## 2025-02-12 - Added ARIA labels to modal close buttons
**Learning:** Icon-only buttons (like '✕') across various modals in this app (AuthModal, GachaSystem, UserProfile) were missing ARIA labels, creating accessibility issues for screen readers.
**Action:** Always verify icon-only interactive elements have proper `aria-label`s for screen reader support.

## 2026-09-14 - Added ARIA labels to AuthModal form inputs
**Learning:** Found that form inputs in `AuthModal` relied solely on `placeholder` attributes for context, which is insufficient for screen readers. Error messages also lacked ARIA live region attributes, making them silent for assistive tech users.
**Action:** Always ensure that standalone inputs have an `aria-label` when a visible `<label>` is not present, and that error messages use `role="alert"` and `aria-live="polite"` so screen readers announce validation errors.

## 2025-02-28 - Added keyboard focus states to global Button
**Learning:** Found that the core `Button` component lacked visual focus states for keyboard navigation. While mouse users see hover states, keyboard users had no clear indicator of which button was active.
**Action:** Always add `focus-visible` styles (like rings and offsets) to interactive components to ensure keyboard accessibility without affecting the mouse experience.

## 2023-10-27 - Custom interactive elements need full keyboard accessibility
**Learning:** Found multiple instances where non-interactive elements (like `div` or `h1`) had `onClick` handlers for navigation or selection (e.g., in `App.tsx`, `ArcadeHub.tsx`, `MiniGames.tsx`). This breaks keyboard navigation.
**Action:** Always add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler listening for `Enter` and `Space` when adding click events to non-semantic elements, or replace them with native `<button>` tags when possible.

## 2023-10-27 - Form inputs missing context for screen readers
**Learning:** Several standalone inputs across the application (search, API key input, chat input) lacked associated labels, relying only on visual placeholders.
**Action:** Always add descriptive `aria-label`s to inputs that don't have a visible, associated `<label>` tag to ensure accessibility for screen reader users.
## 2024-05-17 - Added mute button
**Learning:** Found that the app uses sounds aggressively during interactions but lacked a way to mute them.
**Action:** Always provide user control over sound effects, persisting the choice to local storage, and ensuring the toggle is accessible.

## 2023-10-27 - Forms require visible labels and focus styles for accessibility
**Learning:** Found that the inputs in AuthModal lacked visible labels and id bindings, and interactive elements like buttons and inputs lacked proper focus indicators for keyboard navigation.
**Action:** Always add visible `<label>` tags with `htmlFor` mapped to input `id`s where appropriate, as it's better for accessibility and usability than placeholder text or standalone `aria-label`s. Ensure that all interactive elements have `focus-visible` styles to show focus states for keyboard users.
