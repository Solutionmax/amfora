"use client";

import { useTranslations } from "next-intl";

import { MESSAGE_TYPES, STATUS_VARIANTS } from "../../constants";
import type { ReverseShareInfo } from "../../types";

interface StatusMessageProps {
  variant: "success" | "warning" | "error" | "info" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  additionalText?: string;
  size?: "default" | "compact";
}

interface WeTransferStatusMessageProps {
  type: keyof typeof MESSAGE_TYPES;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  showContactOwner?: boolean;
  reverseShare?: ReverseShareInfo | null;
}

export function StatusMessage({
  icon: Icon,
  title,
  description,
  additionalText,
  variant,
  size = "default",
}: StatusMessageProps) {
  const styles = STATUS_VARIANTS[variant];
  const isCompact = size === "compact";

  return (
    <div className={`text-center space-y-4 ${isCompact ? "py-6" : "py-8"}`}>
      <div className="flex justify-center">
        <div className={`${styles.iconBg} p-3 rounded-full`}>
          <Icon className={`${isCompact ? "h-6 w-6" : "h-8 w-8"} ${styles.iconColor}`} />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className={`${isCompact ? "text-lg" : "text-xl"} font-semibold ${styles.titleColor}`}>{title}</h3>
        <p
          className={`${styles.descriptionColor} ${isCompact ? "text-sm" : ""} ${isCompact ? "" : "max-w-md mx-auto"}`}
        >
          {description}
        </p>
        {additionalText && (
          <p className={`${isCompact ? "text-xs" : "text-sm"} text-muted-foreground`}>{additionalText}</p>
        )}
      </div>
    </div>
  );
}

export function WeTransferStatusMessage({
  type,
  icon: Icon,
  titleKey,
  descriptionKey,
  showContactOwner = false,
  reverseShare,
}: WeTransferStatusMessageProps) {
  const t = useTranslations();

  const getVariant = (): "success" | "warning" | "error" | "info" | "neutral" => {
    switch (type) {
      case MESSAGE_TYPES.SUCCESS:
        return "success";
      case MESSAGE_TYPES.MAX_FILES:
        return "warning";
      case MESSAGE_TYPES.INACTIVE:
        return "error";
      case MESSAGE_TYPES.EXPIRED:
        return "info";
      case MESSAGE_TYPES.NOT_FOUND:
      default:
        return "neutral";
    }
  };

  const description =
    type === MESSAGE_TYPES.MAX_FILES ? t(descriptionKey, { maxFiles: reverseShare?.maxFiles || 0 }) : t(descriptionKey);

  const additionalText = showContactOwner ? t("reverseShares.upload.maxFilesReached.contactOwner") : undefined;

  return (
    <StatusMessage
      variant={getVariant()}
      icon={Icon}
      title={t(titleKey)}
      description={description}
      additionalText={additionalText}
      size="compact"
    />
  );
}
