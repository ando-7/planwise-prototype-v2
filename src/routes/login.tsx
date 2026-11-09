import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

const description = "Melde dich an, um zu deinen Aufgaben in Planwise zu gelangen.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Anmelden — Planwise" },
      { name: "description", content: description },
      { property: "og:title", content: "Anmelden — Planwise" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthShell>
      <AuthForm mode="login" />
    </AuthShell>
  );
}
