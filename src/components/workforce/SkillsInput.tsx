import { useState, type KeyboardEvent } from "react";
import { Plus, X, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const INDUSTRY_SKILL_SUGGESTIONS = [
  "AutoCAD & 3D Drafting",
  "CNC Bridge Saw",
  "Waterjet Cutting",
  "Edge Polishing & Profiling",
  "Site Measurement",
  "Marble & Granite Grading",
  "Stone Installation Supervision",
  "B2B Sales & Key Accounts",
  "Client Follow-up & CRM",
  "Tally ERP & GST Invoicing",
  "Dispatch Logistics & Loading",
  "Inventory Quality Control",
] as const;

interface SkillsInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  disabled?: boolean;
}

export function SkillsInput({ skills, onChange, disabled }: SkillsInputProps) {
  const [currentInput, setCurrentInput] = useState("");

  const addSkill = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Allow comma-separated paste / typing
    const items = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !skills.includes(s));
    if (items.length > 0) {
      onChange([...skills, ...items]);
    }
    setCurrentInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(currentInput);
    }
  };

  return (
    <div className="space-y-3">
      {/* Input box with Add button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Type a skill and press Enter (e.g. AutoCAD, CNC Cutting, Sales)..."
            className="pr-10 text-sm"
          />
          <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !currentInput.trim()}
          onClick={() => addSkill(currentInput)}
          className="gap-1.5 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add</span>
        </Button>
      </div>

      {/* Rendered Skill Badges */}
      {skills.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-muted/20 p-2.5 min-h-[46px]">
          {skills.map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="gap-1.5 pl-2.5 pr-1.5 py-1 text-xs font-semibold bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800 transition-colors"
            >
              <span>{skill}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 transition-colors"
                  aria-label={`Remove skill ${skill}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic px-1">
          No skills added yet. Type a skill above or click a suggestion below.
        </div>
      )}

      {/* Suggested Stone Industry Skills */}
      {!disabled && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Suggested stone industry skills:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRY_SKILL_SUGGESTIONS.map((suggestion) => {
              const isAdded = skills.includes(suggestion);
              return (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    if (!isAdded) addSkill(suggestion);
                    else removeSkill(suggestion);
                  }}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-all ${
                    isAdded
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-background border border-border/80 text-muted-foreground hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  <span>{suggestion}</span>
                  {isAdded ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-60" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
