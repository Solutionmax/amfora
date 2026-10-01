import { forwardRef } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";

interface RedirectUriInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: any;
  placeholder?: string;
}

const CALLBACK_PATH = "/api/auth/providers/callback";

export const RedirectUriInput = forwardRef<HTMLInputElement, RedirectUriInputProps>(
  ({ value, onChange, disabled, error, placeholder }, ref) => {
    const t = useTranslations();

    const getBaseUrl = (fullUrl: string) => {
      if (!fullUrl) return "";
      return fullUrl.replace(CALLBACK_PATH, "");
    };

    const buildFullUrl = (baseUrl: string) => {
      if (!baseUrl) return "";
      return `${baseUrl}${CALLBACK_PATH}`;
    };

    const baseUrl = getBaseUrl(value || "");

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newBaseUrl = e.target.value;
      const fullUrl = buildFullUrl(newBaseUrl);
      onChange(fullUrl);
    };

    return (
      <div className="grid gap-1.5">
        <div className="relative">
          <Input
            ref={ref}
            value={baseUrl}
            onChange={handleInputChange}
            placeholder={placeholder || t("settings.redirectUri.placeholder")}
            disabled={disabled}
            aria-invalid={!!error}
            className="pr-32"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="mono rounded border border-line bg-surface-2 px-2 py-1 text-xs text-ink-3">
              {CALLBACK_PATH}
            </span>
          </div>
        </div>

        {baseUrl && (
          <p className="text-[12.5px] text-ink-3">
            {t("settings.redirectUri.previewLabel")}{" "}
            <code className="mono break-all text-ink-2">{buildFullUrl(baseUrl)}</code>
          </p>
        )}
      </div>
    );
  }
);

RedirectUriInput.displayName = "RedirectUriInput";
