export const TASK_TYPES = [
  { value: "homework", label: "Homework" },
  { value: "quiz", label: "Quiz" },
  { value: "test", label: "Test" },
  { value: "exam", label: "Exam" },
  { value: "essay", label: "Essay" },
  { value: "project", label: "Project" },
  { value: "presentation", label: "Presentation" },
  { value: "reading", label: "Reading" },
  { value: "other", label: "Other" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

export const MAX_TITLE_LENGTH = 150;
export const MAX_NOTES_LENGTH = 2000;
export const MAX_ESTIMATED_MINUTES = 600;
