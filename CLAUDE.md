# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static portfolio website for Dr. Virender Ahlawat, a veterinary surgeon based in Langley, BC, Canada. No build tools, no package manager — pure HTML, CSS, and JavaScript served directly via GitHub Pages and IIS.

## Deployment

- **GitHub Pages**: `index.html` is the entry point; live at `virenderahlawat.ca` (CNAME configured)
- **IIS**: `web.config` configures MIME types for modern image formats (`.avif`, `.webp`) on the Windows Server production environment

No build step is needed. Edit files and commit — GitHub Pages serves them directly.

## File Structure

| File/Directory | Purpose |
|----------------|---------|
| `index.html` | Main single-page portfolio (hero, about, timeline, gallery, video carousel, services, contact) |
| `blogs.html` | Blog listing page with expandable posts |
| `home.css` | Primary stylesheet — responsive, glassmorphism, animations |
| `home-v2.css` | Legacy/alternative stylesheet (may be deprecated) |
| `home.js` | Video carousel, scroll animations, testimonial carousel, metrics counter, video modal |
| `menu.js` | Mobile hamburger menu toggle with scroll lock |
| `blogs.js` | Blog expand/collapse with URL hash navigation |
| `static_resources/images/` | All image assets (gallery, hero, blog thumbnails, initiative photos) |
| `data/` | JSON data files consumed by the admin panel and rendered dynamically |
| `admin/` | Password-protected CMS for managing dynamic content |
| `worker/` | Cloudflare Worker for admin authentication (deployed to `workers.dev`) |
| `CNAME` | Custom domain config for GitHub Pages (`virenderahlawat.ca`) |
| `Docs/` | Project documentation (requirements PPTX) |

## Data Layer (`data/`)

Dynamic content is stored as JSON and updated by the admin panel via the GitHub API:

| File | Content |
|------|---------|
| `data/blogs.json` | Blog posts (id, title, highlightWord, previewText, content HTML, image path, date) |
| `data/gallery.json` | Gallery images (id, src path, alt text) |
| `data/testimonials.json` | Testimonials (id, text, author, role) |
| `data/videos.json` | YouTube video carousel entries (id, videoId, title, description) |

## Admin Panel (`admin/`)

Password-protected CMS at `/admin/` for managing dynamic content without touching code.

| File | Purpose |
|------|---------|
| `admin/index.html` | Admin UI — login screen + tabbed editor for all content types |
| `admin/admin.js` | All admin logic: auth flow, GitHub API reads/writes, CRUD for each data type |
| `admin/admin.css` | Admin panel styles |

### Admin Architecture

- **Auth**: Password is hashed client-side (SHA-256) and verified against the Cloudflare Worker. On success, the Worker returns an AES-GCM encrypted GitHub PAT that is decrypted in-browser using PBKDF2-derived key from the user's password.
- **GitHub PAT**: Lives in memory only — never persisted in localStorage or cookies after decryption.
- **Content updates**: Admin reads JSON files from GitHub API (fetching current SHA), edits in-browser, then PUTs updated JSON back to the same repo/branch. This triggers a GitHub Pages redeploy.
- **Image uploads**: Admin uploads images directly to `static_resources/images/` via GitHub API (base64-encoded).
- **Rate limiting**: The Cloudflare Worker enforces 5 failed login attempts per IP per 15 minutes.
- **First-time setup**: `/status` endpoint checks if admin is configured; if not, shows a setup screen that stores the password hash + encrypted PAT in KV.
- **Change password**: `/change-password` endpoint re-encrypts the PAT under the new password.

## Cloudflare Worker (`worker/`)

Auth-only backend deployed to Cloudflare Workers. Not a general API — handles only admin authentication.

| File | Purpose |
|------|---------|
| `worker/index.js` | Worker source — `/status`, `/setup`, `/login`, `/change-password` endpoints |
| `worker/wrangler.toml` | Wrangler config — KV namespace binding `ADMIN_CONFIG` (id: `be1a1a921ad6474ba4aeb16c97ddd974`) |
| `worker/package.json` | Dev dependency: wrangler |

- **Worker URL**: `https://admin-auth.royal-mud-fed3.workers.dev`
- **KV namespace**: `ADMIN_CONFIG` — stores `password_hash`, `encrypted_token`, and rate-limit keys
- **CORS**: Restricted to `https://virenderahlawat.ca`
- **Deploy**: `cd worker && npx wrangler deploy`

## Architecture

### JavaScript Patterns

- **No framework** — vanilla DOM manipulation throughout
- `home.js` uses `IntersectionObserver` for scroll-triggered animations and animated number counters
- Video carousel in `home.js` supports keyboard navigation (arrow keys, Escape)
- `blogs.js` reads `window.location.hash` on page load to auto-expand a specific blog post
- All JS files are loaded at the bottom of `<body>` with `defer`-equivalent placement

### CSS Patterns

- Mobile-first breakpoints at `768px` and `900px`
- Glassmorphism via `backdrop-filter: blur()` on the fixed navigation and overlays
- Scroll-animated sections use `.animate` class added by `IntersectionObserver` in `home.js`

### External CDN Dependencies (no local install needed)

- **Google Fonts**: Comfortaa, Lexend
- **Font Awesome 6.0.0**: Icons
- **Leaflet.js 1.9.4**: Interactive map in the contact section
- **Calendly**: Appointment booking widget embedded in contact section
- **YouTube**: Video embeds in the carousel

## Key Content Sections (index.html)

1. Hero + CTA
2. About + testimonial carousel (auto-rotating, data from `data/testimonials.json`)
3. Journey timeline (education & career milestones)
4. Animated metrics counters
5. Gallery (data from `data/gallery.json`) with hover overlays
6. Vision statement blockquote
7. Video carousel (data from `data/videos.json`)
8. Community initiatives (3 cards)
9. Services grid (10 cards linking to Murrayville Animal Hospital)
10. Contact: Leaflet map + Calendly booking
11. Footer with social links

## Images

Store all images in `static_resources/images/`. Prefer `.webp` or `.avif` formats for new images. Gallery images follow the naming pattern `gallery1.jpeg` through `gallery12.jpeg`. Admin-uploaded images are named with a timestamp prefix (e.g., `gallery_1780009281694_filename.webp`).

## GitHub Repo

- **Repo**: `connectionsincca/dr-virender-ahlawat-vet-website`
- **Branch**: `main`
