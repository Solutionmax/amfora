"use client";

import { ComponentType, createElement, ReactElement, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { IconChevronDown } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { BUILTIN_ICONS, IconNode } from "./builtin-icons";

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

const drawNode = (node: IconNode, key: number): ReactElement =>
  createElement(node.tag, { key, ...node.attr }, node.child?.map(drawNode));

/** An icon that ships with the app, drawn the way react-icons draws it. */
function BuiltinIcon({ icon, className }: { icon: IconNode; className: string }) {
  return (
    <svg
      {...icon.attr}
      className={className}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0"
      height="1em"
      width="1em"
      aria-hidden="true"
    >
      {icon.child?.map(drawNode)}
    </svg>
  );
}

/**
 * A sign-in provider's icon. The default providers' icons ship with the app; any other name loads its
 * pack and renders nothing until that is in. An unknown name shows a cog.
 */
export function ProviderIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const builtin = BUILTIN_ICONS[name];
  const [loaded, setLoaded] = useState<{ name: string; Icon: IconComponent | null } | null>(null);

  useEffect(() => {
    if (builtin) return;
    let cancelled = false;

    loadIcon(name)
      .then((Icon) => !cancelled && setLoaded({ name, Icon }))
      .catch(() => !cancelled && setLoaded({ name, Icon: null }));

    return () => {
      cancelled = true;
    };
  }, [name, builtin]);

  if (builtin) return <BuiltinIcon icon={builtin} className={className} />;
  if (loaded?.name !== name) return null;

  const Icon = loaded.Icon;

  return Icon ? (
    <Icon className={className} />
  ) : (
    <BuiltinIcon icon={BUILTIN_ICONS[FALLBACK_ICON]} className={className} />
  );
}

function PickerLoading() {
  const t = useTranslations();

  return (
    <p role="status" className="mt-1.5 text-[12.5px] text-ink-3">
      {t("iconPicker.loading")}
    </p>
  );
}

// The dialog lists every react-icons pack (about 13 MB of script), so it loads when the field is
// pressed and not with the form the field sits in.
const IconPickerDialog = dynamic(() => import("@/components/ui/icon-picker").then((mod) => mod.IconPickerDialog), {
  ssr: false,
  loading: PickerLoading,
});

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  placeholder?: string;
}

/** The icon field of a provider form: shows the chosen icon, opens the picker when pressed. */
export function IconPicker({ value, onChange, placeholder }: IconPickerProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isWanted, setIsWanted] = useState(false);

  const openPicker = () => {
    setIsWanted(true);
    setIsOpen(true);
  };

  return (
    <>
      <Button type="button" variant="outline" className="w-full justify-between" onClick={openPicker}>
        <span className="flex min-w-0 items-center gap-2">
          {value ? (
            <>
              <ProviderIcon name={value} className="size-[18px] shrink-0" />
              <span className="truncate text-sm">{value}</span>
            </>
          ) : (
            <span className="text-ink-3">{placeholder || t("iconPicker.placeholder")}</span>
          )}
        </span>
        <IconChevronDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
      </Button>
      {isWanted && <IconPickerDialog open={isOpen} onOpenChange={setIsOpen} onChange={onChange} />}
    </>
  );
}
