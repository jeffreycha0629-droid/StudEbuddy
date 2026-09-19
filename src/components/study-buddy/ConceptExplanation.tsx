"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { explainConcept } from "@/lib/actions/concept-explanation";
import { EXPLANATION_STYLES } from "@/lib/explanation-styles";
import { cn } from "@/lib/utils/cn";

export function ConceptExplanation() {
  const [concept, setConcept] = useState("");
  const [style, setStyle] = useState<string>("normal");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating) return;

    setError(null);
    setExplanation(null);

    if (!concept.trim()) {
      setError("Please enter a concept to explain.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await explainConcept(concept, style);

      if (result.error || !result.explanation) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      setExplanation(result.explanation);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card title="Concept Explanation">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-text-muted">
          Ask Claude to explain a concept, and pick how you&apos;d like it
          explained.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {error}
          </p>
        )}

        <FormField label="Concept" required>
          <Input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            disabled={isGenerating}
            placeholder="e.g. cellular respiration"
          />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Explanation style</span>
          <div className="flex flex-wrap gap-2">
            {EXPLANATION_STYLES.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStyle(option.value)}
                disabled={isGenerating}
                aria-pressed={style === option.value}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  style === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" isLoading={isGenerating} className="w-full sm:w-auto">
          Explain This
        </Button>
      </form>

      {explanation && (
        <div className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-surface-muted p-3 text-sm text-foreground">
          {explanation}
        </div>
      )}
    </Card>
  );
}
