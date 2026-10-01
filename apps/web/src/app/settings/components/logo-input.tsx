"use client";

import { useEffect, useRef, useState } from "react";
import { IconUpload } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { LineRow } from "@/components/ui/line-list";
import { useAppInfo } from "@/contexts/app-info-context";
import { removeLogo, uploadLogo } from "@/http/endpoints";

interface LogoInputProps {
  value?: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

/** Logo as one line: the current mark, a short hint, upload or replace, remove. Saves at once. */
export function LogoInput({ value, onChange, isDisabled }: LogoInputProps) {
  const t = useTranslations();
  const [isUploading, setIsUploading] = useState(false);
  const [currentLogo, setCurrentLogo] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshAppInfo, appLogo } = useAppInfo();

  useEffect(() => {
    setCurrentLogo(appLogo);
  }, [appLogo]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setIsUploading(true);
      const response = await uploadLogo({ file: file });
      const newLogoUrl = response.data.logo;

      setCurrentLogo(newLogoUrl);
      onChange(newLogoUrl);
      await refreshAppInfo();
      toast.success(t("logo.messages.uploadSuccess"));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("logo.errors.uploadFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setIsUploading(true);
      await removeLogo();
      setCurrentLogo("");
      onChange("");
      await refreshAppInfo();
      toast.success(t("logo.messages.removeSuccess"));
    } catch (error: any) {
      toast.error(error.response?.data?.error || t("logo.errors.removeFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-w-0">
      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        disabled={isDisabled}
        type="file"
        onChange={handleFileSelect}
        aria-label={t("customization.v2.brand.logo")}
      />
      <LineRow
        className="min-h-0 py-0"
        icon={
          <span className="grid size-[34px] place-items-center overflow-hidden rounded-full bg-primary-soft text-primary">
            {currentLogo ? (
              <img alt={t("logo.labels.appLogo")} className="size-full object-contain p-1" src={currentLogo} />
            ) : (
              <BrandMark className="!size-[18px]" />
            )}
          </span>
        }
        title={t("customization.v2.brand.logo")}
        sub={t("customization.calm.logoHint")}
      >
        {currentLogo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDisabled || isUploading}
            onClick={handleRemoveLogo}
          >
            {t("customization.v2.downloadPage.remove")}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDisabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <IconUpload aria-hidden="true" />
          {currentLogo ? t("customization.v2.downloadPage.replace") : t("customization.calm.upload")}
        </Button>
      </LineRow>
    </div>
  );
}
