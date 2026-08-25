// slash 命令排序对话框测试：自定义顺序（slashOrder）、显隐（slashHidden）、
// 新命令补尾、陈旧 id 忽略、对话框草稿初始化、勾选联动、保存落盘、面板仅显示非隐藏项。
// 使用 withEditor 串行化，避免 node:test 并发子测试互相踩踏共享的 global.window/document。
const test = require('node:test');
const assert = require('node:assert');
const { withEditor } = require('./helpers/app-env.cjs');

// 模拟「输入 / 并触发」：在指定位置插入 /，光标移到 / 后，调用触发检测
function typeSlash(ed, line, ch) {
  ed.cm.replaceRange('/', { line, ch });
  const pos = { line, ch: ch + 1 };
  ed.cm.setCursor(pos);
  ed._maybeTriggerSlash(ed.cm, pos);
}

test('slash-order: _buildSlashBaseCatalogIds 含全部 28 项', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  const ids = ed._buildSlashBaseCatalogIds();
  assert.strictEqual(ids.length, 28, '基础目录应为 28 项，实际: ' + ids.length);
  assert.ok(ids.includes('insert-h1') && ids.includes('insert-h6'), '应含首尾标题');
}));

test('slash-order: _applySlashLayout 按 slashOrder 重排', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  const catalog = [
    { action: 'a', label: 'A' }, { action: 'b', label: 'B' },
    { action: 'c', label: 'C' }, { action: 'd', label: 'D' },
  ];
  ed.settings.slashOrder = ['c', 'a', 'd', 'b'];
  ed.settings.slashHidden = [];
  const out = ed._applySlashLayout(catalog);
  assert.strictEqual(out.map((c) => c.action).join(','), 'c,a,d,b', '应按保存顺序重排');
}));

test('slash-order: _applySlashLayout 过滤隐藏项', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  const catalog = [
    { action: 'a', label: 'A' }, { action: 'b', label: 'B' }, { action: 'c', label: 'C' },
  ];
  ed.settings.slashOrder = ['a', 'b', 'c'];
  ed.settings.slashHidden = ['b'];
  const out = ed._applySlashLayout(catalog);
  assert.strictEqual(out.map((c) => c.action).join(','), 'a,c', '隐藏项 b 应被过滤');
}));

test('slash-order: _applySlashLayout 新命令补尾、陈旧 id 忽略', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  const catalog = [
    { action: 'a', label: 'A' }, { action: 'b', label: 'B' }, { action: 'new', label: 'NEW' },
  ];
  // 保存顺序里含陈旧 id 'old'（目录已不存在），且未列出新增的 'new'
  ed.settings.slashOrder = ['old', 'b', 'a'];
  ed.settings.slashHidden = [];
  const out = ed._applySlashLayout(catalog);
  // 陈旧 'old' 被忽略、'b','a' 按序、'new' 补到末尾
  assert.strictEqual(out.map((c) => c.action).join(','), 'b,a,new', '应忽略陈旧并补尾新项，实际: ' + out.map((c) => c.action).join(','));
}));

test('slash-order: _buildSlashCommands 反映自定义顺序与隐藏', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  ed.settings.slashOrder = ['insert-image', 'insert-bold', 'insert-h1'];
  ed.settings.slashHidden = ['insert-table'];
  ed._slashCommands = null;
  const cmds = ed._buildSlashCommands();
  const actions = cmds.map((c) => c.action);
  assert.strictEqual(actions[0], 'insert-image', '首项应为 insert-image');
  assert.ok(!actions.includes('insert-table'), '隐藏的 insert-table 不应出现');
  // 未列出的其余项按默认序补在后面，总数 = 28 - 1(隐藏) = 27
  assert.strictEqual(cmds.length, 27, '总数应为 27，实际: ' + cmds.length);
}));

test('slash-order: _moveSlashOrderItem 在草稿内移动', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  ed._slashOrderDraft = ['a', 'b', 'c', 'd'];
  ed._moveSlashOrderItem(0, 2);
  assert.strictEqual(ed._slashOrderDraft.join(','), 'b,c,a,d', '从 0 移到 2 应得 b,c,a,d，实际: ' + ed._slashOrderDraft);
  ed._moveSlashOrderItem(3, 0);
  assert.strictEqual(ed._slashOrderDraft.join(','), 'd,b,c,a', '从 3 移到 0 应得 d,b,c,a，实际: ' + ed._slashOrderDraft);
}));

