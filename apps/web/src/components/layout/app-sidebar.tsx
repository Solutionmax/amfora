"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconActivity,
  IconChevronRight,
  IconDatabase,
  IconFolder,
  IconInbox,
  IconKey,
  IconLayoutGrid,
  IconLogout,
  IconPalette,
  IconSettings,
  IconShare,
  IconTrash,
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
import { useUpdateStatus } from "@/hooks/use-update-status";
import { getDiskSpace, logout as logoutAPI } from "@/http/endpoints";
import { ringPercent, storageLevel, type StorageLevel } from "@/lib/storage-usage";
import { cn } from "@/lib/utils";
import packageJson from "../../../package.json";

const { version } = packageJson;

type DiskSpace = { diskSizeGB: number; diskUsedGB: number; diskAvailableGB: number };
type NavEntry = { href: string; label: string; icon: typeof IconFolder };

/** A user close to their own limit sees it in the colour of the ring and of the line under the amount. */
const LEVEL_STYLE: Record<StorageLevel, { ring: string; text: string }> = {
  normal: { ring: "stroke-primary", text: "" },
  almostFull: { ring: "stroke-warn", text: "font-semibold text-warn" },
  full: { ring: "stroke-bad", text: "font-semibold text-bad" },
};

// The menu is drawn again on every page; the ring only draws itself in the first time.
let hasDrawnRing = false;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  // Operators can hide the version; the footer honours the same setting.
  const { value: hideVersion } = useSecureConfigValue("hideVersion");
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const { appName } = useAppInfo();
  const [disk, setDisk] = useState<DiskSpace | null>(null);
  const [drawsRing] = useState(() => !hasDrawnRing);
  const update = useUpdateStatus((store) => store.status);
  const loadUpdate = useUpdateStatus((store) => store.load);

  useEffect(() => {
    getDiskSpace()
      .then((res) => {
        setDisk(res.data as DiskSpace);
        hasDrawnRing = true;
      })
      .catch(() => setDisk(null));
  }, []);

  // Only an administrator may ask, and only they can install. A check that fails shows
  // nothing here: Settings is where the reason is told.
  useEffect(() => {
    if (isAdmin) loadUpdate().catch(() => undefined);
  }, [isAdmin, loadUpdate]);

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
    { href: "/trash", label: t("trash.pageTitle"), icon: IconTrash },
    { href: "/shares", label: t("shares.pageTitle"), icon: IconShare },
    { href: "/reverse-shares", label: t("reverseShares.pageTitle"), icon: IconInbox },
    { href: "/secrets", label: t("secrets.pageTitle"), icon: IconKey },
    { href: "/activity", label: t("activity.pageTitle"), icon: IconActivity },
  ];

  const admin: NavEntry[] = isAdmin
    ? [
        { href: "/users-management", label: t("users.calm.title"), icon: IconUsers },
        { href: "/customization", label: t("customization.pageTitle"), icon: IconPalette },
        { href: "/settings", label: t("settings.pageTitle"), icon: IconSettings },
      ]
    : [];

  // Administrators see what Amfora holds against the disk. Everyone else sees their own use against their own limit.
  const isOwnStorage = isAdmin === false;
  const hasLimit = !isOwnStorage || !disk || disk.diskSizeGB > 0;
  const level = LEVEL_STYLE[isOwnStorage && disk ? storageLevel(disk.diskUsedGB, disk.diskSizeGB) : "normal"];
  const drawn = disk ? ringPercent(disk.diskUsedGB, disk.diskSizeGB) : 0;

  const storageLine = () => {
    if (!disk) return "—";
    if (!hasLimit) return t("navbar.storageNoLimit");
    if (level === LEVEL_STYLE.full) return t("navbar.storageFull");

    const size = formatStorageSize(Math.max(disk.diskSizeGB - disk.diskUsedGB, 0));
    return t(level === LEVEL_STYLE.almostFull ? "navbar.storageOnlyFree" : "navbar.storageFree", { size });
  };
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
        <div data-testid="sidebar-storage" className="flex min-w-0 items-center gap-2.5 px-2.5 text-xs text-ink-3">
          {hasLimit ? (
            <svg
              role="progressbar"
              aria-label={t("storageUsage.title")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={disk ? Math.round(drawn) : undefined}
              viewBox="0 0 32 32"
              className="size-[30px] shrink-0"
            >
              <circle cx="16" cy="16" r="13" fill="none" strokeWidth="3.6" className="stroke-line" />
              {drawn > 0 && (
                <circle
                  cx="16"
                  cy="16"
                  r="13"
                  fill="none"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray="100"
                  strokeDashoffset={100 - drawn}
                  transform="rotate(-90 16 16)"
                  className={cn(level.ring, drawsRing && "storage-ring")}
                />
              )}
            </svg>
          ) : (
            <span className="grid size-[30px] shrink-0 place-items-center rounded-full text-ink-icon shadow-[inset_0_0_0_1.5px_var(--line)]">
              <IconDatabase className="size-[15px]" strokeWidth={1.8} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] text-ink-2">
              {disk
                ? t.rich("navbar.storageUsed", {
                    size: formatStorageSize(disk.diskUsedGB),
                    b: (chunks) => <b className="mono font-semibold text-ink">{chunks}</b>,
                  })
                : "—"}
            </p>
            <p className={cn("truncate", level.text)}>{storageLine()}</p>
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

        {isAdmin && update?.updateAvailable && !update.applying && (
          <Link
            href="/settings"
            onClick={onNavigate}
            data-testid="sidebar-update"
            className="group flex h-[38px] min-w-0 items-center gap-[11px] rounded-[10px] bg-surface pl-[13px] pr-2 shadow-[0_0_0_1px_var(--line),0_1px_2px_rgba(14,32,54,.06)] transition-shadow duration-150 hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_45%,var(--line)),0_1px_2px_rgba(14,32,54,.06)]"
          >
            <span className="update-pulse relative size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{t("navbar.updateAvailable")}</span>
            <span className="mono shrink-0 rounded-full bg-primary-soft px-2 py-[3px] text-[11.5px] font-semibold text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-primary-foreground">
              {update.latestVersion}
            </span>
          </Link>
        )}

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
