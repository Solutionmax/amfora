"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconFolder,
  IconInbox,
  IconLayoutGrid,
  IconLogout,
  IconPalette,
  IconSettings,
  IconShare,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { formatStorageSize } from "@/app/dashboard/utils/format-storage-size";
import { BrandMark } from "@/components/brand/brand-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppInfo } from "@/contexts/app-info-context";
import { useAuth } from "@/contexts/auth-context";
import { useSecureConfigValue } from "@/hooks/use-secure-configs";
import { getDiskSpace, logout as logoutAPI } from "@/http/endpoints";
import { cn } from "@/lib/utils";
import packageJson from "../../../package.json";

const { version } = packageJson;

type DiskSpace = { diskSizeGB: number; diskUsedGB: number; diskAvailableGB: number };
type NavEntry = { href: string; label: string; icon: typeof IconFolder };

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  // Operators can hide the version; the footer honours the same setting.
  const { value: hideVersion } = useSecureConfigValue("hideVersion");
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const { appName } = useAppInfo();
  const [disk, setDisk] = useState<DiskSpace | null>(null);

  useEffect(() => {
    getDiskSpace()
      .then((res) => setDisk(res.data as DiskSpace))
      .catch(() => setDisk(null));
  }, []);

  const handleLogout = async () => {
    try {
      await logoutAPI();
    } catch (err) {
      console.error("Error logging out:", err);
    } finally {
      logout();
      router.push("/login");
    }
  };

  const main: NavEntry[] = [
    { href: "/dashboard", label: t("dashboard.pageTitle"), icon: IconLayoutGrid },
    { href: "/files", label: t("files.pageTitle"), icon: IconFolder },
    { href: "/shares", label: t("shares.pageTitle"), icon: IconShare },
    { href: "/reverse-shares", label: t("reverseShares.pageTitle"), icon: IconInbox },
  ];

  const admin: NavEntry[] = isAdmin
    ? [
        { href: "/users-management", label: t("navbar.usersManagement"), icon: IconUsers },
        { href: "/customization", label: t("customization.pageTitle"), icon: IconPalette },
        { href: "/settings", label: t("settings.pageTitle"), icon: IconSettings },
      ]
    : [];

  const account: NavEntry[] = [{ href: "/profile", label: t("navbar.profile"), icon: IconUser }];

  const used = disk ? Math.min(disk.diskUsedGB / Math.max(disk.diskSizeGB, 1), 1) : 0;

  const item = (entry: NavEntry) => {
    const active = pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    return (
      <Link
        key={entry.href}
        href={entry.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-9 items-center gap-2.5 rounded-[var(--radius)] px-2.5 text-[13.5px] font-medium transition-colors duration-150",
          active
            ? "bg-surface font-semibold text-primary shadow-[0_1px_0_var(--line),0_8px_18px_-12px_rgba(12,22,38,.35)] before:absolute before:bottom-[9px] before:left-0 before:top-[9px] before:w-[3px] before:rounded-full before:bg-primary dark:bg-surface-2 dark:shadow-none"
            : "text-ink-2 hover:bg-surface-2 hover:text-ink"
        )}
      >
        <entry.icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
        {entry.label}
      </Link>
    );
  };

  const group = (label: string) => (
    <span className="px-2.5 pb-1.5 pt-[18px] text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
      {label}
    </span>
  );

  return (
    <div className="flex h-full flex-col border-r border-[color-mix(in_oklab,var(--line)_80%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_7%,var(--surface))_0%,var(--surface)_160px)] px-3 pb-3 pt-4 text-ink">
      <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-2.5 px-2 pb-[18px] pt-1.5">
        <BrandMark className="size-8 shrink-0 text-primary" />
        <span className="truncate font-display text-base font-semibold tracking-[-0.01em]">{appName}</span>
      </Link>

      <nav aria-label={appName} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {main.map(item)}
        {admin.length > 0 && group(t("navbar.admin"))}
        {admin.map(item)}
        {group(t("navbar.account"))}
        {account.map(item)}
      </nav>

      <div className="mt-auto flex flex-col gap-3.5 pt-4">
        <div className="rounded-[var(--radius)] bg-surface-2 p-3 text-xs text-ink-3">
          <div className="flex items-baseline justify-between gap-2 whitespace-nowrap">
            <span>{t("navbar.storage")}</span>
            <span className="mono text-[11px]">
              {disk ? formatStorageSize(disk.diskUsedGB) : "—"} / {disk ? formatStorageSize(disk.diskSizeGB) : "—"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t("storageUsage.title")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={disk ? Math.round(used * 100) : undefined}
            className="mt-1.5 h-1 overflow-hidden rounded-sm bg-line"
          >
            <div className="h-full rounded-sm bg-primary" style={{ width: `${used * 100}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-line px-1.5 pt-3">
          <Avatar className="size-[30px]">
            <AvatarImage src={user?.image as string | undefined} />
            <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-ink-3">{isAdmin ? t("navbar.roleAdmin") : t("navbar.roleUser")}</p>
          </div>
          <Button variant="ghost" size="icon" className="size-8" onClick={handleLogout} aria-label={t("navbar.logout")}>
            <IconLogout className="size-[18px]" />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 px-0.5 text-[11px] text-ink-3 [&_button]:size-7 [&_button]:text-ink-3 [&_button:hover]:text-ink">
          <LanguageSwitcher />
          <ModeToggle />
          {hideVersion !== "true" && <span className="mono ml-auto pr-1">v{version}</span>}
        </div>
      </div>
    </div>
  );
}
