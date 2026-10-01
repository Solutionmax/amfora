"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { LoadingScreen } from "../layout/loading-screen";

type ProtectedRouteProps = {
  children: ReactNode;
  requireAdmin?: boolean;
};

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    if (isAuthenticated !== null) {
      setHasCheckedAuth(true);

      if (isAuthenticated === false) {
        router.replace("/login");
      } else if (requireAdmin && isAdmin === false) {
        router.replace("/dashboard");
      }
    }
  }, [isAuthenticated, isAdmin, requireAdmin, router]);

  if (!hasCheckedAuth || isAuthenticated === null || (requireAdmin && isAdmin === null)) {
    return <LoadingScreen />;
  }

  // On the way to /login or /dashboard: keep the quiet wait instead of a blank page.
  if (!isAuthenticated || (requireAdmin && !isAdmin)) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
