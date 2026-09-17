"use client";

import { useEffect, useRef, useState } from "react";
import { IconCloudUpload, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAppInfo } from "@/contexts/app-info-context";
import { removeLogo, uploadLogo } from "@/http/endpoints";

interface LogoInputProps {
  value?: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

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
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        disabled={isDisabled}
        type="file"
        onChange={handleFileSelect}
      />

      {currentLogo ? (
        <div className="flex flex-wrap items-center gap-5 rounded-xl border bg-background/60 p-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border bg-card p-2">
            <img
              alt={t("logo.labels.appLogo")}
              className="max-h-full max-w-full object-contain"
              src={currentLogo}
              sizes="64px"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={isDisabled || isUploading}
            onClick={handleRemoveLogo}
          >
            {!isUploading && <IconTrash className="h-4 w-4" />}
            {t("logo.buttons.remove")}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          className="w-full border-dashed py-8"
          variant="outline"
          disabled={isDisabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {!isUploading && <IconCloudUpload className="h-5 w-5" />}
          {t("logo.buttons.upload")}
        </Button>
      )}
    </div>
  );
}
