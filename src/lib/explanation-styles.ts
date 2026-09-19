/**
 * UI-facing explanation style options. The `value`s here must exactly
 * match the keys in the private EXPLANATION_STYLE_GUIDANCE map in
 * src/lib/actions/concept-explanation.ts - that map holds the actual
 * prompt guidance text sent to Claude (server-only), while this file
 * holds just the values/labels the client needs to render the picker.
 */
export const EXPLANATION_STYLES = [
  { value: "simple", label: "Simple" },
  { value: "normal", label: "Normal" },
  { value: "detailed", label: "Detailed" },
  { value: "example", label: "Example" },
  { value: "analogy", label: "Analogy" },
] as const;
