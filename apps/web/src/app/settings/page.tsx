"use client";

import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DefaultFooter } from "@/components/ui/default-footer";
import { SettingsForm } from "./components/settings-form";
import { SettingsHeader } from "./components/settings-header";
import { useSettings } from "./hooks/use-settings";

export default function SettingsPage() {
  const settings = useSettings();

  if (settings.isLoading) {
    return <LoadingScreen />;
  }

  if (settings.isUnauthorized) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="w-full h-screen flex flex-col">
          <Navbar />
          <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
            <div className="flex flex-col gap-8 items-center justify-center min-h-[50vh]">
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
          </div>
          <DefaultFooter />
        </div>
      </ProtectedRoute>
    );
  }

  if (settings.error && !settings.isUnauthorized) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="w-full h-screen flex flex-col">
          <Navbar />
          <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
            <div className="flex flex-col gap-8 items-center justify-center min-h-[50vh]">
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
          </div>
          <DefaultFooter />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="w-full h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
          <div className="flex flex-col gap-8">
            <SettingsHeader />
            <SettingsForm
              collapsedGroups={settings.collapsedGroups}
              groupForms={settings.groupForms}
              groupedConfigs={settings.groupedConfigs}
              onGroupSubmit={settings.onGroupSubmit}
              onToggleCollapse={settings.toggleCollapse}
            />
          </div>
        </div>
        <DefaultFooter />
      </div>
    </ProtectedRoute>
  );
}