test('slash-order: showSlashOrderDialog 初始化草稿为全 28 项、对话框可见', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  ed.settings.slashOrder = undefined;
  ed.settings.slashHidden = undefined;
  ed.showSlashOrderDialog();
  assert.strictEqual(ed._slashOrderOpen, true, '对话框应标记为打开');
  assert.strictEqual(ed._slashOrderDraft.length, 28, '草稿应为 28 项');
  assert.strictEqual(ed._slashHiddenDraft.size, 0, '默认无隐藏');
  const list = w.document.getElementById('slash-order-list');
  assert.strictEqual(list.children.length, 28, '对话框应渲染 28 行，实际: ' + list.children.length);
  assert.strictEqual(w.document.getElementById('slash-order-dialog').classList.contains('hidden'), false, '对话框应可见');
}));

test('slash-order: 取消勾选将项加入隐藏草稿', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  ed.settings.slashOrder = undefined;
  ed.settings.slashHidden = undefined;
  ed.showSlashOrderDialog();
  const list = w.document.getElementById('slash-order-list');
  // 找到 insert-image 行并取消勾选
  const rows = Array.from(list.querySelectorAll('.slash-order-row'));
  const target = rows.find((r) => r.querySelector('.slash-order-label').textContent === '图片');
  assert.ok(target, '应存在「图片」行');
  const cb = target.querySelector('input[type=checkbox]');
  assert.strictEqual(cb.checked, true, '默认应勾选');
  cb.checked = false;
  cb.dispatchEvent(new w.Event('change'));
  assert.ok(ed._slashHiddenDraft.has('insert-image'), '取消勾选后 insert-image 应进入隐藏草稿');
  assert.ok(target.classList.contains('hidden-cmd'), '行应加 hidden-cmd 样式');
}));

test('slash-order: applySlashOrder 写盘、清缓存、面板仅显示非隐藏项', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  ed.settings.slashOrder = undefined;
  ed.settings.slashHidden = undefined;
  ed.showSlashOrderDialog();
  // 隐藏「图片」
  const list = w.document.getElementById('slash-order-list');
  const target = Array.from(list.querySelectorAll('.slash-order-row'))
    .find((r) => r.querySelector('.slash-order-label').textContent === '图片');
  const cb = target.querySelector('input[type=checkbox]');
  cb.checked = false;
  cb.dispatchEvent(new w.Event('change'));
  // 保存
  ed.applySlashOrder();
  assert.strictEqual(ed._slashOrderOpen, false, '保存后对话框应关闭');
  assert.ok(ed.settings.slashHidden.includes('insert-image'), '设置应记录隐藏项');
  assert.strictEqual(ed._slashCommands, null, '应清缓存');
  // 面板仅显示 27 项，无「图片」
  ed.cm.setValue('');
  typeSlash(ed, 0, 0);
  const items = w.document.querySelectorAll('#slash-panel .slash-item');
  assert.strictEqual(items.length, 27, '面板应显示 27 项，实际: ' + items.length);
  const labels = Array.from(items).map((i) => i.querySelector('.slash-label').textContent);
  assert.ok(!labels.includes('图片'), '面板不应含被隐藏的「图片」');
}));

test('slash-order: resetSlashOrder 恢复默认顺序与全显示', async () => withEditor({ captureInitErr: true }, async (w, ed) => {
  ed.settings.slashOrder = ['insert-image', 'insert-bold'];
  ed.settings.slashHidden = ['insert-table'];
  ed.showSlashOrderDialog();
  // 先制造脏数据
  ed._slashOrderDraft = ['insert-h6', 'insert-h5'];
  ed._slashHiddenDraft = new Set(['insert-h1']);
  ed.resetSlashOrder();
  assert.strictEqual(ed._slashOrderDraft.join(','), ed._buildSlashBaseCatalogIds().join(','), '应恢复默认顺序');
  assert.strictEqual(ed._slashHiddenDraft.size, 0, '应恢复全部显示');
}));
