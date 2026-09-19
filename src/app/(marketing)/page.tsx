import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-start gap-6 py-10">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground">
        Know what to study, when to study, and how.
      </h1>
      <p className="max-w-xl text-base text-text-muted">
        StudEbuddy is an AI-powered study companion that helps students turn a
        pile of assignments into a realistic, personalized study plan.
      </p>
      <div className="flex gap-3">
        <Link href="/signup">
          <Button variant="primary">Get Started</Button>
        </Link>
        <Link href="/login">
          <Button variant="secondary">Log In</Button>
        </Link>
      </div>
    </div>
  );
}
