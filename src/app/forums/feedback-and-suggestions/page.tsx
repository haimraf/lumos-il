import { redirect } from "next/navigation";

export default function LegacyFeedbackRoute() {
  redirect("/contact?topic=forum");
}
