"use client";

import { useEffect, useState } from "react";

export interface GreetingProps {
  displayName: string | null;
}

function getTimeOfDayGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Computes the greeting on the client, from the browser's own clock,
 * rather than the server's - a server-rendered greeting would reflect
 * the server's timezone, which could easily disagree with the student's
 * actual local time (e.g. showing "Good evening" at 2 PM for them).
 *
 * Starts as null so the server and client render the same thing on first
 * paint (avoiding a hydration mismatch), then fills in the correct
 * greeting immediately after mount.
 */
export function Greeting({ displayName }: GreetingProps) {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(getTimeOfDayGreeting(new Date().getHours()));
  }, []);

  const name = displayName?.trim() || "there";

  return (
    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
      {greeting ?? "Hello"}, {name}
    </h1>
  );
}
