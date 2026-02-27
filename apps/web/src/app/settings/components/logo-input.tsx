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
        <div className="flex flex-col items-center gap-4">
          <div className="relative max-w-[200px] max-h-[200px] flex">
            <img alt={t("logo.labels.appLogo")} className="rounded-lg" src={currentLogo} sizes="200px" />
          </div>
          <Button variant="destructive" disabled={isDisabled} onClick={handleRemoveLogo}>
            {!isUploading && <IconTrash className="h-4 w-4" />}
            {t("logo.buttons.remove")}
          </Button>
        </div>
      ) : (
        <Button
          className="w-full py-8"
          variant="outline"
          disabled={isDisabled}
          onClick={() => fileInputRef.current?.click()}
        >
          {!isUploading && <IconCloudUpload className="h-5 w-5" />}
          {t("logo.buttons.upload")}
        </Button>
      )}
    </div>
  );
}
