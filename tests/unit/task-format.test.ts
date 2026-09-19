import { describe, expect, it } from "vitest";
import { difficultyLabel, subjectName, taskTypeLabel } from "@/lib/task-format";
import { sessionMethodLabel } from "@/lib/session-format";
import type { Subject } from "@/types/database";

const subjects: Subject[] = [
  { id: "s1", user_id: "u1", name: "Biology", created_at: "", updated_at: "" },
  { id: "s2", user_id: "u1", name: "Algebra II", created_at: "", updated_at: "" },
];

describe("subjectName", () => {
  it("returns the matching subject's name", () => {
    expect(subjectName(subjects, "s1")).toBe("Biology");
  });

  it("returns null when subjectId is null", () => {
    expect(subjectName(subjects, null)).toBeNull();
  });

  it("returns null when no subject matches the id", () => {
    expect(subjectName(subjects, "does-not-exist")).toBeNull();
  });
});

describe("taskTypeLabel", () => {
  it("returns the human-readable label for a known task type", () => {
    expect(taskTypeLabel("homework")).toBe("Homework");
    expect(taskTypeLabel("exam")).toBe("Exam");
  });

  it("falls back to the raw value for an unrecognized type", () => {
    expect(taskTypeLabel("something-new")).toBe("something-new");
  });
});

describe("difficultyLabel", () => {
  it("returns the human-readable label for a known difficulty", () => {
    expect(difficultyLabel("easy")).toBe("Easy");
    expect(difficultyLabel("hard")).toBe("Hard");
  });

  it("returns null for a null difficulty", () => {
    expect(difficultyLabel(null)).toBeNull();
  });

  it("falls back to the raw value for an unrecognized difficulty", () => {
    expect(difficultyLabel("extreme")).toBe("extreme");
  });
});

describe("sessionMethodLabel", () => {
  it("returns the human-readable label for a known study method", () => {
    expect(sessionMethodLabel("flashcards")).toBe("Flashcards");
    expect(sessionMethodLabel("practice_test")).toBe("Practice test");
  });

  it("returns null for a null method", () => {
    expect(sessionMethodLabel(null)).toBeNull();
  });

  it("falls back to the raw value for an unrecognized method", () => {
    expect(sessionMethodLabel("interpretive_dance")).toBe("interpretive_dance");
  });
});
