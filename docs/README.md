# Project Nova Public Site

Static public-safe website for `project-nova.cloud`.

## Files
- `index.html` — homepage / public manifesto
- `styles.css` — full responsive styling
- `blog/index.html` — journey index
- `blog/*.html` — starter essays
- `CNAME` — GitHub Pages custom domain
- `robots.txt`, `sitemap.xml` — basic indexing

## Public safety rules
Do not publish:
- bot tokens, API keys, VPS IPs, private chat IDs
- partner/client internals
- private vessel logs or memory files
- unapproved names/details from the fleet

Publish:
- vision
- principles
- essays
- public-safe lore
- build lessons without secrets

## Deployment options
### GitHub Pages
1. Create a repo, e.g. `project-nova-site`.
2. Push this folder contents to `main`.
3. Enable Pages from `main` branch root.
4. Keep `CNAME` as `project-nova.cloud`.
5. In Matbao DNS, point the domain to GitHub Pages:
   - `A` records for apex: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www`: `<github-username>.github.io`

### Netlify / Vercel / Cloudflare Pages
Deploy as a static site. Build command: none. Output directory: project root.
Then configure `project-nova.cloud` in the provider dashboard and follow their DNS instructions.
