"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isPublicPath } from "@/components/auth/paths/public-paths";
import { unauthenticatedOnlyPaths } from "@/components/auth/paths/unahthenticated-only-paths";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAuth } from "@/contexts/auth-context";
import { SETUP_PAGE, setupUrl } from "@/lib/two-factor-setup";

interface RedirectHandlerProps {
  children: React.ReactNode;
}

const homePaths = ["/"];

export function RedirectHandler({ children }: RedirectHandlerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  // Public pages (a share link, a secret) stay open; everything else waits for the set up.
  const mustSetUp =
    isAuthenticated === true &&
    user?.twoFactorSetupRequired === true &&
    !pathname.startsWith(SETUP_PAGE) &&
    !isPublicPath(pathname);

  useEffect(() => {
    if (mustSetUp) {
      router.replace(setupUrl(pathname + window.location.search));
      return;
    }
    if (isAuthenticated === true) {
      if (unauthenticatedOnlyPaths.some((path) => pathname.startsWith(path)) || homePaths.includes(pathname)) {
        router.replace("/dashboard");
        return;
      }
    } else if (isAuthenticated === false) {
      if (!isPublicPath(pathname) && !homePaths.includes(pathname)) {
        router.replace("/login");
        return;
      }
    }
  }, [isAuthenticated, mustSetUp, pathname, router]);

  if (isAuthenticated === null || mustSetUp) {
    return <LoadingScreen />;
  }

  if (
    isAuthenticated === true &&
    (unauthenticatedOnlyPaths.some((path) => pathname.startsWith(path)) || homePaths.includes(pathname))
  ) {
    return <LoadingScreen />;
  }

  if (isAuthenticated === false && !isPublicPath(pathname) && !homePaths.includes(pathname)) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
