# DESIGN_SYSTEM.md

StudEbuddy's design system. Sections are numbered and referenced by number
from code comments (e.g. "DESIGN_SYSTEM.md section 9") — numbers are stable
once assigned.

## 1. Principles

Desktop-first, responsive, accessible by default, and honest about what's
built (section 13). Simple over clever: no icon library, no animation
library, no component-library dependency — see `PROJECT_RULES.md` rule 32.

## 2. Layout

Desktop-first responsive web app. The authenticated shell (`(app)` route
group) is a fixed sidebar + content area on desktop, collapsing to a top
header + bottom tab bar on mobile (section 11). Marketing pages and
onboarding use their own simpler shells with no sidebar.

## 3. Typography

System font stack (`ui-sans-serif, system-ui, -apple-system, "Segoe UI",
Roboto, Helvetica, Arial, sans-serif` — see `globals.css`), no webfont
loading. Page titles: `text-2xl font-semibold tracking-tight`. Section/card
titles: `text-base font-semibold`. Body text: `text-sm`. Muted/secondary
text: `text-sm text-text-muted`.

## 4. Color

Until a final StudEbuddy brand palette is confirmed, the app uses a neutral,
accessible default palette, defined once as CSS variables in
`src/app/globals.css` and exposed to Tailwind as semantic tokens in
`tailwind.config.ts` (`background`, `foreground`, `surface`,
`surface-muted`, `primary` (+ `hover`/`foreground`), `secondary`, `accent`,
`success`, `warning`, `error`, `border`, `text-muted`).

**Never hardcode a raw color value in a component.** Always use a semantic
token (`bg-primary`, `text-error`, `border-border`, etc.) so the whole app
can be re-themed by changing `globals.css` alone. When the real brand
palette is set, update the CSS variables there and note the change in this
section — component code should need zero changes.

## 5. Spacing & radius

Tailwind's default spacing scale. Border radius is semantic, not ad hoc:
`sm` (0.375rem) for small controls, `md` (0.5rem) for buttons, `lg`
(0.875rem) for cards, `xl` (1.25rem) reserved for modals (none exist yet).

## 6. Iconography

None yet. Where an icon would normally go (e.g. show/hide password), use a
clear text label instead (see `PasswordInput.tsx`) rather than adding an
icon library for one or two icons.

## 7. Elevation

Cards use a subtle `shadow-sm` and a 1px border — no deeper shadow scale
exists yet. Avoid nesting a `Card` inside another `Card` (section 10).

## 8. Buttons

Every button (`src/components/ui/Button.tsx`) must have: a clear text label
(no icon-only buttons), a loading state (spinner + `aria-busy`), a disabled
state, a hover state, a visible keyboard focus ring
(`focus-visible:ring-2 focus-visible:ring-primary`), and a minimum 44×44px
touch target (`min-h-[44px]`). Three variants: `primary` (main action per
view), `secondary` (everything else), `destructive` (delete/remove
confirmations only).

## 9. Forms

Every field needs a **visible label** — never rely on placeholder text as a
substitute for a label. Use `FormField` to wrap a labeled control with
optional hint text and a validation error message, correctly wired via
`aria-describedby`/`aria-required`/`aria-invalid`. Any input-like component
used inside `FormField` (`Input`, `Select`, `Textarea`, `PasswordInput`)
must accept and apply a `hasError` prop the same way, since `FormField`
clones that prop onto its single child.

## 10. Cards

`Card` (`src/components/ui/Card.tsx`) is the base content container: a clear
optional title, optional header actions, consistent padding, and concise
content. Don't nest a `Card` inside another `Card`; use plain `div`s with
borders for sub-sections instead if needed.

## 11. Navigation

- **Desktop:** a persistent sidebar (`Sidebar.tsx`) with the app name,
  primary nav, and logout, always indicating the active page
  (`aria-current="page"`).
- **Mobile:** a fixed bottom bar (`MobileNav.tsx`) with the same items,
  horizontally scrollable if it doesn't fit — a compact pattern that keeps
  every core area one tap away, rather than a hidden hamburger menu.
- **Nav items** (`src/lib/nav-items.ts`): Dashboard, Study Plan, Calendar,
  Study Buddy, Progress, Profile/Settings (one nav entry mapped to two real
  routes, `/profile` and `/settings`).
- Logout is deliberately outside the "Primary" nav landmark — it's an
  action, not a page.

## 12. Dashboard layout

The dashboard renders its widgets as a **vertical priority stack, not a
grid**: Today's Plan, then Daily Check-In, then Upcoming Deadlines, then
Progress, in that order. This is a specified priority order (most
actionable first), not just a space-efficient arrangement — don't reorder
it for layout convenience alone.

## 13. Empty and unbuilt states

Two distinct cases, and they must look different:

- **A real feature with no data yet** gets a specific, helpful empty state
  ("No tasks yet. Add your first task above to start building your study
  plan.") — never a bare "No data."
- **A feature that hasn't been built yet** uses `PlaceholderPage` or
  equivalent copy that says exactly that ("This page is a placeholder...
  Its real functionality has not been built yet.") — never fake data, and
  never UI that implies something works when it doesn't. See `CLAUDE.md`
  section 4.

## 14. Loading states

Widgets that fetch their own data client-side (see `TRANSFER_NOTES.md` for
why several do) show a plain "Loading..." message while fetching and a
`role="alert"` error message on failure with guidance to refresh — never a
silent blank card.

## 15. Feedback & validation messages

Form-level errors: `role="alert"`, left border in `error` color, on a
`surface-muted` background. Success messages: `role="status"`. Field-level
errors render under the field via `FormField`. Never rely on color alone —
every error also has visible text.

## 16. Confirmations for destructive actions

Deleting a task or study session shows an inline confirm/cancel step in
place (see `TaskListView.tsx`, `SessionList.tsx`) rather than a native
`confirm()` dialog or an unconfirmed instant delete.

## 17. Motion & accessibility

Respect `prefers-reduced-motion` globally (see `globals.css`) — animations
and transitions collapse to near-zero duration for users who request it.
More generally: every interactive element has a visible focus ring, every
icon-only control has an `aria-label`, and status changes that aren't
obvious visually (a running timer, a saved check-in) use `aria-live`/`role`
appropriately rather than relying on sighted-only visual feedback.
