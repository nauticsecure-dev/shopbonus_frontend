import { apiRequest, apiUpload, ensureCsrfCookie } from "@/lib/api";
import type { Locale } from "@/types/locale";

export type EmailVerificationStatus = "verified" | "pending" | "required";

export interface ConsumerNotifications {
  vouchers_discounts: boolean;
  reminders: boolean;
  offers_inspiration: boolean;
}

export interface ConsumerProfile {
  id: string;
  first_name: string;
  email: string;
  email_verification: EmailVerificationStatus;
  pending_email: string | null;
  phone: string | null;
  locale: string;
  avatar_url: string | null;
  security: {
    email_verified: boolean;
    two_factor: "enabled" | "disabled" | string;
  };
  notifications: ConsumerNotifications;
}

export interface ConsumerPreferences {
  notifications: ConsumerNotifications;
  categories: string[];
  mandatory_mail: string;
}

type Data<T> = { data: T };

export async function fetchConsumerProfile(locale?: Locale): Promise<ConsumerProfile> {
  const res = await apiRequest<Data<ConsumerProfile>>({
    path: "/api/v1/consumer/profile",
    locale,
  });
  return res.data;
}

export async function updateConsumerProfile(
  patch: { first_name?: string; phone?: string | null; locale?: Locale },
  locale?: Locale
): Promise<ConsumerProfile> {
  const res = await apiRequest<Data<ConsumerProfile>>({
    path: "/api/v1/consumer/profile",
    method: "PATCH",
    locale,
    body: patch,
  });
  return res.data;
}

export async function uploadAvatar(file: File, locale?: Locale): Promise<ConsumerProfile> {
  const formData = new FormData();
  formData.append("avatar", file);
  const res = await apiUpload<Data<ConsumerProfile>>({
    path: "/api/v1/consumer/profile/avatar",
    locale,
    formData,
  });
  return res.data;
}

export async function deleteAvatar(locale?: Locale): Promise<ConsumerProfile> {
  const res = await apiRequest<Data<ConsumerProfile>>({
    path: "/api/v1/consumer/profile/avatar",
    method: "DELETE",
    locale,
  });
  return res.data;
}

export async function requestEmailChange(
  email: string,
  currentPassword: string,
  locale?: Locale
): Promise<{ pending_email: string; expires_at: string; message: string }> {
  const res = await apiRequest<Data<{ pending_email: string; expires_at: string; message: string }>>({
    path: "/api/v1/consumer/email-change",
    method: "POST",
    locale,
    body: { email, current_password: currentPassword },
  });
  return res.data;
}

export async function confirmEmailChange(code: string, locale?: Locale): Promise<{ email: string; email_verification: string }> {
  const res = await apiRequest<Data<{ email: string; email_verification: string }>>({
    path: "/api/v1/consumer/email-change/confirm",
    method: "POST",
    locale,
    body: { code },
  });
  return res.data;
}

export async function cancelEmailChange(locale?: Locale): Promise<void> {
  await apiRequest({
    path: "/api/v1/consumer/email-change",
    method: "DELETE",
    locale,
  });
}

export async function fetchPreferences(locale?: Locale): Promise<ConsumerPreferences> {
  const res = await apiRequest<Data<ConsumerPreferences>>({
    path: "/api/v1/consumer/preferences",
    locale,
  });
  return res.data;
}

export async function updateNotificationPreferences(
  notifications: Partial<ConsumerNotifications>,
  locale?: Locale
): Promise<ConsumerPreferences> {
  const res = await apiRequest<Data<ConsumerPreferences>>({
    path: "/api/v1/consumer/preferences",
    method: "PUT",
    locale,
    body: { notifications },
  });
  return res.data;
}

/** Fortify session route — not under /api/v1. */
export async function changePassword(
  currentPassword: string,
  password: string,
  locale?: Locale
): Promise<void> {
  await ensureCsrfCookie();
  await apiRequest({
    path: "/user/password",
    method: "PUT",
    locale,
    body: {
      current_password: currentPassword,
      password,
      password_confirmation: password,
    },
  });
}

export async function requestAccountDeletion(
  currentPassword: string,
  locale?: Locale
): Promise<{ status: string; type: string }> {
  const res = await apiRequest<Data<{ status: string; type: string }>>({
    path: "/api/v1/consumer/privacy/deletion-request",
    method: "POST",
    locale,
    body: { current_password: currentPassword, confirm: true },
  });
  return res.data;
}

export async function downloadPrivacyExport(locale?: Locale): Promise<Blob> {
  await ensureCsrfCookie();
  const { apiUrl, env } = await import("@/config/env");
  const { normalizeLocale, DEFAULT_LOCALE } = await import("@/types/locale");
  const resolvedLocale = normalizeLocale(locale, DEFAULT_LOCALE);

  function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  const xsrf = env.useCookieAuth ? readCookie("XSRF-TOKEN") : null;
  const response = await fetch(apiUrl("/api/v1/consumer/privacy/export"), {
    method: "GET",
    credentials: env.useCookieAuth ? "include" : "same-origin",
    headers: {
      Accept: "application/json",
      "Accept-Language": resolvedLocale,
      ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Export failed (${response.status})`);
  }
  return response.blob();
}
