"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";

export type HomeRedirect = "/dashboard" | "/login";

export function getHomeRedirect(isAuthenticated: boolean | null): HomeRedirect | null {
  if (isAuthenticated === true) return "/dashboard";
  if (isAuthenticated === false) return "/login";
  return null;
}

export function useHome() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const destination = getHomeRedirect(isAuthenticated);
    if (destination) router.replace(destination);
  }, [isAuthenticated, router]);

  return { isLoading: isAuthenticated === null };
}
