"use client";

import type { ReactNode } from "react";
import { IconKey } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { LineList, LineRow, SubHeading } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTrustedDevices } from "../hooks/use-trusted-devices";
import { useTwoFactor } from "../hooks/use-two-factor";
import { quietLink, TrustedDevices } from "./trusted-devices";
import { BackupCodesDialog, DisableTwoFactorDialog, RemoveDevicesDialog } from "./two-factor-dialogs";
import { TwoFactorSetup } from "./two-factor-setup";

function StatusTitle({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={cn("size-[7px] rounded-full", on ? "bg-ok" : "bg-ink-icon")} />
      {children}
    </span>
  );
}

/** Two factor authentication: off, inline setup, or on with backup codes and trusted devices. */
export function TwoFactorForm() {
  const t = useTranslations();
  const twoFactor = useTwoFactor();
  const { status, isLoading } = twoFactor;
  const trusted = useTrustedDevices(twoFactor.statusLoaded && status.enabled);

  const body = (() => {
    if (!twoFactor.statusLoaded && twoFactor.statusError) {
      return (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
          {t("twoFactor.messages.statusLoadFailed")}
          <Button variant="link" className={quietLink} onClick={() => void twoFactor.loadStatus()}>
            {t("common.calm.retry")}
          </Button>
        </p>
      );
    }

    if (!twoFactor.statusLoaded) {
      return (
        <div className="grid gap-2.5" aria-hidden="true">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      );
    }

    if (!status.enabled && twoFactor.isSetupModalOpen && twoFactor.setupData) {
      return (
        <TwoFactorSetup
          setupData={twoFactor.setupData}
          code={twoFactor.verificationCode}
          onCodeChange={twoFactor.setVerificationCode}
          onVerify={() => void twoFactor.verifySetup()}
          onCancel={() => {
            twoFactor.setIsSetupModalOpen(false);
            twoFactor.setVerificationCode("");
          }}
          isBusy={isLoading}
        />
      );
    }

    if (!status.enabled) {
      return (
        <LineRow
          className="min-h-0 py-0"
          title={<StatusTitle on={false}>{t("profile.calm.off")}</StatusTitle>}
          sub={t("profile.calm.offHint")}
        >
          <Button onClick={() => void twoFactor.startSetup()} disabled={isLoading}>
            {t("profile.calm.turnOn")}
          </Button>
        </LineRow>
      );
    }

    return (
      <>
        <LineRow
          className="min-h-0 py-0"
          title={<StatusTitle on>{t("profile.calm.on")}</StatusTitle>}
          sub={t("profile.calm.onHint")}
        >
          <Button variant="outline" onClick={() => twoFactor.setIsDisableModalOpen(true)} disabled={isLoading}>
            {t("profile.calm.turnOff")}
          </Button>
        </LineRow>

        <div className="grid gap-1">
          <SubHeading className="mt-2">{t("profile.calm.backupCodes")}</SubHeading>
          <LineList>
            <LineRow
              className="min-h-0 flex-wrap sm:flex-nowrap"
              icon={<IconKey stroke={1.8} />}
              title={t("profile.calm.codesLeft", { count: status.availableBackupCodes })}
              sub={t("profile.calm.backupHint")}
            >
              {twoFactor.backupCodes.length > 0 && (
                <Button variant="link" className={quietLink} onClick={twoFactor.downloadBackupCodes}>
                  {t("profile.calm.download")}
                </Button>
              )}
              <Button
                variant="link"
                className={cn(quietLink, "ms-2")}
                onClick={() => void twoFactor.generateNewBackupCodes()}
                disabled={isLoading}
              >
                {t("profile.calm.newCodes")}
              </Button>
            </LineRow>
          </LineList>
        </div>

        <TrustedDevices
          devices={trusted.devices}
          isLoading={trusted.isLoading}
          loadError={trusted.loadError}
          isRemoving={trusted.isRemoving}
          formatDeviceName={trusted.formatDeviceName}
          onRemove={(device) => void trusted.handleRemoveDevice(device)}
          onRemoveAll={trusted.handleRemoveAllDevices}
          onRetry={() => void trusted.loadDevices()}
        />
      </>
    );
  })();

  return (
    <FormSection title={t("twoFactor.title")} description={t("profile.calm.twoFactorHint")}>
      {body}

      <DisableTwoFactorDialog
        open={twoFactor.isDisableModalOpen}
        onOpenChange={(open) => {
          twoFactor.setIsDisableModalOpen(open);
          if (!open) twoFactor.setDisablePassword("");
        }}
        password={twoFactor.disablePassword}
        onPasswordChange={twoFactor.setDisablePassword}
        onConfirm={() => void twoFactor.disable2FA()}
        isBusy={isLoading}
      />
      <BackupCodesDialog
        open={twoFactor.isBackupCodesModalOpen}
        onOpenChange={twoFactor.setIsBackupCodesModalOpen}
        codes={twoFactor.backupCodes}
        onDownload={twoFactor.downloadBackupCodes}
        onCopy={() => void twoFactor.copyBackupCodes()}
      />
      <RemoveDevicesDialog
        open={trusted.isRemoveModalOpen}
        onOpenChange={trusted.setIsRemoveModalOpen}
        title={t("twoFactor.trustedDevices.modals.removeDevice.title")}
        description={t("twoFactor.trustedDevices.confirmRemove")}
        detail={
          trusted.deviceToRemove
            ? [trusted.formatDeviceName(trusted.deviceToRemove), trusted.deviceToRemove.ipAddress]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
        confirmLabel={t("twoFactor.trustedDevices.modals.buttons.removeDevice")}
        onConfirm={() => void trusted.confirmRemoveDevice()}
        isBusy={trusted.isRemoving}
      />
      <RemoveDevicesDialog
        open={trusted.isRemoveAllModalOpen}
        onOpenChange={trusted.setIsRemoveAllModalOpen}
        title={t("twoFactor.trustedDevices.modals.removeAllDevices.title")}
        description={t("twoFactor.trustedDevices.modals.removeAllDevices.description", {
          count: trusted.devices.length,
        })}
        confirmLabel={t("twoFactor.trustedDevices.modals.buttons.removeAllDevices")}
        onConfirm={() => void trusted.confirmRemoveAllDevices()}
        isBusy={trusted.isRemoving}
      />
    </FormSection>
  );
}
