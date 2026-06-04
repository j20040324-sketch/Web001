# AETHER — Luxury Tech Brand Website

A multi-page, Lamborghini-inspired marketing site for a fictional premium
technology house, **AETHER**. Built with plain **HTML, CSS, and JavaScript** —
no frameworks, no build step. Deeply clickable, every section complete,
including a full set of legal/terms pages.

## Pages

| Page | File |
|------|------|
| Home | `index.html` |
| Models (overview) | `models.html` |
| Aether Halo (smartphone) | `halo.html` |
| Aether Forge (workstation) | `forge.html` |
| Aether Pulse (audio) | `pulse.html` |
| Aether Orbit (wearable) | `orbit.html` |
| Company / About | `company.html` |
| News | `news.html` |
| Contact | `contact.html` |
| Privacy Policy | `privacy.html` |
| Cookie Policy | `cookie.html` |
| Terms & Conditions | `terms.html` |
| Legal Notice | `legal.html` |

## Design "skills" borrowed from Lamborghini.com

- Cinematic full-viewport hero sections with large uppercase display type
- Minimalist luxury palette (near-black + champagne-gold accent), wide letter-spacing
- Sticky header that turns translucent on scroll, with a hover mega-dropdown for Models
- Outline buttons that fill on hover; animated underline nav links
- Scroll-reveal animations (IntersectionObserver) and easing-driven stat counters
- Alternating full-width feature blocks, product spec tables, pricing tiers
- A comprehensive multi-column footer with newsletter, social, and legal links

## Architecture

- `css/style.css` — the full design system
- `js/main.js` — injects the shared **header** and **footer** into every page
  (via `#site-header` / `#site-footer` placeholders) and wires up the mobile
  menu, sticky header, scroll reveals, counters and demo forms. Edit the nav or
  footer in one place and it updates everywhere.

## Run locally

It's a static site. Open `index.html`, or serve it:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

> Design and interaction patterns inspired by lamborghini.com, rewritten from
> scratch with original content. AETHER is fictional; all specs, prices and
> legal text are illustrative only and not legal advice.
