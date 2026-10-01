"use client";

import React, { useState } from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  className?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ className, ...props }, ref) => {
  const t = useTranslations();
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <Input type={showPassword ? "text" : "password"} className={cn("pr-10", className)} ref={ref} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
        onClick={togglePasswordVisibility}
        disabled={props.disabled}
      >
        {showPassword ? (
          <IconEyeOff className="h-4 w-4 text-ink-icon hover:text-ink" />
        ) : (
          <IconEye className="h-4 w-4 text-ink-icon hover:text-ink" />
        )}
        <span className="sr-only">{showPassword ? t("ui.hidePassword") : t("ui.showPassword")}</span>
      </Button>
    </div>
  );
});

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
