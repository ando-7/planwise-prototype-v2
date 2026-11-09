import { describe, expect, it } from "vitest";
import {
  addContributor,
  applyProgress,
  DELETE_BLOCKED_MESSAGE,
  deleteBlockReason,
  latestSubtaskDueDate,
  removeContributor,
  selectableContributors,
  samplePeople,
  syncStatus,
  taskProgress,
  validateBooking,
  validatePlan,
  type Subtask,
  type Task,
} from "./tasks";

const subtask = (overrides: Partial<Subtask>): Subtask => ({
  id: "s",
  title: "s",
  duration: 1,
  dueDate: "2026-11-01",
  progress: 0,
  status: "offen",
  bookings: [],
  plans: [],
  ...overrides,
});

const task = (overrides: Partial<Task>): Task => ({
  ...subtask({ id: "t", dueDate: "2026-11-30" }),
  ownerId: "p1",
  contributorIds: [],
  subtasks: [],
  ...overrides,
});

describe("task rules", () => {
  it("uses the task's own progress when it has no subtasks", () => {
    expect(taskProgress({ progress: 80, subtasks: [] })).toBe(80);
  });

  it("averages subtask progress (rounded) when subtasks exist", () => {
    const subtasks = [subtask({ progress: 100 }), subtask({ progress: 100 }), subtask({ progress: 30 })];
    expect(taskProgress({ progress: 0, subtasks })).toBe(77);
  });

  it("finds the latest subtask end date", () => {
    const subtasks = [subtask({ dueDate: "2026-10-29" }), subtask({ dueDate: "2026-11-06" }), subtask({ dueDate: "2026-11-02" })];
    expect(latestSubtaskDueDate(subtasks)).toBe("2026-11-06");
    expect(latestSubtaskDueDate([])).toBeUndefined();
  });

  it("sets status to erledigt at 100 % progress", () => {
    expect(applyProgress({ progress: 40, status: "in-bearbeitung" as const }, 100)).toEqual({ progress: 100, status: "erledigt" });
  });

  it("marks a task with subtasks as erledigt once all subtasks are at 100 %, and reopens it otherwise", () => {
    const done = [subtask({ progress: 100, status: "erledigt" }), subtask({ progress: 100, status: "erledigt" })];
    expect(syncStatus(task({ status: "in-bearbeitung", subtasks: done })).status).toBe("erledigt");
    const open = [subtask({ progress: 100, status: "erledigt" }), subtask({ progress: 50, status: "in-bearbeitung" })];
    expect(syncStatus(task({ status: "erledigt", subtasks: open })).status).toBe("in-bearbeitung");
    expect(syncStatus(task({ status: "offen", subtasks: [] })).status).toBe("offen");
  });
});

describe("KR-1 delete protection", () => {
  it("blocks deleting a task with a booking", () => {
    const t = task({ bookings: [{ id: "b", personId: "p1", date: "2026-11-02", hours: 1 }] });
    expect(deleteBlockReason(t)).toBe(
      "Löschen nicht möglich: Für diese Aufgabe existieren bereits gebuchte oder geplante Zeiten.",
    );
  });

  it("blocks deleting a task whose subtask has planned time", () => {
    const t = task({ subtasks: [subtask({ plans: [{ id: "p", personId: "p1", date: "2026-11-02", hours: 2 }] })] });
    expect(deleteBlockReason(t)).toBe(DELETE_BLOCKED_MESSAGE);
  });

  it("allows deleting a task without any time", () => {
    expect(deleteBlockReason(task({ subtasks: [subtask({})] }))).toBeUndefined();
  });
});

describe("contributors (KR-7, KR-2)", () => {
  it("rejects the responsible person as contributor", () => {
    expect(addContributor(task({ ownerId: "p1" }), "p1").ok).toBe(false);
  });

  it("excludes the responsible person from the selectable list", () => {
    const ids = selectableContributors(samplePeople, task({ ownerId: "p1", contributorIds: ["p2"] })).map((p) => p.id);
    expect(ids).toEqual(["p3", "p4", "p5"]);
  });

  it("keeps bookings and hands open plans to the owner, flagged", () => {
    const t = task({
      ownerId: "p1",
      contributorIds: ["p2"],
      bookings: [{ id: "b", personId: "p2", date: "2026-11-02", hours: 3 }],
      subtasks: [subtask({ plans: [{ id: "x", personId: "p2", date: "2026-11-05", hours: 2 }] })],
    });
    const next = removeContributor(t, "p2");
    expect(next.contributorIds).toEqual([]);
    expect(next.bookings).toEqual(t.bookings);
    expect(next.subtasks[0]!.plans[0]).toMatchObject({ personId: "p1", needsReassignment: true, hours: 2 });
  });
});

describe("booking and plan validation (FA-ZM-1, FA-ZM-3)", () => {
  const ctx = { today: "2026-11-07", dueDate: "2026-11-30" };

  it("rejects a booking date in the future", () => {
    expect(validateBooking({ date: "2026-11-08", hours: 1 }, ctx).date).toBe(
      "Das Buchungsdatum darf nicht in der Zukunft liegen.",
    );
  });

  it("rejects 0 hours and accepts 1.5 hours", () => {
    expect(validateBooking({ date: "2026-11-07", hours: 0 }, ctx).hours).toBe("Die Stundenanzahl muss größer als 0 sein.");
    expect(validateBooking({ date: "2026-11-07", hours: 1.5 }, ctx)).toEqual({});
  });

  it("rejects planning after the task's end date", () => {
    expect(validatePlan({ date: "2026-11-09", hours: 2 }, { dueDate: "2026-11-06" }).date).toBeDefined();
    expect(validatePlan({ date: "2026-11-05", hours: 2 }, { dueDate: "2026-11-06" })).toEqual({});
  });
});
