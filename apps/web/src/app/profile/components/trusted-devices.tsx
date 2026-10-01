"use client";

import { IconDeviceLaptop, IconDeviceMobile } from "@tabler/icons-react";
import { useFormatter, useNow, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { LineList, LineRow, SubHeading } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrustedDevice } from "@/http/endpoints/auth/trusted-devices/types";
import { isMobileAgent } from "../utils";

export const quietLink =
  "h-auto rounded-[5px] p-0 text-[13px] font-semibold focus-visible:ring-[3px] focus-visible:ring-primary/35";

/** Devices that skip the code at sign-in, one hairline row each. */
export function TrustedDevices({
  devices,
  isLoading,
  loadError,
  isRemoving,
  formatDeviceName,
  onRemove,
  onRemoveAll,
  onRetry,
}: {
  devices: TrustedDevice[];
  isLoading: boolean;
  loadError: boolean;
  isRemoving: boolean;
  formatDeviceName: (device: TrustedDevice) => string;
  onRemove: (device: TrustedDevice) => void;
  onRemoveAll: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const now = useNow();

  const shortDate = (value: string) => format.dateTime(new Date(value), { day: "numeric", month: "short" });

  const describe = (device: TrustedDevice) => {
    const parts: string[] = [];
    if (device.ipAddress) parts.push(device.ipAddress);
    parts.push(
      device.lastUsedAt
        ? t("profile.calm.usedWhen", { when: format.relativeTime(new Date(device.lastUsedAt), now) })
        : t("profile.calm.neverUsed")
    );
    parts.push(
      new Date(device.expiresAt) < now
        ? t("profile.calm.expiredOn", { date: shortDate(device.expiresAt) })
        : t("profile.calm.trustedUntil", { date: shortDate(device.expiresAt) })
    );
    return parts.join(" · ");
  };

  return (
    <div className="grid gap-1">
      <div className="mt-2 flex items-center justify-between gap-3">
        <SubHeading>{t("profile.calm.trustedDevices")}</SubHeading>
        {devices.length > 0 && (
          <Button
            variant="link"
            className={`${quietLink} text-ink-3 hover:text-bad`}
            onClick={onRemoveAll}
            disabled={isRemoving}
          >
            {t("profile.calm.removeAll")}
          </Button>
        )}
      </div>

      {isLoading && devices.length === 0 ? (
        <div className="grid gap-3 py-3" aria-hidden="true">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
      ) : loadError ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-[13px] text-ink-3">
          {t("twoFactor.trustedDevices.loadFailed")}
          <Button variant="link" className={quietLink} onClick={onRetry}>
            {t("common.calm.retry")}
          </Button>
        </p>
      ) : devices.length === 0 ? (
        <p className="py-3 text-[13px] text-ink-3">{t("profile.calm.noDevices")}</p>
      ) : (
        <LineList>
          {devices.map((device) => {
            const DeviceIcon = isMobileAgent(device.userAgent) ? IconDeviceMobile : IconDeviceLaptop;
            return (
              <LineRow
                key={device.id}
                icon={<DeviceIcon stroke={1.8} />}
                title={formatDeviceName(device)}
                sub={describe(device)}
                className="min-h-0"
              >
                <Button
                  variant="link"
                  className={`${quietLink} text-ink-3 hover:text-bad`}
                  onClick={() => onRemove(device)}
                  disabled={isRemoving}
                  aria-label={`${t("profile.calm.remove")} ${formatDeviceName(device)}`}
                >
                  {t("profile.calm.remove")}
                </Button>
              </LineRow>
            );
          })}
        </LineList>
      )}
    </div>
  );
}
