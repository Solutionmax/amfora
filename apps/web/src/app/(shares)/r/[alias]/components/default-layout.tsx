"use client";

import type { DefaultLayoutProps } from "../types";
import { VesselLayout } from "./vessel-layout";

/** Legacy layout selections and error states share the public Amfora identity. */
export function DefaultLayout(props: DefaultLayoutProps) {
  return <VesselLayout {...props} />;
}
