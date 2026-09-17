# Amfora redesign and deployment

Approved by user 17 September 2026: light, refined ivory/ink/blue design across all public and authenticated pages, followed by deployment together with the improved branch.

## Design
Ivory canvas, crisp white surfaces, ink typography, blue actions. Small amphora identity; files and progress are the primary interface. Consistent spacing, single surface cards, accessible forms and actions, deliberate dark appearance. Existing installation customization remains functional.

## Scope
Home, login, recovery, invite, auth callbacks, public download/receive, dashboard, files, shares, reverse shares, settings, customization, users, profile; shared controls, dialogs, loading/error/empty states, mobile navigation. Existing API, hooks, security fixes and translations remain intact. No new dependencies or unnecessary animations.

## Acceptance
Run existing tests, TypeScript, lint, production Docker build. Inspect desktop/mobile and dark mode with browser, exercise upload and download. Back up application data and original compose before switching live deployment. Verify UID 1001, new image identity, database migration and health. Keep rollback files. Update AMFORA.md with exact deployed state.
