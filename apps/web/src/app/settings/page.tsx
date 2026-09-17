"use client";

import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FileManagerLayout } from "@/components/layout/file-manager-layout";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./components/settings-form";
import { useSettings } from "./hooks/use-settings";

export default function SettingsPage() {
  const t = useTranslations();
  const settings = useSettings();

  if (settings.isLoading) {
    return <LoadingScreen />;
  }

  if (settings.isUnauthorized) {
    return (
      <ProtectedRoute requireAdmin>
        <FileManagerLayout title={t("settings.pageTitle")}>
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-8">
            <Card className="max-w-md border-destructive/50 bg-destructive/10">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <IconAlertTriangle className="h-5 w-5" />
                  Access Denied
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  {settings.error || "You don't have administrator privileges to access this page."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <IconRefresh className="h-4 w-4" />
                  Refresh Page
                </Button>
              </CardContent>
            </Card>
          </div>
        </FileManagerLayout>
      </ProtectedRoute>
    );
  }

  if (settings.error && !settings.isUnauthorized) {
    return (
      <ProtectedRoute requireAdmin>
        <FileManagerLayout title={t("settings.pageTitle")}>
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-8">
            <Card className="max-w-md border-destructive/50 bg-destructive/10">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <IconAlertTriangle className="h-5 w-5" />
                  Error Loading Settings
                </CardTitle>
                <CardDescription className="text-destructive/80">{settings.error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="w-full flex items-center gap-2"
                >
                  <IconRefresh className="h-4 w-4" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </FileManagerLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <FileManagerLayout title={t("settings.pageTitle")}>
        <div className="w-full">
          <SettingsForm
            groupForms={settings.groupForms}
            groupedConfigs={settings.groupedConfigs}
            onGroupSubmit={settings.onGroupSubmit}
          />
        </div>
      </FileManagerLayout>
    </ProtectedRoute>
  );
}
