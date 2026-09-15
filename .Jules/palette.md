## 2025-02-12 - Added ARIA labels to modal close buttons
**Learning:** Icon-only buttons (like '✕') across various modals in this app (AuthModal, GachaSystem, UserProfile) were missing ARIA labels, creating accessibility issues for screen readers.
**Action:** Always verify icon-only interactive elements have proper `aria-label`s for screen reader support.

## 2026-09-14 - Added ARIA labels to AuthModal form inputs
**Learning:** Found that form inputs in `AuthModal` relied solely on `placeholder` attributes for context, which is insufficient for screen readers. Error messages also lacked ARIA live region attributes, making them silent for assistive tech users.
**Action:** Always ensure that standalone inputs have an `aria-label` when a visible `<label>` is not present, and that error messages use `role="alert"` and `aria-live="polite"` so screen readers announce validation errors.

## 2025-02-28 - Added keyboard focus states to global Button
**Learning:** Found that the core `Button` component lacked visual focus states for keyboard navigation. While mouse users see hover states, keyboard users had no clear indicator of which button was active.
**Action:** Always add `focus-visible` styles (like rings and offsets) to interactive components to ensure keyboard accessibility without affecting the mouse experience.
