import { useState, useEffect } from "react";
import { Pencil, RotateCcw, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface RenameTarget {
  id: string;
  currentLabel: string;
  defaultLabel: string;
  isGroup?: boolean;
}

interface QuickRenameTabDialogProps {
  target: RenameTarget | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, newLabel: string) => void;
  onReset: (id: string) => void;
}

export function QuickRenameTabDialog({
  target,
  onOpenChange,
  onSave,
  onReset,
}: QuickRenameTabDialogProps) {
  const [val, setVal] = useState("");

  useEffect(() => {
    if (target) {
      setVal(target.currentLabel);
    }
  }, [target]);

  if (!target) return null;

  const isCustomized = target.currentLabel !== target.defaultLabel;

  const handleSave = () => {
    const trimmed = val.trim();
    if (!trimmed) {
      toast.error("Tab name cannot be empty");
      return;
    }
    onSave(target.id, trimmed);
    toast.success(`Renamed "${target.defaultLabel}" to "${trimmed}"`);
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset(target.id);
    toast.success(`Reset "${target.currentLabel}" back to original "${target.defaultLabel}"`);
    onOpenChange(false);
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
            <Pencil className="h-5 w-5" />
            <DialogTitle>Rename Navigation {target.isGroup ? "Section" : "Tab"}</DialogTitle>
          </div>
          <DialogDescription>
            Change the display label for this {target.isGroup ? "section" : "tab"} in your sidebar.
            Your custom names persist automatically across sessions.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4 py-2"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Original Factory Name:</span>
              <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                {target.defaultLabel}
              </span>
            </div>

            <Label htmlFor="quick-rename-input" className="text-sm font-medium">
              Custom Display Label
            </Label>
            <Input
              id="quick-rename-input"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={target.defaultLabel}
              autoFocus
              onFocus={(e) => e.target.select()}
              className="text-sm font-medium"
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
            {isCustomized ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="w-full sm:w-auto text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 border-amber-300 dark:border-amber-800"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset to Original
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Save Name
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
