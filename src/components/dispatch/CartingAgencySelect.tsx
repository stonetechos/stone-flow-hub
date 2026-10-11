import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Truck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { qk } from "@/lib/query-keys";
import { listCartingAgencies, type CartingAgencyRow } from "@/lib/purchase-transportation/api";
import {
  listInstallationAgencies,
  type InstallationAgencyRow,
} from "@/lib/installation-agencies/api";

export interface MasterAgencyOption {
  id: string;
  name: string;
  phone: string | null;
  contactPerson: string | null;
  vehicleType: string | null;
  source: "carting" | "installation";
}

interface Props {
  value?: string | null;
  onChange: (carrierName: string | null) => void;
  onAgencyAutoFill?: (details: {
    phone?: string | null;
    contactPerson?: string | null;
    vehicleType?: string | null;
  }) => void;
  className?: string;
  placeholder?: string;
}

const CUSTOM_VALUE = "__custom__";
const NONE_VALUE = "__none__";

export function CartingAgencySelect({
  value,
  onChange,
  onAgencyAutoFill,
  className,
  placeholder = "Select carting agency / transport",
}: Props) {
  const cartingQuery = useQuery({
    queryKey: qk.cartingAgencies.list(),
    queryFn: () => listCartingAgencies(true),
    staleTime: 60_000,
  });

  const installQuery = useQuery({
    queryKey: qk.installationAgencies.list(),
    queryFn: () => listInstallationAgencies(true),
    staleTime: 60_000,
  });

  // Combine and deduplicate agencies
  const agencies: MasterAgencyOption[] = useMemo(() => {
    const map = new Map<string, MasterAgencyOption>();

    (cartingQuery.data ?? []).forEach((c: CartingAgencyRow) => {
      const trimmed = c.name?.trim();
      if (!trimmed) return;
      map.set(trimmed.toLowerCase(), {
        id: c.id,
        name: trimmed,
        phone: c.phone ?? null,
        contactPerson: c.contact_person ?? null,
        vehicleType: c.vehicle_type ?? null,
        source: "carting",
      });
    });

    (installQuery.data ?? []).forEach((i: InstallationAgencyRow) => {
      const trimmed = i.name?.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      // Only add if not already in map from carting agencies
      if (!map.has(key)) {
        map.set(key, {
          id: i.id,
          name: trimmed,
          phone: i.phone ?? null,
          contactPerson: i.contact_person ?? null,
          vehicleType: null,
          source: "installation",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [cartingQuery.data, installQuery.data]);

  // Determine current dropdown value
  const matchedAgency = useMemo(() => {
    if (!value) return null;
    return agencies.find((a) => a.name.toLowerCase() === value.trim().toLowerCase()) ?? null;
  }, [value, agencies]);

  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState(value ?? "");

  // Sync custom text if value changes externally
  useEffect(() => {
    if (value && !matchedAgency) {
      setIsCustomMode(true);
      setCustomText(value);
    } else if (!value) {
      setIsCustomMode(false);
      setCustomText("");
    } else {
      setIsCustomMode(false);
    }
  }, [value, matchedAgency]);

  const selectValue = matchedAgency
    ? matchedAgency.name
    : isCustomMode || (value && !matchedAgency)
      ? CUSTOM_VALUE
      : NONE_VALUE;

  const handleSelectChange = (v: string) => {
    if (v === NONE_VALUE) {
      setIsCustomMode(false);
      setCustomText("");
      onChange(null);
    } else if (v === CUSTOM_VALUE) {
      setIsCustomMode(true);
      onChange(customText.trim() || null);
    } else {
      setIsCustomMode(false);
      const chosen = agencies.find((a) => a.name === v);
      if (chosen) {
        onChange(chosen.name);
        onAgencyAutoFill?.({
          phone: chosen.phone,
          contactPerson: chosen.contactPerson,
          vehicleType: chosen.vehicleType,
        });
      } else {
        onChange(v);
      }
    }
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    onChange(text.trim() || null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select value={selectValue} onValueChange={handleSelectChange}>
            <SelectTrigger className={className}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>— None / Not assigned —</SelectItem>
              {agencies.length > 0 && (
                <>
                  <SelectSeparator />
                  {agencies.map((a) => (
                    <SelectItem key={a.id} value={a.name}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{a.name}</span>
                        {(a.phone || a.vehicleType || a.contactPerson) && (
                          <span className="text-[11px] text-muted-foreground">
                            {[a.contactPerson, a.phone, a.vehicleType].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
              <SelectSeparator />
              <SelectItem value={CUSTOM_VALUE}>
                ✏️ Other / Custom Transporter (manual entry)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Link
          to="/masters/carting-agencies"
          target="_blank"
          title="Manage master carting agencies"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground text-xs shrink-0"
        >
          <Truck className="h-4 w-4" />
        </Link>
      </div>

      {isCustomMode && (
        <div className="pt-1">
          <Input
            value={customText}
            onChange={(e) => handleCustomTextChange(e.target.value)}
            placeholder="Type custom carrier / transport name…"
            autoFocus
          />
        </div>
      )}

      {matchedAgency && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
          <span>
            Master Agency: <strong>{matchedAgency.name}</strong>
            {matchedAgency.phone ? ` • Phone: ${matchedAgency.phone}` : ""}
            {matchedAgency.vehicleType ? ` • ${matchedAgency.vehicleType}` : ""}
          </span>
          <Link
            to="/masters/carting-agencies"
            target="_blank"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Manage <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
