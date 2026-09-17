# Product website

English static product website and documentation for Amfora. Served at
https://amfora.solutionmax.net. This is separate from the file-sharing app.

## Preview locally

From the repository root:

```sh
python3 -m http.server 18080 --bind 127.0.0.1 --directory site
```

Open http://127.0.0.1:18080. No build step or dependencies are needed.

- `index.html`: product presentation, interactive send/collect walkthrough, screenshot stories and FAQ.
- `docs/index.html`: installation, configuration and user documentation.
- `assets/site.css`: shared responsive design and self-hosted font faces.
- `assets/site.js`: mobile navigation, keyboard-accessible walkthrough, example-link copying, docs search and code copying.
- `assets/screenshots/`: actual app captures using synthetic sample content.
- `404.html`: missing-page response, wired by Caddy in production.

The repository remains private. The product website is publicly reachable for
preview, with `noindex,nofollow` in HTML, an X-Robots-Tag response header and a
robots.txt disallow rule. These are indexing controls, not access controls.
No application database, credentials or uploaded user files belong in this tree.

For deployment and rollback see `docs/deployment/product-website.md` at the
repository root. The site uses no analytics, third-party font requests or cookies.
