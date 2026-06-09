/* ============================================================
   NOVAI Flow app — SPA shell, hash router, and views.
   All data comes from the backend via window.API.
   ============================================================ */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function setView(h) { $('#view').innerHTML = h; }
  function loading() { setView(skel(2) + skel(4)); }
  function toast(msg, err) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'app-toast show' + (err ? ' err' : '');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.className = 'app-toast'; }, 2800);
  }
  function fmtDate(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return iso; }
  }
  function fmtDay(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('zh-CN'); } catch (e) { return iso; }
  }
  function clean(o) {
    var r = {};
    Object.keys(o).forEach(function (k) { if (o[k] !== '' && o[k] != null) r[k] = o[k]; });
    return r;
  }
  function copy(text) {
    navigator.clipboard.writeText(text).then(function () { toast('已复制到剪贴板'); }, function () {});
  }
  // Turn a backend invite URL into a front-end accept-invite link on this host.
  function acceptLink(backendUrl) {
    var token = '';
    try { token = new URL(backendUrl).searchParams.get('token') || ''; } catch (e) { var m = (backendUrl || '').match(/token=([^&]+)/); token = m ? m[1] : ''; }
    return location.href.split('/app/')[0] + '/accept-invite.html?token=' + encodeURIComponent(token);
  }
  function badge(text, cls) { return '<span class="badge ' + (cls || '') + '">' + esc(text) + '</span>'; }
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 300); };
  }
  function emptyState(ico, title, sub, btnId, btnLabel) {
    return '<div class="empty-state"><div class="ico">' + ico + '</div><div class="t">' + esc(title) + '</div>' +
      '<div class="s">' + esc(sub || '') + '</div>' +
      (btnId ? '<button class="b primary" id="' + btnId + '">' + esc(btnLabel) + '</button>' : '') + '</div>';
  }
  function errorState(msg) {
    return '<div class="empty-state"><div class="ico">⚠️</div><div class="t">出错了</div>' +
      '<div class="s">' + esc(msg || '加载失败，请重试') + '</div>' +
      '<button class="b" id="retryBtn">重试</button></div>';
  }
  function pagerHtml(total, page, pageSize) {
    var pages = Math.max(1, Math.ceil(total / pageSize));
    if (total <= pageSize) return '';
    return '<div class="pager"><span>第 ' + page + ' / ' + pages + ' 页 · 共 ' + total + '</span>' +
      '<button data-pg="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>上一页</button>' +
      '<button data-pg="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>下一页</button></div>';
  }
  function bindPager(reload) { $$('#view [data-pg]').forEach(function (b) { b.onclick = function () { reload(parseInt(b.dataset.pg, 10)); }; }); }
  // Wire HTML5 drag-and-drop on a kanban board. onMove(id, columnStatus).
  function wireBoard(onMove) {
    $$('#view .board-card[draggable]').forEach(function (card) {
      card.ondragstart = function (e) { e.dataTransfer.setData('text/id', card.dataset.id); e.dataTransfer.effectAllowed = 'move'; card.style.opacity = '0.4'; };
      card.ondragend = function () { card.style.opacity = ''; };
    });
    $$('#view .board-col').forEach(function (col) {
      col.ondragover = function (e) { e.preventDefault(); col.classList.add('drop'); };
      col.ondragleave = function () { col.classList.remove('drop'); };
      col.ondrop = function (e) { e.preventDefault(); col.classList.remove('drop'); var id = e.dataTransfer.getData('text/id'); var status = col.dataset.status; if (id && status) onMove(id, status); };
    });
  }
  function confirmDel(msg, fn) {
    openModal('确认删除', '<p style="font-size:14px;color:var(--muted)">' + esc(msg) + '</p>', {
      submitLabel: '删除',
      busyLabel: '删除中…',
      onSubmit: async function () { await fn(); closeModal(); },
    });
    var b = $('#modalHost [data-ms]'); if (b) b.classList.add('danger');
  }
  function money(n) { var v = Number(n) || 0; return '$' + v.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function breadcrumb(items) {
    return '<nav class="crumb">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return last ? '<span>' + esc(it.label) + '</span>' : '<a href="' + it.href + '">' + esc(it.label) + '</a><span class="sep">/</span>';
    }).join('') + '</nav>';
  }
  function skel(lines) {
    var s = '';
    for (var i = 0; i < (lines || 4); i++) s += '<div class="sk"' + (i === 0 ? ' style="width:40%"' : (i === (lines || 4) - 1 ? ' style="width:65%"' : '')) + '></div>';
    return '<div class="panel">' + s + '</div>';
  }
  // SVG donut from [{label,value,color}]
  function donut(segments, size) {
    size = size || 150;
    var r = size / 2 - 14, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
    var total = segments.reduce(function (a, s) { return a + s.value; }, 0) || 1;
    var off = 0;
    var circles = segments.filter(function (s) { return s.value > 0; }).map(function (s) {
      var len = s.value / total * circ;
      var c = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="14" stroke-dasharray="' + len + ' ' + (circ - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
      off += len; return c;
    }).join('');
    var legend = segments.map(function (s) { return '<div class="lg"><span class="dot" style="background:' + s.color + '"></span>' + esc(s.label) + ' <b>' + s.value + '</b></div>'; }).join('');
    return '<div class="chart-donut"><svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + circles +
      '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" fill="var(--fg)" font-size="22" font-family="Sora">' + total + '</text></svg><div class="lgs">' + legend + '</div></div>';
  }
  function bars(items) {
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return '<div class="bars">' + items.map(function (i) {
      return '<div class="bar-row"><span class="bl">' + esc(i.label) + '</span><div class="bt"><div class="bf" style="width:' + (i.value / max * 100) + '%;background:' + (i.color || 'var(--accent)') + '"></div></div><span class="bv">' + i.value + '</span></div>';
    }).join('') + '</div>';
  }
  var CHART = { gold: '#c9a96a', green: '#4cd07d', red: '#e0556a', blue: '#6aa9ff', gray: '#666' };

  // ---- option sets ----
  var CLIENT_STATUS = [
    ['NEW_LEAD', '新线索', 'blue'], ['CONTACTED', '已联系', 'blue'], ['IN_PROGRESS', '进行中', 'gold'],
    ['WAITING_CLIENT', '等待客户', 'gold'], ['COMPLETED', '已完成', 'green'], ['INACTIVE', '已停用', ''],
  ];
  var TASK_STATUS = [['TODO', '待办'], ['IN_PROGRESS', '进行中'], ['WAITING', '等待'], ['DONE', '完成'], ['CANCELLED', '取消']];
  var PRIORITY = [['LOW', '低'], ['MEDIUM', '中'], ['HIGH', '高'], ['URGENT', '紧急']];
  var PROJECT_STATUS = [['PENDING', '待开始'], ['IN_PROGRESS', '进行中'], ['WAITING_CLIENT', '等待客户'], ['REVIEW', '审核'], ['COMPLETED', '完成'], ['CANCELLED', '取消']];
  var ROLES = [['STAFF', '员工'], ['MANAGER', '经理'], ['ADMIN', '管理员']];

  function labelOf(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v; }
  function statusBadge(v) {
    for (var i = 0; i < CLIENT_STATUS.length; i++) if (CLIENT_STATUS[i][0] === v) return badge(CLIENT_STATUS[i][1], CLIENT_STATUS[i][2]);
    return badge(v);
  }

  // ---- modal + forms ----
  function closeModal() { var h = $('#modalHost'); h.className = 'app-modal-host'; h.innerHTML = ''; }
  function openModal(title, bodyHtml, opts) {
    opts = opts || {};
    var h = $('#modalHost');
    h.innerHTML =
      '<div class="app-modal-back"></div><div class="app-modal"><h3>' + esc(title) + '</h3>' +
      '<div class="m-body">' + bodyHtml + '</div><div class="actions">' +
      '<button class="b" data-mc>关闭</button>' +
      (opts.submitLabel ? '<button class="b primary" data-ms>' + esc(opts.submitLabel) + '</button>' : '') +
      '</div></div>';
    h.className = 'app-modal-host open';
    $('.app-modal-back', h).onclick = closeModal;
    $('[data-mc]', h).onclick = closeModal;
    if (opts.onSubmit) {
      var sb = $('[data-ms]', h);
      sb.onclick = async function () {
        var orig = sb.textContent;
        sb.disabled = true; sb.textContent = opts.busyLabel || '处理中…';
        try { await opts.onSubmit(h); }
        catch (e) { toast((e && e.message) || '操作失败', true); }
        if (document.body.contains(sb)) { sb.disabled = false; sb.textContent = orig; }
      };
    }
    // Enter submits when typing in a form field; auto-focus the first editable field.
    var form = $('[data-mform]', h);
    if (form) form.onsubmit = function (e) { e.preventDefault(); var b = $('[data-ms]', h); if (b && !b.disabled) b.click(); };
    var first = $('.m-body input:not([readonly]):not([type=hidden]):not([type=checkbox]), .m-body textarea, .m-body select', h);
    if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
    return h;
  }
  function fieldHtml(f) {
    var v = f.value != null ? esc(f.value) : '';
    if (f.type === 'select') {
      return '<div class="field"><label>' + esc(f.label) + '</label><select name="' + f.name + '">' +
        f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === f.value ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
        '</select></div>';
    }
    if (f.type === 'textarea') return '<div class="field"><label>' + esc(f.label) + '</label><textarea name="' + f.name + '">' + v + '</textarea></div>';
    return '<div class="field"><label>' + esc(f.label) + '</label><input name="' + f.name + '" type="' + (f.type || 'text') + '" value="' + v + '" placeholder="' + esc(f.ph || '') + '"/></div>';
  }
  function collect(host) { var d = {}; $$('[name]', host).forEach(function (el) { d[el.name] = el.value; }); return d; }
  function formModal(title, fields, submitLabel, onSubmit) {
    openModal(title, '<form data-mform>' + fields.map(fieldHtml).join('') + '</form>', {
      submitLabel: submitLabel || '保存',
      busyLabel: '保存中…',
      onSubmit: function (host) { return onSubmit(collect(host)); },
    });
  }

  // cached client options for selects
  async function clientOptions() {
    var r = await API.get('/clients?pageSize=100');
    return r.items.map(function (c) { return [c.id, c.firstName + ' ' + c.lastName]; });
  }

  // ======================= VIEWS =======================

  function kpi(icon, n, label, warn) {
    return '<div class="kpi' + (warn ? ' warn' : '') + '"><div class="ic">' + icon + '</div><div><div class="n">' + n + '</div><div class="l">' + esc(label) + '</div></div></div>';
  }
  function focusItem(href, title, meta) { return '<a href="' + href + '"><span>' + esc(title) + '</span><span class="meta">' + esc(meta) + '</span></a>'; }
  function sumVals(o) { return Object.keys(o || {}).reduce(function (a, k) { return a + o[k]; }, 0); }

  // ---- customizable dashboard ----
  var DASH_CATALOG = [
    { id: 'kpi_clients', title: '客户总数' }, { id: 'kpi_projects', title: '进行中项目' },
    { id: 'kpi_overdue_tasks', title: '逾期任务' }, { id: 'kpi_unpaid', title: '待收发票' },
    { id: 'kpi_new_clients', title: '今日新增客户' }, { id: 'kpi_unread', title: '未读消息' },
    { id: 'kpi_unsigned', title: '未签合同' }, { id: 'kpi_due_today', title: '今日到期任务' },
    { id: 'kpi_revenue_paid', title: '已收款' }, { id: 'kpi_revenue_out', title: '待收款' },
    { id: 'kpi_sign_rate', title: '合同签署率' }, { id: 'kpi_task_completion', title: '任务完成率' },
    { id: 'kpi_properties', title: '物业总数' }, { id: 'kpi_active_leases', title: '在租租约' },
    { id: 'kpi_arrears', title: '欠租金额' }, { id: 'kpi_open_jobs', title: '维修工单' },
    { id: 'kpi_due_inspections', title: '待办验房' },
    { id: 'revenue', title: '收入概览（图）' }, { id: 'chart_clients', title: '客户分布（图）' },
    { id: 'chart_invoices', title: '发票状态（图）' }, { id: 'chart_contracts', title: '合同状态（图）' },
    { id: 'chart_projects', title: '项目状态（图）' }, { id: 'focus', title: '今日待办' },
    { id: 'activity', title: '最近动态' },
  ];
  var DASH_DEFAULT = ['kpi_clients', 'kpi_projects', 'kpi_overdue_tasks', 'kpi_unpaid', 'kpi_properties', 'kpi_arrears', 'revenue', 'chart_clients', 'focus', 'activity'];
  function catTitle(id) { for (var i = 0; i < DASH_CATALOG.length; i++) if (DASH_CATALOG[i].id === id) return DASH_CATALOG[i].title; return id; }
  function getDashConfig() {
    try { var v = JSON.parse(localStorage.getItem('novai-dash') || 'null'); if (v && v.order && v.order.length) return { order: v.order.filter(catTitleExists), sizes: v.sizes || {} }; } catch (e) {}
    return { order: DASH_DEFAULT.slice(), sizes: {} };
  }
  function catTitleExists(id) { return DASH_CATALOG.some(function (w) { return w.id === id; }); }
  function saveDash() { try { localStorage.setItem('novai-dash', JSON.stringify({ order: dashState.order, sizes: dashState.sizes })); } catch (e) {} }
  function sizeOf(id) { return dashState.sizes[id] || (dashState.widgets[id] ? dashState.widgets[id].size : 'half'); }
  function sizeLabel(s) { return s === 'kpi' ? '小' : (s === 'full' ? '大' : '中'); }
  function nextSize(s) { return s === 'kpi' ? 'half' : (s === 'half' ? 'full' : 'kpi'); }
  function panelBars(title, arr) { return '<div class="panel"><h3>' + title + '</h3>' + (arr.length ? bars(arr) : '<p class="loading">暂无数据</p>') + '</div>'; }

  function dashWidgets(ctx) {
    var m = ctx.m, rep = ctx.rep;
    var prop = ctx.prop || { properties: 0, activeLeases: 0, arrears: { totalOutstanding: 0 }, jobs: 0, dueInspections: 0 };
    var clientsTotal = rep ? sumVals(rep.clientsByStatus) : 0;
    var taskCompletion = 0;
    if (rep) { var tt = sumVals(rep.tasksByStatus); taskCompletion = tt ? Math.round((rep.tasksByStatus.DONE || 0) / tt * 100) : 0; }
    function invSeg() { var inv = rep.invoicesByStatus; return [{ label: '已付', value: inv.PAID || 0, color: CHART.green }, { label: '未付', value: (inv.UNPAID || 0) + (inv.SENT || 0), color: CHART.gold }, { label: '逾期', value: inv.OVERDUE || 0, color: CHART.red }, { label: '草稿', value: (inv.DRAFT || 0) + (inv.CANCELLED || 0), color: CHART.gray }]; }
    function clientBars() { var cb = rep.clientsByStatus; return CLIENT_STATUS.map(function (s) { return { label: s[1], value: cb[s[0]] || 0, color: CHART.gold }; }).filter(function (b) { return b.value > 0; }); }
    function contractBars() { var ct = rep.contractsByStatus; return Object.keys(CONTRACT_LABEL).map(function (k) { return { label: CONTRACT_LABEL[k], value: ct[k] || 0, color: k === 'SIGNED' ? CHART.green : CHART.gold }; }).filter(function (b) { return b.value > 0; }); }
    function projectBars() { var pj = rep.projectsByStatus; return PROJECT_STATUS.map(function (s) { return { label: s[1], value: pj[s[0]] || 0, color: s[0] === 'COMPLETED' ? CHART.green : CHART.gold }; }).filter(function (b) { return b.value > 0; }); }

    var unsigned = (ctx.contracts.items || []).filter(function (c) { return c.status === 'SENT' || c.status === 'VIEWED'; }).slice(0, 5);
    var unpaid = (ctx.invoices.items || []).filter(function (i) { return ['UNPAID', 'OVERDUE', 'SENT'].indexOf(i.status) > -1; }).slice(0, 5);
    var focusHtml = '';
    (ctx.overdue.items || []).slice(0, 5).forEach(function (t) { focusHtml += focusItem('#/tasks', t.title, '逾期任务 · ' + (t.dueDate ? fmtDay(t.dueDate) : '')); });
    unsigned.forEach(function (c) { focusHtml += focusItem('#/contracts', c.title, '待签合同'); });
    unpaid.forEach(function (i) { focusHtml += focusItem('#/invoices', i.invoiceNumber, money(i.amount) + ' · 待收款'); });
    if (!focusHtml) focusHtml = '<p class="loading">没有待办事项，一切顺利。</p>';
    var tl = (ctx.recent || []).map(function (e) { return '<li><div class="t">' + esc(e.title) + '</div><div class="d">' + fmtDate(e.createdAt) + (e.description ? ' · ' + esc(e.description) : '') + '</div></li>'; }).join('') || '<li class="d">暂无动态</li>';
    var revHtml = rep ? ('<div class="panel"><h3>收入概览</h3><div style="display:flex;gap:22px;margin-bottom:10px"><div><div style="color:var(--muted);font-size:11px">已收</div><div style="font-family:Sora;font-size:19px;color:' + CHART.green + '">' + money(rep.revenue.paid) + '</div></div><div><div style="color:var(--muted);font-size:11px">待收</div><div style="font-family:Sora;font-size:19px;color:' + CHART.gold + '">' + money(rep.revenue.outstanding) + '</div></div></div>' + donut(invSeg(), 110) + '</div>') : '';

    return {
      kpi_clients: { size: 'kpi', html: kpi('◍', clientsTotal, '客户总数') },
      kpi_projects: { size: 'kpi', html: kpi('▤', m.activeProjects, '进行中项目') },
      kpi_overdue_tasks: { size: 'kpi', html: kpi('⚠', m.tasksOverdue, '逾期任务', m.tasksOverdue > 0) },
      kpi_unpaid: { size: 'kpi', html: kpi('$', m.unpaidInvoices + m.overdueInvoices, '待收发票', (m.unpaidInvoices + m.overdueInvoices) > 0) },
      kpi_new_clients: { size: 'kpi', html: kpi('+', m.newClientsToday, '今日新增客户') },
      kpi_unread: { size: 'kpi', html: kpi('✉', m.unreadMessages, '未读消息', m.unreadMessages > 0) },
      kpi_unsigned: { size: 'kpi', html: kpi('✎', m.unsignedContracts, '未签合同') },
      kpi_due_today: { size: 'kpi', html: kpi('◷', m.tasksDueToday, '今日到期任务', m.tasksDueToday > 0) },
      kpi_revenue_paid: { size: 'kpi', html: rep ? kpi('$', money(rep.revenue.paid), '已收款') : '' },
      kpi_revenue_out: { size: 'kpi', html: rep ? kpi('$', money(rep.revenue.outstanding), '待收款', rep.revenue.outstanding > 0) : '' },
      kpi_sign_rate: { size: 'kpi', html: rep ? kpi('✎', rep.contractSignRate + '%', '合同签署率') : '' },
      kpi_task_completion: { size: 'kpi', html: rep ? kpi('✓', taskCompletion + '%', '任务完成率') : '' },
      kpi_properties: { size: 'kpi', html: kpi('⌂', prop.properties, '物业总数') },
      kpi_active_leases: { size: 'kpi', html: kpi('▤', prop.activeLeases, '在租租约') },
      kpi_arrears: { size: 'kpi', html: kpi('$', money(prop.arrears.totalOutstanding), '欠租金额', (prop.arrears.totalOutstanding || 0) > 0) },
      kpi_open_jobs: { size: 'kpi', html: kpi('⚙', prop.jobs, '维修工单') },
      kpi_due_inspections: { size: 'kpi', html: kpi('◉', prop.dueInspections, '待办验房') },
      revenue: { size: 'half', html: revHtml },
      chart_clients: { size: 'half', html: rep ? panelBars('客户分布', clientBars()) : '' },
      chart_invoices: { size: 'half', html: rep ? ('<div class="panel"><h3>发票状态</h3>' + donut(invSeg()) + '</div>') : '' },
      chart_contracts: { size: 'half', html: rep ? panelBars('合同状态', contractBars()) : '' },
      chart_projects: { size: 'half', html: rep ? panelBars('项目状态', projectBars()) : '' },
      focus: { size: 'half', html: '<div class="panel"><h3>今日待办</h3><div class="focus">' + focusHtml + '</div></div>' },
      activity: { size: 'half', html: '<div class="panel"><h3>最近动态</h3><ul class="tl">' + tl + '</ul></div>' },
    };
  }

  // iOS home-screen–style editing. All edit actions mutate the DOM in place
  // (no full re-render) so there's never a flicker/screen-switch — CSS handles
  // the jiggle and the add/remove motion.
  var dashState = { widgets: null, order: null, sizes: {}, editing: false, sizePopFor: null, dragEl: null };

  function sizeClass(size) { return size === 'kpi' ? 'w-kpi' : (size === 'full' ? 'w-full' : 'w-half'); }
  function dashCellHtml(id) {
    var w = dashState.widgets[id]; if (!w || !w.html) return '';
    var size = sizeOf(id);
    return '<div class="dash-cell ' + sizeClass(size) + '" data-id="' + id + '" draggable="' + (dashState.editing ? 'true' : 'false') + '">' +
      '<button class="rm-badge" data-rm title="移除">−</button>' +
      '<button class="size-badge" data-size title="尺寸">' + sizeLabel(size) + '</button>' + w.html + '</div>';
  }

  // Full render — only when first opening the dashboard.
  function renderDash() {
    var order = dashState.order.filter(function (id) { return dashState.widgets[id] && dashState.widgets[id].html; });
    var cells = order.map(dashCellHtml).join('') || '<p class="loading">没有组件，点「自定义 → 添加组件」。</p>';
    setView('<div class="pv-head"><div><h1>仪表盘</h1><p id="dashSub">今天需要关注的事项</p></div>' +
      '<div id="dashActions"><button class="b" id="dashCustomize">自定义</button></div></div>' +
      '<div class="dash-grid' + (dashState.editing ? ' editing' : '') + '" id="dashGrid">' + cells + '</div>');
    $('#dashCustomize').onclick = function (e) { e.stopPropagation(); enterEdit(); };
    bindDashGrid();
    $('#view').onclick = onDashBlankClick;
  }

  function bindDashGrid() {
    var grid = $('#dashGrid');
    grid.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-rm]'); if (rm) { e.stopPropagation(); removeWidget(rm.closest('.dash-cell')); return; }
      var sb = e.target.closest('[data-size]'); if (sb) { e.stopPropagation(); toggleSizePop(sb.closest('.dash-cell')); return; }
      var sz = e.target.closest('[data-sz]'); if (sz) { e.stopPropagation(); setSize(sz.closest('.dash-cell'), sz.getAttribute('data-sz')); return; }
    });
    grid.addEventListener('dragstart', function (e) { var c = e.target.closest('.dash-cell'); if (!c || !dashState.editing) return; dashState.dragEl = c; e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
    grid.addEventListener('dragover', function (e) { if (!dashState.dragEl) return; e.preventDefault(); var c = e.target.closest('.dash-cell'); $$('#dashGrid .drop-target').forEach(function (x) { if (x !== c) x.classList.remove('drop-target'); }); if (c && c !== dashState.dragEl) c.classList.add('drop-target'); });
    grid.addEventListener('drop', function (e) { if (!dashState.dragEl) return; e.preventDefault(); var c = e.target.closest('.dash-cell'); if (c && c !== dashState.dragEl) { grid.insertBefore(dashState.dragEl, c); rebuildOrderFromDom(); saveDash(); } });
    grid.addEventListener('dragend', function () { if (dashState.dragEl) dashState.dragEl.classList.remove('dragging'); dashState.dragEl = null; $$('#dashGrid .drop-target').forEach(function (x) { x.classList.remove('drop-target'); }); });
  }
  function rebuildOrderFromDom() { dashState.order = $$('#dashGrid .dash-cell').map(function (c) { return c.getAttribute('data-id'); }); }

  function enterEdit() {
    dashState.editing = true;
    $('#dashGrid').classList.add('editing');
    $$('#dashGrid .dash-cell').forEach(function (c) { c.setAttribute('draggable', 'true'); });
    $('#dashActions').innerHTML = '<button class="b" id="dashAdd">+ 添加组件</button><button class="b primary" id="dashDone">完成</button>';
    $('#dashAdd').onclick = function (e) { e.stopPropagation(); openAddGallery(); };
    $('#dashDone').onclick = function (e) { e.stopPropagation(); exitEdit(); };
    $('#dashSub').textContent = '拖动排序 · 调尺寸 · 移除';
  }
  function exitEdit() {
    dashState.editing = false; closeSizePop();
    var grid = $('#dashGrid'); if (grid) { grid.classList.remove('editing'); $$('#dashGrid .dash-cell').forEach(function (c) { c.setAttribute('draggable', 'false'); }); }
    $('#dashActions').innerHTML = '<button class="b" id="dashCustomize">自定义</button>';
    $('#dashCustomize').onclick = function (e) { e.stopPropagation(); enterEdit(); };
    $('#dashSub').textContent = '今天需要关注的事项';
    saveDash();
  }

  function toggleSizePop(cell) {
    var id = cell.getAttribute('data-id');
    if (dashState.sizePopFor === id) { closeSizePop(); return; }
    closeSizePop();
    dashState.sizePopFor = id; cell.classList.add('pop-open');
    var size = sizeOf(id), pop = document.createElement('div');
    pop.className = 'size-pop';
    pop.innerHTML = ['kpi', 'half', 'full'].map(function (sz) { return '<button data-sz="' + sz + '"' + (sz === size ? ' class="active"' : '') + '>' + sizeLabel(sz) + '</button>'; }).join('');
    cell.appendChild(pop);
  }
  function closeSizePop() {
    dashState.sizePopFor = null;
    $$('#dashGrid .size-pop').forEach(function (p) { p.remove(); });
    $$('#dashGrid .pop-open').forEach(function (c) { c.classList.remove('pop-open'); });
  }
  function setSize(cell, sz) {
    dashState.sizes[cell.getAttribute('data-id')] = sz;
    cell.classList.remove('w-kpi', 'w-half', 'w-full');
    cell.classList.add(sizeClass(sz));
    var b = cell.querySelector('.size-badge'); if (b) b.textContent = sizeLabel(sz);
    closeSizePop(); saveDash();
  }
  function removeWidget(cell) {
    var id = cell.getAttribute('data-id'), i = dashState.order.indexOf(id);
    if (i > -1) dashState.order.splice(i, 1);
    closeSizePop();
    cell.classList.add('removing');
    setTimeout(function () { cell.remove(); saveDash(); }, 200);
  }

  function onDashBlankClick(e) {
    if (!$('#dashGrid') || !dashState.editing) return;
    if (e.target.closest('.rm-badge') || e.target.closest('.size-badge') || e.target.closest('.size-pop') || e.target.closest('#dashActions')) return;
    if (dashState.sizePopFor) { closeSizePop(); return; }
    exitEdit();
  }

  function openAddGallery() {
    var avail = DASH_CATALOG.filter(function (w) { return dashState.order.indexOf(w.id) < 0; });
    var body = avail.length ? '<div class="add-gallery">' + avail.map(function (w) { return '<button class="add-card" data-id="' + w.id + '">' + esc(w.title) + '</button>'; }).join('') + '</div>' : '<p class="loading">已全部添加</p>';
    openModal('添加组件', body, {});
    $$('#modalHost .add-card').forEach(function (b) { b.onclick = function () { addWidget(b.getAttribute('data-id')); closeModal(); }; });
  }
  function addWidget(id) {
    if (dashState.order.indexOf(id) > -1) return;
    dashState.order.push(id);
    var grid = $('#dashGrid'); if (!grid) return;
    var empty = grid.querySelector('.loading'); if (empty) empty.remove();
    var tmp = document.createElement('div'); tmp.innerHTML = dashCellHtml(id);
    var cell = tmp.firstChild;
    if (cell) { cell.classList.add('adding'); grid.appendChild(cell); }
    saveDash();
  }

  async function viewDashboard() {
    setView(skel(3) + skel(5));
    var res = await Promise.all([
      API.get('/dashboard'),
      API.get('/reports/summary').catch(function () { return null; }),
      API.get('/tasks?overdue=true&pageSize=6').catch(function () { return { items: [] }; }),
      API.get('/contracts').catch(function () { return { items: [] }; }),
      API.get('/invoices').catch(function () { return { items: [] }; }),
      // PropTech aggregates (graceful — default to 0 if the module/permission is absent)
      API.get('/properties?pageSize=1').catch(function () { return { total: 0 }; }),
      API.get('/leases?status=ACTIVE&pageSize=1').catch(function () { return { total: 0 }; }),
      API.get('/leases/arrears').catch(function () { return { totalOutstanding: 0, count: 0 }; }),
      API.get('/maintenance/jobs?pageSize=1').catch(function () { return { total: 0 }; }),
      API.get('/inspections?status=SCHEDULED&pageSize=1').catch(function () { return { total: 0 }; }),
    ]);
    var ctx = {
      m: res[0].metrics, rep: res[1], overdue: res[2], contracts: res[3], invoices: res[4],
      recent: res[0].recentActivity,
      prop: {
        properties: res[5].total || 0,
        activeLeases: res[6].total || 0,
        arrears: res[7] || { totalOutstanding: 0, count: 0 },
        jobs: res[8].total || 0,
        dueInspections: res[9].total || 0,
      },
    };
    dashState.widgets = dashWidgets(ctx);
    var cfg = getDashConfig();
    dashState.order = cfg.order.filter(function (id) { return dashState.widgets[id]; });
    dashState.sizes = cfg.sizes || {};
    dashState.editing = false;
    dashState.sizePopFor = null;
    renderDash();
  }
  function labelOfInvoice(s) { var m = { DRAFT: '草稿', SENT: '已发送', UNPAID: '未付', PAID: '已付', OVERDUE: '逾期', CANCELLED: '已取消' }; return m[s] || s; }

  var CONTRACT_LABEL = { DRAFT: '草稿', SENT: '已发送', VIEWED: '已查看', SIGNED: '已签署', CANCELLED: '已取消', EXPIRED: '已过期' };
  async function viewReports() {
    setView(skel(3) + skel(4));
    var pres = await Promise.all([
      API.get('/reports/summary'),
      API.get('/properties?pageSize=1').catch(function () { return { total: 0 }; }),
      API.get('/leases?status=ACTIVE&pageSize=1').catch(function () { return { total: 0 }; }),
      API.get('/leases/arrears').catch(function () { return { totalOutstanding: 0, count: 0 }; }),
      API.get('/maintenance/jobs?pageSize=1').catch(function () { return { total: 0 }; }),
    ]);
    var rep = pres[0];
    var ptech = { properties: pres[1].total || 0, activeLeases: pres[2].total || 0, arrears: pres[3] || { totalOutstanding: 0 }, jobs: pres[4].total || 0 };
    var anyPtech = ptech.properties || ptech.activeLeases || ptech.jobs || (ptech.arrears.totalOutstanding || 0);
    var ptechRow = anyPtech ? ('<h3 style="margin:4px 0 12px;font-family:Sora;font-size:16px">地产指标</h3><div class="kpi-grid">' +
      kpi('⌂', ptech.properties, '物业总数') +
      kpi('▤', ptech.activeLeases, '在租租约') +
      kpi('$', money(ptech.arrears.totalOutstanding), '欠租金额', (ptech.arrears.totalOutstanding || 0) > 0) +
      kpi('⚙', ptech.jobs, '维修工单') + '</div>') : '';
    var inv = rep.invoicesByStatus, cb = rep.clientsByStatus, ct = rep.contractsByStatus, tk = rep.tasksByStatus, pj = rep.projectsByStatus;
    var invSeg = [
      { label: '已付', value: inv.PAID || 0, color: CHART.green },
      { label: '未付', value: (inv.UNPAID || 0) + (inv.SENT || 0), color: CHART.gold },
      { label: '逾期', value: inv.OVERDUE || 0, color: CHART.red },
      { label: '草稿/取消', value: (inv.DRAFT || 0) + (inv.CANCELLED || 0), color: CHART.gray },
    ];
    var clientBars = CLIENT_STATUS.map(function (s) { return { label: s[1], value: cb[s[0]] || 0, color: CHART.gold }; }).filter(function (b) { return b.value > 0; });
    var contractBars = Object.keys(CONTRACT_LABEL).map(function (k) { return { label: CONTRACT_LABEL[k], value: ct[k] || 0, color: k === 'SIGNED' ? CHART.green : CHART.gold }; }).filter(function (b) { return b.value > 0; });
    var projectBars = PROJECT_STATUS.map(function (s) { return { label: s[1], value: pj[s[0]] || 0, color: s[0] === 'COMPLETED' ? CHART.green : CHART.gold }; }).filter(function (b) { return b.value > 0; });
    var totalTasks = sumVals(tk), completion = totalTasks ? Math.round((tk.DONE || 0) / totalTasks * 100) : 0;

    setView('<div class="pv-head"><div><h1>报表 / 洞察</h1><p>业务关键指标一览</p></div></div>' +
      '<div class="kpi-grid">' +
      kpi('$', money(rep.revenue.paid), '已收款') +
      kpi('$', money(rep.revenue.outstanding), '待收款', rep.revenue.outstanding > 0) +
      kpi('✎', rep.contractSignRate + '%', '合同签署率') +
      kpi('✓', completion + '%', '任务完成率') +
      '</div>' + ptechRow +
      '<div class="grid2"><div class="panel"><h3>发票状态</h3>' + donut(invSeg) + '</div>' +
      '<div class="panel"><h3>客户分布</h3>' + (clientBars.length ? bars(clientBars) : '<p class="loading">暂无数据</p>') + '</div></div>' +
      '<div class="grid2"><div class="panel"><h3>合同状态</h3>' + (contractBars.length ? bars(contractBars) : '<p class="loading">暂无数据</p>') + '</div>' +
      '<div class="panel"><h3>项目状态</h3>' + (projectBars.length ? bars(projectBars) : '<p class="loading">暂无数据</p>') + '</div></div>');
  }

  var fClients = { search: '', status: '', page: 1, view: 'list' };
  function addClientModal() {
    formModal('新建客户', [
      { name: 'firstName', label: '名' }, { name: 'lastName', label: '姓' },
      { name: 'email', label: '邮箱', type: 'email' }, { name: 'phone', label: '电话' },
      { name: 'companyName', label: '公司' },
      { name: 'status', label: '状态', type: 'select', options: CLIENT_STATUS.map(function (s) { return [s[0], s[1]]; }), value: 'NEW_LEAD' },
    ], '创建', async function (data) {
      await API.post('/clients', clean(data)); closeModal(); toast('客户已创建'); fClients.page = 1; viewClients();
    });
  }
  function clientsHead(total) {
    return '<div class="pv-head"><div><h1>客户</h1><p>共 ' + total + ' 位</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><div class="seg"><button data-v="list"' + (fClients.view === 'list' ? ' class="active"' : '') + '>列表</button><button data-v="board"' + (fClients.view === 'board' ? ' class="active"' : '') + '>看板</button></div>' +
      '<button class="b primary" id="add">+ 新建客户</button></div></div>';
  }
  function bindClientsHead() {
    $$('#view .seg button').forEach(function (b) { b.onclick = function () { fClients.view = b.dataset.v; viewClients(); }; });
    var addBtn = $('#add'); if (addBtn) addBtn.onclick = addClientModal;
  }
  async function clientsBoard() {
    loading();
    var r = await API.get('/clients?pageSize=200');
    var cols = CLIENT_STATUS.map(function (s) {
      var inCol = r.items.filter(function (c) { return c.status === s[0]; });
      var cards = inCol.map(function (c) {
        return '<div class="board-card" draggable="true" data-id="' + c.id + '"><div>' + esc(c.firstName + ' ' + c.lastName) + '</div>' + (c.email ? '<div class="sub">' + esc(c.email) + '</div>' : '') + '</div>';
      }).join('');
      return '<div class="board-col" data-status="' + s[0] + '"><h4>' + s[1] + '<span>' + inCol.length + '</span></h4>' + cards + '</div>';
    }).join('');
    setView(clientsHead(r.items.length) + '<div class="board">' + cols + '</div>');
    bindClientsHead();
    $$('#view .board-card').forEach(function (card) { card.onclick = function () { location.hash = '#/clients/' + card.dataset.id; }; });
    wireBoard(async function (id, status) { try { await API.patch('/clients/' + id, { status: status }); toast('已更新状态'); clientsBoard(); } catch (e) { toast(e.message, true); } });
  }
  async function viewClients() {
    if (fClients.view === 'board') return clientsBoard();
    loading();
    var qs = '?page=' + fClients.page + '&pageSize=10';
    if (fClients.search) qs += '&search=' + encodeURIComponent(fClients.search);
    if (fClients.status) qs += '&status=' + fClients.status;
    var r = await API.get('/clients' + qs);
    var statusOpts = '<option value="">全部状态</option>' + CLIENT_STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === fClients.status ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('');
    var body;
    if (!r.items.length && !fClients.search && !fClients.status) {
      body = emptyState('◍', '还没有客户', '新建第一位客户，开始管理你的客户工作流。', 'add', '+ 新建客户');
    } else {
      var rows = r.items.map(function (c) {
        return '<tr class="clickable" data-id="' + c.id + '"><td>' + esc(c.firstName + ' ' + c.lastName) + '</td><td>' + esc(c.email || '-') + '</td><td>' + esc(c.phone || '-') + '</td><td>' + statusBadge(c.status) + '</td></tr>';
      }).join('') || '<tr><td class="empty" colspan="4">没有匹配的客户</td></tr>';
      body = '<table class="tbl"><thead><tr><th>姓名</th><th>邮箱</th><th>电话</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table>' + pagerHtml(r.total, r.page, r.pageSize);
    }
    setView(clientsHead(r.total) +
      '<div class="filterbar"><input type="search" id="cq" placeholder="搜索姓名 / 邮箱 / 公司…" value="' + esc(fClients.search) + '"/><select id="cs">' + statusOpts + '</select></div>' +
      '<div class="panel">' + body + '</div>');
    bindClientsHead();
    $$('#view tr.clickable').forEach(function (tr) { tr.onclick = function () { location.hash = '#/clients/' + tr.dataset.id; }; });
    $('#cq').oninput = debounce(function (e) { fClients.search = e.target.value.trim(); fClients.page = 1; viewClients(); }, 350);
    $('#cs').onchange = function (e) { fClients.status = e.target.value; fClients.page = 1; viewClients(); };
    bindPager(function (p) { fClients.page = p; viewClients(); });
  }

  async function viewClientDetail(id) {
    setView(skel(2) + skel(5));
    var c = await API.get('/clients/' + id);
    var name = c.firstName + ' ' + c.lastName;
    var TABS = [['overview', '概览'], ['projects', '项目'], ['tasks', '任务'], ['contracts', '合同'], ['invoices', '发票'], ['files', '文件']];
    setView(
      breadcrumb([{ label: '客户', href: '#/clients' }, { label: name }]) +
      '<div class="pv-head"><div><h1>' + esc(name) + '</h1><p>' + statusBadge(c.status) + (c.companyName ? ' · ' + esc(c.companyName) : '') + '</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="b" id="note">+ 备注</button><button class="b" id="edit">编辑</button><button class="b danger" id="del">删除</button><button class="b primary" id="invite">邀请门户</button></div></div>' +
      '<div class="tabs" id="ctabs">' + TABS.map(function (t) { return '<button data-tab="' + t[0] + '"' + (t[0] === 'overview' ? ' class="active"' : '') + '>' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div id="tabc"></div>');

    function tableWrap(head, rows, emptyMsg) {
      if (!rows) return '<div class="panel"><p class="loading">' + esc(emptyMsg) + '</p></div>';
      return '<div class="panel"><table class="tbl"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
    async function loadTab(t) {
      var host = $('#tabc'); host.innerHTML = '<div class="loading">加载中…</div>';
      try {
        if (t === 'overview') {
          var tlRes = await API.get('/clients/' + id + '/timeline');
          var tags = (c.tagRelations || []).map(function (x) { return badge(x.tag.name, 'gold'); }).join(' ') || '<span class="badge">无</span>';
          var tl = (tlRes.items || []).map(function (e) { return '<li><div class="t">' + esc(e.title) + '</div><div class="d">' + fmtDate(e.createdAt) + (e.description ? ' · ' + esc(e.description) : '') + '</div></li>'; }).join('') || '<li class="d">暂无记录</li>';
          host.innerHTML = '<div class="detail"><div class="panel"><h3>时间线</h3><ul class="tl">' + tl + '</ul></div>' +
            '<div class="panel"><h3>资料</h3><dl class="kv">' +
            '<dt>状态</dt><dd>' + statusBadge(c.status) + '</dd><dt>邮箱</dt><dd>' + esc(c.email || '-') + '</dd>' +
            '<dt>电话</dt><dd>' + esc(c.phone || '-') + '</dd><dt>公司</dt><dd>' + esc(c.companyName || '-') + '</dd>' +
            '<dt>来源</dt><dd>' + esc(c.source || '-') + '</dd><dt>标签</dt><dd>' + tags + '</dd>' +
            '<dt>备注</dt><dd>' + esc(c.notes || '-') + '</dd></dl></div></div>';
        } else if (t === 'projects') {
          var r = await API.get('/projects?clientId=' + id + '&pageSize=50');
          var rows = (r.items || []).map(function (p) { return '<tr><td>' + esc(p.projectName) + '</td><td>' + badge(labelOf(PROJECT_STATUS, p.status), p.status === 'COMPLETED' ? 'green' : 'gold') + '</td><td>' + (p.dueDate ? fmtDay(p.dueDate) : '-') + '</td></tr>'; }).join('');
          host.innerHTML = tableWrap('<th>名称</th><th>状态</th><th>截止</th>', rows, '暂无项目');
        } else if (t === 'tasks') {
          var r2 = await API.get('/tasks?clientId=' + id + '&pageSize=50');
          var rows2 = (r2.items || []).map(function (x) { return '<tr><td>' + esc(x.title) + '</td><td>' + badge(labelOf(TASK_STATUS, x.status), x.status === 'DONE' ? 'green' : '') + '</td><td>' + badge(labelOf(PRIORITY, x.priority)) + '</td><td>' + (x.dueDate ? fmtDay(x.dueDate) : '-') + '</td></tr>'; }).join('');
          host.innerHTML = tableWrap('<th>标题</th><th>状态</th><th>优先级</th><th>截止</th>', rows2, '暂无任务');
        } else if (t === 'contracts') {
          var r3 = await API.get('/contracts?clientId=' + id);
          var rows3 = (r3.items || []).map(function (x) { return '<tr><td>' + esc(x.title) + '</td><td>' + badge(x.status, x.status === 'SIGNED' ? 'green' : 'gold') + '</td><td>' + (x.signedFileUrl ? '<button class="b sm" data-dl="' + esc(x.signedFileUrl) + '" data-name="' + esc(x.title) + '.html">下载</button>' : '') + '</td></tr>'; }).join('');
          host.innerHTML = tableWrap('<th>标题</th><th>状态</th><th></th>', rows3, '暂无合同');
        } else if (t === 'invoices') {
          var r4 = await API.get('/invoices?clientId=' + id);
          var rows4 = (r4.items || []).map(function (x) { return '<tr><td>' + esc(x.invoiceNumber) + '</td><td>' + money(x.amount) + '</td><td>' + badge(x.status, x.status === 'PAID' ? 'green' : (x.status === 'OVERDUE' ? 'red' : 'gold')) + '</td><td>' + (x.pdfUrl ? '<button class="b sm" data-dl="' + esc(x.pdfUrl) + '" data-name="' + esc(x.invoiceNumber) + '.html">下载</button>' : '') + '</td></tr>'; }).join('');
          host.innerHTML = tableWrap('<th>编号</th><th>金额</th><th>状态</th><th></th>', rows4, '暂无发票');
        } else if (t === 'files') {
          var r5 = await API.get('/files?clientId=' + id);
          var rows5 = (r5.items || []).map(function (x) { return '<tr><td>' + esc(x.fileName) + '</td><td>' + badge(x.visibility === 'CLIENT_VISIBLE' ? '客户可见' : '仅内部', x.visibility === 'CLIENT_VISIBLE' ? 'green' : '') + '</td><td><button class="b sm" data-dl="/api/v1/files/' + x.id + '/download" data-name="' + esc(x.fileName) + '">下载</button></td></tr>'; }).join('');
          host.innerHTML = tableWrap('<th>文件名</th><th>可见性</th><th></th>', rows5, '暂无文件');
        }
        $$('#tabc [data-dl]').forEach(function (b) { b.onclick = async function () { try { await API.download(b.dataset.dl, b.dataset.name); } catch (e) { toast(e.message, true); } }; });
      } catch (e) { host.innerHTML = '<div class="loading">出错：' + esc(e.message) + '</div>'; }
    }
    $$('#ctabs button').forEach(function (b) { b.onclick = function () { $$('#ctabs button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); loadTab(b.dataset.tab); }; });
    loadTab('overview');

    $('#note').onclick = function () {
      formModal('添加备注', [{ name: 'note', label: '备注内容', type: 'textarea' }], '保存', async function (d) {
        if (!d.note) return; await API.post('/clients/' + id + '/notes', { note: d.note }); closeModal(); toast('已添加'); viewClientDetail(id);
      });
    };
    $('#edit').onclick = function () {
      formModal('编辑客户', [
        { name: 'firstName', label: '名', value: c.firstName }, { name: 'lastName', label: '姓', value: c.lastName },
        { name: 'email', label: '邮箱', value: c.email }, { name: 'phone', label: '电话', value: c.phone },
        { name: 'companyName', label: '公司', value: c.companyName },
        { name: 'status', label: '状态', type: 'select', options: CLIENT_STATUS.map(function (s) { return [s[0], s[1]]; }), value: c.status },
        { name: 'notes', label: '备注', type: 'textarea', value: c.notes },
      ], '保存', async function (d) {
        await API.patch('/clients/' + id, d); closeModal(); toast('已保存'); viewClientDetail(id);
      });
    };
    $('#invite').onclick = async function () {
      try {
        var r = await API.post('/clients/' + id + '/invite', {});
        var link = acceptLink(r.inviteUrl);
        openModal('客户门户邀请链接', '<p style="color:var(--muted);font-size:14px;margin-bottom:10px">把链接发给客户，他设置密码后即可登录门户：</p><div class="field"><input value="' + esc(link) + '" readonly id="lnk"/></div>', { submitLabel: '复制链接', onSubmit: function () { copy(link); } });
      } catch (e) { toast(e.message, true); }
    };
    $('#del').onclick = function () {
      confirmDel('确定删除客户「' + (c.firstName + ' ' + c.lastName) + '」？此操作不可撤销。', async function () {
        await API.del('/clients/' + id); toast('已删除'); location.hash = '#/clients';
      });
    };
  }

  var fTasks = { status: '', page: 1, view: 'list' };
  function tasksHead(total) {
    return '<div class="pv-head"><div><h1>任务</h1><p>共 ' + total + ' 项</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center"><div class="seg"><button data-v="list"' + (fTasks.view === 'list' ? ' class="active"' : '') + '>列表</button><button data-v="board"' + (fTasks.view === 'board' ? ' class="active"' : '') + '>看板</button></div>' +
      '<button class="b primary" id="add">+ 新建任务</button></div></div>';
  }
  function bindTasksHead() {
    $$('#view .seg button').forEach(function (b) { b.onclick = function () { fTasks.view = b.dataset.v; viewTasks(); }; });
    var addBtn = $('#add'); if (addBtn) addBtn.onclick = function () { taskFormModal(null); };
  }
  async function tasksBoard() {
    loading();
    var r = await API.get('/tasks?pageSize=200');
    var cols = TASK_STATUS.map(function (s) {
      var inCol = r.items.filter(function (t) { return t.status === s[0]; });
      var cards = inCol.map(function (t) {
        return '<div class="board-card" draggable="true" data-id="' + t.id + '"><div>' + esc(t.title) + '</div><div class="sub">' + badge(labelOf(PRIORITY, t.priority), t.priority === 'URGENT' || t.priority === 'HIGH' ? 'red' : '') + (t.dueDate ? ' · ' + fmtDay(t.dueDate) : '') + '</div></div>';
      }).join('');
      return '<div class="board-col" data-status="' + s[0] + '"><h4>' + s[1] + '<span>' + inCol.length + '</span></h4>' + cards + '</div>';
    }).join('');
    setView(tasksHead(r.items.length) + '<div class="board">' + cols + '</div>');
    bindTasksHead();
    $$('#view .board-card').forEach(function (card) { card.onclick = function () { var t = r.items.filter(function (x) { return x.id === card.dataset.id; })[0]; taskFormModal(t); }; });
    wireBoard(async function (id, status) { try { await API.patch('/tasks/' + id, { status: status }); toast('已更新'); tasksBoard(); } catch (e) { toast(e.message, true); } });
  }
  async function taskFormModal(task) {
    var t = task || {};
    var checklist = Array.isArray(t.checklist) ? t.checklist.map(function (c) { return { label: c.label || '', done: !!c.done }; }) : [];
    var opts = await clientOptions();
    function ckHtml() {
      return checklist.map(function (c, i) {
        return '<div class="ri-row2" data-i="' + i + '"><input type="checkbox" class="ck-done"' + (c.done ? ' checked' : '') + '/><input class="ck-label" value="' + esc(c.label) + '" placeholder="清单项"/><button type="button" class="ri-del ck-del">✕</button></div>';
      }).join('');
    }
    var body = fieldHtml({ name: 'title', label: '标题', value: t.title }) +
      fieldHtml({ name: 'description', label: '描述', type: 'textarea', value: t.description }) +
      '<div class="row2">' + fieldHtml({ name: 'status', label: '状态', type: 'select', options: TASK_STATUS, value: t.status || 'TODO' }) + fieldHtml({ name: 'priority', label: '优先级', type: 'select', options: PRIORITY, value: t.priority || 'MEDIUM' }) + '</div>' +
      fieldHtml({ name: 'dueDate', label: '截止日期', type: 'date', value: t.dueDate ? t.dueDate.slice(0, 10) : '' }) +
      fieldHtml({ name: 'clientId', label: '关联客户(可选)', type: 'select', options: [['', '—']].concat(opts), value: t.clientId || '' }) +
      '<div class="field"><label>清单</label><div id="ckList">' + ckHtml() + '</div><button type="button" class="b sm" id="ckAdd" style="margin-top:6px">+ 添加清单项</button></div>';
    openModal(task ? '编辑任务' : '新建任务', body, {
      submitLabel: '保存',
      onSubmit: async function (host) {
        syncCk(host);
        var d = collect(host);
        // strip checklist inputs that collect picked up by name? they have no name, fine
        var bd = clean({ title: d.title, description: d.description, status: d.status, priority: d.priority, dueDate: d.dueDate, clientId: d.clientId });
        if (bd.dueDate) bd.dueDate = new Date(bd.dueDate).toISOString();
        bd.checklist = checklist.filter(function (c) { return c.label; });
        var btn = $('[data-ms]', host); if (btn) btn.disabled = true;
        try { if (task) await API.patch('/tasks/' + task.id, bd); else await API.post('/tasks', bd); closeModal(); toast('已保存'); viewTasks(); }
        catch (e) { toast(e.message, true); if (btn) btn.disabled = false; }
      },
    });
    var host = $('#modalHost');
    function syncCk(h) { checklist = $$('#ckList .ri-row2', h).map(function (row) { return { label: $('.ck-label', row).value, done: $('.ck-done', row).checked }; }); }
    function bindCk() { $$('#ckList .ck-del', host).forEach(function (b) { b.onclick = function () { syncCk(host); checklist.splice(+b.closest('.ri-row2').getAttribute('data-i'), 1); $('#ckList', host).innerHTML = ckHtml(); bindCk(); }; }); }
    bindCk();
    $('#ckAdd', host).onclick = function () { syncCk(host); checklist.push({ label: '', done: false }); $('#ckList', host).innerHTML = ckHtml(); bindCk(); };
  }
  async function viewTasks() {
    if (fTasks.view === 'board') return tasksBoard();
    loading();
    var qs = '?page=' + fTasks.page + '&pageSize=15';
    if (fTasks.status) qs += '&status=' + fTasks.status;
    var r = await API.get('/tasks' + qs);
    var statusOpts = '<option value="">全部状态</option>' + TASK_STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === fTasks.status ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('');
    var body;
    if (!r.items.length && !fTasks.status) {
      body = emptyState('✓', '暂无任务', '创建任务来跟踪每位客户要做的事。', 'add', '+ 新建任务');
    } else {
      var rows = r.items.map(function (t) {
        var done = t.status === 'DONE';
        var ck = Array.isArray(t.checklist) && t.checklist.length ? ' <span class="badge">☑ ' + t.checklist.filter(function (c) { return c.done; }).length + '/' + t.checklist.length + '</span>' : '';
        return '<tr><td>' + esc(t.title) + ck + '</td><td>' + badge(labelOf(TASK_STATUS, t.status), done ? 'green' : '') + '</td><td>' + badge(labelOf(PRIORITY, t.priority), t.priority === 'URGENT' || t.priority === 'HIGH' ? 'red' : '') + '</td><td>' + (t.dueDate ? fmtDay(t.dueDate) : '-') + '</td><td><div class="rowacts">' +
          (done ? '' : '<button class="b sm" data-done="' + t.id + '">完成</button>') +
          '<button class="b sm" data-edit="' + t.id + '">编辑</button><button class="b sm danger" data-del="' + t.id + '">删</button></div></td></tr>';
      }).join('') || '<tr><td class="empty" colspan="5">没有匹配的任务</td></tr>';
      body = '<table class="tbl"><thead><tr><th>标题</th><th>状态</th><th>优先级</th><th>截止</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' + pagerHtml(r.total, r.page, r.pageSize);
    }
    setView(tasksHead(r.total) +
      '<div class="filterbar"><select id="ts">' + statusOpts + '</select></div>' +
      '<div class="panel">' + body + '</div>');
    bindTasksHead();
    $('#ts').onchange = function (e) { fTasks.status = e.target.value; fTasks.page = 1; viewTasks(); };
    $$('#view [data-done]').forEach(function (b) { b.onclick = async function () { await API.patch('/tasks/' + b.dataset.done, { status: 'DONE' }); toast('已完成'); viewTasks(); }; });
    $$('#view [data-edit]').forEach(function (b) { b.onclick = function () { var t = r.items.filter(function (x) { return x.id === b.dataset.edit; })[0]; taskFormModal(t); }; });
    $$('#view [data-del]').forEach(function (b) { b.onclick = function () { confirmDel('删除此任务？', async function () { await API.del('/tasks/' + b.dataset.del); toast('已删除'); viewTasks(); }); }; });
    bindPager(function (p) { fTasks.page = p; viewTasks(); });
  }

  var fProjects = { page: 1 };
  async function projectCreateModal() {
    var opts = await clientOptions();
    if (!opts.length) { toast('请先创建客户', true); return; }
    formModal('新建项目', [
      { name: 'clientId', label: '客户', type: 'select', options: opts },
      { name: 'projectName', label: '项目名称' },
      { name: 'description', label: '描述', type: 'textarea' },
      { name: 'status', label: '状态', type: 'select', options: PROJECT_STATUS, value: 'PENDING' },
      { name: 'dueDate', label: '截止日期', type: 'date' },
    ], '创建', async function (d) {
      var body = clean(d); if (body.dueDate) body.dueDate = new Date(body.dueDate).toISOString();
      await API.post('/projects', body); closeModal(); toast('项目已创建'); viewProjects();
    });
  }
  function projectEditModal(p) {
    formModal('编辑项目', [
      { name: 'projectName', label: '项目名称', value: p.projectName },
      { name: 'description', label: '描述', type: 'textarea', value: p.description },
      { name: 'status', label: '状态', type: 'select', options: PROJECT_STATUS, value: p.status },
      { name: 'dueDate', label: '截止日期', type: 'date', value: p.dueDate ? p.dueDate.slice(0, 10) : '' },
    ], '保存', async function (d) {
      var body = clean(d); if (body.dueDate) body.dueDate = new Date(body.dueDate).toISOString();
      await API.patch('/projects/' + p.id, body); closeModal(); toast('已保存'); viewProjects();
    });
  }
  async function viewProjects(parts) {
    if (parts && parts[0]) return viewProjectDetail(parts[0]);
    loading();
    var r = await API.get('/projects?page=' + fProjects.page + '&pageSize=15');
    var body;
    if (!r.items.length) {
      body = emptyState('▤', '暂无项目', '把客户的工作拆成项目来推进。', 'add', '+ 新建项目');
    } else {
      var rows = r.items.map(function (p) {
        return '<tr class="clickable" data-id="' + p.id + '"><td>' + esc(p.projectName) + '</td><td>' + badge(labelOf(PROJECT_STATUS, p.status), p.status === 'COMPLETED' ? 'green' : 'gold') + '</td><td>' + (p.dueDate ? fmtDay(p.dueDate) : '-') + '</td><td><div class="rowacts"><button class="b sm" data-edit="' + p.id + '">编辑</button><button class="b sm danger" data-del="' + p.id + '">删</button></div></td></tr>';
      }).join('');
      body = '<table class="tbl"><thead><tr><th>名称</th><th>状态</th><th>截止</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' + pagerHtml(r.total, r.page, r.pageSize);
    }
    setView('<div class="pv-head"><div><h1>项目</h1><p>共 ' + r.total + ' 个</p></div><button class="b primary" id="add">+ 新建项目</button></div><div class="panel">' + body + '</div>');
    var addBtn = $('#add'); if (addBtn) addBtn.onclick = projectCreateModal;
    $$('#view tr.clickable').forEach(function (tr) { tr.onclick = function () { location.hash = '#/projects/' + tr.dataset.id; }; });
    $$('#view [data-edit]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); projectEditModal(r.items.filter(function (x) { return x.id === b.dataset.edit; })[0]); }; });
    $$('#view [data-del]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); confirmDel('删除此项目？', async function () { await API.del('/projects/' + b.dataset.del); toast('已删除'); viewProjects(); }); }; });
    bindPager(function (p) { fProjects.page = p; viewProjects(); });
  }

  async function viewProjectDetail(id) {
    loading();
    var p = await API.get('/projects/' + id);
    var stages = Array.isArray(p.stages) ? p.stages.map(function (s) { return { name: s.name || '', done: !!s.done }; }) : [];
    var updates = p.updates || [];
    function stageHtml() {
      return stages.map(function (s, i) {
        return '<div class="ri-row2" data-i="' + i + '"><input type="checkbox" class="st-done"' + (s.done ? ' checked' : '') + '/><input class="st-name" value="' + esc(s.name) + '" placeholder="阶段名"/><button type="button" class="ri-del st-del">✕</button></div>';
      }).join('');
    }
    var updatesHtml = updates.map(function (u) {
      return '<li><div class="t">' + esc(u.body) + '</div><div class="d">' + fmtDate(u.createdAt) + (u.isClientVisible ? ' · ' + badge('客户可见', 'green') : ' · ' + badge('仅内部')) + '</div></li>';
    }).join('') || '<li class="d">暂无更新</li>';
    var done = stages.filter(function (s) { return s.done; }).length;
    setView(
      breadcrumb([{ label: '项目', href: '#/projects' }, { label: p.projectName }]) +
      '<div class="pv-head"><div><h1>' + esc(p.projectName) + '</h1><p>' + badge(labelOf(PROJECT_STATUS, p.status), p.status === 'COMPLETED' ? 'green' : 'gold') + (p.dueDate ? ' · 截止 ' + fmtDay(p.dueDate) : '') + '</p></div>' +
      '<div style="display:flex;gap:8px"><button class="b" id="pedit">编辑</button><button class="b" id="ptoggle">' + (p.isClientVisible ? '设为仅内部' : '设为客户可见') + '</button></div></div>' +
      '<div class="detail"><div class="panel"><h3>进度更新</h3><form class="chat-form" id="puForm" style="margin-bottom:14px"><input id="puBody" placeholder="写一条进度更新…" autocomplete="off"/><button class="b primary" type="submit">发布</button></form><ul class="tl">' + updatesHtml + '</ul></div>' +
      '<div class="panel"><h3>阶段（' + done + '/' + stages.length + '）</h3><div id="stList">' + stageHtml() + '</div><button class="b sm" id="stAdd" style="margin-top:8px">+ 添加阶段</button><button class="b sm primary" id="stSave" style="margin-top:8px;margin-left:6px">保存阶段</button>' +
      '<div style="margin-top:14px"><dl class="kv"><dt>描述</dt><dd>' + esc(p.description || '-') + '</dd><dt>客户可见</dt><dd>' + (p.isClientVisible ? '是' : '否') + '</dd></dl></div></div></div>');
    $('#pedit').onclick = function () { projectEditModal(p); };
    $('#ptoggle').onclick = async function () { await API.patch('/projects/' + id, { isClientVisible: !p.isClientVisible }); toast('已更新'); viewProjectDetail(id); };
    $('#puForm').onsubmit = async function (e) { e.preventDefault(); var v = $('#puBody').value.trim(); if (!v) return; await API.post('/projects/' + id + '/updates', { body: v }); toast('已发布'); viewProjectDetail(id); };
    function syncSt() { stages = $$('#stList .ri-row2').map(function (row) { return { name: $('.st-name', row).value, done: $('.st-done', row).checked }; }); }
    function bindSt() { $$('#stList .st-del').forEach(function (b) { b.onclick = function () { syncSt(); stages.splice(+b.closest('.ri-row2').getAttribute('data-i'), 1); $('#stList').innerHTML = stageHtml(); bindSt(); }; }); }
    bindSt();
    $('#stAdd').onclick = function () { syncSt(); stages.push({ name: '', done: false }); $('#stList').innerHTML = stageHtml(); bindSt(); };
    $('#stSave').onclick = async function () { syncSt(); await API.patch('/projects/' + id, { stages: stages.filter(function (s) { return s.name; }) }); toast('阶段已保存'); };
  }

  async function viewContracts() {
    loading();
    var r = await API.get('/contracts');
    var items = r.items || [];
    var body;
    if (!items.length) {
      body = emptyState('✎', '暂无合同', '从模板生成合同，发送给客户在线签署。', 'add', '+ 新建合同');
    } else {
      var rows = items.map(function (c) {
        var canSend = ['DRAFT', 'SENT', 'VIEWED'].indexOf(c.status) > -1;
        var acts = '<button class="b sm" data-view="' + c.id + '">查看</button>';
        if (c.status === 'DRAFT') acts += '<button class="b sm" data-cedit="' + c.id + '">编辑</button>';
        if (canSend) acts += '<button class="b sm" data-send="' + c.id + '">发送签署</button>';
        if (c.signedFileUrl) acts += '<button class="b sm" data-dl="' + esc(c.signedFileUrl) + '" data-name="' + esc(c.title) + '.html">下载</button>';
        if (c.status === 'DRAFT') acts += '<button class="b sm danger" data-del="' + c.id + '">删</button>';
        return '<tr><td>' + esc(c.title) + '</td><td>' + badge(c.status, c.status === 'SIGNED' ? 'green' : 'gold') + '</td><td><div class="rowacts">' + acts + '</div></td></tr>';
      }).join('');
      body = '<table class="tbl"><thead><tr><th>标题</th><th>状态</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    setView('<div class="pv-head"><div><h1>合同</h1></div><div style="display:flex;gap:8px"><button class="b" id="tpl">模板</button><button class="b primary" id="add">+ 新建合同</button></div></div>' +
      '<div class="panel">' + body + '</div>');
    function find(id) { return items.filter(function (x) { return x.id === id; })[0]; }
    $$('#view [data-view]').forEach(function (b) { b.onclick = function () { var c = find(b.dataset.view); openModal(c.title, '<div style="background:#fff;color:#111;border-radius:8px;padding:18px;max-height:60vh;overflow:auto">' + c.contentHtml + '</div>', {}); }; });
    $$('#view [data-cedit]').forEach(function (b) { b.onclick = function () {
      var c = find(b.dataset.cedit);
      formModal('编辑合同', [
        { name: 'title', label: '标题', value: c.title },
        { name: 'contentHtml', label: '内容(HTML)', type: 'textarea', value: c.contentHtml },
      ], '保存', async function (d) { await API.patch('/contracts/' + c.id, d); closeModal(); toast('已保存'); viewContracts(); });
    }; });
    $$('#view [data-dl]').forEach(function (b) { b.onclick = async function () { try { await API.download(b.dataset.dl, b.dataset.name); } catch (e) { toast(e.message, true); } }; });
    $$('#view [data-del]').forEach(function (b) { b.onclick = function () { confirmDel('删除此合同草稿？', async function () { await API.del('/contracts/' + b.dataset.del); toast('已删除'); viewContracts(); }); }; });
    $$('#view [data-send]').forEach(function (b) {
      b.onclick = async function () {
        var res = await API.post('/contracts/' + b.dataset.send + '/send', {});
        openModal('签署链接', '<p style="color:var(--muted);font-size:14px;margin-bottom:10px">发给客户签署：</p><div class="field"><input value="' + esc(res.signingUrl) + '" readonly/></div>', { submitLabel: '复制', onSubmit: function () { copy(res.signingUrl); } });
        viewContracts();
      };
    });
    $('#add').onclick = async function () {
      var opts = await clientOptions();
      var tpls = await API.get('/contracts/templates');
      var tplOpts = [['', '— 不用模板 —']].concat((tpls.items || []).map(function (t) { return [t.id, t.templateName]; }));
      formModal('新建合同', [
        { name: 'clientId', label: '客户', type: 'select', options: opts },
        { name: 'title', label: '标题' },
        { name: 'templateId', label: '模板(可选)', type: 'select', options: tplOpts },
        { name: 'contentHtml', label: '内容(HTML，不用模板时填)', type: 'textarea' },
      ], '创建', async function (d) {
        await API.post('/contracts', clean(d)); closeModal(); toast('合同已创建'); viewContracts();
      });
    };
    $('#tpl').onclick = async function () {
      var tpls = await API.get('/contracts/templates');
      var list = (tpls.items || []).map(function (t) { return '<li style="padding:8px 0;border-bottom:1px solid var(--line-soft)">' + esc(t.templateName) + '</li>'; }).join('') || '<li class="d">暂无模板</li>';
      openModal('合同模板', '<ul class="tl" style="margin-bottom:14px">' + list + '</ul><button class="b primary" id="newTpl">+ 新建模板</button>', {});
      $('#newTpl').onclick = function () {
        formModal('新建模板', [
          { name: 'templateName', label: '模板名称' },
          { name: 'contentHtml', label: '内容(HTML，支持 {{client_name}} 等占位符)', type: 'textarea', value: '<h2>服务协议</h2><p>客户：{{client_name}}</p><p>公司：{{company_name}}</p><p>日期：{{date}}</p>' },
        ], '创建', async function (d) { await API.post('/contracts/templates', d); closeModal(); toast('模板已创建'); });
      };
    };
  }

  async function viewInvoices() {
    loading();
    var r = await API.get('/invoices');
    var items = r.items || [];
    var body;
    if (!items.length) {
      body = emptyState('$', '暂无发票', '生成发票，附带银行转账信息发给客户。', 'add', '+ 新建发票');
    } else {
      var rows = items.map(function (i) {
        var actions = '<button class="b sm" data-detail="' + i.id + '">详情</button>';
        if (i.status === 'DRAFT') actions += '<button class="b sm" data-send="' + i.id + '">发送</button>';
        else if (i.status !== 'PAID' && i.status !== 'CANCELLED') actions += '<button class="b sm" data-paid="' + i.id + '">标记已付</button>';
        if (i.pdfUrl) actions += '<button class="b sm" data-dl="' + esc(i.pdfUrl) + '" data-name="' + esc(i.invoiceNumber) + '.html">下载</button>';
        return '<tr><td>' + esc(i.invoiceNumber) + '</td><td>' + esc(i.currency) + ' ' + esc(i.amount) + '</td><td>' + (i.dueDate ? fmtDay(i.dueDate) : '-') + '</td><td>' + badge(i.status, i.status === 'PAID' ? 'green' : (i.status === 'OVERDUE' ? 'red' : 'gold')) + '</td><td><div class="rowacts">' + actions + '</div></td></tr>';
      }).join('');
      body = '<table class="tbl"><thead><tr><th>编号</th><th>金额</th><th>到期</th><th>状态</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    setView('<div class="pv-head"><div><h1>发票</h1></div><button class="b primary" id="add">+ 新建发票</button></div><div class="panel">' + body + '</div>');
    function find(id) { return items.filter(function (x) { return x.id === id; })[0]; }
    $$('#view [data-detail]').forEach(function (b) { b.onclick = function () {
      var i = find(b.dataset.detail);
      var liBlock;
      if (Array.isArray(i.lineItems) && i.lineItems.length) {
        liBlock = '<table class="tbl" style="margin-bottom:10px"><thead><tr><th>描述</th><th style="text-align:right">数量</th><th style="text-align:right">单价</th><th style="text-align:right">金额</th></tr></thead><tbody>' +
          i.lineItems.map(function (x) { return '<tr><td>' + esc(x.description) + '</td><td style="text-align:right">' + x.quantity + '</td><td style="text-align:right">' + money(x.unitPrice) + '</td><td style="text-align:right">' + money(x.lineTotal) + '</td></tr>'; }).join('') +
          '</tbody></table><dl class="kv"><dt>小计</dt><dd>' + money(i.subtotal) + '</dd><dt>GST(' + Number(i.taxRate || 0) + '%)</dt><dd>' + money(i.taxAmount) + '</dd><dt>合计</dt><dd><strong>' + money(i.amount) + '</strong></dd></dl>';
      } else {
        liBlock = '<dl class="kv"><dt>金额</dt><dd>' + money(i.amount) + '</dd></dl>';
      }
      openModal('发票 ' + i.invoiceNumber, liBlock + '<dl class="kv">' +
        '<dt>状态</dt><dd>' + badge(i.status, i.status === 'PAID' ? 'green' : 'gold') + '</dd>' +
        '<dt>到期</dt><dd>' + (i.dueDate ? fmtDay(i.dueDate) : '-') + '</dd>' +
        '<dt>账户名</dt><dd>' + esc(i.bankAccountName || '-') + '</dd>' +
        '<dt>BSB</dt><dd>' + esc(i.bankBsb || '-') + '</dd>' +
        '<dt>账号</dt><dd>' + esc(i.bankAccountNumber || '-') + '</dd>' +
        '<dt>付款参考</dt><dd>' + esc(i.paymentReference || '-') + '</dd></dl>', {});
    }; });
    $$('#view [data-dl]').forEach(function (b) { b.onclick = async function () { try { await API.download(b.dataset.dl, b.dataset.name); } catch (e) { toast(e.message, true); } }; });
    $$('#view [data-send]').forEach(function (b) { b.onclick = async function () { await API.post('/invoices/' + b.dataset.send + '/send', {}); toast('已发送'); viewInvoices(); }; });
    $$('#view [data-paid]').forEach(function (b) { b.onclick = async function () { await API.post('/invoices/' + b.dataset.paid + '/mark-paid', {}); toast('已标记已付'); viewInvoices(); }; });
    $('#add').onclick = invoiceModal;
  }
  async function invoiceModal() {
    var opts = await clientOptions();
    if (!opts.length) { toast('请先创建客户', true); return; }
    var rows = [{ description: '', quantity: 1, unitPrice: 0 }];
    var gst = true;
    function totals() {
      var sub = rows.reduce(function (a, r) { return a + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0); }, 0);
      var tax = gst ? sub * 0.1 : 0;
      return { sub: sub, tax: tax, total: sub + tax };
    }
    function liHtml() {
      return rows.map(function (r, i) {
        return '<div class="li-row" data-i="' + i + '"><input class="li-desc" placeholder="描述" value="' + esc(r.description) + '"/><input class="li-qty" type="number" min="0" step="1" value="' + r.quantity + '"/><input class="li-price" type="number" min="0" step="0.01" value="' + r.unitPrice + '"/><span class="li-total">' + money((Number(r.quantity) || 0) * (Number(r.unitPrice) || 0)) + '</span><button type="button" class="li-del">✕</button></div>';
      }).join('');
    }
    function totalsHtml() { var t = totals(); return '小计 ' + money(t.sub) + ' · GST ' + money(t.tax) + ' · <strong>合计 ' + money(t.total) + '</strong>'; }
    var body = '<div class="field"><label>客户</label><select name="clientId">' + opts.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="li-head"><span>描述</span><span>数量</span><span>单价</span><span style="text-align:right">金额</span><span></span></div>' +
      '<div id="liList">' + liHtml() + '</div>' +
      '<button type="button" class="b sm" id="liAdd" style="margin:6px 0 12px">+ 添加明细</button>' +
      '<div class="field"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="gst" checked style="width:auto"/> 含 GST (10%)</label></div>' +
      '<div class="field"><label>到期日期</label><input name="dueDate" type="date"/></div>' +
      '<div id="liTotals" style="text-align:right;font-size:14px;margin-top:4px">' + totalsHtml() + '</div>';
    openModal('新建发票', body, {
      submitLabel: '创建',
      onSubmit: async function (host) {
        sync(host);
        var items = rows.filter(function (r) { return r.description && Number(r.quantity) > 0; }).map(function (r) { return { description: r.description, quantity: Number(r.quantity), unitPrice: Number(r.unitPrice) || 0 }; });
        if (!items.length) { toast('请至少填写一条明细', true); return; }
        var b = { clientId: $('select[name=clientId]', host).value, lineItems: items, taxRate: gst ? 10 : 0 };
        var due = $('input[name=dueDate]', host).value; if (due) b.dueDate = new Date(due).toISOString();
        var btn = $('[data-ms]', host); if (btn) btn.disabled = true;
        try { await API.post('/invoices', b); closeModal(); toast('发票已创建'); viewInvoices(); }
        catch (e) { toast(e.message, true); if (btn) btn.disabled = false; }
      },
    });
    var host = $('#modalHost');
    function sync(h) { $$('.li-row', h).forEach(function (el) { var i = +el.dataset.i; rows[i] = { description: $('.li-desc', el).value, quantity: $('.li-qty', el).value, unitPrice: $('.li-price', el).value }; }); }
    function rerender() { $('#liList', host).innerHTML = liHtml(); bindRows(); $('#liTotals', host).innerHTML = totalsHtml(); }
    function bindRows() {
      $$('.li-row', host).forEach(function (el) {
        ['.li-desc', '.li-qty', '.li-price'].forEach(function (sel) {
          $(sel, el).oninput = function () { sync(host); $('.li-total', el).textContent = money((Number($('.li-qty', el).value) || 0) * (Number($('.li-price', el).value) || 0)); $('#liTotals', host).innerHTML = totalsHtml(); };
        });
        $('.li-del', el).onclick = function () { sync(host); rows.splice(+el.dataset.i, 1); if (!rows.length) rows.push({ description: '', quantity: 1, unitPrice: 0 }); rerender(); };
      });
    }
    bindRows();
    $('#liAdd', host).onclick = function () { sync(host); rows.push({ description: '', quantity: 1, unitPrice: 0 }); rerender(); };
    $('#gst', host).onchange = function (e) { gst = e.target.checked; $('#liTotals', host).innerHTML = totalsHtml(); };
  }

  async function viewMessages(parts) {
    loading();
    if (parts && parts[0]) return viewThread(parts[0]);
    var r = await API.get('/conversations');
    var rows = (r.items || []).map(function (c) {
      var name = c.client ? c.client.firstName + ' ' + c.client.lastName : '客户';
      return '<tr class="clickable" data-id="' + c.id + '"><td>' + esc(name) + '</td><td>' + fmtDate(c.lastMessageAt) + '</td><td>' + (c.unread ? badge(c.unread + ' 未读', 'red') : '') + '</td></tr>';
    }).join('') || '<tr><td class="empty" colspan="3">暂无会话</td></tr>';
    setView('<div class="pv-head"><div><h1>消息</h1></div></div><div class="panel"><table class="tbl"><thead><tr><th>客户</th><th>最近</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    $$('#view tr.clickable').forEach(function (tr) { tr.onclick = function () { location.hash = '#/messages/' + tr.dataset.id; }; });
  }
  async function viewThread(id) {
    loading();
    var r = await API.get('/conversations/' + id + '/messages');
    var msgs = (r.items || []).map(function (m) {
      return '<div class="cmsg ' + (m.senderType === 'CLIENT' ? 'client' : 'staff') + '">' + esc(m.content) + '</div>';
    }).join('') || '<div class="loading">暂无消息</div>';
    setView('<div class="pv-head"><div><a class="app-side-link" href="#/messages">← 会话列表</a><h1>会话</h1></div></div>' +
      '<div class="panel chat-wrap"><div class="chat-list" id="cl">' + msgs + '</div>' +
      '<form class="chat-form" id="cf"><input id="ct" placeholder="输入回复…" autocomplete="off"/><button class="b primary" type="submit">发送</button></form></div>');
    var cl = $('#cl'); cl.scrollTop = cl.scrollHeight;
    $('#cf').onsubmit = async function (e) {
      e.preventDefault();
      var v = $('#ct').value.trim(); if (!v) return;
      $('#ct').value = '';
      await API.post('/conversations/' + id + '/messages', { content: v });
      viewThread(id);
    };
  }

  async function viewTeam() {
    loading();
    var r = await API.get('/members');
    var rows = (r.members || []).map(function (m) {
      return '<tr><td>' + esc((m.user.firstName || '') + ' ' + (m.user.lastName || '')) + '</td><td>' + esc(m.user.email) + '</td><td>' + badge(m.role, 'gold') + '</td></tr>';
    }).join('');
    var pend = (r.pendingInvitations || []).map(function (i) {
      return '<tr><td>' + esc(i.email) + '</td><td>' + badge(i.role) + '</td><td>' + badge('待接受', 'blue') + '</td></tr>';
    }).join('');
    setView('<div class="pv-head"><div><h1>团队</h1></div><button class="b primary" id="inv">+ 邀请成员</button></div>' +
      '<div class="panel"><h3>成员</h3><table class="tbl"><thead><tr><th>姓名</th><th>邮箱</th><th>角色</th></tr></thead><tbody>' + (rows || '<tr><td class="empty" colspan="3">—</td></tr>') + '</tbody></table></div>' +
      (pend ? '<div class="panel"><h3>待接受邀请</h3><table class="tbl"><tbody>' + pend + '</tbody></table></div>' : ''));
    $('#inv').onclick = function () {
      formModal('邀请成员', [
        { name: 'email', label: '邮箱', type: 'email' },
        { name: 'role', label: '角色', type: 'select', options: ROLES, value: 'STAFF' },
      ], '生成邀请', async function (d) {
        var res = await API.post('/members/invite', { email: d.email, role: d.role });
        var ilink = acceptLink(res.inviteUrl);
        openModal('邀请链接', '<p style="color:var(--muted);font-size:14px;margin-bottom:10px">把链接发给对方加入团队：</p><div class="field"><input value="' + esc(ilink) + '" readonly/></div>', { submitLabel: '复制', onSubmit: function () { copy(ilink); } });
        viewTeam();
      });
    };
  }

  var ROLES_DESC = [
    ['OWNER', '所有者', '最高权限，管理一切'],
    ['ADMIN', '管理员', '公司设置、成员、客户、合同、发票、集成、报表'],
    ['MANAGER', '经理', '团队客户、任务、项目、合同、发票'],
    ['STAFF', '员工', '分配给自己的客户、任务、消息、合同、发票、文件'],
    ['CLIENT', '客户', '只能访问自己的门户数据'],
  ];
  function prefRow(label, key, on) { return '<label class="pref-row"><span>' + label + '</span><input type="checkbox" data-pref="' + key + '"' + (on ? ' checked' : '') + '/></label>'; }
  async function viewSettings() {
    loading();
    var co = await API.get('/companies/current');
    var pay = await API.get('/payment-settings').catch(function () { return {}; });
    var wf = await API.get('/workflows').catch(function () { return { items: [] }; });
    var integ = await API.get('/integrations').catch(function () { return { items: [] }; });
    var prefs = await API.get('/notification-preferences').catch(function () { return { inAppEnabled: true, emailEnabled: true, smsEnabled: false }; });
    var wfRows = (wf.items || []).map(function (w) {
      return '<tr><td>' + esc(w.name) + '</td><td><button class="b sm" data-wf="' + w.id + '" data-on="' + w.isActive + '">' + (w.isActive ? '已启用' : '已停用') + '</button></td></tr>';
    }).join('');
    var roleRows = ROLES_DESC.map(function (r) { return '<tr><td>' + badge(r[1], 'gold') + '</td><td style="color:var(--muted);font-size:13px">' + esc(r[2]) + '</td></tr>'; }).join('');
    var connected = (integ.items || []).filter(function (i) { return i.status === 'CONNECTED' || i.status === 'MOCK_CONNECTED'; }).length;
    setView('<div class="pv-head"><div><h1>设置</h1></div></div>' +
      '<div class="grid2">' +
      '<div class="panel"><h3>公司资料 / 品牌</h3>' +
      fieldHtml({ name: 'name', label: '公司名称', value: co.name }) +
      fieldHtml({ name: 'abn', label: 'ABN', value: co.abn }) +
      '<div class="row2">' + fieldHtml({ name: 'phone', label: '电话', value: co.phone }) + fieldHtml({ name: 'email', label: '邮箱', value: co.email }) + '</div>' +
      fieldHtml({ name: 'logoUrl', label: 'Logo 链接', value: co.logoUrl }) +
      fieldHtml({ name: 'timezone', label: '时区', value: co.timezone }) +
      '<button class="b primary" id="saveCo">保存</button></div>' +
      '<div class="panel"><h3>收款设置</h3>' +
      fieldHtml({ name: 'accountName', label: '账户名', value: pay.accountName }) +
      '<div class="row2">' + fieldHtml({ name: 'bsb', label: 'BSB', value: pay.bsb }) + fieldHtml({ name: 'accountNumber', label: '账号', value: pay.accountNumber }) + '</div>' +
      '<button class="b primary" id="savePay">保存</button></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div class="panel"><h3>通知偏好</h3><div class="prefs">' + prefRow('应用内通知', 'inAppEnabled', prefs.inAppEnabled) + prefRow('邮件通知（占位）', 'emailEnabled', prefs.emailEnabled) + prefRow('短信通知（占位）', 'smsEnabled', prefs.smsEnabled) + '</div></div>' +
      '<div class="panel"><h3>安全</h3><div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start"><button class="b" id="chPwd">更改密码</button><button class="b" id="chEmail">更改邮箱</button></div></div>' +
      '</div>' +
      '<div class="grid2">' +
      '<div class="panel"><h3>角色与权限</h3><table class="tbl"><tbody>' + roleRows + '</tbody></table></div>' +
      '<div class="panel"><h3>API 密钥</h3><p style="color:var(--muted);font-size:13px;margin-bottom:10px">用于程序化访问 NovAI API。</p><button class="b" disabled style="opacity:.5">生成密钥（即将上线）</button></div>' +
      '</div>' +
      '<div class="panel"><h3>自动化工作流</h3><table class="tbl"><tbody>' + (wfRows || '<tr><td class="empty">—</td></tr>') + '</tbody></table></div>' +
      '<div class="panel"><h3>集成</h3><p style="color:var(--muted);font-size:13px">已连接 ' + connected + ' 个 · 共 16 个可接入。<a class="link-accent" href="#/integrations">前往集成市场 →</a></p></div>' +
      '<div class="panel"><h3>演示数据</h3><p style="color:var(--muted);font-size:13px;margin-bottom:10px">一键为当前工作区生成澳洲示例数据（客户 / 项目 / 任务 / 合同 / 发票 / 报告 / 公告 / 会话）。</p><button class="b primary" id="seedDemo">载入示例数据</button></div>');
    $('#saveCo').onclick = async function () {
      var body = clean({ name: $('[name=name]').value, abn: $('[name=abn]').value, phone: $('[name=phone]').value, email: $('[name=email]').value, logoUrl: $('[name=logoUrl]').value, timezone: $('[name=timezone]').value });
      try { await API.patch('/companies/current', body); toast('已保存'); } catch (e) { toast(e.message, true); }
    };
    $('#savePay').onclick = async function () {
      var body = clean({ accountName: $('[name=accountName]').value, bsb: $('[name=bsb]').value, accountNumber: $('[name=accountNumber]').value });
      try { await API.patch('/payment-settings', body); toast('已保存'); } catch (e) { toast(e.message, true); }
    };
    $('#chPwd').onclick = changePasswordModal;
    $('#chEmail').onclick = changeEmailModal;
    $('#seedDemo').onclick = async function () { var b = $('#seedDemo'); b.disabled = true; try { var r = await API.post('/dev/seed-demo', {}); toast(r.message || '已生成示例数据'); } catch (e) { toast(e.message, true); } b.disabled = false; };
    $$('#view [data-pref]').forEach(function (cb) { cb.onchange = async function () { var d = {}; d[cb.dataset.pref] = cb.checked; try { await API.patch('/notification-preferences', d); toast('已更新'); } catch (e) { toast(e.message, true); } }; });
    $$('#view [data-wf]').forEach(function (b) {
      b.onclick = async function () {
        var to = b.dataset.on !== 'true';
        await API.patch('/workflows/' + b.dataset.wf, { isActive: to });
        toast('已更新'); viewSettings();
      };
    });
  }

  var fFiles = { clientId: '' };
  async function uploadModal() {
    var opts = await clientOptions();
    var clientSel = '<select name="clientId"><option value="">— 不关联客户 —</option>' + opts.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    var visSel = '<select name="visibility"><option value="INTERNAL_ONLY">仅内部</option><option value="CLIENT_VISIBLE">客户可见</option></select>';
    openModal('上传文件', '<div class="field"><label>文件</label><input type="file" name="file"/></div>' +
      '<div class="field"><label>可见性</label>' + visSel + '</div>' +
      '<div class="field"><label>关联客户(可选)</label>' + clientSel + '</div>', {
      submitLabel: '上传',
      onSubmit: async function (host) {
        var fileEl = $('input[name=file]', host);
        if (!fileEl.files.length) { toast('请选择文件', true); return; }
        var fd = new FormData();
        fd.append('file', fileEl.files[0]);
        var cl = $('select[name=clientId]', host).value; if (cl) fd.append('clientId', cl);
        fd.append('visibility', $('select[name=visibility]', host).value);
        var btn = $('[data-ms]', host); if (btn) btn.disabled = true;
        try { await API.upload('/files/upload', fd); closeModal(); toast('已上传'); viewFiles(); }
        catch (e) { toast(e.message, true); if (btn) btn.disabled = false; }
      },
    });
  }
  async function viewFiles() {
    loading();
    var opts = await clientOptions();
    var r = await API.get('/files' + (fFiles.clientId ? '?clientId=' + fFiles.clientId : ''));
    var items = r.items || [];
    var body;
    if (!items.length && !fFiles.clientId) {
      body = emptyState('📎', '暂无文件', '上传文件，并标记是否对客户可见。', 'up', '上传文件');
    } else {
      var rows = items.map(function (f) {
        return '<tr><td>' + esc(f.fileName) + '</td><td>' + esc(f.fileType || '-') + '</td><td>' + (f.fileSize ? Math.round(f.fileSize / 1024) + ' KB' : '-') + '</td><td>' + badge(f.visibility === 'CLIENT_VISIBLE' ? '客户可见' : '仅内部', f.visibility === 'CLIENT_VISIBLE' ? 'green' : '') + '</td><td><div class="rowacts"><button class="b sm" data-dl="/api/v1/files/' + f.id + '/download" data-name="' + esc(f.fileName) + '">下载</button><button class="b sm danger" data-del="' + f.id + '">删</button></div></td></tr>';
      }).join('') || '<tr><td class="empty" colspan="5">没有匹配的文件</td></tr>';
      body = '<table class="tbl"><thead><tr><th>文件名</th><th>类型</th><th>大小</th><th>可见性</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
    var clientFilter = '<select id="ff"><option value="">全部客户</option>' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === fFiles.clientId ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    setView('<div class="pv-head"><div><h1>文件</h1></div><button class="b primary" id="up2">上传文件</button></div>' +
      '<div class="filterbar">' + clientFilter + '</div><div class="panel">' + body + '</div>');
    var up = $('#up'); if (up) up.onclick = uploadModal;
    $('#up2').onclick = uploadModal;
    $('#ff').onchange = function (e) { fFiles.clientId = e.target.value; viewFiles(); };
    $$('#view [data-dl]').forEach(function (b) { b.onclick = async function () { try { await API.download(b.dataset.dl, b.dataset.name); } catch (e) { toast(e.message, true); } }; });
    $$('#view [data-del]').forEach(function (b) { b.onclick = function () { confirmDel('删除此文件？', async function () { await API.del('/files/' + b.dataset.del); toast('已删除'); viewFiles(); }); }; });
  }

  async function viewAccount() {
    setView(skel(2) + skel(3));
    var me = await API.get('/auth/me');
    var ms = await API.get('/auth/memberships').catch(function () { return { items: [], currentCompanyId: '' }; });
    var u = me.user;
    var verified = !!u.emailVerifiedAt;
    var av = ((u.firstName || u.email || 'N').trim()[0] || 'N').toUpperCase();
    var wsRows = (ms.items || []).map(function (w) {
      var cur = w.companyId === ms.currentCompanyId;
      return '<tr><td>' + esc(w.companyName) + '</td><td>' + badge(w.role, 'gold') + '</td><td>' + (cur ? badge('当前', 'green') : '<button class="b sm" data-switch="' + w.companyId + '">切换到此</button>') + '</td></tr>';
    }).join('');
    setView('<div class="pv-head"><div><h1>个人信息</h1><p>账户与安全设置</p></div></div>' +
      '<div class="panel profile-hd"><div class="av-lg">' + esc(av) + '</div>' +
      '<div><div class="nm">' + esc((u.firstName || '') + ' ' + (u.lastName || '')) + '</div><div class="em">' + esc(u.email) + ' ' + (verified ? badge('已验证', 'green') : badge('未验证', 'red')) + '</div></div>' +
      '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap"><button class="b" id="editProfile">编辑资料</button>' + (verified ? '' : '<button class="b" id="verify">验证邮箱</button>') + '</div></div>' +
      '<div class="grid2">' +
      '<div class="panel"><h3>资料</h3><dl class="kv"><dt>姓名</dt><dd>' + esc((u.firstName || '') + ' ' + (u.lastName || '')) + '</dd>' +
      '<dt>邮箱</dt><dd>' + esc(u.email) + '</dd><dt>角色</dt><dd>' + esc(me.role || '-') + '</dd>' +
      '<dt>所属公司</dt><dd>' + esc(me.company ? me.company.name : '-') + '</dd>' +
      '<dt>注册时间</dt><dd>' + fmtDay(u.createdAt) + '</dd></dl></div>' +
      '<div class="panel"><h3>安全</h3><div style="display:flex;flex-direction:column;gap:10px;align-items:flex-start"><button class="b" id="chEmail">更改邮箱</button><button class="b" id="chPwd">更改密码</button></div></div>' +
      '</div>' +
      '<div class="panel"><h3>工作区</h3><table class="tbl"><thead><tr><th>名称</th><th>角色</th><th></th></tr></thead><tbody>' + (wsRows || '<tr><td class="empty" colspan="3">—</td></tr>') + '</tbody></table></div>');
    $('#editProfile').onclick = function () {
      formModal('编辑资料', [{ name: 'firstName', label: '名', value: u.firstName }, { name: 'lastName', label: '姓', value: u.lastName }], '保存', async function (d) {
        await API.patch('/auth/profile', clean(d)); closeModal(); toast('已保存');
        try { var m2 = await API.get('/auth/me'); $('#appUser').textContent = (m2.user.firstName || '') + (m2.company ? ' · ' + m2.company.name : ''); $('#appAv').textContent = ((m2.user.firstName || m2.user.email || 'N').trim()[0] || 'N').toUpperCase(); } catch (e) {}
        viewAccount();
      });
    };
    $('#chEmail').onclick = changeEmailModal;
    $('#chPwd').onclick = changePasswordModal;
    var vb = $('#verify');
    if (vb) vb.onclick = async function () {
      try { var r = await API.post('/auth/request-email-verification', {}); openModal('邮箱验证链接', '<p style="font-size:14px;color:var(--muted);margin-bottom:10px">点击下方链接完成验证（暂未发真邮件，先返回给你）：</p><div class="field"><input value="' + esc(r.verifyUrl) + '" readonly/></div>', { submitLabel: '复制', onSubmit: function () { copy(r.verifyUrl); } }); } catch (e) { toast(e.message, true); }
    };
    $$('#view [data-switch]').forEach(function (b) { b.onclick = async function () { try { var r = await API.post('/auth/switch', { companyId: b.dataset.switch }); localStorage.setItem('novai-access', r.accessToken); localStorage.setItem('novai-refresh', r.refreshToken); toast('已切换工作区'); location.reload(); } catch (e) { toast(e.message, true); } }; });
  }

  // ---- Report builder (paperless reports) ----
  var REPORT_STATUS = { DRAFT: '草稿', SENT: '已发送' };
  function renderReportPreview(rep) {
    var secs = (rep.sections || []).map(function (s) {
      var items = (s.items || []).map(function (it) {
        var v = it.value ? esc(it.value) : (it.checked ? '✓' : '');
        return '<tr><td style="padding:6px;border-bottom:1px solid #eee">' + esc(it.label || '') + '</td><td style="padding:6px;border-bottom:1px solid #eee">' + v + (it.note ? ' — ' + esc(it.note) : '') + '</td></tr>';
      }).join('');
      return '<h3>' + esc(s.title || '') + '</h3><table style="width:100%;border-collapse:collapse">' + items + '</table>';
    }).join('');
    return '<h2>' + esc(rep.title) + '</h2>' + secs + (rep.aiDraft ? '<hr/><p><strong>AI 摘要</strong><br/>' + esc(rep.aiDraft) + '</p>' : '');
  }
  async function reportTemplatesModal() {
    var t = await API.get('/report-templates').catch(function () { return { items: [] }; });
    var list = (t.items || []).map(function (x) { return '<li style="padding:8px 0;border-bottom:1px solid var(--line-soft)">' + esc(x.name) + (x.description ? ' <span style="color:var(--muted)">· ' + esc(x.description) + '</span>' : '') + '</li>'; }).join('') || '<li class="d">暂无模板</li>';
    openModal('报告模板', '<ul class="tl" style="margin-bottom:14px">' + list + '</ul><button class="b primary" id="newTpl">+ 新建模板</button>', {});
    $('#newTpl').onclick = function () {
      formModal('新建模板', [{ name: 'name', label: '模板名称' }, { name: 'description', label: '说明(可选)' }], '创建', async function (d) {
        await API.post('/report-templates', { name: d.name, description: d.description, sections: [{ title: '概况', items: [{ label: '项目', type: 'text' }] }] });
        closeModal(); toast('模板已创建');
      });
    };
  }
  async function viewReportDocs(parts) {
    if (parts && parts[0]) return viewReportEditor(parts[0]);
    loading();
    var r = await API.get('/reports');
    var rows = (r.items || []).map(function (x) {
      return '<tr><td>' + esc(x.title) + '</td><td>' + badge(REPORT_STATUS[x.status] || x.status, x.status === 'SENT' ? 'green' : 'gold') + '</td><td>' + fmtDate(x.createdAt) + '</td><td><div class="rowacts"><button class="b sm" data-edit="' + x.id + '">编辑</button>' + (x.pdfUrl ? '<button class="b sm" data-dl="' + esc(x.pdfUrl) + '" data-name="' + esc(x.title) + '.html">下载</button>' : '') + '<button class="b sm danger" data-del="' + x.id + '">删</button></div></td></tr>';
    }).join('');
    var body = (r.items || []).length ? '<table class="tbl"><thead><tr><th>标题</th><th>状态</th><th>创建</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' : emptyState('✎', '暂无报告', '用模板或空白创建一份无纸化报告，发送给客户。', 'add2', '+ 新建报告');
    setView('<div class="pv-head"><div><h1>报告</h1><p>无纸化报告 / 检查报告</p></div><div style="display:flex;gap:8px"><button class="b" id="tpl">模板</button><button class="b primary" id="add">+ 新建报告</button></div></div><div class="panel">' + body + '</div>');
    $$('#view [data-edit]').forEach(function (b) { b.onclick = function () { location.hash = '#/report/' + b.dataset.edit; }; });
    $$('#view [data-del]').forEach(function (b) { b.onclick = function () { confirmDel('删除此报告？', async function () { await API.del('/reports/' + b.dataset.del); toast('已删除'); viewReportDocs(); }); }; });
    $$('#view [data-dl]').forEach(function (b) { b.onclick = async function () { try { await API.download(b.dataset.dl, b.dataset.name); } catch (e) { toast(e.message, true); } }; });
    $('#tpl').onclick = reportTemplatesModal;
    var addFn = async function () {
      var opts = await clientOptions();
      var tpls = await API.get('/report-templates').catch(function () { return { items: [] }; });
      var tplOpts = [['', '— 空白 —']].concat((tpls.items || []).map(function (t) { return [t.id, t.name]; }));
      formModal('新建报告', [
        { name: 'title', label: '标题' },
        { name: 'clientId', label: '客户(可选)', type: 'select', options: [['', '—']].concat(opts) },
        { name: 'templateId', label: '模板(可选)', type: 'select', options: tplOpts },
      ], '创建', async function (d) {
        var res = await API.post('/reports', clean(d)); closeModal(); location.hash = '#/report/' + res.id;
      });
    };
    var a1 = $('#add'); if (a1) a1.onclick = addFn;
    var a2 = $('#add2'); if (a2) a2.onclick = addFn;
  }
  async function viewReportEditor(id) {
    loading();
    var rep = await API.get('/reports/' + id);
    rep.sections = Array.isArray(rep.sections) ? rep.sections : [];
    function sync() {
      $$('#repBody .rep-sec').forEach(function (sec) {
        var si = +sec.getAttribute('data-si');
        if (!rep.sections[si]) return;
        rep.sections[si].title = $('.rs-title', sec).value;
        rep.sections[si].items = $$('.ri-row', sec).map(function (row) {
          return { label: $('.ri-label', row).value, value: $('.ri-value', row).value, note: $('.ri-note', row).value, checked: $('.ri-checked', row).checked };
        });
      });
    }
    function render() {
      var secs = rep.sections.map(function (s, si) {
        var items = (s.items || []).map(function (it) {
          return '<div class="ri-row"><input class="ri-label" placeholder="项目" value="' + esc(it.label || '') + '"/><input class="ri-value" placeholder="结果" value="' + esc(it.value || '') + '"/><input class="ri-note" placeholder="备注" value="' + esc(it.note || '') + '"/><label class="ri-chk"><input type="checkbox" class="ri-checked"' + (it.checked ? ' checked' : '') + '/></label><button class="ri-del">✕</button></div>';
        }).join('');
        return '<div class="rep-sec" data-si="' + si + '"><div class="rep-sec-h"><input class="rs-title" placeholder="章节标题" value="' + esc(s.title || '') + '"/><button class="b sm danger rs-del">删章节</button></div>' + items + '<button class="b sm ri-add">+ 添加条目</button></div>';
      }).join('');
      $('#repBody').innerHTML = secs + '<button class="b" id="secAdd" style="margin-top:12px">+ 添加章节</button>';
      $$('#repBody .rs-del').forEach(function (b) { b.onclick = function () { sync(); rep.sections.splice(+b.closest('.rep-sec').getAttribute('data-si'), 1); render(); }; });
      $$('#repBody .ri-add').forEach(function (b) { b.onclick = function () { sync(); var si = +b.closest('.rep-sec').getAttribute('data-si'); rep.sections[si].items = rep.sections[si].items || []; rep.sections[si].items.push({ label: '', value: '', note: '', checked: false }); render(); }; });
      $$('#repBody .ri-del').forEach(function (b) { b.onclick = function () { sync(); var row = b.closest('.ri-row'), sec = row.closest('.rep-sec'); var si = +sec.getAttribute('data-si'), ii = $$('.ri-row', sec).indexOf(row); rep.sections[si].items.splice(ii, 1); render(); }; });
      $('#secAdd').onclick = function () { sync(); rep.sections.push({ title: '新章节', items: [] }); render(); };
    }
    setView(breadcrumb([{ label: '报告', href: '#/report' }, { label: rep.title }]) +
      '<div class="pv-head"><div><h1>' + esc(rep.title) + '</h1><p>' + badge(REPORT_STATUS[rep.status] || rep.status, rep.status === 'SENT' ? 'green' : 'gold') + '</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="b" id="ai">AI 摘要</button><button class="b" id="preview">预览</button><button class="b" id="save">保存</button><button class="b primary" id="send">发送给客户</button></div></div>' +
      (rep.aiDraft ? '<div class="panel"><h3>AI 摘要</h3><p style="font-size:14px;color:var(--muted)">' + esc(rep.aiDraft) + '</p></div>' : '') +
      '<div class="panel"><div class="field"><label>报告标题</label><input id="repTitle" value="' + esc(rep.title) + '"/></div><div id="repBody"></div></div>');
    $('#repTitle').oninput = function (e) { rep.title = e.target.value; };
    render();
    $('#save').onclick = async function () { sync(); await API.patch('/reports/' + id, { title: rep.title, sections: rep.sections }); toast('已保存'); };
    $('#ai').onclick = async function () { var res = await API.post('/reports/' + id + '/ai-draft-placeholder', {}); rep.aiDraft = res.aiDraft; toast('已生成 AI 摘要'); viewReportEditor(id); };
    $('#send').onclick = async function () { sync(); await API.patch('/reports/' + id, { title: rep.title, sections: rep.sections }); await API.post('/reports/' + id + '/send', {}); toast('已发送给客户'); viewReportEditor(id); };
    $('#preview').onclick = function () { sync(); openModal(rep.title, '<div style="background:#fff;color:#111;border-radius:8px;padding:16px;max-height:60vh;overflow:auto">' + renderReportPreview(rep) + '</div>', {}); };
  }

  // ---- Integrations marketplace ----
  var INTEGRATIONS = [
    { p: 'GMAIL', name: 'Gmail', cat: '邮件' }, { p: 'OUTLOOK', name: 'Outlook', cat: '邮件' },
    { p: 'XERO', name: 'Xero', cat: '财务' }, { p: 'MYOB', name: 'MYOB', cat: '财务' },
    { p: 'STRIPE', name: 'Stripe', cat: '支付' }, { p: 'PAYPAL', name: 'PayPal', cat: '支付' },
    { p: 'DOCUSIGN', name: 'DocuSign', cat: '电子签' },
    { p: 'GOOGLE_DRIVE', name: 'Google Drive', cat: '文件' }, { p: 'ONEDRIVE', name: 'OneDrive', cat: '文件' }, { p: 'SHAREPOINT', name: 'SharePoint', cat: '文件' },
    { p: 'SLACK', name: 'Slack', cat: '沟通' }, { p: 'TEAMS', name: 'Microsoft Teams', cat: '沟通' },
    { p: 'OFFICERND', name: 'OfficeRnD', cat: '行业', soon: true }, { p: 'PROPERTYME', name: 'PropertyMe', cat: '行业', soon: true },
    { p: 'UNLEASHED', name: 'Unleashed', cat: '行业', soon: true }, { p: 'INSPECTION_EXPRESS', name: 'Inspection Express', cat: '行业', soon: true },
  ];
  function intStatusBadge(st) {
    if (st === 'MOCK_CONNECTED') return badge('已模拟连接', 'green');
    if (st === 'CONNECTED') return badge('已连接', 'green');
    if (st === 'ERROR') return badge('错误', 'red');
    return badge('未连接');
  }
  async function viewIntegrations() {
    loading();
    var r = await API.get('/integrations').catch(function () { return { items: [] }; });
    var map = {}; (r.items || []).forEach(function (i) { map[i.provider] = i.status; });
    var cards = INTEGRATIONS.map(function (it) {
      var st = map[it.p] || 'DISCONNECTED';
      var connected = st === 'MOCK_CONNECTED' || st === 'CONNECTED';
      var actions = it.soon ? '<span class="badge gold">即将上线</span>'
        : (connected ? '<button class="b sm" data-logs="' + it.p + '">日志</button><button class="b sm danger" data-disc="' + it.p + '">断开</button>'
          : '<button class="b sm primary" data-mock="' + it.p + '">模拟连接</button>');
      return '<div class="int-card"><div class="int-top"><div class="int-icon">' + esc(it.name[0]) + '</div><div><div class="int-name">' + esc(it.name) + '</div><div class="int-cat">' + esc(it.cat) + '</div></div></div>' +
        '<div class="int-foot"><span>' + (it.soon ? badge('即将上线', 'gold') : intStatusBadge(st)) + '</span><div class="rowacts">' + actions + '</div></div></div>';
    }).join('');
    setView('<div class="pv-head"><div><h1>集成</h1><p>连接你日常用的工具（当前为模拟连接，未接入真实 API）</p></div></div><div class="int-grid">' + cards + '</div>');
    $$('#view [data-mock]').forEach(function (b) { b.onclick = async function () { await API.post('/integrations/' + b.dataset.mock + '/mock-connect', {}); toast('已模拟连接'); viewIntegrations(); }; });
    $$('#view [data-disc]').forEach(function (b) { b.onclick = async function () { await API.del('/integrations/' + b.dataset.disc); toast('已断开'); viewIntegrations(); }; });
    $$('#view [data-logs]').forEach(function (b) { b.onclick = async function () { var l = await API.get('/integrations/' + b.dataset.logs + '/logs'); var list = (l.items || []).map(function (x) { return '<li><div class="t">' + esc(x.event) + '</div><div class="d">' + esc(x.message || '') + ' · ' + fmtDate(x.createdAt) + '</div></li>'; }).join('') || '<li class="d">暂无日志</li>'; openModal('集成日志', '<ul class="tl">' + list + '</ul>', {}); }; });
  }

  // ---- Automations ----
  async function viewAutomations() {
    loading();
    var r = await API.get('/workflows').catch(function () { return { items: [] }; });
    var cards = (r.items || []).map(function (w) {
      return '<div class="panel" style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:14px"><div><div style="font-size:15px">' + esc(w.name) + '</div><div style="color:var(--muted);font-size:12.5px;margin-top:3px">触发：' + esc(w.triggerType) + '</div></div>' +
        '<div class="rowacts"><button class="b sm" data-test="' + w.id + '">测试运行</button><button class="b sm ' + (w.isActive ? 'primary' : '') + '" data-wf="' + w.id + '" data-on="' + w.isActive + '">' + (w.isActive ? '已启用' : '已停用') + '</button></div></div>';
    }).join('') || '<p class="loading">暂无自动化</p>';
    setView('<div class="pv-head"><div><h1>自动化</h1><p>固定工作流模板（开启后由后台定时/事件触发）</p></div></div>' + cards);
    $$('#view [data-wf]').forEach(function (b) { b.onclick = async function () { await API.patch('/workflows/' + b.dataset.wf, { isActive: b.dataset.on !== 'true' }); toast('已更新'); viewAutomations(); }; });
    $$('#view [data-test]').forEach(function (b) { b.onclick = async function () { var res = await API.post('/workflows/' + b.dataset.test + '/run-test', {}); toast(res.message || '已触发测试运行'); }; });
  }

  // ---- Announcements ----
  var ANN_TARGET = [['ALL_CLIENTS', '所有客户'], ['SELECTED_CLIENTS', '指定客户'], ['TAGS', '按标签']];
  async function viewAnnouncements() {
    loading();
    var r = await API.get('/announcements').catch(function () { return { items: [] }; });
    var rows = (r.items || []).map(function (a) {
      return '<tr><td>' + esc(a.title) + '</td><td>' + badge(labelOf(ANN_TARGET, a.targetType)) + '</td><td>' + (a.publishedAt ? badge('已发布', 'green') : badge('草稿', 'gold')) + '</td><td>' + fmtDate(a.createdAt) + '</td><td><div class="rowacts">' + (a.publishedAt ? '' : '<button class="b sm primary" data-pub="' + a.id + '">发布</button>') + '<button class="b sm danger" data-del="' + a.id + '">删</button></div></td></tr>';
    }).join('');
    var body = (r.items || []).length ? '<table class="tbl"><thead><tr><th>标题</th><th>对象</th><th>状态</th><th>创建</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' : emptyState('📣'.replace('📣', '✦'), '暂无公告', '向客户发布更新公告，会显示在客户门户。', 'add', '+ 新建公告');
    setView('<div class="pv-head"><div><h1>公告</h1><p>面向客户的更新通知</p></div><button class="b primary" id="addA">+ 新建公告</button></div><div class="panel">' + body + '</div>');
    var addFn = function () {
      formModal('新建公告', [
        { name: 'title', label: '标题' },
        { name: 'content', label: '内容', type: 'textarea' },
        { name: 'targetType', label: '发送对象', type: 'select', options: ANN_TARGET, value: 'ALL_CLIENTS' },
        { name: 'publish', label: '立即发布', type: 'select', options: [['yes', '是'], ['no', '否（存草稿）']], value: 'yes' },
      ], '创建', async function (d) {
        await API.post('/announcements', { title: d.title, content: d.content, targetType: d.targetType, publish: d.publish === 'yes' });
        closeModal(); toast('已创建'); viewAnnouncements();
      });
    };
    var a1 = $('#addA'); if (a1) a1.onclick = addFn;
    var a2 = $('#add'); if (a2) a2.onclick = addFn;
    $$('#view [data-pub]').forEach(function (b) { b.onclick = async function () { await API.post('/announcements/' + b.dataset.pub + '/publish', {}); toast('已发布'); viewAnnouncements(); }; });
    $$('#view [data-del]').forEach(function (b) { b.onclick = function () { confirmDel('删除此公告？', async function () { await API.del('/announcements/' + b.dataset.del); toast('已删除'); viewAnnouncements(); }); }; });
  }

  // ---- Email module (mock) ----
  async function viewEmail() {
    loading();
    var res = await Promise.all([
      API.get('/mailboxes').catch(function () { return { items: [] }; }),
      API.get('/emails').catch(function () { return { items: [] }; }),
      API.get('/email-templates').catch(function () { return { items: [] }; }),
    ]);
    var mb = res[0].items || [], em = (res[1].items) || [], tpls = res[2].items || [];
    var mbRows = mb.map(function (m) { return '<tr><td>' + esc(m.emailAddress) + '</td><td>' + badge(m.provider) + '</td><td>' + badge(m.syncStatus || '待授权', m.syncStatus === 'SYNCED' ? 'green' : '') + '</td><td><div class="rowacts"><button class="b sm" data-sync="' + m.id + '">模拟同步</button><button class="b sm danger" data-mdel="' + m.id + '">删</button></div></td></tr>'; }).join('') || '<tr><td class="empty" colspan="4">未连接邮箱</td></tr>';
    var emRows = em.map(function (e) { return '<tr><td>' + badge(e.direction === 'INBOUND' ? '收' : '发', e.direction === 'INBOUND' ? 'blue' : 'gold') + '</td><td>' + esc(e.subject || '(无主题)') + '</td><td>' + esc(e.direction === 'INBOUND' ? e.fromEmail : e.toEmail) + '</td><td>' + fmtDate(e.createdAt) + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="4">暂无邮件</td></tr>';
    var tplRows = tpls.map(function (t) { return '<tr><td>' + esc(t.name) + '</td><td>' + esc(t.subject) + '</td><td><button class="b sm danger" data-tdel="' + t.id + '">删</button></td></tr>'; }).join('') || '<tr><td class="empty" colspan="3">暂无模板</td></tr>';
    setView('<div class="pv-head"><div><h1>邮箱</h1><p>邮件集成（模拟，未接入真实 Gmail/Outlook）</p></div><div style="display:flex;gap:8px"><button class="b" data-conn="GMAIL">连接 Gmail</button><button class="b" data-conn="OUTLOOK">连接 Outlook</button></div></div>' +
      '<div class="panel"><h3>邮箱（最多 2 个）</h3><table class="tbl"><thead><tr><th>地址</th><th>提供商</th><th>状态</th><th></th></tr></thead><tbody>' + mbRows + '</tbody></table></div>' +
      '<div class="panel"><h3>邮件</h3><table class="tbl"><thead><tr><th>方向</th><th>主题</th><th>对方</th><th>时间</th></tr></thead><tbody>' + emRows + '</tbody></table></div>' +
      '<div class="panel"><h3>邮件模板 <button class="b sm" id="addTpl" style="float:right">+ 新建模板</button></h3><table class="tbl"><thead><tr><th>名称</th><th>主题</th><th></th></tr></thead><tbody>' + tplRows + '</tbody></table></div>');
    $$('#view [data-conn]').forEach(function (b) { b.onclick = function () { var prov = b.dataset.conn; formModal('连接 ' + prov + '（模拟）', [{ name: 'emailAddress', label: '邮箱地址', type: 'email' }, { name: 'displayName', label: '显示名称(可选)' }], '连接', async function (d) { await API.post('/mailboxes/connect', { provider: prov, emailAddress: d.emailAddress, displayName: d.displayName }); closeModal(); toast('已连接（模拟）'); viewEmail(); }); }; });
    $$('#view [data-sync]').forEach(function (b) { b.onclick = async function () { var r = await API.post('/mailboxes/' + b.dataset.sync + '/mock-sync', {}); toast('已同步 ' + (r.synced || 0) + ' 封'); viewEmail(); }; });
    $$('#view [data-mdel]').forEach(function (b) { b.onclick = function () { confirmDel('删除此邮箱？', async function () { await API.del('/mailboxes/' + b.dataset.mdel); toast('已删除'); viewEmail(); }); }; });
    $$('#view [data-tdel]').forEach(function (b) { b.onclick = function () { confirmDel('删除此模板？', async function () { await API.del('/email-templates/' + b.dataset.tdel); toast('已删除'); viewEmail(); }); }; });
    $('#addTpl').onclick = function () { formModal('新建邮件模板', [{ name: 'name', label: '模板名称' }, { name: 'subject', label: '邮件主题' }, { name: 'bodyHtml', label: '内容(HTML，支持 {{client_name}} 等)', type: 'textarea' }], '创建', async function (d) { await API.post('/email-templates', d); closeModal(); toast('已创建'); viewEmail(); }); };
  }

  // ---- Audit logs ----
  var AUDIT_ENTITIES = ['', 'client', 'contract', 'invoice', 'project', 'task', 'report', 'file', 'integration', 'workflow', 'member', 'mailbox', 'announcement'];
  var fAudit = { page: 1, entityType: '', action: '' };
  async function viewAudit() {
    loading();
    var qs = '?page=' + fAudit.page + '&pageSize=30';
    if (fAudit.entityType) qs += '&entityType=' + encodeURIComponent(fAudit.entityType);
    if (fAudit.action) qs += '&action=' + encodeURIComponent(fAudit.action);
    var r;
    try { r = await API.get('/audit-logs' + qs); }
    catch (e) {
      setView('<div class="pv-head"><div><h1>审计日志</h1></div></div><div class="panel"><p class="loading">' + (e.status === 403 ? '需要管理员权限查看审计日志。' : esc(e.message)) + '</p></div>');
      return;
    }
    var items = r.items || [];
    var rows = items.map(function (a) { return '<tr class="clickable" data-id="' + a.id + '"><td>' + esc(a.action) + '</td><td>' + esc(a.entityType || '-') + '</td><td>' + fmtDate(a.createdAt) + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="3">暂无记录</td></tr>';
    var entOpts = AUDIT_ENTITIES.map(function (e) { return '<option value="' + e + '"' + (e === fAudit.entityType ? ' selected' : '') + '>' + (e || '全部实体') + '</option>'; }).join('');
    setView('<div class="pv-head"><div><h1>审计日志</h1><p>共 ' + r.total + ' 条</p></div></div>' +
      '<div class="filterbar"><input type="search" id="aq" placeholder="搜索动作，如 invoice.send" value="' + esc(fAudit.action) + '"/><select id="ae">' + entOpts + '</select></div>' +
      '<div class="panel"><table class="tbl"><thead><tr><th>动作</th><th>实体</th><th>时间</th></tr></thead><tbody>' + rows + '</tbody></table>' + pagerHtml(r.total, r.page, r.pageSize) + '</div>');
    $('#aq').oninput = debounce(function (e) { fAudit.action = e.target.value.trim(); fAudit.page = 1; viewAudit(); }, 350);
    $('#ae').onchange = function (e) { fAudit.entityType = e.target.value; fAudit.page = 1; viewAudit(); };
    bindPager(function (p) { fAudit.page = p; viewAudit(); });
    $$('#view tr.clickable').forEach(function (tr) {
      tr.onclick = function () {
        var a = items.filter(function (x) { return x.id === tr.dataset.id; })[0];
        function pre(v) { return v == null ? '<span style="color:var(--muted)">—</span>' : '<pre style="white-space:pre-wrap;font-size:12px;background:var(--bg-3);padding:10px;border-radius:8px;overflow:auto;max-height:30vh">' + esc(JSON.stringify(v, null, 2)) + '</pre>'; }
        openModal(a.action, '<dl class="kv"><dt>实体</dt><dd>' + esc(a.entityType || '-') + (a.entityId ? ' · ' + esc(a.entityId).slice(0, 8) : '') + '</dd><dt>时间</dt><dd>' + fmtDate(a.createdAt) + '</dd><dt>IP</dt><dd>' + esc(a.ip || a.ipAddress || '-') + '</dd></dl>' +
          '<div style="margin-top:10px"><div style="color:var(--muted);font-size:12px;margin-bottom:4px">旧值</div>' + pre(a.oldValue) + '<div style="color:var(--muted);font-size:12px;margin:8px 0 4px">新值</div>' + pre(a.newValue) + '</div>', {});
      };
    });
  }

  // ======================= CLIENT PORTAL =======================
  function dl(pdfUrl, name) { return pdfUrl ? '<button class="b sm" data-pdl="' + esc(pdfUrl) + '" data-pn="' + esc(name) + '">下载</button>' : ''; }
  function bindPortalDownloads() { $$('#view [data-pdl]').forEach(function (b) { b.onclick = async function () { try { await API.download(b.dataset.pdl, b.dataset.pn); } catch (e) { toast(e.message, true); } }; }); }

  async function pOverview() {
    loading();
    var me = await API.get('/portal/me');
    var c = me.client, co = me.company;
    var res = await Promise.all([
      API.get('/portal/projects').then(function (r) { return r.items; }).catch(function () { return []; }),
      API.get('/portal/invoices').then(function (r) { return r.items; }).catch(function () { return []; }),
      API.get('/portal/contracts').then(function (r) { return r.items; }).catch(function () { return []; }),
    ]);
    var projects = res[0], invoices = res[1], contracts = res[2];
    var unpaid = invoices.filter(function (i) { return ['UNPAID', 'OVERDUE', 'SENT'].indexOf(i.status) > -1; }).length;
    var unsigned = contracts.filter(function (x) { return x.status === 'SENT' || x.status === 'VIEWED'; }).length;
    var pl = projects.slice(0, 6).map(function (p) { return '<li><div class="t">' + esc(p.projectName) + '</div><div class="d">' + badge(labelOf(PROJECT_STATUS, p.status), p.status === 'COMPLETED' ? 'green' : 'gold') + (p.dueDate ? ' · 截止 ' + fmtDay(p.dueDate) : '') + '</div></li>'; }).join('') || '<li class="d">暂无项目</li>';
    setView('<div class="pv-head"><div><h1>你好，' + esc(c.firstName || '') + '</h1><p>' + esc(co ? co.name : '') + ' · 客户门户</p></div></div>' +
      '<div class="kpi-grid">' + kpi('▤', projects.length, '我的项目') + kpi('✎', unsigned, '待签合同', unsigned > 0) + kpi('$', unpaid, '待付发票', unpaid > 0) + '</div>' +
      '<div class="panel"><h3>项目进展</h3><ul class="tl">' + pl + '</ul></div>');
  }
  async function pProjects() {
    loading();
    var items = (await API.get('/portal/projects')).items || [];
    var rows = items.map(function (p) { return '<tr><td>' + esc(p.projectName) + '</td><td>' + badge(labelOf(PROJECT_STATUS, p.status), p.status === 'COMPLETED' ? 'green' : 'gold') + '</td><td>' + (p.dueDate ? fmtDay(p.dueDate) : '-') + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="3">暂无项目</td></tr>';
    setView('<div class="pv-head"><div><h1>我的项目</h1></div></div><div class="panel"><table class="tbl"><thead><tr><th>名称</th><th>状态</th><th>截止</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
  }
  async function pContracts() {
    loading();
    var items = (await API.get('/portal/contracts')).items || [];
    var rows = items.map(function (x) { return '<tr><td>' + esc(x.title) + '</td><td>' + badge(x.status, x.status === 'SIGNED' ? 'green' : 'gold') + '</td><td>' + dl(x.signedFileUrl, x.title + '.html') + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="3">暂无合同</td></tr>';
    setView('<div class="pv-head"><div><h1>我的合同</h1><p>待签合同请查收对方发来的签署链接</p></div></div><div class="panel"><table class="tbl"><thead><tr><th>标题</th><th>状态</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    bindPortalDownloads();
  }
  async function pInvoices() {
    loading();
    var items = (await API.get('/portal/invoices')).items || [];
    var rows = items.map(function (i) { return '<tr class="clickable" data-id="' + i.id + '"><td>' + esc(i.invoiceNumber) + '</td><td>' + money(i.amount) + '</td><td>' + (i.dueDate ? fmtDay(i.dueDate) : '-') + '</td><td>' + badge(i.status, i.status === 'PAID' ? 'green' : (i.status === 'OVERDUE' ? 'red' : 'gold')) + '</td><td>' + dl(i.pdfUrl, i.invoiceNumber + '.html') + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="5">暂无发票</td></tr>';
    setView('<div class="pv-head"><div><h1>我的发票</h1></div></div><div class="panel"><table class="tbl"><thead><tr><th>编号</th><th>金额</th><th>到期</th><th>状态</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    bindPortalDownloads();
    $$('#view tr.clickable').forEach(function (tr) {
      tr.onclick = function (e) {
        if (e.target.closest('[data-pdl]')) return;
        var i = items.filter(function (x) { return x.id === tr.dataset.id; })[0];
        openModal('发票 ' + i.invoiceNumber, '<dl class="kv"><dt>金额</dt><dd>' + money(i.amount) + '</dd><dt>状态</dt><dd>' + badge(i.status) + '</dd><dt>账户名</dt><dd>' + esc(i.bankAccountName || '-') + '</dd><dt>BSB</dt><dd>' + esc(i.bankBsb || '-') + '</dd><dt>账号</dt><dd>' + esc(i.bankAccountNumber || '-') + '</dd><dt>付款参考</dt><dd>' + esc(i.paymentReference || '-') + '</dd></dl>', {});
      };
    });
  }
  async function pFiles() {
    loading();
    var items = (await API.get('/portal/files')).items || [];
    var rows = items.map(function (f) { return '<tr><td>' + esc(f.fileName) + '</td><td>' + (f.fileSize ? Math.round(f.fileSize / 1024) + ' KB' : '-') + '</td><td><button class="b sm" data-pdl="/api/v1/files/' + f.id + '/download" data-pn="' + esc(f.fileName) + '">下载</button></td></tr>'; }).join('') || '<tr><td class="empty" colspan="3">暂无文件</td></tr>';
    setView('<div class="pv-head"><div><h1>我的文件</h1></div></div><div class="panel"><table class="tbl"><thead><tr><th>文件名</th><th>大小</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    bindPortalDownloads();
  }
  async function pReports() {
    loading();
    var items = (await API.get('/portal/reports')).items || [];
    var rows = items.map(function (x) { return '<tr><td>' + esc(x.title) + '</td><td>' + fmtDate(x.sentAt) + '</td><td>' + dl(x.pdfUrl, x.title + '.html') + '</td></tr>'; }).join('') || '<tr><td class="empty" colspan="3">暂无报告</td></tr>';
    setView('<div class="pv-head"><div><h1>我的报告</h1></div></div><div class="panel"><table class="tbl"><thead><tr><th>标题</th><th>发送时间</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    bindPortalDownloads();
  }
  async function pAnnouncements() {
    loading();
    var items = (await API.get('/portal/announcements')).items || [];
    var list = items.map(function (a) { return '<div class="panel"><h3>' + esc(a.title) + '</h3><p style="font-size:14px;white-space:pre-wrap">' + esc(a.content) + '</p><div class="d" style="color:var(--muted);font-size:12px;margin-top:8px">' + fmtDate(a.publishedAt) + '</div></div>'; }).join('') || '<div class="panel"><p class="loading">暂无公告</p></div>';
    setView('<div class="pv-head"><div><h1>公告</h1></div></div>' + list);
  }
  async function pMessages() {
    loading();
    var r = await API.get('/portal/messages');
    var msgs = (r.messages || []).map(function (m) { return '<div class="cmsg ' + (m.senderType === 'CLIENT' ? 'staff' : 'client') + '">' + esc(m.content) + '</div>'; }).join('') || '<div class="loading">还没有消息，发条消息开始吧</div>';
    setView('<div class="pv-head"><div><h1>消息</h1></div></div><div class="panel chat-wrap"><div class="chat-list" id="cl">' + msgs + '</div><form class="chat-form" id="cf"><input id="ct" placeholder="输入消息…" autocomplete="off"/><button class="b primary" type="submit">发送</button></form></div>');
    var cl = $('#cl'); cl.scrollTop = cl.scrollHeight;
    $('#cf').onsubmit = async function (e) { e.preventDefault(); var v = $('#ct').value.trim(); if (!v) return; $('#ct').value = ''; await API.post('/portal/messages', { content: v }); pMessages(); };
  }
  async function pProfile() {
    loading();
    var me = await API.get('/portal/me');
    var c = me.client;
    setView('<div class="pv-head"><div><h1>我的资料</h1></div></div>' +
      '<div class="grid2"><div class="panel"><h3>资料</h3><dl class="kv"><dt>姓名</dt><dd>' + esc((c.firstName || '') + ' ' + (c.lastName || '')) + '</dd><dt>邮箱</dt><dd>' + esc(c.email || '-') + '</dd><dt>电话</dt><dd>' + esc(c.phone || '-') + '</dd><dt>所属</dt><dd>' + esc(me.company ? me.company.name : '-') + '</dd></dl></div>' +
      '<div class="panel"><h3>安全</h3><button class="b" id="chPwd">更改密码</button></div></div>');
    $('#chPwd').onclick = changePasswordModal;
  }
  var PORTAL_ROUTES = { overview: pOverview, projects: pProjects, messages: pMessages, contracts: pContracts, invoices: pInvoices, files: pFiles, reports: pReports, announcements: pAnnouncements, profile: pProfile };
  var PORTAL_TITLES = { overview: '概览', projects: '我的项目', messages: '消息', contracts: '我的合同', invoices: '我的发票', files: '我的文件', reports: '我的报告', announcements: '公告', profile: '我的资料' };
  function renderPortalNav() {
    $('#appNav').innerHTML = '<div class="nav-sec">客户门户</div>' +
      [['overview', '概览'], ['projects', '我的项目'], ['messages', '消息'], ['contracts', '我的合同'], ['invoices', '我的发票'], ['files', '我的文件'], ['reports', '我的报告'], ['announcements', '公告'], ['profile', '我的资料']]
        .map(function (x) { return '<a class="nav-item" href="#/' + x[0] + '" data-nav="' + x[0] + '">' + x[1] + '</a>'; }).join('');
  }

  // ======================= Property management (PropTech) =======================
  var PROPERTY_TYPE = [
    ['RESIDENTIAL_HOUSE', '独立屋'], ['RESIDENTIAL_UNIT', '公寓单元'], ['APARTMENT', '公寓'],
    ['TOWNHOUSE', '联排别墅'], ['COMMERCIAL_OFFICE', '商业办公'], ['COMMERCIAL_RETAIL', '商业零售'],
    ['COMMERCIAL_INDUSTRIAL', '工业'], ['LAND', '土地'], ['OTHER', '其他'],
  ];
  var PROPERTY_STATUS = [
    ['ACTIVE', '在管', 'green'], ['VACANT', '空置', 'gold'], ['LEASED', '已出租', 'green'],
    ['UNDER_MAINTENANCE', '维修中', 'gold'], ['OFF_MARKET', '下架', ''], ['ARCHIVED', '已归档', ''],
  ];
  var UNIT_STATUS = [['AVAILABLE', '可用'], ['OCCUPIED', '已占用'], ['UNDER_MAINTENANCE', '维修中'], ['UNAVAILABLE', '不可用']];
  var OWNER_TYPE = [['INDIVIDUAL', '个人'], ['COMPANY', '公司'], ['TRUST', '信托'], ['PARTNERSHIP', '合伙']];

  function propStatusBadge(v) {
    for (var i = 0; i < PROPERTY_STATUS.length; i++) if (PROPERTY_STATUS[i][0] === v) return badge(PROPERTY_STATUS[i][1], PROPERTY_STATUS[i][2]);
    return badge(v);
  }
  function ownerName(o) { return (o.companyName || ((o.firstName || '') + ' ' + (o.lastName || '')).trim()) || '业主'; }
  // numeric form fields arrive as strings — convert present keys, drop blanks.
  function numify(payload, intKeys, floatKeys) {
    (intKeys || []).forEach(function (k) { if (payload[k] != null && payload[k] !== '') payload[k] = parseInt(payload[k], 10); else delete payload[k]; });
    (floatKeys || []).forEach(function (k) { if (payload[k] != null && payload[k] !== '') payload[k] = Number(payload[k]); else delete payload[k]; });
    return payload;
  }

  var fProps = { search: '', status: '', type: '', page: 1 };
  function propsHead(total) {
    return '<div class="pv-head"><div><h1>物业</h1><p>共 ' + total + ' 处</p></div><button class="b primary" id="add">+ 新建物业</button></div>';
  }
  async function viewProperties() {
    loading();
    var qs = '?page=' + fProps.page + '&pageSize=10';
    if (fProps.search) qs += '&search=' + encodeURIComponent(fProps.search);
    if (fProps.status) qs += '&status=' + fProps.status;
    if (fProps.type) qs += '&type=' + fProps.type;
    var r = await API.get('/properties' + qs);
    var statusOpts = '<option value="">全部状态</option>' + PROPERTY_STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === fProps.status ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('');
    var typeOpts = '<option value="">全部类型</option>' + PROPERTY_TYPE.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === fProps.type ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('');
    var body;
    if (!r.items.length && !fProps.search && !fProps.status && !fProps.type) {
      body = emptyState('🏠', '还没有物业', '添加第一处物业，开始管理租约、验房与维修。', 'add', '+ 新建物业');
    } else {
      var rows = r.items.map(function (p) {
        var rent = p.weeklyRent ? money(p.weeklyRent) + ' /周' : '-';
        var units = p._count ? p._count.units : 0;
        return '<tr class="clickable" data-id="' + p.id + '"><td>' + esc(p.addressLine) + (p.name ? ' <span style="color:var(--muted)">· ' + esc(p.name) + '</span>' : '') + '</td><td>' + esc(p.suburb || '-') + '</td><td>' + esc(labelOf(PROPERTY_TYPE, p.type)) + '</td><td>' + propStatusBadge(p.status) + '</td><td>' + rent + '</td><td>' + units + '</td></tr>';
      }).join('') || '<tr><td class="empty" colspan="6">没有匹配的物业</td></tr>';
      body = '<table class="tbl"><thead><tr><th>地址</th><th>区域</th><th>类型</th><th>状态</th><th>周租</th><th>单元</th></tr></thead><tbody>' + rows + '</tbody></table>' + pagerHtml(r.total, r.page, r.pageSize);
    }
    setView(propsHead(r.total) +
      '<div class="filterbar"><input type="search" id="pq" placeholder="搜索地址 / 名称 / 区域…" value="' + esc(fProps.search) + '"/><select id="pst">' + statusOpts + '</select><select id="pty">' + typeOpts + '</select></div>' +
      '<div class="panel">' + body + '</div>');
    var addBtn = $('#add'); if (addBtn) addBtn.onclick = openCreateProperty;
    $$('#view tr.clickable').forEach(function (tr) { tr.onclick = function () { location.hash = '#/properties/' + tr.dataset.id; }; });
    var pq = $('#pq'); if (pq) pq.oninput = debounce(function (e) { fProps.search = e.target.value.trim(); fProps.page = 1; viewProperties(); }, 350);
    var pst = $('#pst'); if (pst) pst.onchange = function (e) { fProps.status = e.target.value; fProps.page = 1; viewProperties(); };
    var pty = $('#pty'); if (pty) pty.onchange = function (e) { fProps.type = e.target.value; fProps.page = 1; viewProperties(); };
    bindPager(function (p) { fProps.page = p; viewProperties(); });
  }

  function propertyFields(p) {
    return [
      { name: 'addressLine', label: '地址（必填）', value: p ? p.addressLine : undefined },
      { name: 'name', label: '名称/备注', value: p ? p.name : undefined },
      { name: 'suburb', label: '区域', value: p ? p.suburb : undefined },
      { name: 'state', label: '州', value: p ? p.state : undefined },
      { name: 'postcode', label: '邮编', value: p ? p.postcode : undefined },
      { name: 'type', label: '类型', type: 'select', options: PROPERTY_TYPE, value: p ? p.type : undefined },
      { name: 'status', label: '状态', type: 'select', options: PROPERTY_STATUS.map(function (s) { return [s[0], s[1]]; }), value: p ? p.status : undefined },
      { name: 'bedrooms', label: '卧室数', type: 'number', value: p ? p.bedrooms : undefined },
      { name: 'bathrooms', label: '卫浴数', type: 'number', value: p ? p.bathrooms : undefined },
      { name: 'carSpaces', label: '车位数', type: 'number', value: p ? p.carSpaces : undefined },
      { name: 'weeklyRent', label: '周租金', type: 'number', value: p ? p.weeklyRent : undefined },
      { name: 'notes', label: '备注', type: 'textarea', value: p ? p.notes : undefined },
    ];
  }
  function openCreateProperty() {
    formModal('新建物业', propertyFields(null), '创建', async function (d) {
      var payload = numify(clean(d), ['bedrooms', 'bathrooms', 'carSpaces'], ['weeklyRent']);
      if (!payload.addressLine) { toast('请填写地址', true); return; }
      var p = await API.post('/properties', payload); closeModal(); toast('已创建'); location.hash = '#/properties/' + p.id;
    });
  }
  function openEditProperty(p, id) {
    formModal('编辑物业', propertyFields(p), '保存', async function (d) {
      var payload = numify(clean(d), ['bedrooms', 'bathrooms', 'carSpaces'], ['weeklyRent']);
      await API.patch('/properties/' + id, payload); closeModal(); toast('已保存'); viewPropertyDetail(id);
    });
  }

  async function viewPropertyDetail(id) {
    setView(skel(2) + skel(4));
    var p = await API.get('/properties/' + id);
    setView(
      breadcrumb([{ label: '物业', href: '#/properties' }, { label: p.addressLine }]) +
      '<div class="pv-head"><div><h1>' + esc(p.addressLine) + '</h1><p>' + propStatusBadge(p.status) + ' · ' + esc(labelOf(PROPERTY_TYPE, p.type)) + (p.suburb ? ' · ' + esc(p.suburb) : '') + '</p></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="b" id="edit">编辑</button><button class="b danger" id="del">删除</button></div></div>' +
      '<div class="tabs" id="ptabs"><button data-tab="overview" class="active">概览</button><button data-tab="units">单元</button><button data-tab="owners">业主</button></div><div id="ptabc"></div>');

    function loadTab(t) {
      var host = $('#ptabc');
      if (t === 'overview') {
        host.innerHTML = '<div class="detail"><div class="panel"><h3>物业资料</h3><dl class="kv">' +
          '<dt>地址</dt><dd>' + esc(p.addressLine) + '</dd><dt>区域</dt><dd>' + esc(p.suburb || '-') + '</dd>' +
          '<dt>州/邮编</dt><dd>' + esc(((p.state || '-') + ' ' + (p.postcode || '')).trim()) + '</dd>' +
          '<dt>类型</dt><dd>' + esc(labelOf(PROPERTY_TYPE, p.type)) + '</dd><dt>状态</dt><dd>' + propStatusBadge(p.status) + '</dd>' +
          '<dt>卧/卫/车</dt><dd>' + (p.bedrooms != null ? p.bedrooms : '-') + ' / ' + (p.bathrooms != null ? p.bathrooms : '-') + ' / ' + (p.carSpaces != null ? p.carSpaces : '-') + '</dd>' +
          '<dt>周租金</dt><dd>' + (p.weeklyRent ? money(p.weeklyRent) : '-') + '</dd><dt>备注</dt><dd>' + esc(p.notes || '-') + '</dd></dl></div>' +
          '<div class="panel"><h3>概况</h3><dl class="kv"><dt>单元数</dt><dd>' + ((p.units || []).length) + '</dd><dt>业主数</dt><dd>' + ((p.ownerships || []).length) + '</dd><dt>创建于</dt><dd>' + fmtDay(p.createdAt) + '</dd></dl></div></div>';
      } else if (t === 'units') {
        var urows = (p.units || []).map(function (u) {
          return '<tr><td>' + esc(u.unitNumber) + '</td><td>' + esc(u.label || '-') + '</td><td>' + esc(labelOf(UNIT_STATUS, u.status)) + '</td><td>' + (u.weeklyRent ? money(u.weeklyRent) : '-') + '</td><td class="rowacts"><button class="b sm" data-eu="' + u.id + '">编辑</button><button class="b sm danger" data-du="' + u.id + '">删除</button></td></tr>';
        }).join('') || '<tr><td class="empty" colspan="5">暂无单元</td></tr>';
        host.innerHTML = '<div class="panel"><div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="b primary" id="addUnit">+ 新增单元</button></div><table class="tbl"><thead><tr><th>单元号</th><th>标签</th><th>状态</th><th>周租</th><th></th></tr></thead><tbody>' + urows + '</tbody></table></div>';
        $('#addUnit').onclick = function () { unitForm(null); };
        $$('#ptabc [data-eu]').forEach(function (b) { b.onclick = function () { var u = (p.units || []).filter(function (x) { return x.id === b.dataset.eu; })[0]; unitForm(u); }; });
        $$('#ptabc [data-du]').forEach(function (b) { b.onclick = function () { confirmDel('删除该单元？', async function () { await API.del('/properties/' + id + '/units/' + b.dataset.du); toast('已删除'); viewPropertyDetail(id); }); }; });
      } else if (t === 'owners') {
        var orows = (p.ownerships || []).map(function (os) {
          return '<tr><td>' + esc(ownerName(os.owner)) + (os.isPrimary ? ' ' + badge('主', 'gold') : '') + '</td><td>' + esc(os.owner.email || '-') + '</td><td>' + (os.sharePercent != null ? os.sharePercent + '%' : '-') + '</td><td class="rowacts"><button class="b sm danger" data-do="' + os.id + '">移除</button></td></tr>';
        }).join('') || '<tr><td class="empty" colspan="4">暂无业主</td></tr>';
        host.innerHTML = '<div class="panel"><div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:10px"><button class="b" id="newOwner">+ 新建业主</button><button class="b primary" id="attachOwner">+ 关联业主</button></div><table class="tbl"><thead><tr><th>业主</th><th>邮箱</th><th>持股</th><th></th></tr></thead><tbody>' + orows + '</tbody></table></div>';
        $('#newOwner').onclick = ownerCreateForm;
        $('#attachOwner').onclick = attachOwnerForm;
        $$('#ptabc [data-do]').forEach(function (b) { b.onclick = function () { confirmDel('移除该业主关联？', async function () { await API.del('/properties/' + id + '/owners/' + b.dataset.do); toast('已移除'); viewPropertyDetail(id); }); }; });
      }
    }
    function unitForm(u) {
      formModal(u ? '编辑单元' : '新增单元', [
        { name: 'unitNumber', label: '单元号（必填）', value: u ? u.unitNumber : undefined },
        { name: 'label', label: '标签', value: u ? u.label : undefined },
        { name: 'status', label: '状态', type: 'select', options: UNIT_STATUS, value: u ? u.status : undefined },
        { name: 'bedrooms', label: '卧室', type: 'number', value: u ? u.bedrooms : undefined },
        { name: 'bathrooms', label: '卫浴', type: 'number', value: u ? u.bathrooms : undefined },
        { name: 'weeklyRent', label: '周租金', type: 'number', value: u ? u.weeklyRent : undefined },
      ], '保存', async function (d) {
        var payload = numify(clean(d), ['bedrooms', 'bathrooms'], ['weeklyRent']);
        if (u) { await API.patch('/properties/' + id + '/units/' + u.id, payload); }
        else { if (!payload.unitNumber) { toast('请填单元号', true); return; } await API.post('/properties/' + id + '/units', payload); }
        closeModal(); toast('已保存'); viewPropertyDetail(id);
      });
    }
    function ownerCreateForm() {
      formModal('新建业主', [
        { name: 'type', label: '类型', type: 'select', options: OWNER_TYPE },
        { name: 'firstName', label: '名' }, { name: 'lastName', label: '姓' },
        { name: 'companyName', label: '公司名（公司/信托填）' },
        { name: 'email', label: '邮箱' }, { name: 'phone', label: '电话' },
      ], '创建', async function (d) {
        var payload = clean(d);
        if (!payload.firstName && !payload.lastName && !payload.companyName) { toast('请填写姓名或公司名', true); return; }
        await API.post('/owners', payload); closeModal(); toast('已创建业主'); attachOwnerForm();
      });
    }
    async function attachOwnerForm() {
      var r = await API.get('/owners?pageSize=100');
      if (!r.items.length) { toast('请先新建业主', true); return ownerCreateForm(); }
      var opts = r.items.map(function (o) { return [o.id, ownerName(o)]; });
      formModal('关联业主', [
        { name: 'ownerId', label: '选择业主', type: 'select', options: opts },
        { name: 'sharePercent', label: '持股比例(%)', type: 'number', value: 100 },
        { name: 'isPrimary', label: '设为主业主', type: 'select', options: [['no', '否'], ['yes', '是']] },
      ], '关联', async function (d) {
        var payload = { ownerId: d.ownerId, sharePercent: d.sharePercent ? Number(d.sharePercent) : 100, isPrimary: d.isPrimary === 'yes' };
        await API.post('/properties/' + id + '/owners', payload); closeModal(); toast('已关联'); viewPropertyDetail(id);
      });
    }

    $$('#ptabs button').forEach(function (b) { b.onclick = function () { $$('#ptabs button').forEach(function (x) { x.classList.remove('active'); }); b.classList.add('active'); loadTab(b.dataset.tab); }; });
    loadTab('overview');
    $('#edit').onclick = function () { openEditProperty(p, id); };
    $('#del').onclick = function () { confirmDel('删除物业「' + p.addressLine + '」？此操作不可撤销。', async function () { await API.del('/properties/' + id); toast('已删除'); location.hash = '#/properties'; }); };
  }

  // ======================= shell + router =======================
  var ROUTES = { dashboard: viewDashboard, clients: viewClients, properties: viewProperties, tasks: viewTasks, projects: viewProjects, files: viewFiles, contracts: viewContracts, invoices: viewInvoices, messages: viewMessages, report: viewReportDocs, reports: viewReports, automations: viewAutomations, integrations: viewIntegrations, announcements: viewAnnouncements, email: viewEmail, team: viewTeam, settings: viewSettings, audit: viewAudit, account: viewAccount };
  var TITLES = { dashboard: '仪表盘', clients: '客户', properties: '物业', tasks: '任务', projects: '项目', files: '文件', contracts: '合同', invoices: '发票', messages: '消息', report: '报告', reports: '报表', automations: '自动化', integrations: '集成', announcements: '公告', email: '邮箱', team: '团队', settings: '设置', audit: '审计日志', account: '个人信息' };

  var currentKey = 'dashboard';
  function setActiveNav(key) {
    currentKey = key;
    $$('#appNav [data-nav]').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === key); });
    var leaf = $('#appNav [data-nav="' + key + '"]');
    if (leaf) { var grp = leaf.closest('.nav-group'); if (grp) grp.classList.add('open'); }
    $('#appTitle').textContent = (window.PORTAL ? PORTAL_TITLES : TITLES)[key] || 'NOVAI Flow';
    if (!window.PORTAL) renderBookmarkStar();
  }

  // ---- bookmarks ----
  function getBookmarks() { try { return JSON.parse(localStorage.getItem('novai-bookmarks') || '[]'); } catch (e) { return []; } }
  function setBookmarks(b) { try { localStorage.setItem('novai-bookmarks', JSON.stringify(b)); } catch (e) {} }
  function isBookmarked(key) { return getBookmarks().some(function (x) { return x.key === key; }); }
  function renderBookmarks() {
    var b = getBookmarks(), host = $('#navBookmarks'); if (!host) return;
    host.innerHTML = b.length ? '<div class="nav-sec">书签</div>' + b.map(function (x) { return '<a href="#/' + x.key + '"><span class="i">★</span>' + esc(x.label) + '</a>'; }).join('') : '';
  }
  function renderBookmarkStar() { var btn = $('#appBookmark'); if (!btn) return; var on = isBookmarked(currentKey); btn.textContent = on ? '★' : '☆'; btn.classList.toggle('on', on); }
  function toggleBookmark() {
    var b = getBookmarks();
    b = isBookmarked(currentKey) ? b.filter(function (x) { return x.key !== currentKey; }) : b.concat([{ key: currentKey, label: TITLES[currentKey] || currentKey }]);
    setBookmarks(b); renderBookmarks(); renderBookmarkStar();
    toast(isBookmarked(currentKey) ? '已收藏' : '已取消收藏');
  }

  // ---- account menu ----
  function changePasswordModal() {
    formModal('更改密码', [
      { name: 'currentPassword', label: '当前密码', type: 'password' },
      { name: 'newPassword', label: '新密码（至少 8 位）', type: 'password' },
    ], '保存', async function (d) {
      var r = await API.post('/auth/change-password', { currentPassword: d.currentPassword, newPassword: d.newPassword });
      if (r && r.accessToken) { localStorage.setItem('novai-access', r.accessToken); localStorage.setItem('novai-refresh', r.refreshToken); }
      closeModal(); toast('密码已更新');
    });
  }
  function changeEmailModal() {
    formModal('更改邮箱', [
      { name: 'newEmail', label: '新邮箱', type: 'email' },
      { name: 'password', label: '当前密码', type: 'password' },
    ], '保存', async function (d) {
      var r = await API.post('/auth/change-email', { newEmail: d.newEmail, password: d.password });
      try { localStorage.setItem('novai-auth', d.newEmail); } catch (e) {}
      closeModal();
      openModal('邮箱已更新', '<p style="font-size:14px;color:var(--muted);margin-bottom:10px">新邮箱需验证。验证链接（暂未发真邮件，先返回给你）：</p><div class="field"><input value="' + esc(r.verifyUrl) + '" readonly/></div>', { submitLabel: '复制', onSubmit: function () { copy(r.verifyUrl); } });
    });
  }
  async function openAccountMenu() {
    var menu = $('#appMenu');
    if (!menu.hidden) { menu.hidden = true; return; }
    menu.innerHTML = '<div class="loading" style="padding:14px">加载中…</div>';
    menu.hidden = false;
    var data = await API.get('/auth/memberships').catch(function () { return { items: [], currentCompanyId: '' }; });
    var wsHtml = (data.items || []).map(function (w) {
      var cur = w.companyId === data.currentCompanyId;
      return '<button class="ws" data-switch="' + w.companyId + '"' + (cur ? ' disabled' : '') + '><span>' + esc(w.companyName) + ' · ' + esc(w.role) + '</span>' + (cur ? '<span class="tick">✓</span>' : '') + '</button>';
    }).join('');
    menu.innerHTML = '<button data-act="profile">个人信息</button><div class="div"></div>' +
      '<div class="mh">工作区</div>' + (wsHtml || '<div class="loading" style="padding:6px 10px">无</div>') +
      '<div class="div"></div><button data-act="email">更改邮箱</button><button data-act="password">更改密码</button>' +
      '<div class="div"></div><button data-act="logout">退出登录</button>';
    $('#appMenu [data-act="profile"]').onclick = function () { menu.hidden = true; location.hash = window.PORTAL ? '#/profile' : '#/account'; };
    $$('#appMenu [data-switch]').forEach(function (b) {
      b.onclick = async function () {
        try { var r = await API.post('/auth/switch', { companyId: b.dataset.switch }); localStorage.setItem('novai-access', r.accessToken); localStorage.setItem('novai-refresh', r.refreshToken); toast('已切换工作区'); location.reload(); } catch (e) { toast(e.message, true); }
      };
    });
    $('#appMenu [data-act="logout"]').onclick = function () { API.logout(); };
    $('#appMenu [data-act="email"]').onclick = function () { menu.hidden = true; changeEmailModal(); };
    $('#appMenu [data-act="password"]').onclick = function () { menu.hidden = true; changePasswordModal(); };
  }
  function closeSide() { $('.app-side').classList.remove('open'); $('#appOverlay').classList.remove('show'); }

  async function route() {
    var def = window.PORTAL ? 'overview' : 'dashboard';
    var hash = (location.hash || '').replace(/^#\/?/, '') || def;
    var parts = hash.split('/');
    var key = parts[0];
    setActiveNav(key);
    closeModal();
    closeSide();
    try {
      if (window.PORTAL) {
        var pfn = PORTAL_ROUTES[key] || pOverview;
        return await pfn(parts.slice(1));
      }
      if (key === 'clients' && parts[1]) return await viewClientDetail(parts[1]);
      if (key === 'properties' && parts[1]) return await viewPropertyDetail(parts[1]);
      var fn = ROUTES[key] || viewDashboard;
      await fn(parts.slice(1));
    } catch (e) {
      if (e && e.status === 401) return;
      setView(errorState(e && e.message));
      var rb = $('#retryBtn'); if (rb) rb.onclick = route;
    }
  }

  async function loadBadge() {
    try {
      var n = await API.get('/notifications');
      $('#bellDot').hidden = !(n.unread > 0);
    } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', async function () {
    if (!API.isAuthed()) { API.gotoLogin(); return; }
    var me;
    try {
      me = await API.get('/auth/me');
      $('#appUser').textContent = (me.user.firstName || '') + (me.company ? ' · ' + me.company.name : '');
      $('#appAv').textContent = ((me.user.firstName || me.user.email || 'N').trim()[0] || 'N').toUpperCase();
    } catch (e) { if (e && e.status === 401) return; }

    // Client users get the simplified portal (different nav + routes).
    if (me && me.role === 'CLIENT') {
      window.PORTAL = true;
      renderPortalNav();
      var sb = $('#appSearch'); if (sb) sb.style.display = 'none';
      var bk = $('#appBookmark'); if (bk) bk.style.display = 'none';
    }

    $('#appBurger').onclick = function () { $('.app-side').classList.add('open'); $('#appOverlay').classList.add('show'); };
    $('#appOverlay').onclick = closeSide;

    // grouped nav: collapse/expand groups
    $$('#appNav .nav-grp-h').forEach(function (h) { h.onclick = function () { h.parentNode.classList.toggle('open'); }; });
    // bookmarks + account menu
    renderBookmarks();
    var bkBtn = $('#appBookmark'); if (bkBtn) bkBtn.onclick = toggleBookmark;
    $('#appAccountBtn').onclick = function (e) { e.stopPropagation(); openAccountMenu(); };
    document.addEventListener('click', function (e) { var m = $('#appMenu'), btn = $('#appAccountBtn'); if (m && !m.hidden && !m.contains(e.target) && !btn.contains(e.target)) m.hidden = true; });
    $('#appBell').onclick = async function () {
      var n = await API.get('/notifications');
      var list = (n.items || []).map(function (x) { return '<li><div class="t">' + esc(x.title) + '</div><div class="d">' + esc(x.message || '') + ' · ' + fmtDate(x.createdAt) + '</div></li>'; }).join('') || '<li class="d">暂无通知</li>';
      openModal('通知', '<ul class="tl">' + list + '</ul>', { submitLabel: '全部已读', onSubmit: async function () { await API.patch('/notifications/read-all', {}); closeModal(); loadBadge(); } });
    };
    var searchInput = $('#appSearch'), searchRes = $('#searchRes');
    if (searchInput && !window.PORTAL) {
      var doSearch = debounce(async function () {
        var q = searchInput.value.trim();
        if (q.length < 2) { searchRes.hidden = true; return; }
        try {
          var r = await API.get('/search?q=' + encodeURIComponent(q));
          var html = '';
          function grp(title, arr, fmt) { if (arr && arr.length) html += '<div class="grp">' + title + '</div>' + arr.map(fmt).join(''); }
          grp('客户', r.clients, function (c) { return '<a href="#/clients/' + c.id + '">' + esc(c.firstName + ' ' + c.lastName) + '</a>'; });
          grp('任务', r.tasks, function (t) { return '<a href="#/tasks">' + esc(t.title) + '</a>'; });
          grp('项目', r.projects, function (p) { return '<a href="#/projects">' + esc(p.projectName) + '</a>'; });
          grp('合同', r.contracts, function (c) { return '<a href="#/contracts">' + esc(c.title) + '</a>'; });
          grp('发票', r.invoices, function (i) { return '<a href="#/invoices">' + esc(i.invoiceNumber) + '</a>'; });
          searchRes.innerHTML = html || '<div class="none">无结果</div>';
          searchRes.hidden = false;
        } catch (e) {}
      }, 300);
      searchInput.oninput = doSearch;
      searchInput.onfocus = function () { if (searchInput.value.trim().length >= 2) searchRes.hidden = false; };
      document.addEventListener('click', function (e) { if (!searchInput.contains(e.target) && !searchRes.contains(e.target)) searchRes.hidden = true; });
      searchRes.addEventListener('click', function () { searchRes.hidden = true; searchInput.value = ''; });
    }
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
        var s = $('#appSearch'); if (s && s.style.display !== 'none') { e.preventDefault(); s.focus(); }
      } else if (e.key === 'Escape') {
        var m = $('#modalHost'); if (m && m.classList.contains('open')) closeModal();
      }
    });
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = window.PORTAL ? '#/overview' : '#/dashboard';
    route();
    loadBadge();
    setInterval(loadBadge, 60000); // keep the notification dot fresh without a reload
  });
})();
