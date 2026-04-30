import type { ReactNode } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface ProfileFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export default function ProfileField({
  label,
  children,
  className,
}: ProfileFieldProps) {
  return (
    <Field className={cn("gap-3", className)}>
      <FieldLabel className="text-sm font-semibold text-[#004EDC]">
        {label}
      </FieldLabel>
      {children}
    </Field>
  );
}
