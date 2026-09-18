# Unified application design and bounded build cache

Approved direction: extend the product website's ivory, white, cobalt, fine borders, and clear typography to the complete application. Preserve authentication, sharing, QR export, clipboard, uploads, downloads, customization, and dark mode.

Implementation covers shared color/surface tokens, navigation, dashboard and file views, admin settings, profile, customization, user management, public authentication and transfer pages. Appearance defaults use cobalt `#1757e8` and a 0.75rem radius; existing deployments retain stored values until explicitly updated.

Builds use a dedicated builder with native garbage collection and bounded post build cache pruning. Local build/load is the default, publishing is explicit. Clean never removes application volumes or images. Keep the running image and a tested rollback image.

Validation: web lint, TypeScript and unit tests; mocked build wrapper checks; production image build; isolated desktop/mobile/dark visual inspection and functional checks; deployment with consistent backup and preserved data counts; refreshed English screenshots and repository documentation.
