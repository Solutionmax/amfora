# Product website

English static product website and documentation for Amfora. Served at
https://amfora.solutionmax.net. This is separate from the file sharing app.

## Preview locally

From the repository root:

```sh
python3 -m http.server 18080 --bind 127.0.0.1 --directory site
```

Open http://127.0.0.1:18080. No build step or dependencies are needed.

- `index.html`: the homepage, generated from a mockup source (hero, public page themes, workspace tabs, the 2.4 tiles, API, brandpack slider, FAQ). Its styles and script are `assets/home.css` and `assets/home.js`.
- `releases/index.html`: current release, versioned downloads, release history and Docker upgrade instructions. Update this page when publishing a release.
- `docs/index.html`: installation, configuration and user documentation.
- `assets/home.css`, `assets/home.js`: design and behaviour of the homepage.
- `assets/site.css`, `assets/pages.css`, `assets/site.js`: the other pages: mobile navigation, docs search and code copying, self hosted font faces.
- `assets/screenshots/`: actual app captures using synthetic sample content, one folder per version (`2.4` is current; `2.3` stays for old links).
- `brandpack/index.html`, `palmr/index.html`, `sales-es.html`: the brandpack page, the Palmr move guide and the Spanish contracting information.
- `legal.html`: operator details, website privacy, cookies and self hosted installation responsibilities.
- `404.html`: missing page response, wired by Caddy in production.

The source repository is public and can be downloaded without a GitHub account. The product website is publicly reachable for
preview, with `noindex,nofollow` in HTML, an X-Robots-Tag response header and a
robots.txt disallow rule. These are indexing controls, not access controls.
No application database, credentials or uploaded user files belong in this tree.

For deployment and rollback see `docs/deployment/product-website.md` at the
repository root. The static pages use no analytics, third party font requests or application cookies.
Cloudflare may set strictly necessary cookies for security challenges. The public
privacy notice distinguishes this website from independently operated installations.
