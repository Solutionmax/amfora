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

interface VesselStatusMessageProps {
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
    <div className={`space-y-4 px-6 ${isCompact ? "py-8" : "py-10"}`}>
      <div>
        <div className={`${styles.iconBg} flex size-12 items-center justify-center rounded-xl`}>
          <Icon className={`${isCompact ? "h-6 w-6" : "h-8 w-8"} ${styles.iconColor}`} />
        </div>
      </div>
      <div className="space-y-2">
        <h3 className={`${isCompact ? "text-lg" : "text-xl"} font-display font-bold ${styles.titleColor}`}>{title}</h3>
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

export function VesselStatusMessage({
  type,
  icon: Icon,
  titleKey,
  descriptionKey,
  showContactOwner = false,
  reverseShare,
}: VesselStatusMessageProps) {
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

  const contactKey =
    type === MESSAGE_TYPES.INACTIVE
      ? "reverseShares.upload.linkInactive.contactOwner"
      : type === MESSAGE_TYPES.EXPIRED
        ? "reverseShares.upload.linkExpired.contactOwner"
        : "reverseShares.upload.maxFilesReached.contactOwner";
  const additionalText = showContactOwner ? t(contactKey) : undefined;

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
