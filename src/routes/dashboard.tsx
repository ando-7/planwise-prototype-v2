import { createFileRoute } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TaskBoard } from "@/components/dashboard/task-board";

const description = "Überblick über alle Aufgaben, Enddaten und Fortschritt.";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Planwise" },
      { name: "description", content: description },
      { property: "og:title", content: "Dashboard · Planwise" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <TaskBoard />
      </main>
    </div>
  );
}
