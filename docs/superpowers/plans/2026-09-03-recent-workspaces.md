# 最近工作区切换 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在「文件」菜单新增「打开最近的工作区」子菜单，记录并快速切换最近打开的文件夹（去重、上限 10）。

**架构：** 完全平行现有「最近文件」实现（方案 A）。新增 `_recentWorkspaces` 状态与一组成员方法，存 `localStorage` 键 `tizumark-recent-workspaces`；在文件菜单加一个子菜单节点；复用现有 submenu 定位逻辑（抽成通用小函数）；`openFolderPath` 成功后记录；点击走 `maybeOpenFolderPath` 切换。

**技术栈：** 原生 JS（app.js）、HTML、localStorage、jsdom 测试（node:test）。

**规格文档：** `docs/superpowers/specs/2026-09-03-recent-workspaces-design.md`

---

### 任务 1：i18n 文案

**文件：**
- 修改：`src/app.js:229-231`（中文 dict 的 recentFiles 附近）
- 修改：`src/app.js:614-616`（英文 dict 的 recentFiles 附近）

- [ ] **步骤 1：加中文字典键**

在 `recentFiles: '打开最近的文件',`（app.js:229）之后的 `noRecentFiles`/`clearRecentFiles` 附近，紧邻加入：

```js
recentWorkspaces: '打开最近的工作区',
noRecentWorkspaces: '暂无最近工作区',
clearRecentWorkspaces: '清空最近工作区',
```

- [ ] **步骤 2：加英文字典键**

在英文 `noRecentFiles`/`clearRecentFiles`（app.js:615-616）附近加入：

```js
recentWorkspaces: 'Open Recent Workspaces',
noRecentWorkspaces: 'No recent workspaces',
clearRecentWorkspaces: 'Clear Recent Workspaces',
```

- [ ] **步骤 3：Commit**

```bash
git add src/app.js
git commit -m "feat(recent-workspaces): 新增最近工作区 i18n 文案"
```

---

### 任务 2：状态初始化 + 持久化方法

**文件：**
- 修改：`src/app.js:1124-1126`（构造函数 `_recentFiles` 初始化附近）

- [ ] **步骤 1：加状态初始化**

在 `this.loadRecentFiles();`（app.js:1126）之后加：

```js
this._recentWorkspaces = [];
this.loadRecentWorkspaces();
```

- [ ] **步骤 2：加持久化与 CRUD 方法**

在现有 `clearRecentFiles()`（app.js:5104-5108）之后、`refreshRecentFiles()` 之前，插入以下方法（与最近文件对称）：

```js
loadRecentWorkspaces() {
  try {
    const raw = localStorage.getItem('tizumark-recent-workspaces');
    const arr = raw ? JSON.parse(raw) : [];
    this._recentWorkspaces = Array.isArray(arr) ? arr.filter(p => typeof p === 'string') : [];
  } catch {
    this._recentWorkspaces = [];
  }
}

saveRecentWorkspaces() {
  try {
    localStorage.setItem('tizumark-recent-workspaces', JSON.stringify(this._recentWorkspaces || []));
  } catch {}
}

addRecentWorkspace(folderPath) {
  if (!folderPath) return;
  const list = this._recentWorkspaces || (this._recentWorkspaces = []);
  const idx = list.indexOf(folderPath);
  if (idx !== -1) list.splice(idx, 1);
  list.unshift(folderPath);
  if (list.length > 10) list.length = 10;
  this.saveRecentWorkspaces();
  if (this._recentWorkspacesSubmenuVisible) this.renderRecentWorkspacesSubmenu();
}

clearRecentWorkspaces() {
  this._recentWorkspaces = [];
  this.saveRecentWorkspaces();
  if (this._recentWorkspacesSubmenuVisible) this.renderRecentWorkspacesSubmenu();
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/app.js
git commit -m "feat(recent-workspaces): 最近工作区持久化与去重方法"
```

---

### 任务 3：渲染子菜单 + 通用定位函数

**文件：**
- 修改：`src/app.js:5133-5154`（现有 showRecentSubmenu/hideRecentSubmenu）

- [ ] **步骤 1：抽出通用子菜单定位函数**

将现有 `showRecentSubmenu`（app.js:5139-5154）里的 `getBoundingClientRect` 定位逻辑改为通用函数，紧挨 `showRecentSubmenu` 新增：

```js
positionSubmenu(trigger, submenu) {
  if (!trigger || !submenu) return;
  const rect = trigger.getBoundingClientRect();
  submenu.style.left = (rect.right - 1) + 'px';
  submenu.style.top = rect.top + 'px';
  requestAnimationFrame(() => {
    const sr = submenu.getBoundingClientRect();
    if (sr.right > window.innerWidth) submenu.style.left = (rect.left - sr.width + 1) + 'px';
    if (sr.bottom > window.innerHeight) submenu.style.top = (window.innerHeight - sr.height - 4) + 'px';
  });
}
```

并重构 `showRecentSubmenu` 复用 `positionSubmenu(trigger, submenu)`（删除原内联定位代码，只保留 `renderRecentFilesSubmenu()` + `submenu.classList.remove('hidden')` + `_recentSubmenuVisible = true` + 调用 `positionSubmenu`）。

