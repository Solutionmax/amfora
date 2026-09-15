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
import { Amphora } from "@/components/brand/amphora";
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
    { href: "/customization", label: t("customization.pageTitle"), icon: IconPalette },
    ...(isAdmin
      ? [
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
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
        )}
      >
        <entry.icon className="size-[18px]" aria-hidden="true" />
        {entry.label}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col gap-6 border-r bg-secondary/60 p-4">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 px-2 pt-2">
        {appLogo ? (
          <img alt="" className="h-8 w-8 rounded object-contain" src={appLogo} />
        ) : (
          <Amphora className="h-8 w-8 text-primary" />
        )}
        <span className="font-display text-xl font-bold tracking-tight">{appName}</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {main.map(item)}
        <span className="mt-6 px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t("navbar.settings")}
        </span>
        {manage.map(item)}
      </nav>

      <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
        <Amphora className="h-14 w-14 shrink-0 text-primary" fill={used} />
        <div className="min-w-0 font-mono text-xs leading-relaxed">
          <p className="text-foreground">{disk ? formatStorageSize(disk.diskUsedGB) : "--"}</p>
          <p className="text-muted-foreground">
            {t("storageUsage.total")}: {disk ? formatStorageSize(disk.diskSizeGB) : "--"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={user?.image as string | undefined} />
          <AvatarFallback>{user?.firstName?.[0]}</AvatarFallback>
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

      <div className="flex items-center gap-1 border-t pt-3">
        <LanguageSwitcher />
        <ModeToggle />
      </div>
    </div>
  );
}
