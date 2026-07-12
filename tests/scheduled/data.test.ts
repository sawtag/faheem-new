import { describe, expect, it } from "vitest";
import {
  ScheduledTaskSchema,
  loadScheduledTasks,
} from "@/app/(app)/scheduled/data";

describe("scheduled tasks loader", () => {
  it("validates data/scheduled-tasks.json against the zod-lite schema (3 seeded tasks)", () => {
    const tasks = loadScheduledTasks();
    expect(tasks.map((t) => t.id)).toEqual([
      "jahez-kpi-digest",
      "quick-commerce-news-sweep",
      "portfolio-concentration-check",
    ]);
  });

  it("every seeded task ships enabled by default (cosmetic, on)", () => {
    for (const task of loadScheduledTasks()) {
      expect(task.enabled).toBe(true);
    }
  });

  it("nextRun is a pre-formatted display string, not a computed date", () => {
    for (const task of loadScheduledTasks()) {
      expect(task.nextRun.en).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{2}:\d{2}$/);
    }
  });

  it("rejects a malformed task payload", () => {
    const result = ScheduledTaskSchema.array().safeParse([
      { id: "x", icon: "mail" }, // missing name/cadence/schedule/destination/nextRun/enabled
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects a task missing an Arabic localization", () => {
    const result = ScheduledTaskSchema.safeParse({
      id: "x",
      icon: "mail",
      name: { en: "X" },
      cadence: { en: "Weekly", ar: "أسبوعي" },
      schedule: { en: "Every Monday", ar: "كل إثنين" },
      destination: { en: "Risk", ar: "المخاطر" },
      nextRun: { en: "Jul 14, 07:00", ar: "14 يوليو، 07:00" },
      enabled: true,
    });
    expect(result.success).toBe(false);
  });
});
