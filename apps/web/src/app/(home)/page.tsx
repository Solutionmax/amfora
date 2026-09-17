"use client";

import { LoadingScreen } from "@/components/layout/loading-screen";
import { useHome } from "./hooks/use-home";

export default function HomePage() {
  useHome();
  return <LoadingScreen />;
}
