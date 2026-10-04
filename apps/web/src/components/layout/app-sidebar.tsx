"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconChevronRight,
  IconFolder,
  IconInbox,
  IconKey,
  IconLayoutGrid,
  IconLogout,
  IconPalette,
  IconSettings,
  IconShare,
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
    { href: "/secrets", label: t("secrets.pageTitle"), icon: IconKey },
  ];

  const admin: NavEntry[] = isAdmin
    ? [
        { href: "/users-management", label: t("users.calm.title"), icon: IconUsers },
        { href: "/customization", label: t("customization.pageTitle"), icon: IconPalette },
        { href: "/settings", label: t("settings.pageTitle"), icon: IconSettings },
      ]
    : [];

  const used = disk ? Math.min(disk.diskUsedGB / Math.max(disk.diskSizeGB, 1), 1) : 0;
  const onProfile = pathname === "/profile";

  const item = (entry: NavEntry) => {
    const active = pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    return (
      <Link
        key={entry.href}
        href={entry.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] font-medium transition-colors duration-150",
          active
            ? "bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(14,32,54,.06)] [&_svg]:text-primary"
            : "text-ink-2 hover:bg-surface-2 hover:text-ink [&_svg]:text-ink-icon"
        )}
      >
        <entry.icon className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
        {entry.label}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar-bg px-3.5 pb-4 pt-[22px] text-ink">
      <Link href="/dashboard" onClick={onNavigate} className="flex min-w-0 items-center gap-[9px] px-2">
        <BrandMark className="size-6 shrink-0 text-primary" />
        <span className="truncate font-display text-[17px] font-bold tracking-[-0.01em]">{appName}</span>
      </Link>

      <nav aria-label={appName} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <div className="flex flex-col gap-0.5">{main.map(item)}</div>
        {admin.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="mono px-2.5 pb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
              {t("navbar.admin")}
            </span>
            {admin.map(item)}
          </div>
        )}
      </nav>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-[7px] px-2.5 text-xs text-ink-3">
          <div className="flex items-baseline justify-between gap-2 whitespace-nowrap">
            <span>{t("navbar.storage")}</span>
            <span className="mono text-[11.5px] text-ink-2">
              {disk ? formatStorageSize(disk.diskUsedGB) : "—"} / {disk ? formatStorageSize(disk.diskSizeGB) : "—"}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t("storageUsage.title")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={disk ? Math.round(used * 100) : undefined}
            className="h-[3px] overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${used * 100}%` }} />
          </div>
        </div>

        <Link
          href="/profile"
          onClick={onNavigate}
          aria-current={onProfile ? "page" : undefined}
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-[9px] px-2.5 py-2 transition-colors duration-150",
            onProfile ? "bg-surface shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(14,32,54,.06)]" : "hover:bg-surface-2"
          )}
        >
          <Avatar className="size-[30px]">
            <AvatarImage src={user?.image as string | undefined} />
            <AvatarFallback className="bg-primary font-display text-[11px] font-bold text-primary-foreground">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-ink-3">{isAdmin ? t("navbar.roleAdmin") : t("navbar.roleUser")}</p>
          </div>
          <IconChevronRight className="size-4 text-ink-icon" aria-hidden="true" />
        </Link>

        <div className="flex items-center gap-1 px-1 [&_button]:size-[30px] [&_button]:text-ink-icon [&_button:hover]:text-ink">
          <LanguageSwitcher />
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label={t("navbar.logout")}>
            <IconLogout className="size-[17px]" />
          </Button>
          {hideVersion !== "true" && <span className="mono ml-auto pr-1.5 text-[11px] text-ink-3">v{version}</span>}
        </div>
      </div>
    </div>
  );
}
