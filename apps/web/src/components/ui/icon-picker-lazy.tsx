"use client";

import { ComponentType, useEffect, useState } from "react";
import dynamic from "next/dynamic";

type IconComponent = ComponentType<{ className?: string }>;
type IconPack = Record<string, unknown>;

// One chunk per react-icons pack, keyed by the name prefix (FaDiscord -> Fa). Two packs share Fa, Hi and Io.
const PACKS: Record<string, Array<() => Promise<IconPack>>> = {
  Ai: [() => import("react-icons/ai")],
  Bi: [() => import("react-icons/bi")],
  Bs: [() => import("react-icons/bs")],
  Cg: [() => import("react-icons/cg")],
  Ci: [() => import("react-icons/ci")],
  Di: [() => import("react-icons/di")],
  Fa: [() => import("react-icons/fa"), () => import("react-icons/fa6")],
  Fc: [() => import("react-icons/fc")],
  Fi: [() => import("react-icons/fi")],
  Gi: [() => import("react-icons/gi")],
  Go: [() => import("react-icons/go")],
  Gr: [() => import("react-icons/gr")],
  Hi: [() => import("react-icons/hi"), () => import("react-icons/hi2")],
  Im: [() => import("react-icons/im")],
  Io: [() => import("react-icons/io"), () => import("react-icons/io5")],
  Lia: [() => import("react-icons/lia")],
  Lu: [() => import("react-icons/lu")],
  Md: [() => import("react-icons/md")],
  Pi: [() => import("react-icons/pi")],
  Ri: [() => import("react-icons/ri")],
  Rx: [() => import("react-icons/rx")],
  Si: [() => import("react-icons/si")],
  Sl: [() => import("react-icons/sl")],
  Tb: [() => import("react-icons/tb")],
  Tfi: [() => import("react-icons/tfi")],
  Ti: [() => import("react-icons/ti")],
  Vsc: [() => import("react-icons/vsc")],
  Wi: [() => import("react-icons/wi")],
};

const FALLBACK_ICON = "FaCog";

/** Finds one icon by name, loading only the pack its prefix points to. */
export async function loadIcon(name: string): Promise<IconComponent | null> {
  const loaders = PACKS[/^[A-Z][a-z]+/.exec(name)?.[0] ?? ""] ?? [];

  for (const load of loaders) {
    const icon = (await load())[name];
    if (typeof icon === "function") return icon as IconComponent;
  }

  return null;
}

/** A sign-in provider's icon. Renders nothing until its pack has loaded; an unknown name shows a cog. */
export function ProviderIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const [loaded, setLoaded] = useState<{ name: string; Icon: IconComponent | null } | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadIcon(name)
      .then((Icon) => Icon ?? loadIcon(FALLBACK_ICON))
      .then((Icon) => !cancelled && setLoaded({ name, Icon }))
      .catch(() => !cancelled && setLoaded({ name, Icon: null }));

    return () => {
      cancelled = true;
    };
  }, [name]);

  const Icon = loaded?.name === name ? loaded.Icon : null;

  return Icon ? <Icon className={className} /> : null;
}

// The picker lists every react-icons pack (~11 MB), so it loads only when a provider form opens.
export const IconPicker = dynamic(() => import("@/components/ui/icon-picker").then((mod) => mod.IconPicker), {
  ssr: false,
});
