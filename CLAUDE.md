# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static portfolio website for Dr. Virender Ahlawat, a veterinary surgeon based in Langley, BC, Canada. No build tools, no package manager — pure HTML, CSS, and JavaScript served directly via GitHub Pages and IIS.

## Deployment

- **GitHub Pages**: `index.html` is the entry point (renamed from `home.html` for GitHub Pages compatibility)
- **IIS**: `web.config` configures MIME types for modern image formats (`.avif`, `.webp`) on the Windows Server production environment

No build step is needed. Edit files and commit — GitHub Pages serves them directly.

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Main single-page portfolio (hero, about, timeline, gallery, video carousel, services, contact) |
| `blogs.html` | Blog listing page with expandable posts |
| `home.css` | Primary stylesheet — responsive, glassmorphism, animations |
| `home-v2.css` | Legacy/alternative stylesheet (may be deprecated) |
| `home.js` | Video carousel, scroll animations, testimonial carousel, metrics counter, video modal |
| `menu.js` | Mobile hamburger menu toggle with scroll lock |
| `blogs.js` | Blog expand/collapse with URL hash navigation |
| `static_resources/images/` | All image assets (gallery, hero, blog thumbnails, initiative photos) |

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
2. About + testimonial carousel (auto-rotating)
3. Journey timeline (education & career milestones)
4. Animated metrics counters
5. 12-image media gallery with hover overlays
6. Vision statement blockquote
7. Video carousel (5 YouTube videos)
8. Community initiatives (3 cards)
9. Services grid (10 cards linking to Murrayville Animal Hospital)
10. Contact: Leaflet map + Calendly booking
11. Footer with social links

## Images

Store all images in `static_resources/images/`. Prefer `.webp` or `.avif` formats for new images. Gallery images follow the naming pattern `gallery1.jpeg` through `gallery12.jpeg`.
