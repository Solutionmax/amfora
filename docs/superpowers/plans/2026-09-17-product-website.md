# Amfora product website

Goal: publish an English product website and docs at amfora.solutionmax.net on the existing Contabo VPS, with a polished private GitHub repository.

Design: extend the approved ink/navy, glass amphora, cobalt and ivory visual identity. Large editorial typography, real product screenshots, clear paths to documentation and the private source repository. No fabricated testimonials, releases, encryption claims or public app access. The website is publicly accessible for preview and excluded from indexing; GitHub remains private.

Architecture: plain HTML, shared CSS and small progressive-enhancement JavaScript in site/. Existing Caddy serves static files from an isolated release directory. No extra container, service, database or build dependency. Fonts and artwork are self-hosted.

- [x] Build home, screenshot showcase, FAQ, documentation, 404 and metadata.
- [x] Capture sanitized screenshots from an isolated application clone.
- [x] Verify documentation against implementation; update README and deployment guide.
- [x] Browser-check desktop/mobile, navigation, docs anchors, clipboard, assets and accessibility basics.
- [ ] Deploy isolated static release; validate Caddy, HTTPS and existing hosts.
- [ ] Commit and push amfora branch; set it as default; preserve private visibility.
- [ ] Update project status and record verification/rollback instructions.
