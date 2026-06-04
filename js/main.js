/* ============================================================
   AETHER — shared header/footer injection + site interactions
   One file, included on every page with <script defer>.
   ============================================================ */

const PRODUCTS = [
  { href: 'halo.html', name: 'Aether Halo', tag: 'Smartphone' },
  { href: 'forge.html', name: 'Aether Forge', tag: 'Workstation' },
  { href: 'pulse.html', name: 'Aether Pulse', tag: 'Audio' },
  { href: 'orbit.html', name: 'Aether Orbit', tag: 'Wearable' },
];

const MODEL_PAGES = ['models.html', ...PRODUCTS.map((p) => p.href)];

function currentPage() {
  const path = window.location.pathname.split('/').pop();
  return path === '' ? 'index.html' : path;
}

/* ---------- Header ---------- */
function headerHTML() {
  const page = currentPage();
  const isModels = MODEL_PAGES.includes(page);

  const dropdown = PRODUCTS.map(
    (p) =>
      `<a href="${p.href}">${p.name}<span>${p.tag}</span></a>`
  ).join('');

  const navItems = [
    { href: 'models.html', label: 'Models', active: isModels, dropdown },
    { href: 'company.html', label: 'Company', active: page === 'company.html' },
    { href: 'news.html', label: 'News', active: page === 'news.html' },
    { href: 'contact.html', label: 'Contact', active: page === 'contact.html' },
  ]
    .map((item) => {
      const cls = `${item.dropdown ? 'has-dropdown' : ''} ${
        item.active ? 'active' : ''
      }`.trim();
      const dd = item.dropdown
        ? `<div class="dropdown">${item.dropdown}</div>`
        : '';
      return `<li class="${cls}"><a class="nav-link" href="${item.href}">${item.label}</a>${dd}</li>`;
    })
    .join('');

  return `
  <header class="site-header" id="siteHeader">
    <div class="header-inner">
      <a class="brand" href="index.html">AETHER</a>
      <nav class="main-nav">
        <ul>${navItems}</ul>
      </nav>
      <div class="header-actions">
        <a class="mini" href="contact.html">Store</a>
        <a class="mini" href="contact.html">Account</a>
        <button class="hamburger" id="hamburger" type="button" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <div class="overlay" id="overlay"></div>
  <nav class="mobile-nav" id="mobileNav">
    <a href="index.html">Home</a>
    <a href="models.html">Models</a>
    ${PRODUCTS.map((p) => `<a class="sub" href="${p.href}">${p.name}</a>`).join('')}
    <a href="company.html">Company</a>
    <a href="news.html">News</a>
    <a href="contact.html">Contact</a>
    <a href="contact.html">Store</a>
    <a href="contact.html">My Account</a>
  </nav>`;
}

/* ---------- Footer ---------- */
function footerHTML() {
  const year = document.documentElement.getAttribute('data-year') || '2026';
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="brand" href="index.html">AETHER</a>
          <p>Technology, elevated. Engineered without compromise, for those who refuse the ordinary.</p>
          <div class="social">
            <a href="#" aria-label="Instagram">IG</a>
            <a href="#" aria-label="YouTube">YT</a>
            <a href="#" aria-label="X">X</a>
            <a href="#" aria-label="LinkedIn">IN</a>
            <a href="#" aria-label="TikTok">TT</a>
          </div>
        </div>
        <div class="footer-col">
          <h5>Products</h5>
          <ul>
            <li><a href="halo.html">Aether Halo</a></li>
            <li><a href="forge.html">Aether Forge</a></li>
            <li><a href="pulse.html">Aether Pulse</a></li>
            <li><a href="orbit.html">Aether Orbit</a></li>
            <li><a href="models.html">All Models</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Company</h5>
          <ul>
            <li><a href="company.html">About</a></li>
            <li><a href="news.html">News</a></li>
            <li><a href="company.html#careers">Careers</a></li>
            <li><a href="contact.html">Contact</a></li>
            <li><a href="company.html#sustainability">Sustainability</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>Legal</h5>
          <ul>
            <li><a href="privacy.html">Privacy Policy</a></li>
            <li><a href="cookie.html">Cookie Policy</a></li>
            <li><a href="terms.html">Terms &amp; Conditions</a></li>
            <li><a href="legal.html">Legal Notice</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="legal-links">
          <a href="privacy.html">Privacy</a>
          <a href="cookie.html">Cookies</a>
          <a href="terms.html">Terms</a>
          <a href="legal.html">Legal Notice</a>
          <a href="contact.html">Accessibility</a>
        </div>
        <div class="copyright">© ${year} AETHER Technologies S.p.A. All rights reserved.</div>
      </div>
    </div>
  </footer>`;
}

/* ---------- Inject + init ---------- */
function injectChrome() {
  const h = document.getElementById('site-header');
  const f = document.getElementById('site-footer');
  if (h) h.innerHTML = headerHTML();
  if (f) f.innerHTML = footerHTML();
}

function initMenu() {
  const burger = document.getElementById('hamburger');
  const nav = document.getElementById('mobileNav');
  const overlay = document.getElementById('overlay');
  if (!burger || !nav || !overlay) return;

  const toggle = (open) => {
    burger.classList.toggle('open', open);
    nav.classList.toggle('open', open);
    overlay.classList.toggle('show', open);
    document.body.classList.toggle('no-scroll', open);
  };

  burger.addEventListener('click', () =>
    toggle(!nav.classList.contains('open'))
  );
  overlay.addEventListener('click', () => toggle(false));
  nav.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => toggle(false))
  );
}

function initStickyHeader() {
  const header = document.getElementById('siteHeader');
  if (!header) return;
  const onScroll = () =>
    header.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  els.forEach((el) => io.observe(el));
}

function animateCounter(el) {
  const target = +el.getAttribute('data-target');
  const decimals = (el.getAttribute('data-decimals') | 0) || 0;
  const duration = 1600;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    const val = target * eased;
    el.textContent = val.toFixed(decimals);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target.toFixed(decimals);
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const els = document.querySelectorAll('.counter');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(animateCounter);
    return;
  }
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  els.forEach((el) => io.observe(el));
}

function initForms() {
  document.querySelectorAll('form[data-demo]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = form.querySelector('[data-demo-msg]');
      if (msg) {
        msg.textContent =
          'Thank you — this is a demo form, so nothing was sent.';
        msg.style.color = 'var(--accent)';
      }
      form.reset();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  injectChrome();
  initMenu();
  initStickyHeader();
  initReveal();
  initCounters();
  initForms();
});
