import { cookies, headers } from "next/headers";
import { normalizeLocale } from "@/types/locale";

export async function requestLocale() {
  const stored = (await cookies()).get("shopbonus-locale")?.value;
  return normalizeLocale(stored ?? (await headers()).get("accept-language")?.split(",")[0], "nl");
}