- [ ] **步骤 2：新增 hide/show/render 工作区子菜单**

紧挨现有 `hideRecentSubmenu`（app.js:5133）之后新增：

```js
renderRecentWorkspacesSubmenu() {
  const submenu = document.getElementById('recent-workspaces-submenu');
  if (!submenu) return;
  const list = this._recentWorkspaces || [];
  submenu.innerHTML = '';
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dropdown-item disabled';
    empty.textContent = this.t('noRecentWorkspaces');
    submenu.appendChild(empty);
    return;
  }
  list.forEach(p => {
    const item = document.createElement('div');
    // 复用 .recent-file-* 样式；.recent-workspace-* 作为语义钩子
    item.className = 'dropdown-item recent-file-item recent-workspace-item';
    item.dataset.path = p;
    const name = p.split(/[/\\]/).pop() || p;
    const dir = p.slice(0, Math.max(0, p.length - name.length)).replace(/[/\\]$/, '');
    const nameEl = document.createElement('span');
    nameEl.className = 'recent-file-name recent-workspace-name';
    nameEl.textContent = name;
    const dirEl = document.createElement('span');
    dirEl.className = 'recent-file-dir recent-workspace-dir';
    dirEl.textContent = dir;
    item.appendChild(nameEl);
    item.appendChild(dirEl);
    item.title = p;
    submenu.appendChild(item);
  });
  const sep = document.createElement('div');
  sep.className = 'dropdown-separator';
  submenu.appendChild(sep);
  const clear = document.createElement('div');
  clear.className = 'dropdown-item recent-clear recent-workspace-clear';
  clear.dataset.action = 'clear';
  clear.textContent = this.t('clearRecentWorkspaces');
  submenu.appendChild(clear);
}

showRecentWorkspacesSubmenu() {
  const trigger = document.getElementById('btn-recent-workspaces');
  const submenu = document.getElementById('recent-workspaces-submenu');
  if (!trigger || !submenu) return;
  this.renderRecentWorkspacesSubmenu();
  submenu.classList.remove('hidden');
  this._recentWorkspacesSubmenuVisible = true;
  this.positionSubmenu(trigger, submenu);
}

hideRecentWorkspacesSubmenu() {
  const sm = document.getElementById('recent-workspaces-submenu');
  if (sm) sm.classList.add('hidden');
  this._recentWorkspacesSubmenuVisible = false;
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/app.js
git commit -m "feat(recent-workspaces): 渲染与通用子菜单定位"
```

---

### 任务 4：UI 节点（index.html）

**文件：**
- 修改：`src/index.html:128-133`（`#btn-recent` 与 `#recent-files-submenu` 之后）

- [ ] **步骤 1：新增两个节点**

在 `#recent-files-submenu` 的 `</div>`（app.js 里 index.html:133）之后、`#btn-save` 之前，插入：

```html
<div class="dropdown-item dropdown-submenu-trigger" id="btn-recent-workspaces" data-submenu="recent-workspaces-submenu">
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M2 8h20"/><path d="M6 12h4"/><path d="M6 16h4"/></svg>
  <span id="label-recent-workspaces">打开最近的工作区</span>
  <svg class="submenu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
</div>
<div class="dropdown-menu submenu hidden" id="recent-workspaces-submenu"><!-- 动态渲染 --></div>
```

- [ ] **步骤 2：Commit**

```bash
git add src/index.html
git commit -m "feat(recent-workspaces): 文件菜单新增最近工作区子菜单节点"
```

---

### 任务 5：事件绑定与菜单文本同步

**文件：**
- 修改：`src/app.js:5383-5411`（文件菜单事件初始化块）

- [ ] **步骤 1：给 trigger 绑 hover/click，submenu 绑 click**

在现有 `recentSubmenu.addEventListener('click', ...)`（app.js:5396-5411）之后追加：

```js
const wsTrigger = document.getElementById('btn-recent-workspaces');
if (wsTrigger) {
  wsTrigger.addEventListener('mouseenter', () => this.showRecentWorkspacesSubmenu());
  wsTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    this.showRecentWorkspacesSubmenu();
  });
}
const wsSubmenu = document.getElementById('recent-workspaces-submenu');
if (wsSubmenu) {
  wsSubmenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const clearItem = e.target.closest('[data-action="clear"]');
    if (clearItem) {
      this.clearRecentWorkspaces();
      this.hideRecentWorkspacesSubmenu();
      return;
    }
    const item = e.target.closest('.recent-workspace-item');
    if (item && item.dataset.path) {
      const path = item.dataset.path;
      document.getElementById('file-menu').classList.add('hidden');
      this.hideRecentWorkspacesSubmenu();
      this.maybeOpenFolderPath(path, { confirm: true });
    }
  });
}
```

- [ ] **步骤 2：鼠标移出文件菜单时收起工作区子菜单**

在现有 `file-menu` 的 `mouseover` 处理（app.js:5390-5394）里追加一行 `this.hideRecentWorkspacesSubmenu();`（与 `this.hideRecentSubmenu()` 并列）。

