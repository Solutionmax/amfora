"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconDownload,
  IconFolder,
  IconLayoutDashboard,
  IconLogout,
  IconPalette,
  IconSettings,
  IconShare,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { formatStorageSize } from "@/app/dashboard/utils/format-storage-size";
import { AmphoraMark } from "@/components/brand/amphora-mark";
import { LanguageSwitcher } from "@/components/general/language-switcher";
import { ModeToggle } from "@/components/general/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppInfo } from "@/contexts/app-info-context";
import { useAuth } from "@/contexts/auth-context";
import { getDiskSpace, logout as logoutAPI } from "@/http/endpoints";
import { cn } from "@/lib/utils";

type DiskSpace = { diskSizeGB: number; diskUsedGB: number; diskAvailableGB: number };

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, logout } = useAuth();
  const { appName, appLogo } = useAppInfo();
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

  const main = [
    { href: "/dashboard", label: t("dashboard.pageTitle"), icon: IconLayoutDashboard },
    { href: "/files", label: t("files.pageTitle"), icon: IconFolder },
    { href: "/shares", label: t("shares.pageTitle"), icon: IconShare },
    { href: "/reverse-shares", label: t("reverseShares.pageTitle"), icon: IconDownload },
  ];

  const manage = [
    ...(isAdmin
      ? [
          { href: "/customization", label: t("customization.pageTitle"), icon: IconPalette },
          { href: "/settings", label: t("settings.pageTitle"), icon: IconSettings },
          { href: "/users-management", label: t("navbar.usersManagement"), icon: IconUsers },
        ]
      : []),
    { href: "/profile", label: t("navbar.profile"), icon: IconUser },
  ];

  const used = disk ? Math.min(disk.diskUsedGB / Math.max(disk.diskSizeGB, 1), 1) : 0;

  const item = (entry: { href: string; label: string; icon: typeof IconFolder }) => {
    const active = pathname === entry.href || pathname.startsWith(`${entry.href}/`);
    return (
      <Link
        key={entry.href}
        href={entry.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
          active
            ? "bg-primary/8 text-primary ring-1 ring-primary/10"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <entry.icon className="size-[18px]" aria-hidden="true" />
        {entry.label}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col border-r border-sidebar-border bg-sidebar px-4">
      <Link href="/dashboard" onClick={onNavigate} className="flex min-h-20 min-w-0 shrink-0 items-center gap-3 px-3">
        {appLogo ? (
          <img alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" src={appLogo} />
        ) : (
          <AmphoraMark className="h-8 w-8 shrink-0 text-primary" />
        )}
        <span className="truncate font-display text-[22px] font-bold tracking-tight">{appName}</span>
      </Link>

      <nav aria-label={appName} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-5">
        {main.map(item)}
        <span className="mt-8 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("navbar.settings")}
        </span>
        {manage.map(item)}
      </nav>

      <div className="mb-5 shrink-0 rounded-xl border border-border/70 bg-background/70 p-4">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">{t("storageUsage.total")}</span>
          <span className="font-mono text-[11px]">{disk ? formatStorageSize(disk.diskSizeGB) : "—"}</span>
        </div>
        <div
          role="progressbar"
          aria-label={t("storageUsage.total")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={disk ? Math.round(used * 100) : undefined}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${used * 100}%` }} />
        </div>
        <p className="mt-2.5 font-mono text-[11px] text-muted-foreground">
          {disk ? formatStorageSize(disk.diskUsedGB) : "—"} / {disk ? formatStorageSize(disk.diskSizeGB) : "—"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5 border-t py-4">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user?.image as string | undefined} />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {user?.firstName?.[0]}
            {user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label={t("navbar.logout")}>
          <IconLogout className="size-[18px]" />
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-1 border-t py-2.5">
        <LanguageSwitcher />
        <ModeToggle />
      </div>
    </div>
  );
}
