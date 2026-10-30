"use client";

import DashboardShell from "@/components/DashboardShell";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useLocale } from "@/i18n/LocaleContext";

export default function AdminNotificationsPage() {
  const { dictionary: t } = useLocale();

  return (
    <DashboardShell admin>
      <NotificationCenter
        preferencesHref="/app/platform/notifications"
        title={t.notifications}
        subtitle="Platformmeldingen voor Super Admins."
      />
    </DashboardShell>
  );
}
