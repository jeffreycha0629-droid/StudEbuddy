import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function MarketingHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
          StudEbuddy
        </Link>

        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="secondary">Log In</Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary">Sign Up</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
