"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import { useTranslation } from "react-i18next";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, children, ...props }, ref) => {
  const { t } = useTranslation();

  const translateNode = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === "string") {
      const trimmed = node.trim();
      if (!trimmed) return node;
      const translated = t(`field.${trimmed}`, t(`label.${trimmed}`, trimmed));
      if (translated !== trimmed) {
        return node.replace(trimmed, translated);
      }
      return node;
    }
    return node;
  };

  const translatedChildren = React.Children.map(children, translateNode);

  return (
    <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>
      {translatedChildren}
    </LabelPrimitive.Root>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
