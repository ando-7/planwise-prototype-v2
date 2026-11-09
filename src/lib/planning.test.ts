import { describe, expect, it } from "vitest";
import { isoWeekNumber, weekPlanGroups, weekStart, workWeek } from "./planning";
import { samplePeople, type Task } from "./tasks";

describe("week planning", () => {
  it("starts the week on Monday, also from a Saturday", () => {
    expect(weekStart("2026-11-07")).toBe("2026-11-02");
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
  });

  it("covers Monday to Friday and the ISO week number", () => {
    expect(workWeek("2026-11-02")).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
    expect(isoWeekNumber("2026-11-02")).toBe(45);
  });

  it("sums planned hours per day and per week, per person", () => {
    const task: Task = {
      id: "t",
      title: "Aufgabe",
      duration: 10,
      dueDate: "2026-11-30",
      progress: 0,
      status: "offen",
      ownerId: "p1",
      contributorIds: ["p2"],
      bookings: [],
      plans: [
        { id: "a", personId: "p1", date: "2026-11-02", hours: 2 },
        { id: "b", personId: "p1", date: "2026-11-04", hours: 1.5 },
        { id: "c", personId: "p2", date: "2026-11-04", hours: 3 },
        { id: "d", personId: "p1", date: "2026-11-09", hours: 8 },
      ],
      subtasks: [],
    };
    const groups = weekPlanGroups([task], samplePeople, workWeek("2026-11-02"), "person");
    expect(groups.map((g) => [g.key, g.total])).toEqual([
      ["p1", 3.5],
      ["p2", 3],
    ]);
    expect(groups[0]!.dayTotals).toEqual([2, 0, 1.5, 0, 0]);
  });
});
