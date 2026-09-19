"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EditSessionForm } from "@/components/study-plan/EditSessionForm";
import { deleteStudySession } from "@/lib/actions/study-plans";
import { sessionMethodLabel } from "@/lib/session-format";
import type { StudySession } from "@/types/database";

export interface SessionListProps {
  sessions: StudySession[];
  onSessionUpdated: (session: StudySession) => void;
  onSessionRemoved: (sessionId: string) => void;
}

export function SessionList({ sessions, onSessionUpdated, onSessionRemoved }: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function startEdit(id: string) {
    setDeletingId(null);
    setDeleteError(null);
    setEditingId(id);
  }

  function startDelete(id: string) {
    setEditingId(null);
    setDeleteError(null);
    setDeletingId(id);
  }

  async function confirmDelete(id: string) {
    if (isDeleting) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await deleteStudySession(id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      onSessionRemoved(id);
      setDeletingId(null);
    } catch {
      setDeleteError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No study sessions yet. Add one below to start building this plan.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((session) => (
        <li key={session.id} className="rounded-md border border-border p-3">
          {editingId === session.id ? (
            <EditSessionForm
              session={session}
              onSaved={(updated) => {
                onSessionUpdated(updated);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : deletingId === session.id ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-foreground">
                Remove &ldquo;{session.title}&rdquo;? This can&apos;t be undone.
              </p>
              {deleteError && (
                <p
                  role="alert"
                  className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
                >
                  {deleteError}
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 sm:flex-none"
                  isLoading={isDeleting}
                  onClick={() => confirmDelete(session.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">{session.title}</p>
              <p className="text-xs text-text-muted">
                {session.scheduled_date}
                {session.scheduled_start ? ` at ${session.scheduled_start.slice(0, 5)}` : ""}
                {" • "}
                {session.planned_duration_minutes} min
                {sessionMethodLabel(session.study_method) ? ` • ${sessionMethodLabel(session.study_method)}` : ""}
              </p>
              {session.objective && (
                <p className="mt-1 text-xs text-text-muted">{session.objective}</p>
              )}
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="secondary" onClick={() => startEdit(session.id)}>
                  Edit
                </Button>
                <Button type="button" variant="secondary" onClick={() => startDelete(session.id)}>
                  Remove
                </Button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
