export const SESSION_STUDY_METHODS = [
  { value: "practice_problems", label: "Practice problems" },
  { value: "flashcards", label: "Flashcards" },
  { value: "explanations", label: "Reading explanations" },
  { value: "videos", label: "Watching videos" },
  { value: "diagrams", label: "Diagrams" },
  { value: "summarizing", label: "Summarizing" },
  { value: "teaching_concepts", label: "Teaching it to someone else" },
  { value: "practice_test", label: "Practice test" },
  { value: "review", label: "General review" },
  { value: "other", label: "Other" },
] as const;

export const MAX_TOPIC_LENGTH = 150;
export const MAX_OBJECTIVE_LENGTH = 300;
export const MAX_SESSION_DURATION_MINUTES = 480;
