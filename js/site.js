/* ============================================================
   NOVAI Flow — site interactions: carousels, FAQ accordion,
   live-chat widget, analytics loader.
   Loaded on every page (after main.js). All front-end only.
   ============================================================ */
(function () {
  /* ---- config (set these to go live) ---- */
  var GA_ID = ''; // e.g. 'G-XXXXXXXXXX' — leave empty to disable
  var CHAT_ENABLED = false; // set true to show the demo chat widget

  var zh = function () {
    return document.documentElement.lang !== 'en';
  };

  /* =========================================================
     Carousel: <div class="carousel" data-autoplay="6000">
       <div class="carousel-viewport"><div class="carousel-track">
         <div class="carousel-slide">…</div> …
       </div></div>
       (buttons + dots are generated)
     ========================================================= */
  function initCarousels() {
    document.querySelectorAll('.carousel').forEach(function (car) {
      var track = car.querySelector('.carousel-track');
      if (!track) return;
      var slides = Array.prototype.slice.call(track.children);
      if (slides.length < 2) return;
      var i = 0;
      var prev = document.createElement('button');
      prev.className = 'carousel-btn prev';
      prev.setAttribute('aria-label', 'Previous');
      prev.innerHTML = '‹';
      var next = document.createElement('button');
      next.className = 'carousel-btn next';
      next.setAttribute('aria-label', 'Next');
      next.innerHTML = '›';
      var dots = document.createElement('div');
      dots.className = 'carousel-dots';
      slides.forEach(function (_, n) {
        var d = document.createElement('button');
        d.className = 'carousel-dot';
        d.addEventListener('click', function () {
          go(n);
          rest();
        });
        dots.appendChild(d);
      });
      car.appendChild(prev);
      car.appendChild(next);
      car.appendChild(dots);

      function go(n) {
        i = (n + slides.length) % slides.length;
        track.style.transform = 'translateX(' + -i * 100 + '%)';
        Array.prototype.forEach.call(dots.children, function (d, k) {
          d.classList.toggle('active', k === i);
        });
      }
      prev.addEventListener('click', function () { go(i - 1); rest(); });
      next.addEventListener('click', function () { go(i + 1); rest(); });

      var timer = null;
      var delay = +car.getAttribute('data-autoplay') || 0;
      function play() {
        if (delay) timer = setInterval(function () { go(i + 1); }, delay);
      }
      function rest() { clearInterval(timer); play(); }
      car.addEventListener('mouseenter', function () { clearInterval(timer); });
      car.addEventListener('mouseleave', play);
      go(0);
      play();
    });
  }

  /* =========================================================
     FAQ accordion: .faq-item > .faq-q (button) + .faq-a
     ========================================================= */
  function initFAQ() {
    document.querySelectorAll('.faq-item .faq-q').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.faq-item');
        var open = item.classList.contains('open');
        var list = q.closest('.faq');
        if (list) list.querySelectorAll('.faq-item.open').forEach(function (el) { el.classList.remove('open'); });
        item.classList.toggle('open', !open);
      });
    });
  }

  /* =========================================================
     Live-chat widget (demo). Swap with Tawk.to / Crisp by
     replacing this with their embed snippet.
     ========================================================= */
  function initChat() {
    if (!CHAT_ENABLED || document.getElementById('chatWidget')) return;
    var t = zh()
      ? { title: 'NOVAI 助手', sub: '我们通常几分钟内回复', ph: '输入消息…', send: '发送', hi: '你好！👋 关于 NOVAI Flow 有什么可以帮你的吗？', bot: '收到！这是演示客服，工作人员会尽快联系你。', open: '在线客服' }
      : { title: 'NOVAI Assistant', sub: 'We usually reply in minutes', ph: 'Type a message…', send: 'Send', hi: 'Hi! 👋 How can we help with NOVAI Flow?', bot: 'Thanks! This is a demo chat — our team will follow up shortly.', open: 'Chat with us' };
    var wrap = document.createElement('div');
    wrap.id = 'chatWidget';
    wrap.innerHTML =
      '<button class="chat-fab" id="chatFab" aria-label="' + t.open + '">' +
        '<span class="chat-fab-icon">💬</span></button>' +
      '<div class="chat-panel" id="chatPanel" hidden>' +
        '<div class="chat-head"><div><strong>' + t.title + '</strong><span>' + t.sub + '</span></div>' +
          '<button class="chat-close" id="chatClose" aria-label="Close">✕</button></div>' +
        '<div class="chat-body" id="chatBody"></div>' +
        '<form class="chat-input" id="chatForm">' +
          '<input id="chatText" type="text" placeholder="' + t.ph + '" autocomplete="off" />' +
          '<button type="submit">' + t.send + '</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(wrap);

    var panel = document.getElementById('chatPanel');
    var body = document.getElementById('chatBody');
    function add(text, who) {
      var m = document.createElement('div');
      m.className = 'chat-msg ' + who;
      m.textContent = text;
      body.appendChild(m);
      body.scrollTop = body.scrollHeight;
    }
    var greeted = false;
    document.getElementById('chatFab').addEventListener('click', function () {
      var show = panel.hidden;
      panel.hidden = !show;
      document.getElementById('chatWidget').classList.toggle('open', show);
      if (show && !greeted) { add(t.hi, 'bot'); greeted = true; }
    });
    document.getElementById('chatClose').addEventListener('click', function () {
      panel.hidden = true;
      document.getElementById('chatWidget').classList.remove('open');
    });
    document.getElementById('chatForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('chatText');
      var v = input.value.trim();
      if (!v) return;
      add(v, 'me');
      input.value = '';
      setTimeout(function () { add(t.bot, 'bot'); }, 600);
    });
  }

  /* =========================================================
     Analytics (Google Analytics 4) — only if GA_ID set
     ========================================================= */
  function initAnalytics() {
    if (!GA_ID) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCarousels();
    initFAQ();
    initChat();
    initAnalytics();
  });
})();