- [ ] **步骤 3：updateMenuText 同步语言**

在 `updateMenuText('btn-recent', t('recentFiles'));`（app.js:1288）之后加：

```js
updateMenuText('btn-recent-workspaces', t('recentWorkspaces'));
```

- [ ] **步骤 4：Commit**

```bash
git add src/app.js
git commit -m "feat(recent-workspaces): 子菜单事件与语言同步"
```

---

### 任务 6：打开文件夹时记录

**文件：**
- 修改：`src/app.js:7611-7627`（`openFolderPath`）

- [ ] **步骤 1：成功后调用记录**

在 `openFolderPath`（app.js:7620）的 `this.saveSession();` 之后（`this.setStatus(...)` 附近）插入：

```js
this.addRecentWorkspace(folderPath);
```

- [ ] **步骤 2：Commit**

```bash
git add src/app.js
git commit -m "feat(recent-workspaces): 打开文件夹时记录最近工作区"
```

---

### 任务 7：测试（TDD 补测试）

**文件：**
- 创建：`test/recent-workspaces.test.cjs`

- [ ] **步骤 1：写测试**

参照 `test/recent-files.test.cjs` 的结构，新增 `test/recent-workspaces.test.cjs`，覆盖：

- `addRecentWorkspace` 截断到 10
- `addRecentWorkspace` 最新置顶
- `addRecentWorkspace` 去重后仍为 10
- `load/save 持久化往返`
- `loadRecentWorkspaces 损坏 JSON 兜底空数组`
- `render 渲染 2 个工作区项`（目录名 + 父路径 + 含清空项）
- `render 空态 disabled=暂无最近工作区`
- `clearRecentWorkspaces 清空`

HTML 需含 `recent-workspaces-submenu`、`btn-recent-workspaces`、`file-menu` 节点；harness 里 `ed._recentWorkspaces = []`、`ed._recentWorkspacesSubmenuVisible` 初始化。渲染断言 class `.recent-workspace-item` / `.recent-workspace-name` / `.recent-workspace-dir`（这些类与 `.recent-file-*` 并存在同一元素上，仅用于语义定位与断言，不含新 CSS）。

（实际测试代码按 recent-files.test.cjs 模式：`Object.create(MarkdownEditor.prototype)`，`saveRecentFiles` → `loadRecentWorkspaces` 对应改键名；渲染项断言改 class 与文本。）

- [ ] **步骤 2：运行新测试确认通过**

```bash
node --test test/recent-workspaces.test.cjs
```

预期：全部 PASS。

- [ ] **步骤 3：运行最近文件回归**

```bash
node --test test/recent-files.test.cjs
```

预期：全部 PASS（验证 `positionSubmenu` 重构未破坏现有逻辑）。

- [ ] **步骤 4：Commit**

```bash
git add test/recent-workspaces.test.cjs
git commit -m "test(recent-workspaces): 最近工作区功能测试"
```

---

### 任务 8：整体验证

**文件：** 无

- [ ] **步骤 1：重建 renderer**

```bash
npm run build:renderer
```

预期：成功，无报错。

- [ ] **步骤 2：运行入口/渲染相关回归 + entry-scripts 检查**

```bash
node test/entry-scripts.test.cjs
node test/tauri-api.test.cjs
```

预期：全部 PASS。

- [ ] **步骤 3：抽查全量前端测试（可选，若时间允许）**

```bash
npm test
```

预期：通过。

---

## 自检记录

- **规格覆盖度**：规格的 6 个改动点（数据模型、记录时机、UI、渲染交互、i18n、样式）——任务 1(i18n)、2(数据模型)、3(渲染/定位)、4(UI)、5(事件/语言同步)、6(记录时机) 全覆盖。样式条目规格明确"复用现有 class，基本无新 CSS"，且渲染复用了 `.recent-file-*` 的样式语义（类名换成 `.recent-workspace-*`，若 CSS 未定义这些类请改为复用 `.recent-file-*`，见下方注）。
  - **注**：`styles.css` 目前只定义了 `.recent-file-item/.recent-file-name/.recent-file-dir`，未定义 `.recent-workspace-*`。为最小化 CSS，`renderRecentWorkspacesSubmenu` 的 item 类名改用 `recent-file-item recent-workspace-item`（同时挂两个类），name/dir 用 `recent-file-name recent-workspace-name` / `recent-file-dir recent-workspace-dir`，即可继承现有样式、零新增 CSS。
- **占位符扫描**：无 TODO/待定；每个代码步骤给出完整代码。
- **类型一致性**：方法名 `addRecentWorkspace/saveRecentWorkspaces/loadRecentWorkspaces/clearRecentWorkspaces/renderRecentWorkspacesSubmenu/showRecentWorkspacesSubmenu/hideRecentWorkspacesSubmenu/positionSubmenu`、状态 `_recentWorkspaces/_recentWorkspacesSubmenuVisible`、DOM id `btn-recent-workspaces/recent-workspaces-submenu/label-recent-workspaces`、i18n 键 `recentWorkspaces/noRecentWorkspaces/clearRecentWorkspaces`，各任务间一致。