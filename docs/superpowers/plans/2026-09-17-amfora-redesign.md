# Amfora Redesign Implementation Plan

> Execution: existing two Luna agents for independent visual surfaces; primary agent integrates, validates and deploys. User authorized implementation and update.

**Goal:** Completely redesign Amfora and deploy all improved code to CT102.
**Architecture:** Retain Next.js/React routes and hooks. Rework existing shared primitives and shells; page-specific updates use semantic palette tokens.
**Tech Stack:** Next.js 15, React 19, Tailwind 4, existing Radix components, Fastify/Prisma backend, Docker.
**Spec:** ../specs/2026-09-17-amfora-redesign.md

## Global constraints
- Maximum two Luna agents; reuse existing agents.
- Preserve data, auth, share security, translations and installation customization.
- No new dependencies. Visual changes verified in browser; existing functional tests remain passing.
- Existing clean amfora branch is the authorized implementation/deployment source.

## Tasks
- [x] Baseline: inspect live image and routes; run web/server tests (8 + 17 passing).
- [x] Foundation (primary): globals.css; UI card/button/input/table/dialog/sheet; layout shell/sidebar/section-layout/loading/footer. Remove nested card chrome, improve contrast, responsive actions and navigation.
- [x] Public (Luna live_version): home/navbar, login/recovery/invite/callbacks, share and reverse upload visual surfaces and brand stage. Maintain hooks and translated labels.
- [x] Workspace (Luna design_inventory): dashboard/files/shares/reverse-shares/profile/customization/settings/users-management contents and tables. Preserve all interactions.
- [x] Integrate/review: inspect diffs, pnpm lint/type-check/test; fix any regressions.
- [ ] Build: docker buildx build --load -t amfora:1.0.0-redesign-20260917 .; test with isolated data copy and local ports before live switch.
- [ ] Deploy: consistent stopped-container backup of /data/palmr plus compose; switch image preserving environment and mounts; retain old image.
- [ ] Verify: health, image identity, ownership, migration, browser public/auth/admin/mobile/dark, upload/download.
- [ ] Document deployed commit/image, backup and verification in /root/projects/homelab/AMFORA.md.

## Verification record
- Pre-change tests: web 8/8, server 17/17.
- First integrated validation: both pnpm validate commands exit 0.
- Staging database migration preserved 2 users, 2 files, 2 shares and 1 reverse share; UID/GID 1001:1001, DB mode 600.
- Browser: authenticated upload created 40-byte check file on isolated staging data. Public download returned existing 69-byte demo PDF. Desktop/mobile/dark snapshots inspected.
- Browser findings fixed: mobile action visibility, narrow dashboard overview cards, mobile file table columns, raw appearance settings, oversized transfer identity panel, unlabeled file-view controls.
- Both Luna cross-reviews completed. Final small fixes: accessible table/grid controls, long custom name wrapping/truncation, single-column narrow forms. Scoped lint and full web validation passed.
