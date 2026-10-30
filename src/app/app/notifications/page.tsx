"use client";

import NotificationCenter from "@/components/notifications/NotificationCenter";
import { useLocale } from "@/i18n/LocaleContext";

export default function ConsumerNotificationsPage() {
  const { dictionary: t } = useLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <NotificationCenter
        preferencesHref="/profiel#notifications"
        title={t.notifications}
        subtitle={t.notificationsStayInformedHint}
      />
    </div>
  );
}
