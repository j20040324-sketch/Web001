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
  function loading() { setView('<div class="loading">加载中…</div>'); }
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
      onSubmit: async function () { try { await fn(); closeModal(); } catch (e) { toast(e.message, true); } },
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
    if (opts.onSubmit) $('[data-ms]', h).onclick = function () { opts.onSubmit(h); };
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
    openModal(title, fields.map(fieldHtml).join(''), {
      submitLabel: submitLabel || '保存',
      onSubmit: async function (host) {
        var btn = $('[data-ms]', host); if (btn) btn.disabled = true;
        try { await onSubmit(collect(host)); }
        catch (e) { toast(e.message, true); if (btn) btn.disabled = false; }
      },
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

  async function viewDashboard() {
    setView(skel(3) + skel(5));
    var res = await Promise.all([
      API.get('/dashboard'),
      API.get('/reports/summary').catch(function () { return null; }),
      API.get('/tasks?overdue=true&pageSize=6').catch(function () { return { items: [] }; }),
      API.get('/contracts').catch(function () { return { items: [] }; }),
      API.get('/invoices').catch(function () { return { items: [] }; }),
      API.get('/payment-settings').catch(function () { return {}; }),
      API.get('/members').catch(function () { return { members: [], pendingInvitations: [] }; }),
    ]);
    var d = res[0], rep = res[1], overdue = res[2], contracts = res[3], invoices = res[4], pay = res[5], team = res[6];
    var m = d.metrics;

    // ---- onboarding checklist ----
    var clientsTotal = rep ? sumVals(rep.clientsByStatus) : 0;
    var tasksTotal = rep ? sumVals(rep.tasksByStatus) : 0;
    var steps = [
      { done: clientsTotal > 0, label: '添加第一位客户', href: '#/clients' },
      { done: tasksTotal > 0, label: '创建一个任务', href: '#/tasks' },
      { done: !!pay.accountNumber, label: '设置收款信息', href: '#/settings' },
      { done: (team.members || []).length > 1 || (team.pendingInvitations || []).length > 0, label: '邀请团队成员', href: '#/team' },
    ];
    var allDone = steps.every(function (s) { return s.done; });
    var checklistHtml = allDone ? '' :
      '<div class="panel"><h3>快速上手（' + steps.filter(function (s) { return s.done; }).length + '/' + steps.length + '）</h3><div class="checklist">' +
      steps.map(function (s) { return '<a class="ck ' + (s.done ? 'done' : '') + '" href="' + s.href + '"><span class="box">✓</span><span>' + esc(s.label) + '</span>' + (s.done ? '' : '<span class="go">前往 →</span>') + '</a>'; }).join('') +
      '</div></div>';

    // ---- KPIs ----
    var kpis = '<div class="kpi-grid">' +
      kpi('◍', clientsTotal, '客户总数') +
      kpi('▤', m.activeProjects, '进行中项目') +
      kpi('⚠', m.tasksOverdue, '逾期任务', m.tasksOverdue > 0) +
      kpi('$', m.unpaidInvoices + m.overdueInvoices, '待收发票', (m.unpaidInvoices + m.overdueInvoices) > 0) +
      '</div>';

    // ---- charts ----
    var charts = '';
    if (rep) {
      var inv = rep.invoicesByStatus;
      var invSeg = [
        { label: '已付', value: inv.PAID || 0, color: CHART.green },
        { label: '未付', value: (inv.UNPAID || 0) + (inv.SENT || 0), color: CHART.gold },
        { label: '逾期', value: inv.OVERDUE || 0, color: CHART.red },
        { label: '草稿', value: (inv.DRAFT || 0) + (inv.CANCELLED || 0), color: CHART.gray },
      ];
      var cb = rep.clientsByStatus;
      var clientBars = CLIENT_STATUS.map(function (s) { return { label: s[1], value: cb[s[0]] || 0, color: CHART.gold }; }).filter(function (b) { return b.value > 0; });
      charts = '<div class="grid2">' +
        '<div class="panel"><h3>收入概览</h3>' +
        '<div style="display:flex;gap:24px;margin-bottom:16px"><div><div class="l" style="color:var(--muted);font-size:12px">已收</div><div style="font-family:Sora;font-size:22px;color:' + CHART.green + '">' + money(rep.revenue.paid) + '</div></div>' +
        '<div><div class="l" style="color:var(--muted);font-size:12px">待收</div><div style="font-family:Sora;font-size:22px;color:' + CHART.gold + '">' + money(rep.revenue.outstanding) + '</div></div></div>' +
        donut(invSeg) + '</div>' +
        '<div class="panel"><h3>客户分布</h3>' + (clientBars.length ? bars(clientBars) : '<p class="loading">暂无客户</p>') + '</div></div>';
    }

    // ---- today's focus ----
    var unsigned = (contracts.items || []).filter(function (c) { return c.status === 'SENT' || c.status === 'VIEWED'; }).slice(0, 5);
    var unpaid = (invoices.items || []).filter(function (i) { return ['UNPAID', 'OVERDUE', 'SENT'].indexOf(i.status) > -1; }).slice(0, 5);
    var focus = '';
    (overdue.items || []).slice(0, 5).forEach(function (t) { focus += focusItem('#/tasks', '🔴 ' + t.title, '逾期 · ' + (t.dueDate ? fmtDay(t.dueDate) : '')); });
    unsigned.forEach(function (c) { focus += focusItem('#/contracts', '✎ ' + c.title, '待签署'); });
    unpaid.forEach(function (i) { focus += focusItem('#/invoices', '$ ' + i.invoiceNumber, money(i.amount) + ' · ' + labelOfInvoice(i.status)); });
    if (!focus) focus = '<p class="loading">没有待办事项，一切顺利 🎉</p>';

    var tl = (d.recentActivity || []).map(function (e) {
      return '<li><div class="t">' + esc(e.title) + '</div><div class="d">' + fmtDate(e.createdAt) + (e.description ? ' · ' + esc(e.description) : '') + '</div></li>';
    }).join('') || '<li class="d">暂无动态</li>';

    setView('<div class="pv-head"><div><h1>仪表盘</h1><p>今天需要关注的事项</p></div></div>' +
      checklistHtml + kpis + charts +
      '<div class="grid2"><div class="panel"><h3>今日待办</h3><div class="focus">' + focus + '</div></div>' +
      '<div class="panel"><h3>最近动态</h3><ul class="tl">' + tl + '</ul></div></div>');
  }
  function labelOfInvoice(s) { var m = { DRAFT: '草稿', SENT: '已发送', UNPAID: '未付', PAID: '已付', OVERDUE: '逾期', CANCELLED: '已取消' }; return m[s] || s; }

  var CONTRACT_LABEL = { DRAFT: '草稿', SENT: '已发送', VIEWED: '已查看', SIGNED: '已签署', CANCELLED: '已取消', EXPIRED: '已过期' };
  async function viewReports() {
    setView(skel(3) + skel(4));
    var rep = await API.get('/reports/summary');
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
      '</div>' +
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
        openModal('客户门户邀请链接', '<p style="color:var(--muted);font-size:14px;margin-bottom:10px">把链接发给客户，他设置密码后即可登录门户：</p><div class="field"><input value="' + esc(r.inviteUrl) + '" readonly id="lnk"/></div>', { submitLabel: '复制链接', onSubmit: function () { copy(r.inviteUrl); } });
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
  function taskFormModal(task) {
    var t = task || {};
    formModal(task ? '编辑任务' : '新建任务', [
      { name: 'title', label: '标题', value: t.title },
      { name: 'description', label: '描述', type: 'textarea', value: t.description },
      { name: 'status', label: '状态', type: 'select', options: TASK_STATUS, value: t.status || 'TODO' },
      { name: 'priority', label: '优先级', type: 'select', options: PRIORITY, value: t.priority || 'MEDIUM' },
      { name: 'dueDate', label: '截止日期', type: 'date', value: t.dueDate ? t.dueDate.slice(0, 10) : '' },
    ], '保存', async function (d) {
      var body = clean(d); if (body.dueDate) body.dueDate = new Date(body.dueDate).toISOString();
      if (task) await API.patch('/tasks/' + task.id, body);
      else await API.post('/tasks', body);
      closeModal(); toast('已保存'); viewTasks();
    });
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
        return '<tr><td>' + esc(t.title) + '</td><td>' + badge(labelOf(TASK_STATUS, t.status), done ? 'green' : '') + '</td><td>' + badge(labelOf(PRIORITY, t.priority), t.priority === 'URGENT' || t.priority === 'HIGH' ? 'red' : '') + '</td><td>' + (t.dueDate ? fmtDay(t.dueDate) : '-') + '</td><td><div class="rowacts">' +
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
  async function viewProjects() {
    loading();
    var r = await API.get('/projects?page=' + fProjects.page + '&pageSize=15');
    var body;
    if (!r.items.length) {
      body = emptyState('▤', '暂无项目', '把客户的工作拆成项目来推进。', 'add', '+ 新建项目');
    } else {
      var rows = r.items.map(function (p) {
        return '<tr><td>' + esc(p.projectName) + '</td><td>' + badge(labelOf(PROJECT_STATUS, p.status), p.status === 'COMPLETED' ? 'green' : 'gold') + '</td><td>' + (p.dueDate ? fmtDay(p.dueDate) : '-') + '</td><td><div class="rowacts"><button class="b sm" data-edit="' + p.id + '">编辑</button><button class="b sm danger" data-del="' + p.id + '">删</button></div></td></tr>';
      }).join('');
      body = '<table class="tbl"><thead><tr><th>名称</th><th>状态</th><th>截止</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' + pagerHtml(r.total, r.page, r.pageSize);
    }
    setView('<div class="pv-head"><div><h1>项目</h1><p>共 ' + r.total + ' 个</p></div><button class="b primary" id="add">+ 新建项目</button></div><div class="panel">' + body + '</div>');
    var addBtn = $('#add'); if (addBtn) addBtn.onclick = projectCreateModal;
    $$('#view [data-edit]').forEach(function (b) { b.onclick = function () { projectEditModal(r.items.filter(function (x) { return x.id === b.dataset.edit; })[0]); }; });
    $$('#view [data-del]').forEach(function (b) { b.onclick = function () { confirmDel('删除此项目？', async function () { await API.del('/projects/' + b.dataset.del); toast('已删除'); viewProjects(); }); }; });
    bindPager(function (p) { fProjects.page = p; viewProjects(); });
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
        openModal('邀请链接', '<p style="color:var(--muted);font-size:14px;margin-bottom:10px">把链接发给对方加入团队：</p><div class="field"><input value="' + esc(res.inviteUrl) + '" readonly/></div>', { submitLabel: '复制', onSubmit: function () { copy(res.inviteUrl); } });
        viewTeam();
      });
    };
  }

  async function viewSettings() {
    loading();
    var co = await API.get('/companies/current');
    var pay = await API.get('/payment-settings').catch(function () { return {}; });
    var wf = await API.get('/workflows').catch(function () { return { items: [] }; });
    var integ = await API.get('/integrations').catch(function () { return { items: [] }; });
    var wfRows = (wf.items || []).map(function (w) {
      return '<tr><td>' + esc(w.name) + '</td><td><button class="b sm" data-wf="' + w.id + '" data-on="' + w.isActive + '">' + (w.isActive ? '已启用' : '已停用') + '</button></td></tr>';
    }).join('');
    setView('<div class="pv-head"><div><h1>设置</h1></div></div>' +
      '<div class="grid2">' +
      '<div class="panel"><h3>公司资料</h3>' +
      fieldHtml({ name: 'name', label: '公司名称', value: co.name }) +
      fieldHtml({ name: 'abn', label: 'ABN', value: co.abn }) +
      fieldHtml({ name: 'phone', label: '电话', value: co.phone }) +
      fieldHtml({ name: 'email', label: '邮箱', value: co.email }) +
      '<button class="b primary" id="saveCo">保存公司资料</button></div>' +
      '<div class="panel"><h3>收款设置</h3>' +
      fieldHtml({ name: 'accountName', label: '账户名', value: pay.accountName }) +
      fieldHtml({ name: 'bsb', label: 'BSB', value: pay.bsb }) +
      fieldHtml({ name: 'accountNumber', label: '账号', value: pay.accountNumber }) +
      '<button class="b primary" id="savePay">保存收款设置</button></div>' +
      '</div>' +
      '<div class="panel"><h3>自动化工作流</h3><table class="tbl"><tbody>' + (wfRows || '<tr><td class="empty">—</td></tr>') + '</tbody></table></div>' +
      '<div class="panel"><h3>集成</h3><p style="color:var(--muted);font-size:13px">已连接 ' + (integ.items || []).filter(function (i) { return i.status === 'CONNECTED'; }).length + ' 个 · 共 12 个可接入（结构已就绪，真实对接稍后开通）</p></div>');
    $('#saveCo').onclick = async function () {
      var body = clean({ name: $('[name=name]').value, abn: $('[name=abn]').value, phone: $('[name=phone]').value, email: $('[name=email]').value });
      try { await API.patch('/companies/current', body); toast('已保存'); } catch (e) { toast(e.message, true); }
    };
    $('#savePay').onclick = async function () {
      var body = clean({ accountName: $('[name=accountName]').value, bsb: $('[name=bsb]').value, accountNumber: $('[name=accountNumber]').value });
      try { await API.patch('/payment-settings', body); toast('已保存'); } catch (e) { toast(e.message, true); }
    };
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

  // ======================= shell + router =======================
  var ROUTES = { dashboard: viewDashboard, clients: viewClients, tasks: viewTasks, projects: viewProjects, files: viewFiles, contracts: viewContracts, invoices: viewInvoices, messages: viewMessages, reports: viewReports, team: viewTeam, settings: viewSettings, account: viewAccount };
  var TITLES = { dashboard: '仪表盘', clients: '客户', tasks: '任务', projects: '项目', files: '文件', contracts: '合同', invoices: '发票', messages: '消息', reports: '报表', team: '团队', settings: '设置', account: '个人信息' };

  var currentKey = 'dashboard';
  function setActiveNav(key) {
    currentKey = key;
    $$('#appNav [data-nav]').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === key); });
    var leaf = $('#appNav [data-nav="' + key + '"]');
    if (leaf) { var grp = leaf.closest('.nav-group'); if (grp) grp.classList.add('open'); }
    $('#appTitle').textContent = TITLES[key] || 'NOVAI Flow';
    renderBookmarkStar();
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
    menu.innerHTML = '<button data-act="profile">👤 个人信息</button><div class="div"></div>' +
      '<div class="mh">工作区</div>' + (wsHtml || '<div class="loading" style="padding:6px 10px">无</div>') +
      '<div class="div"></div><button data-act="email">✉ 更改邮箱</button><button data-act="password">🔑 更改密码</button>' +
      '<div class="div"></div><button data-act="logout">⎋ 退出登录</button>';
    $('#appMenu [data-act="profile"]').onclick = function () { menu.hidden = true; location.hash = '#/account'; };
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
    var hash = (location.hash || '').replace(/^#\/?/, '') || 'dashboard';
    var parts = hash.split('/');
    var key = parts[0];
    setActiveNav(key);
    closeModal();
    closeSide();
    try {
      if (key === 'clients' && parts[1]) return await viewClientDetail(parts[1]);
      var fn = ROUTES[key] || viewDashboard;
      await fn(parts.slice(1));
    } catch (e) {
      if (e && e.status === 401) return;
      setView('<div class="loading">出错了：' + esc(e.message) + '</div>');
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
    try {
      var me = await API.get('/auth/me');
      $('#appUser').textContent = (me.user.firstName || '') + (me.company ? ' · ' + me.company.name : '');
      $('#appAv').textContent = ((me.user.firstName || me.user.email || 'N').trim()[0] || 'N').toUpperCase();
    } catch (e) { if (e && e.status === 401) return; }
    $('#appBurger').onclick = function () { $('.app-side').classList.add('open'); $('#appOverlay').classList.add('show'); };
    $('#appOverlay').onclick = closeSide;

    // grouped nav: collapse/expand groups
    $$('#appNav .nav-grp-h').forEach(function (h) { h.onclick = function () { h.parentNode.classList.toggle('open'); }; });
    // bookmarks + account menu
    renderBookmarks();
    $('#appBookmark').onclick = toggleBookmark;
    $('#appAccountBtn').onclick = function (e) { e.stopPropagation(); openAccountMenu(); };
    document.addEventListener('click', function (e) { var m = $('#appMenu'), btn = $('#appAccountBtn'); if (m && !m.hidden && !m.contains(e.target) && !btn.contains(e.target)) m.hidden = true; });
    $('#appBell').onclick = async function () {
      var n = await API.get('/notifications');
      var list = (n.items || []).map(function (x) { return '<li><div class="t">' + esc(x.title) + '</div><div class="d">' + esc(x.message || '') + ' · ' + fmtDate(x.createdAt) + '</div></li>'; }).join('') || '<li class="d">暂无通知</li>';
      openModal('通知', '<ul class="tl">' + list + '</ul>', { submitLabel: '全部已读', onSubmit: async function () { await API.patch('/notifications/read-all', {}); closeModal(); loadBadge(); } });
    };
    var searchInput = $('#appSearch'), searchRes = $('#searchRes');
    if (searchInput) {
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
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = '#/dashboard';
    route();
    loadBadge();
  });
})();
