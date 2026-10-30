import { redirect } from "next/navigation";

export default function VerifyEmailRedirectPage() {
  redirect("/account?verify=1");
}
