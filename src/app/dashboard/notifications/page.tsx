"use client";

import DashboardShell from "@/components/DashboardShell";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useLocale } from "@/i18n/LocaleContext";

export default function DashboardNotificationsPage() {
  const { dictionary: t } = useLocale();

  return (
    <DashboardShell>
      <NotificationCenter
        preferencesHref="/dashboard/settings#notifications"
        title={t.notifications}
        subtitle={t.notificationsStayInformedHint}
      />
    </DashboardShell>
  );
}
