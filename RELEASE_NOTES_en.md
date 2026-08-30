## ⬇️ Download

> **🏆 Recommended for most users:** [⬇ TizuMark_1.2.2_x64-setup.exe](https://gitee.com/tizu/TizuMark-Markdown-Editor/releases/download/v1.2.2/TizuMark_1.2.2_x64-setup.exe)
>
> **🛠 Enterprise / bulk deploy:** [⬇ TizuMark_1.2.2_x64_en-US.msi](https://gitee.com/tizu/TizuMark-Markdown-Editor/releases/download/v1.2.2/TizuMark_1.2.2_x64_en-US.msi)
>
> **📦 Portable (no install):** [⬇ TizuMark_1.2.2_x64.exe](https://gitee.com/tizu/TizuMark-Markdown-Editor/releases/download/v1.2.2/TizuMark_1.2.2_x64.exe)

### Package types

| Package | For | Notes |
|--------|-----|-------|
| ⭐ **NSIS installer (.exe)** — **Recommended** | Most Windows users | Classic setup wizard; custom install path, desktop shortcut, file association. |
| **MSI installer (.msi)** | IT admins / bulk deploy | Windows Installer; group policy push, silent install (msiexec /i TizuMark_1.2.2_x64_en-US.msi /qn). |
| **Portable (.exe)** | Portable use | Single file, no install, no registry writes. |

---

## ✨ v1.2.2 Changelog

### Added
- Quick insert (slash command palette): type "/" in the editor to open the command palette, with list prioritization, drag-to-reorder and show/hide
- View mode switches intelligently by file type: Markdown uses split preview, plain text uses editor-only (no preview pane/side buttons), images use read-only preview
- "Extended syntax highlight" toggle: can disable ==text== highlighting
- File sidebar: sort by creation time and show creation time
- Heading shortcut smartly switches heading level (in-place replace + same-level cancel)
- Table editing enhancements: Enter auto-formats + add row/add column actions
- Draggable/resizable dialogs + collapsible panel system + full Lucide icon unification
- Toast/error dialog gets a clickable close button
- Shortcut settings panel: collapsible categories + tabular layout + unified keycap styling + default collapsed state
- New shortcuts: Ctrl+Enter / Ctrl+Shift+Enter to insert blank line, Ctrl+Home/End for document start/end navigation
- Zoom enhancements: refined Ctrl+wheel font sizing, new Ctrl+wheel preview font zoom

### Improved
- UI consolidation: breadcrumb / outline toggle / dropdown caret / About & Settings panel styling unified
- Theme & fonts: editor background follows theme color, IBM Plex Serif added to font whitelist
- File tree clears context after copy/cut/paste to avoid hijacking editor/preview Ctrl+C/V
- Dialog drag-resize fully reused, drag follows cursor
- Update endpoint now prefers Gitee raw (better reliability on domestic networks)
- Removed unused dependencies (pulldown-cmark, linkify-it, markdown-it-highlightjs; dev: sharp, png-to-ico, @fiahfy/icns) to reduce size
- Docs: view mode, quick insert, file search (Ctrl+P), file-tree context menu, status bar; fixed shortcuts reference
- Bumped quinn-proto to 0.11.15, fixing security advisory GHSA-4w2j-m93h-cj5j

### Fixed
- Fixed backslash mis-detected as math formula, WeChat image host broken images, missing .md extension on new/rename
- Fixed math rendering: inline formulas with spaces, double HTML-entity escaping, Office tags
- Fixed preview Ctrl+C hijacked by file-tree operations; added shortcut hints to context menu
- Outline same-level heading placeholder toggle keeps labels aligned
- View-mode regression fixes: unnamed tabs no longer force view switch, newFile/initialization regression, restored images no longer turn into code

> Questions? Join QQ group: 1035294939
