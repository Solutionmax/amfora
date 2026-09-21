"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingScreen } from "@/components/layout/loading-screen";
import { useAuth } from "@/contexts/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated === true) router.replace("/dashboard");
    if (isAuthenticated === false) router.replace("/login");
  }, [isAuthenticated, router]);

  return <LoadingScreen />;
}
