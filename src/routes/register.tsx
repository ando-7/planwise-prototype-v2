import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

const description = "Erstelle ein Planwise-Konto und plane Aufgaben und Zeiten deines Teams.";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Konto erstellen — Planwise" },
      { name: "description", content: description },
      { property: "og:title", content: "Konto erstellen — Planwise" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <AuthShell>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
