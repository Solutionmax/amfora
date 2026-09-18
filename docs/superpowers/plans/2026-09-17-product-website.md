# Amfora product website

Goal: publish an English product website and docs at amfora.solutionmax.net on the existing Contabo VPS, with a polished GitHub repository.

Design: extend the approved ink/navy, glass amphora, cobalt and ivory visual identity. Large editorial typography, real product screenshots, clear paths to documentation and the public source repository. No fabricated testimonials, releases, encryption claims or public app access. The website is publicly accessible for preview and excluded from indexing; GitHub is now public (visibility updated September 18, 2026).

Architecture: plain HTML, shared CSS and small progressive enhancement JavaScript in site/. Existing Caddy serves static files from an isolated release directory. No extra container, service, database or build dependency. Fonts and artwork are self hosted.

- [x] Build home, screenshot showcase, FAQ, documentation, 404 and metadata.
- [x] Capture sanitized screenshots from an isolated application clone.
- [x] Verify documentation against implementation; update README and deployment guide.
- [x] Browser check desktop/mobile, navigation, docs anchors, clipboard, assets and accessibility basics.
- [x] Deploy isolated static release; validate Caddy, HTTPS and existing hosts.
- [x] Commit and push amfora branch; set it as default; repository is now public as of September 18, 2026.
- [x] Update project status and record verification/rollback instructions.
