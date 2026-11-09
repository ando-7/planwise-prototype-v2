import { createFileRoute, redirect } from "@tanstack/react-router";

// Same as the original app: the start page sends visitors straight to sign-in.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Planwise — Anmelden" },
      {
        name: "description",
        content: "Melde dich an oder erstelle ein Konto, um Aufgaben mit Planwise zu verwalten.",
      },
      { property: "og:title", content: "Planwise — Anmelden" },
      {
        property: "og:description",
        content: "Melde dich an oder erstelle ein Konto, um Aufgaben mit Planwise zu verwalten.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
