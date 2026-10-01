"use client";

import { forwardRef, useState, type ComponentProps } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordFieldProps = Omit<ComponentProps<"input">, "type"> & {
  /** Controlled visibility; leave out to let the field keep its own. */
  visible?: boolean;
  onToggleVisible?: () => void;
};

/** Password input with a quiet show/hide button inside the field. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { className, visible, onToggleVisible, disabled, ...props },
  ref
) {
  const t = useTranslations();
  const [ownVisible, setOwnVisible] = useState(false);
  const isVisible = visible ?? ownVisible;
  const toggle = onToggleVisible ?? (() => setOwnVisible((value) => !value));

  return (
    <div className="relative flex items-center">
      <Input
        ref={ref}
        type={isVisible ? "text" : "password"}
        className={cn("pe-11", className)}
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-label={isVisible ? t("auth.calm.hidePassword") : t("auth.calm.showPassword")}
        aria-pressed={isVisible}
        className="absolute end-1.5 grid size-[30px] place-items-center rounded-[7px] text-ink-icon outline-none transition-colors hover:text-ink focus-visible:ring-[3px] focus-visible:ring-primary/35 disabled:opacity-45"
      >
        {isVisible ? (
          <IconEyeOff className="size-[17px]" stroke={1.8} />
        ) : (
          <IconEye className="size-[17px]" stroke={1.8} />
        )}
      </button>
    </div>
  );
});
