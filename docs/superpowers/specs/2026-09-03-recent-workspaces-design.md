# 最近工作区切换 设计文档

- 日期：2026-09-03
- 状态：已批准
- 目标：新增「打开最近的工作区」子菜单，记录并快速切换最近打开过的文件夹，与现有「打开最近的文件」体验平行。

## 背景

现有「最近文件」功能在「文件」菜单的子菜单里，通过 `localStorage` 持久化、去重、上限 10，并支持清空。工作区（打开文件夹）由 `workspaceFolder` 管理、在 session 里持久化。用户希望能像切最近文件一样，快速切回历史打开过的文件夹。

## 需求（已澄清）

1. **入口**：「文件」菜单新增「打开最近的工作区」子菜单，紧挨现有「打开最近的文件」。
2. **行为**：点击仅切换工作区目录（走 `maybeOpenFolderPath`，已有差异工作区会弹确认），**不恢复**该工作区上次打开的标签页。
3. **记录**：打开过的文件夹就记录到最近工作区列表；**去重**、上限 10。
4. **持久化**：`localStorage`，键 `tizumark-recent-workspaces`。

## 方案

采用「完全平行最近文件」方案（方案 A）：参照现有 `loadRecentFiles`/`saveRecentFiles`/`addRecentFile`/`renderRecentFilesSubmenu` 那套方法，新增对应的工作区版本。不做通用抽象（YAGNI）。

## 改动

### 1. 数据模型与持久化（src/app.js）

- 状态：`this._recentWorkspaces: string[]`，上限 10。
- localStorage 键：`tizumark-recent-workspaces`。
- 方法（平行现有）：
  - `loadRecentWorkspaces()` / `saveRecentWorkspaces()`
  - `addRecentWorkspace(path)`：先去重（`indexOf` → `splice`）再 `unshift`，截断到 10，保存，若子菜单可见则重渲染。
  - `clearRecentWorkspaces()`：清空 + 保存 + 重渲染。
- 初始化：在构造函数 `_recentFiles` 初始化附近新增 `this._recentWorkspaces = []` 与 `this.loadRecentWorkspaces()`。

### 2. 记录时机（src/app.js）

在 `openFolderPath()` 成功设置 `workspaceFolder` 并渲染完目录树后调用 `this.addRecentWorkspace(folderPath)`。覆盖「打开文件夹」对话框与所有复用 `openFolderPath` 的入口。

### 3. UI 结构（src/index.html）

在「文件」菜单 `#btn-recent` 之后新增：

```html
<div class="dropdown-item dropdown-submenu-trigger" id="btn-recent-workspaces" data-submenu="recent-workspaces-submenu">
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">…文件夹图标（与 btn-open-folder 一致）…</svg>
  <span id="label-recent-workspaces">打开最近的工作区</span>
  <svg class="submenu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
</div>
<div class="dropdown-menu submenu hidden" id="recent-workspaces-submenu"><!-- 动态渲染 --></div>
```

### 4. 渲染与交互（src/app.js）

- `renderRecentWorkspacesSubmenu()`：与 `renderRecentFilesSubmenu` 同构：
  - 空 → 禁用项「暂无最近工作区」。
  - 每项：目录名 + 父路径，`data-path` 存完整路径，`title` 存完整路径。
  - 底部分隔符 + 「清空最近工作区」。
- 事件（文件菜单初始化处）：
  - `#btn-recent-workspaces` 绑 `mouseenter`/`click` → 显示工作区子菜单。
  - `#recent-workspaces-submenu` 绑 `click`：
    - 点「清空」→ `clearRecentWorkspaces()` + 隐藏。
    - 点某项 → 隐藏文件菜单 + 隐藏子菜单，调 `maybeOpenFolderPath(path, { confirm: true })`。
- 定位：复用现有 `showRecentSubmenu` 的 `getBoundingClientRect` 定位逻辑，扩展为通用的子菜单定位（或为工作区子菜单复制一份同样逻辑）。优先做最小改动——把现有定位逻辑抽成可复用的小函数 `positionSubmenu(trigger, submenu)`，供两个子菜单共用。

### 5. i18n（src/app.js）

中/英字典各加：
- `recentWorkspaces` / `'Open Recent Workspaces'`
- `noRecentWorkspaces` / `'No recent workspaces'`
- `clearRecentWorkspaces` / `'Clear Recent Workspaces'`

`updateMenuText('btn-recent-workspaces', t('recentWorkspaces'))` 同步语言切换。

### 6. 样式（src/styles.css）

复用现有 `.recent-file-item / .recent-file-name / .recent-file-dir` 样式给工作区项（类名复用），基本无新 CSS。

## 测试

- 打开文件夹 → 在最近工作区看到记录。
- 重复打开同一文件夹 → 不重复，且顶到最前。
- 打开满 10 个后，新的会挤掉最旧的。
- 点击某工作区 → 切换到该目录；已开不同工作区时弹确认。
- 清空 → 列表清空、显示「暂无最近工作区」。
- 空列表时子菜单只显示「暂无最近工作区」，无「清空」项。
- 中英文切换文案正确。
- 浏览器 mock 模式（`tauri-mock.js`）不报错。

## 非目标

- 不恢复目标工作区上次的标签页。
- 不给当前工作区加高亮。
- 不做通用的"最近列表"抽象。