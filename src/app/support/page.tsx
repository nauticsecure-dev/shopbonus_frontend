import { redirect } from "next/navigation";

/** Canonical consumer support lives at /app/support (notification deep links). */
export default function SupportAliasPage() {
  redirect("/app/support");
}
