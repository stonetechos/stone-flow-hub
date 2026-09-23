import { Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Density } from "@/hooks/use-table-prefs";
import { useTranslation } from "react-i18next";

export function DensityMenu({
  density,
  onChange,
}: {
  density: Density;
  onChange: (d: Density) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
          <Rows3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("table.density", "Density")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t("table.rowDensity", "Row density")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={density} onValueChange={(v) => onChange(v as Density)}>
          <DropdownMenuRadioItem value="comfortable">
            {t("table.comfortable", "Comfortable")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="compact">
            {t("table.compact", "Compact")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dense">{t("table.dense", "Dense")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
