# NOVA — Tech Products Website

A premium, SpaceX-inspired marketing site for a fictional technology brand, **NOVA**.
Built with plain **HTML, CSS, and JavaScript** — no frameworks, no build step.

## Features

- Full-screen, full-viewport scroll sections (`100vh`)
- Staggered `fadeInUp` text animations
- Hover-fill buttons and animated underline navigation
- Responsive hamburger → X mobile menu that slides in from the right
- Bouncing scroll arrow
- Scroll-triggered animated stat counters on product pages
- Layered CSS-gradient backgrounds (no external image dependencies)

## Pages

| File | Page |
|------|------|
| `index.html` | Homepage with scrolling product showcases |
| `phone.html` | Nova Phone X — hero + animated specs |
| `laptop.html` | Nova Book Pro — hero + animated specs |
| `audio.html` | Nova Buds — hero + animated specs |

## Run locally

It's a static site — just open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tech / skills practiced

HTML structure · CSS animations & transitions · `transform`/`@keyframes` ·
responsive `@media` queries · vanilla-JS DOM + `classList.toggle` ·
scroll events · `setTimeout` count-up animation.

> Styling and interaction patterns inspired by Brad Traversy's SpaceX website tutorial,
> rewritten from scratch with original tech-product content.
