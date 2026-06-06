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

  async function viewDashboard() {
    loading();
    var d = await API.get('/dashboard');
    var m = d.metrics;
    var cards = [
      ['新增客户·今日', m.newClientsToday], ['未读消息', m.unreadMessages, m.unreadMessages > 0],
      ['待发合同', m.pendingContracts], ['未签合同', m.unsignedContracts],
      ['逾期发票', m.overdueInvoices, m.overdueInvoices > 0], ['未付发票', m.unpaidInvoices],
      ['进行中项目', m.activeProjects], ['今日到期任务', m.tasksDueToday, m.tasksDueToday > 0],
      ['逾期任务', m.tasksOverdue, m.tasksOverdue > 0],
    ];
    var grid = cards.map(function (c) {
      return '<div class="stat-card' + (c[2] ? ' warn' : '') + '"><div class="n">' + c[1] + '</div><div class="l">' + esc(c[0]) + '</div></div>';
    }).join('');
    var tl = (d.recentActivity || []).map(function (e) {
      return '<li><div class="t">' + esc(e.title) + '</div><div class="d">' + fmtDate(e.createdAt) + (e.description ? ' · ' + esc(e.description) : '') + '</div></li>';
    }).join('') || '<li class="d">暂无动态</li>';
    setView('<div class="pv-head"><div><h1>仪表盘</h1><p>今天需要关注的事项</p></div></div>' +
      '<div class="stat-grid">' + grid + '</div>' +
      '<div class="panel"><h3>最近动态</h3><ul class="tl">' + tl + '</ul></div>');
  }

  async function viewClients() {
    loading();
    var r = await API.get('/clients?pageSize=100');
    var rows = r.items.map(function (c) {
      return '<tr class="clickable" data-id="' + c.id + '"><td>' + esc(c.firstName + ' ' + c.lastName) + '</td><td>' + esc(c.email || '-') + '</td><td>' + esc(c.phone || '-') + '</td><td>' + statusBadge(c.status) + '</td></tr>';
    }).join('') || '<tr><td class="empty" colspan="4">还没有客户，点右上角新建</td></tr>';
    setView('<div class="pv-head"><div><h1>客户</h1><p>共 ' + r.total + ' 位</p></div><button class="b primary" id="add">+ 新建客户</button></div>' +
      '<div class="panel"><table class="tbl"><thead><tr><th>姓名</th><th>邮箱</th><th>电话</th><th>状态</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    $$('#view tr.clickable').forEach(function (tr) { tr.onclick = function () { location.hash = '#/clients/' + tr.dataset.id; }; });
    $('#add').onclick = function () {
      formModal('新建客户', [
        { name: 'firstName', label: '名' }, { name: 'lastName', label: '姓' },
        { name: 'email', label: '邮箱', type: 'email' }, { name: 'phone', label: '电话' },
        { name: 'companyName', label: '公司' },
        { name: 'status', label: '状态', type: 'select', options: CLIENT_STATUS.map(function (s) { return [s[0], s[1]]; }), value: 'NEW_LEAD' },
      ], '创建', async function (data) {
        await API.post('/clients', clean(data)); closeModal(); toast('客户已创建'); viewClients();
      });
    };
  }

  async function viewClientDetail(id) {
    loading();
    var c = await API.get('/clients/' + id);
    var tlRes = await API.get('/clients/' + id + '/timeline');
    var tags = (c.tagRelations || []).map(function (t) { return badge(t.tag.name, 'gold'); }).join(' ') || '<span class="badge">无</span>';
    var tl = (tlRes.items || []).map(function (e) {
      return '<li><div class="t">' + esc(e.title) + '</div><div class="d">' + fmtDate(e.createdAt) + (e.description ? ' · ' + esc(e.description) : '') + '</div></li>';
    }).join('') || '<li class="d">暂无记录</li>';
    setView(
      '<div class="pv-head"><div><a class="app-side-link" href="#/clients">← 客户列表</a><h1>' + esc(c.firstName + ' ' + c.lastName) + '</h1></div>' +
      '<div style="display:flex;gap:8px"><button class="b" id="note">+ 备注</button><button class="b" id="edit">编辑</button><button class="b primary" id="invite">邀请门户</button></div></div>' +
      '<div class="detail"><div class="panel"><h3>时间线</h3><ul class="tl">' + tl + '</ul></div>' +
      '<div><div class="panel"><h3>资料</h3><dl class="kv">' +
      '<dt>状态</dt><dd>' + statusBadge(c.status) + '</dd>' +
      '<dt>邮箱</dt><dd>' + esc(c.email || '-') + '</dd>' +
      '<dt>电话</dt><dd>' + esc(c.phone || '-') + '</dd>' +
      '<dt>公司</dt><dd>' + esc(c.companyName || '-') + '</dd>' +
      '<dt>来源</dt><dd>' + esc(c.source || '-') + '</dd>' +
      '<dt>标签</dt><dd>' + tags + '</dd>' +
      '<dt>备注</dt><dd>' + esc(c.notes || '-') + '</dd></dl></div></div></div>');
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
  }

  async function viewTasks() {
    loading();
    var r = await API.get('/tasks?pageSize=100');
    var rows = r.items.map(function (t) {
      return '<tr><td>' + esc(t.title) + '</td><td>' + badge(labelOf(TASK_STATUS, t.status), t.status === 'DONE' ? 'green' : '') + '</td><td>' + badge(labelOf(PRIORITY, t.priority), t.priority === 'URGENT' || t.priority === 'HIGH' ? 'red' : '') + '</td><td>' + (t.dueDate ? fmtDay(t.dueDate) : '-') + '</td><td>' + (t.status !== 'DONE' ? '<button class="b sm" data-done="' + t.id + '">完成</button>' : '✓') + '</td></tr>';
    }).join('') || '<tr><td class="empty" colspan="5">暂无任务</td></tr>';
    setView('<div class="pv-head"><div><h1>任务</h1><p>共 ' + r.total + ' 项</p></div><button class="b primary" id="add">+ 新建任务</button></div>' +
      '<div class="panel"><table class="tbl"><thead><tr><th>标题</th><th>状态</th><th>优先级</th><th>截止</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    $$('#view [data-done]').forEach(function (b) { b.onclick = async function () { await API.patch('/tasks/' + b.dataset.done, { status: 'DONE' }); toast('已完成'); viewTasks(); }; });
    $('#add').onclick = async function () {
      var opts = await clientOptions();
      formModal('新建任务', [
        { name: 'title', label: '标题' }, { name: 'description', label: '描述', type: 'textarea' },
        { name: 'priority', label: '优先级', type: 'select', options: PRIORITY, value: 'MEDIUM' },
        { name: 'dueDate', label: '截止日期', type: 'date' },
        { name: 'clientId', label: '关联客户(可选)', type: 'select', options: [['', '—']].concat(opts) },
      ], '创建', async function (d) {
        var body = clean(d); if (body.dueDate) body.dueDate = new Date(body.dueDate).toISOString();
        await API.post('/tasks', body); closeModal(); toast('任务已创建'); viewTasks();
      });
    };
  }

  async function viewProjects() {
    loading();
    var r = await API.get('/projects?pageSize=100');
    var rows = r.items.map(function (p) {
      return '<tr><td>' + esc(p.projectName) + '</td><td>' + badge(labelOf(PROJECT_STATUS, p.status), p.status === 'COMPLETED' ? 'green' : 'gold') + '</td><td>' + (p.dueDate ? fmtDay(p.dueDate) : '-') + '</td></tr>';
    }).join('') || '<tr><td class="empty" colspan="3">暂无项目</td></tr>';
    setView('<div class="pv-head"><div><h1>项目</h1><p>共 ' + r.total + ' 个</p></div><button class="b primary" id="add">+ 新建项目</button></div>' +
      '<div class="panel"><table class="tbl"><thead><tr><th>名称</th><th>状态</th><th>截止</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    $('#add').onclick = async function () {
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
    };
  }

  async function viewContracts() {
    loading();
    var r = await API.get('/contracts');
    var rows = (r.items || []).map(function (c) {
      var canSend = ['DRAFT', 'SENT', 'VIEWED'].indexOf(c.status) > -1;
      return '<tr><td>' + esc(c.title) + '</td><td>' + badge(c.status, c.status === 'SIGNED' ? 'green' : 'gold') + '</td><td>' + (canSend ? '<button class="b sm" data-send="' + c.id + '">发送签署</button>' : (c.signedFileUrl ? '<a class="b sm" href="' + API.downloadUrl(c.signedFileUrl) + '" target="_blank">下载</a>' : '')) + '</td></tr>';
    }).join('') || '<tr><td class="empty" colspan="3">暂无合同</td></tr>';
    setView('<div class="pv-head"><div><h1>合同</h1></div><div style="display:flex;gap:8px"><button class="b" id="tpl">模板</button><button class="b primary" id="add">+ 新建合同</button></div></div>' +
      '<div class="panel"><table class="tbl"><thead><tr><th>标题</th><th>状态</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
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
    var rows = (r.items || []).map(function (i) {
      var actions = '';
      if (i.status === 'DRAFT') actions = '<button class="b sm" data-send="' + i.id + '">发送</button>';
      else if (i.status !== 'PAID' && i.status !== 'CANCELLED') actions = '<button class="b sm" data-paid="' + i.id + '">标记已付</button>';
      return '<tr><td>' + esc(i.invoiceNumber) + '</td><td>' + esc(i.currency) + ' ' + esc(i.amount) + '</td><td>' + (i.dueDate ? fmtDay(i.dueDate) : '-') + '</td><td>' + badge(i.status, i.status === 'PAID' ? 'green' : (i.status === 'OVERDUE' ? 'red' : 'gold')) + '</td><td>' + actions + '</td></tr>';
    }).join('') || '<tr><td class="empty" colspan="5">暂无发票</td></tr>';
    setView('<div class="pv-head"><div><h1>发票</h1></div><button class="b primary" id="add">+ 新建发票</button></div>' +
      '<div class="panel"><table class="tbl"><thead><tr><th>编号</th><th>金额</th><th>到期</th><th>状态</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>');
    $$('#view [data-send]').forEach(function (b) { b.onclick = async function () { await API.post('/invoices/' + b.dataset.send + '/send', {}); toast('已发送'); viewInvoices(); }; });
    $$('#view [data-paid]').forEach(function (b) { b.onclick = async function () { await API.post('/invoices/' + b.dataset.paid + '/mark-paid', {}); toast('已标记已付'); viewInvoices(); }; });
    $('#add').onclick = async function () {
      var opts = await clientOptions();
      if (!opts.length) { toast('请先创建客户', true); return; }
      formModal('新建发票', [
        { name: 'clientId', label: '客户', type: 'select', options: opts },
        { name: 'amount', label: '金额', type: 'number' },
        { name: 'dueDate', label: '到期日期', type: 'date' },
      ], '创建', async function (d) {
        var body = { clientId: d.clientId, amount: parseFloat(d.amount) };
        if (d.dueDate) body.dueDate = new Date(d.dueDate).toISOString();
        await API.post('/invoices', body); closeModal(); toast('发票已创建'); viewInvoices();
      });
    };
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

  // ======================= shell + router =======================
  var ROUTES = { dashboard: viewDashboard, clients: viewClients, tasks: viewTasks, projects: viewProjects, contracts: viewContracts, invoices: viewInvoices, messages: viewMessages, team: viewTeam, settings: viewSettings };
  var TITLES = { dashboard: '仪表盘', clients: '客户', tasks: '任务', projects: '项目', contracts: '合同', invoices: '发票', messages: '消息', team: '团队', settings: '设置' };

  function setActiveNav(key) {
    $$('#appNav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === key); });
    $('#appTitle').textContent = TITLES[key] || 'NOVAI Flow';
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
    } catch (e) { if (e && e.status === 401) return; }
    $('#appLogout').onclick = function () { API.logout(); };
    $('#appBurger').onclick = function () { $('.app-side').classList.add('open'); $('#appOverlay').classList.add('show'); };
    $('#appOverlay').onclick = closeSide;
    $('#appBell').onclick = async function () {
      var n = await API.get('/notifications');
      var list = (n.items || []).map(function (x) { return '<li><div class="t">' + esc(x.title) + '</div><div class="d">' + esc(x.message || '') + ' · ' + fmtDate(x.createdAt) + '</div></li>'; }).join('') || '<li class="d">暂无通知</li>';
      openModal('通知', '<ul class="tl">' + list + '</ul>', { submitLabel: '全部已读', onSubmit: async function () { await API.patch('/notifications/read-all', {}); closeModal(); loadBadge(); } });
    };
    window.addEventListener('hashchange', route);
    if (!location.hash) location.hash = '#/dashboard';
    route();
    loadBadge();
  });
})();
