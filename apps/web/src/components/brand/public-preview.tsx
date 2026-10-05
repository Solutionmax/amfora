"use client";

import { createContext, useContext } from "react";

import type { PublicTheme } from "@/components/brand/public-theme";

/**
 * Choices that are not saved yet, for the preview under Customization. Inside this context
 * a public page shows them instead of what the installation has stored. Outside it (every
 * real public page) the value is null and nothing changes.
 */
export interface PublicPreview {
  theme: PublicTheme;
  name: string;
  showCredit: boolean;
}

export const PublicPreviewContext = createContext<PublicPreview | null>(null);

export function usePublicPreview(): PublicPreview | null {
  return useContext(PublicPreviewContext);
}

/**
 * A public page is as tall as the screen. A preview sets --page-height on its box instead,
 * because inside a scaled box "the screen" is the wrong size.
 */
export const PAGE_MIN_HEIGHT = "min-h-[var(--page-height,100vh)]";
