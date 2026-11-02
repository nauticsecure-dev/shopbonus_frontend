"use client";
import { useRoleCopy } from "@/i18n/roleCopy";

import DashboardShell from "@/components/DashboardShell";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useLocale } from "@/i18n/LocaleContext";

export default function AdminNotificationsPage() {
  const c = useRoleCopy();
  const { dictionary: t } = useLocale();

  return (
    <DashboardShell admin>
      <NotificationCenter
        preferencesHref="/app/platform/notifications"
        title={t.notifications}
        subtitle={c("Platform_notifications_for_Super_Admins")}
      />
    </DashboardShell>
  );
}
