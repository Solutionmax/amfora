"use client";

import { useTranslations } from "next-intl";

import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { expiryProblem, maxExpiryValue } from "@/lib/link-lifetime";

interface ExpiryFieldProps {
  id: string;
  label: string;
  /** Shown when the administrator set no maximum. */
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  maxDays: number;
  /** The end date the link has now: it stays allowed as it is. */
  unchanged?: string;
  /** An error from the form itself, shown when the date is not too far away. */
  error?: string;
  className?: string;
}

/** An end date input that holds to the maximum lifetime: the picker stops there and the hint says why. */
export function ExpiryField({
  id,
  label,
  hint,
  value,
  onChange,
  maxDays,
  unchanged,
  error,
  className,
}: ExpiryFieldProps) {
  const t = useTranslations();
  const now = new Date();
  // An empty field is only judged when saving; here only a date that is too far away.
  const problem = value ? expiryProblem({ value, maxDays, now, unchanged }) : null;

  return (
    <Field
      label={label}
      htmlFor={id}
      hint={maxDays > 0 ? t("shares.lifetime.maxHint", { days: maxDays }) : hint}
      error={problem ? t(`shares.lifetime.${problem}`, { days: maxDays }) : error}
    >
      <Input
        id={id}
        type="datetime-local"
        className={className}
        value={value}
        max={value === unchanged ? undefined : maxExpiryValue(maxDays, now)}
        aria-invalid={!!problem}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
