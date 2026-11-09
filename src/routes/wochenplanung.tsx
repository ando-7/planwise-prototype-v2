import { createFileRoute } from "@tanstack/react-router";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WeekPlanner } from "@/components/planning/week-planner";

const title = "Wochenplanung · Planwise";
const description = "Geplante Arbeitsstunden je Person und Aufgabe für eine Kalenderwoche, Montag bis Freitag.";

export const Route = createFileRoute("/wochenplanung")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WeekPlanningPage,
});

function WeekPlanningPage() {
  return (
    <div className="min-h-svh bg-background">
      <DashboardHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
        <WeekPlanner />
      </main>
    </div>
  );
}
