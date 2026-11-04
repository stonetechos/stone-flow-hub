import { useState } from "react";
import { Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sanitizePhonebookNumber } from "@/lib/customers/phonebook-sanitizer";

export interface SelectedContact {
  name?: string;
  mobile?: string;
  email?: string;
  raw?: unknown;
}

interface PhonebookPickerButtonProps {
  onContactSelected: (contact: SelectedContact) => void;
  className?: string;
  variant?: "outline" | "default" | "secondary" | "ghost";
  size?: "default" | "sm" | "xs";
  label?: string;
}

export function PhonebookPickerButton({
  onContactSelected,
  className,
  variant = "outline",
  size = "sm",
  label = "Import from Phonebook",
}: PhonebookPickerButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    // Check if the Contacts Manager API is available
    const hasContactsApi =
      typeof window !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

    if (!hasContactsApi) {
      toast.info(
        "Phonebook directory access is supported on Android mobile browsers. On desktop, please enter contact details manually.",
        { duration: 4500 },
      );
      return;
    }

    setLoading(true);
    try {
      // Direct user gesture triggered — ONLY requests permission upon click
      const contactsNav = (
        navigator as unknown as {
          contacts: {
            select: (
              properties: string[],
              options?: { multiple?: boolean },
            ) => Promise<Array<{ name?: string[]; tel?: string[]; email?: string[] }>>;
          };
        }
      ).contacts;

      const results = await contactsNav.select(["name", "tel", "email"], {
        multiple: false,
      });

      if (!results || results.length === 0) {
        // User cancelled selection
        return;
      }

      const picked = results[0];
      const rawName = picked.name?.[0]?.trim() || "";
      const rawTel = picked.tel?.[0]?.trim() || "";
      const rawEmail = picked.email?.[0]?.trim() || "";
      const cleanMobile = sanitizePhonebookNumber(rawTel);

      onContactSelected({
        name: rawName,
        mobile: cleanMobile,
        email: rawEmail,
        raw: picked,
      });

      toast.success(
        rawName
          ? `Imported ${rawName} (${cleanMobile || rawTel || "No phone"}) from phonebook!`
          : `Imported ${cleanMobile} from phonebook!`,
      );
    } catch (err: unknown) {
      // If user cancelled, do not spam error
      const errStr = String(err);
      if (errStr.includes("cancel") || errStr.includes("AbortError")) {
        return;
      }
      console.warn("[phonebook-picker] Error reading contacts:", err);
      toast.error("Could not import contact. Please type details manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size === "xs" ? "sm" : size}
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "gap-1.5 text-xs font-medium cursor-pointer border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100/60 hover:text-emerald-900 transition-colors shadow-2xs",
        size === "xs" && "h-6 px-2 text-[11px]",
        className,
      )}
      title="Tap to select a customer contact directly from your phone's address book"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
      ) : (
        <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
      )}
      <span>{label}</span>
    </Button>
  );
}
