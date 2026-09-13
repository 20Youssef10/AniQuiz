## 2025-02-12 - Added ARIA labels to modal close buttons
**Learning:** Icon-only buttons (like '✕') across various modals in this app (AuthModal, GachaSystem, UserProfile) were missing ARIA labels, creating accessibility issues for screen readers.
**Action:** Always verify icon-only interactive elements have proper `aria-label`s for screen reader support.
