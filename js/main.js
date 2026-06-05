/* ============================================================
   AETHER 科技服务 — shared header/footer injection + interactions
   One file, included on every page with <script defer>.
   ============================================================ */

const SERVICES = [
  { href: 'cloud.html', name: 'Aether 云', en: 'Cloud', tag: '云基础设施' },
  { href: 'intelligence.html', name: 'Aether 智能', en: 'Intelligence', tag: 'AI 与数据' },
  { href: 'secure.html', name: 'Aether 安全', en: 'Secure', tag: '网络安全' },
  { href: 'build.html', name: 'Aether 开发', en: 'Build', tag: '软件工程' },
];

const SERVICE_PAGES = ['services.html', ...SERVICES.map((s) => s.href)];

function currentPage() {
  const path = window.location.pathname.split('/').pop();
  return path === '' ? 'index.html' : path;
}

/* ---------- Header ---------- */
function headerHTML() {
  const page = currentPage();
  const isServices = SERVICE_PAGES.includes(page);

  const dropdown = SERVICES.map(
    (s) => `<a href="${s.href}">${s.name}<span>${s.en} · ${s.tag}</span></a>`
  ).join('');

  const navItems = [
    { href: 'services.html', label: '服务', active: isServices, dropdown },
    { href: 'company.html', label: '公司', active: page === 'company.html' },
    { href: 'news.html', label: '新闻', active: page === 'news.html' },
    { href: 'contact.html', label: '联系', active: page === 'contact.html' },
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
        <a class="mini" href="contact.html">客户门户</a>
        <a class="mini" href="contact.html">预约咨询</a>
        <button class="hamburger" id="hamburger" type="button" aria-label="菜单">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>

  <div class="overlay" id="overlay"></div>
  <nav class="mobile-nav" id="mobileNav">
    <a href="index.html">首页 Home</a>
    <a href="services.html">服务 Services</a>
    ${SERVICES.map((s) => `<a class="sub" href="${s.href}">${s.name} · ${s.en}</a>`).join('')}
    <a href="company.html">公司 Company</a>
    <a href="news.html">新闻 News</a>
    <a href="contact.html">联系 Contact</a>
    <a href="contact.html">预约咨询</a>
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
          <p>科技服务，臻于卓越。从云到 AI、从安全到开发，为企业打造可靠的数字基座。</p>
          <div class="social">
            <a href="#" aria-label="WeChat">WX</a>
            <a href="#" aria-label="Weibo">WB</a>
            <a href="#" aria-label="LinkedIn">IN</a>
            <a href="#" aria-label="YouTube">YT</a>
            <a href="#" aria-label="X">X</a>
          </div>
        </div>
        <div class="footer-col">
          <h5>服务 Services</h5>
          <ul>
            <li><a href="cloud.html">Aether 云 · Cloud</a></li>
            <li><a href="intelligence.html">Aether 智能 · AI</a></li>
            <li><a href="secure.html">Aether 安全 · Secure</a></li>
            <li><a href="build.html">Aether 开发 · Build</a></li>
            <li><a href="services.html">全部服务</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>公司 Company</h5>
          <ul>
            <li><a href="company.html">关于我们</a></li>
            <li><a href="news.html">新闻动态</a></li>
            <li><a href="company.html#careers">加入我们</a></li>
            <li><a href="contact.html">联系我们</a></li>
            <li><a href="company.html#sustainability">可持续</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h5>法律 Legal</h5>
          <ul>
            <li><a href="privacy.html">隐私政策</a></li>
            <li><a href="cookie.html">Cookie 政策</a></li>
            <li><a href="terms.html">服务条款</a></li>
            <li><a href="legal.html">法律声明</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <div class="legal-links">
          <a href="privacy.html">隐私</a>
          <a href="cookie.html">Cookie</a>
          <a href="terms.html">条款</a>
          <a href="legal.html">法律声明</a>
          <a href="contact.html">无障碍</a>
        </div>
        <div class="copyright">© ${year} AETHER 科技服务有限公司 版权所有 · All rights reserved.</div>
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
        msg.textContent = '感谢提交 — 这是演示表单，并未真正发送。';
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
