#!/usr/bin/env node
'use strict';
/**
 * scripts/release-notes.js —— 自动生成 Release Note（单一来源）。
 *
 * 用途：每次「打包 / 发布」时，检查「自上次版本发布标签至今」的全部提交，
 *       把每个改动 / 需求用简短语言归纳成发布说明，满足：
 *         - 防止漏掉某次重要提交未写入发布说明；
 *         - release.js / github-release.js 直接 require 本文件取 VERSION 与 notesLines，
 *           保证 Gitee / GitHub 两个平台的发布说明完全一致。
 *
 * 版本号来源：package.json（发布前由人工 bump）。
 * 上次发布标签：git describe --tags --abbrev=0；若无标签则用最新的 vX.Y.Z 标签。
 *
 * 作为主脚本运行（npm run build 调用）时会把说明写入
 *   release/RELEASE_NOTES_v<VERSION>.md 并打印摘要；
 * 被 require 时只产出内存中的 VERSION / notesLines（供发布脚本使用，不落盘）。
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(ROOT, 'release');

function readPkg() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
}
const VERSION = readPkg().version;

function git(args) {
  try {
    return execSync('git ' + args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function cmpVer(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

// 上次发布标签
function lastTag() {
  const described = git('describe --tags --abbrev=0 2>/dev/null');
  if (described) return described;
  const tags = git('tag --list')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((t) => /^v?\d+\.\d+\.\d+$/.test(t));
  if (tags.length) return tags.sort(cmpVer).pop();
  return '';
}

// 收集自 lastTag 至今的提交（仅在 git 仓库内有效）
function collectCommits(sinceTag) {
  const range = sinceTag ? `${sinceTag}..HEAD` : 'HEAD';
  const out = git(`log ${range} --pretty=format:%s`);
  if (!out) return [];
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// 把一条提交信息归纳成一句话（去前缀、压缩「代码描述」风格大段）
function summarize(raw) {
  if (!raw) return '';
  let s = raw.replace(/\s+/g, ' ').trim();

  // 1) 去掉常见的 Conventional Commits 类型前缀，但保留中文语义
  s = s.replace(/^(feat|fix|refactor|perf|test|chore|docs|style|build|ci|revert)(\([^)]*\))?\s*[:：]\s*/i, '');

  // 2) 形如「代码描述：【TizuMark】修复 xxx - 点1 - 点2 ...」→ 取第一个「-」之前的主句
  const bulletIdx = s.indexOf(' - ');
  if (bulletIdx > 0 && s.length > bulletIdx + 2) {
    s = s.slice(0, bulletIdx).replace(/代码描述[：:]\s*【[^】]*】\s*/, '');
  } else {
    s = s.replace(/^代码描述[：:]\s*【[^】]*】\s*/, '');
  }

  // 3) 去掉「需求名称：...」「开发进度：...」等尾随元信息
  s = s.replace(/[；;]?\s*(需求名称|开发进度|任务编号|关联)\s*[：:].*$/i, '');

  s = s.trim();
  // 4) 首字母大写更工整
  if (s) s = s[0].toUpperCase() + s.slice(1);
  return s;
}

function downloadSection() {
  return [
    '## ⬇️ 下载',
    '',
    '> **🏆 推荐大多数用户选择：** [⬇ TizuMark_' + VERSION + '_x64-setup.exe](https://gitee.com/tizu/tizu-mark/releases/download/v' + VERSION + '/TizuMark_' + VERSION + '_x64-setup.exe)',
    '>',
    '> **🛠 企业/批量部署：** [⬇ TizuMark_' + VERSION + '_x64_en-US.msi](https://gitee.com/tizu/tizu-mark/releases/download/v' + VERSION + '/TizuMark_' + VERSION + '_x64_en-US.msi)',
    '>',
    '> **📦 绿色版（免安装）：** [⬇ TizuMark_' + VERSION + '_x64.exe](https://gitee.com/tizu/tizu-mark/releases/download/v' + VERSION + '/TizuMark_' + VERSION + '_x64.exe)',
    '',
    '---',
    '',
  ];
}

function buildNotes() {
  const tag = lastTag();
  const commits = collectCommits(tag);
  const changes = [];
  const seen = new Set();
  for (const c of commits) {
    const one = summarize(c);
    if (one && !seen.has(one)) {
      seen.add(one);
      changes.push(one);
    }
  }

  const scopeLine = tag
    ? `自 ${tag} 起共 ${commits.length} 项提交`
    : `共 ${commits.length} 项提交（未找到历史发布标签）`;

  const head = [
    '## ✨ v' + VERSION + ' 更新内容',
    '',
    '> ' + scopeLine + '。以下由 `git log` 自动归纳，发布前请人工复核增删。',
    '',
  ];

  const changeBlock = changes.length
    ? changes.map((c) => '- ' + c)
    : ['- （无新提交）'];

  const tail = ['', '> 使用中遇到问题欢迎加 QQ 群：1035294939'];

  return downloadSection().concat(head, changeBlock, tail);
}

const notesLines = buildNotes();

// 落盘发布说明。被 release.js / github-release.js 在「打包发布」流程中调用，
// 也可在 `node scripts/release-notes.js` 直接运行时触发。
function writeNotes() {
  try {
    if (!fs.existsSync(RELEASE_DIR)) fs.mkdirSync(RELEASE_DIR, { recursive: true });
    const outFile = path.join(RELEASE_DIR, `RELEASE_NOTES_v${VERSION}.md`);
    fs.writeFileSync(outFile, notesLines.join('\n') + '\n', 'utf8');
    console.log('📝 已生成发布说明: ' + outFile);
    console.log('   版本 ' + VERSION + ' | 提交区间见上方说明头部');
    return outFile;
  } catch (e) {
    console.error('生成发布说明失败（不影响发布）: ' + e.message);
    return null;
  }
}

if (require.main === module) {
  writeNotes();
}

module.exports = { VERSION, notesLines, lastTag, collectCommits, summarize, writeNotes };
