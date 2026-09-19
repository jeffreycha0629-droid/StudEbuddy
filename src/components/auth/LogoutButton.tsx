import { Button, type ButtonVariant } from "@/components/ui/Button";
import { signOut } from "@/lib/actions/auth";

export interface LogoutButtonProps {
  variant?: ButtonVariant;
  className?: string;
}

/**
 * A <form> bound to the signOut Server Action rather than a client-side
 * onClick handler. This works correctly whether it's rendered from a
 * Server Component (e.g. the Settings page) or a Client Component (e.g.
 * Sidebar), and degrades gracefully without JavaScript.
 */
export function LogoutButton({ variant = "secondary", className }: LogoutButtonProps) {
  return (
    <form action={signOut}>
      <Button type="submit" variant={variant} className={className}>
        Log Out
      </Button>
    </form>
  );
}
