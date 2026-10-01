"use client";

import { Suspense } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { ReverseSharesView } from "./components/reverse-shares-view";

export default function ReverseSharesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <ReverseSharesView />
      </Suspense>
    </ProtectedRoute>
  );
}
