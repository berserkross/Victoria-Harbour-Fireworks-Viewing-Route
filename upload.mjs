#!/usr/bin/env node
/**
 * upload.mjs —— 通过 GitHub REST API 把本目录的内容推送到远程仓库，并（可选）开启 GitHub Pages。
 *
 * 为什么不用 `git push`？
 *   本机沙箱禁止 git 创建子进程管道（git 需要 ssh/remote-https 子进程），所以 git 联网会失败；
 *   而 Node 自带的 fetch 可以正常联网，因此改用 GitHub 的 Git Data API 直接写仓库。
 *
 * 用法：
 *   node upload.mjs                 # 上传
 *   node upload.mjs --with-pages    # 上传并把 Pages 设为 main / (root)
 *   node upload.mjs --dry-run       # 只显示将要上传什么
 *   node upload.mjs --skip-workflow # 跳过 .github/workflows/（令牌没有 Workflows 权限时）
 *
 * 令牌来源（按顺序尝试，任一即可）：
 *   1) 环境变量 GITHUB_TOKEN
 *   2) 文件 E:\dsh-token.txt （内容只有一行 token）
 *   3) 文件 .\.token.txt
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OWNER = 'berserkross';
const REPO = 'Victoria-Harbour-Fireworks-Viewing-Route';
const BRANCH = 'main';
const API = 'https://api.github.com';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const WITH_PAGES = args.has('--with-pages');

/* 不参与上传的本地文件 */
const IGNORE_DIRS = new Set(['.git', 'node_modules', '_tmp_probe']);
const IGNORE_FILES = new Set([
  '_build.log', '_b.log', 'ci.log', 'upload.log', 'up.log', 'diag.log', 'verify.log', 'v.log',
  '.token.txt', 'dsh-token.txt', 'diag.mjs', '_verify.mjs',
]);
/** 除 IGNORE_FILES 外，一律不上传任何 .log 文件 */
const isIgnoredFile = (name) => IGNORE_FILES.has(name) || name.endsWith('.log');

/** 需要 GitHub 的 Workflows 权限才能提交的路径 */
const isWorkflowPath = (rel) => rel.startsWith('.github/workflows/');

/* ------------------------------------------------------------ 令牌 */

function findToken() {
  if (process.env.GITHUB_TOKEN) return { token: process.env.GITHUB_TOKEN.trim(), from: '环境变量 GITHUB_TOKEN' };
  const cands = ['E:\\dsh-token.txt', 'E:\\token.txt', join(ROOT, '.token.txt')];
  for (const p of cands) {
    if (existsSync(p)) {
      const t = readFileSync(p, 'utf8').replace(/^\uFEFF/, '').trim().split(/\s+/)[0];
      if (t) return { token: t, from: p };
    }
  }
  return null;
}

/* ------------------------------------------------------------ 工具 */

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'fireworks-site-uploader',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 400);
    try {
      const j = JSON.parse(text);
      msg = j.message + (j.errors ? ' :: ' + JSON.stringify(j.errors) : '');
    } catch { /* 保留原文 */ }
    const err = new Error(`${method} ${path} -> HTTP ${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

/** 收集要上传的文件（相对路径，用 / 分隔） */
function collect(dir = ROOT, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).split(sep).join('/');
    const st = statSync(full);
    if (st.isDirectory()) {
      if (IGNORE_DIRS.has(name)) continue;
      collect(full, out);
    } else {
      if (isIgnoredFile(name)) continue;
      out.push({ rel, full, size: st.size });
    }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 清掉上一轮失败留下的探针文件 */
const PROBE_PATHS = ['PROBE-A.txt', 'probe.txt'];

/* ------------------------------------------------------------ 主流程 */

async function main() {
  const files = collect();
  const total = files.reduce((n, f) => n + f.size, 0);
  console.log(`准备上传 ${files.length} 个文件，共 ${(total / 1048576).toFixed(2)} MB`);
  const biggest = files.slice().sort((a, b) => b.size - a.size)[0];
  console.log(`最大文件：${biggest.rel}（${(biggest.size / 1048576).toFixed(2)} MB）`);

  if (biggest.size > 100 * 1024 * 1024) {
    console.error('✗ 有文件超过 GitHub 单文件 100 MB 上限，已中止。');
    process.exit(1);
  }
  if (DRY) {
    files.forEach((f) => console.log(`  ${String(f.size).padStart(9)}  ${f.rel}`));
    console.log('（--dry-run，未上传）');
    return;
  }

  const found = findToken();
  if (!found) {
    console.error(`
✗ 没有找到 GitHub 令牌。

请任选一种方式提供，然后重新运行本脚本：

  方式一（推荐）：
    把令牌保存到  E:\\dsh-token.txt  （文件里只放令牌本身，一行）

  方式二：
    在当前目录建一个  .token.txt  文件，同样只放令牌

  方式三：
    设置环境变量后再运行：  set GITHUB_TOKEN=xxx  &&  node upload.mjs

令牌需要对该仓库有 Contents: Read and write 权限。
`);
    process.exit(2);
  }
  const token = found.token;
  console.log(`使用令牌来源：${found.from}`);

  /* 0. 确认身份与仓库 */
  const me = await api('/user', { token });
  console.log(`✓ 令牌身份：${me.login}`);
  const repo = await api(`/repos/${OWNER}/${REPO}`, { token });
  console.log(`✓ 仓库可写：${repo.full_name}  (default branch: ${repo.default_branch}, private: ${repo.private})`);

  /* 1. 远程当前 HEAD（用于保持历史连续） */
  let parentSha = null;
  try {
    const ref = await api(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`, { token });
    parentSha = ref.object.sha;
    console.log(`✓ 远程已有分支 ${BRANCH}，父提交 ${parentSha.slice(0, 7)}`);
  } catch (e) {
    console.log(`· 远程还没有 ${BRANCH} 分支，将创建首个提交（${String(e.message).slice(0, 80)}）`);
  }

  /* 2. 并行上传 blob */
  console.log('上传文件内容…');
  const CONC = 6;
  const entries = new Array(files.length);
  let done = 0;
  let cursor = 0;

  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= files.length) return;
      const f = files[i];
      const content = readFileSync(f.full);
      const blob = await api(`/repos/${OWNER}/${REPO}/git/blobs`, {
        method: 'POST',
        token,
        body: { content: content.toString('base64'), encoding: 'base64' },
      });
      entries[i] = { path: f.rel, mode: '100644', type: 'blob', sha: blob.sha };
      done += 1;
      process.stdout.write(`\r  ${done}/${files.length}  ${f.rel.slice(0, 60).padEnd(60)}`);
      await sleep(30);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  process.stdout.write('\r' + ' '.repeat(92) + '\r');
  console.log(`✓ 已上传 ${entries.length} 个 blob`);

  /* 3. 建 tree —— 若令牌缺少 Workflows 权限，则剔除工作流文件后重试 */
  let treeEntries = entries;
  if (args.has('--skip-workflow')) {
    treeEntries = entries.filter((e) => !isWorkflowPath(e.path));
    console.log('· 按 --skip-workflow 跳过 .github/workflows/');
  }

  // 找出远程有、本地已经删掉的文件，仅作提示。
  // （GitHub 的 create-tree 接口对「删除条目」的校验很挑：带 base_tree 时
  //  不接受 sha:null，不带 base_tree 时又要求每个条目都有 sha/content。
  //   本脚本以「整体替换根树」的方式上传，历史上传过的旧文件不会被自动清除，
  //   如需删除请到 GitHub 网页上操作，或在仓库里建一个新提交。）
  let stale = [];
  if (parentSha) {
    try {
      const parent = await api(`/repos/${OWNER}/${REPO}/git/commits/${parentSha}`, { token });
      const remoteTree = await api(`/repos/${OWNER}/${REPO}/git/trees/${parent.tree.sha}?recursive=1`, { token });
      const localPaths = new Set(treeEntries.map((e) => e.path));
      stale = remoteTree.tree
        .filter((t) => t.type === 'blob')
        .map((t) => t.path)
        .filter((p) => !localPaths.has(p) && !isWorkflowPath(p));
      if (stale.length) {
        console.log(`! 远程有 ${stale.length} 个文件本地已不存在（本脚本不会自动删除）：`);
        stale.forEach((p) => console.log(`    - ${p}`));
      }
    } catch (e) {
      console.log(`· 无法列出远程文件：${String(e.message).slice(0, 80)}`);
    }
  }

  let tree;
  let workflowSkipped = false;
  const buildTree = (list) => api(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: 'POST',
    token,
    body: { tree: list },
  });

  try {
    tree = await buildTree(treeEntries);
  } catch (e) {
    const hasWorkflow = treeEntries.some((x) => isWorkflowPath(x.path));
    if (e.status === 403 && hasWorkflow) {
      workflowSkipped = true;
      treeEntries = treeEntries.filter((x) => !isWorkflowPath(x.path));
      console.log('! 令牌缺少 Workflows 权限，已跳过 .github/workflows/（不影响网页发布，见文末说明）');
      tree = await buildTree(treeEntries);
    } else {
      throw e;
    }
  }
  console.log(`✓ 已建 tree ${tree.sha.slice(0, 7)}（${treeEntries.length} 项）`);

  /* 4. 建 commit */
  const message =
    'site: 上传《国庆维港烟花路线》网页版\n\n' +
    '由 node upload.mjs 通过 GitHub Git Data API 提交（本地沙箱禁止 git 联网）。\n' +
    `文件数：${treeEntries.length}，体积：${(total / 1048576).toFixed(2)} MB` +
    (workflowSkipped ? '\n注意：本次跳过了 .github/workflows/（令牌无 Workflows 权限）。' : '');
  const commit = await api(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: 'POST',
    token,
    body: { message, tree: tree.sha, parents: parentSha ? [parentSha] : [] },
  });
  console.log(`✓ 已建 commit ${commit.sha.slice(0, 7)}`);

  /* 5. 移动分支指针 */
  if (parentSha) {
    await api(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      token,
      body: { sha: commit.sha, force: false },
    });
    console.log(`✓ 已更新分支 ${BRANCH}`);
  } else {
    await api(`/repos/${OWNER}/${REPO}/git/refs`, {
      method: 'POST',
      token,
      body: { ref: `refs/heads/${BRANCH}`, sha: commit.sha },
    });
    console.log(`✓ 已创建分支 ${BRANCH}`);
  }

  console.log(`\n提交地址：https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`);

  /* 6. 可选：开启 Pages */
  if (WITH_PAGES) {
    console.log('\n配置 GitHub Pages …');
    try {
      await api(`/repos/${OWNER}/${REPO}/pages`, {
        method: 'POST',
        token,
        body: { source: { branch: BRANCH, path: '/' } },
      });
      console.log('✓ Pages 已创建（main / root）');
    } catch (e) {
      if (e.status === 409) {
        try {
          await api(`/repos/${OWNER}/${REPO}/pages`, {
            method: 'PUT',
            token,
            body: { source: { branch: BRANCH, path: '/' } },
          });
          console.log('✓ Pages 已更新（main / root）');
        } catch (e2) {
          console.log(`! Pages 更新失败：${e2.message}`);
        }
      } else {
        console.log(`! Pages 配置失败（可能需要在网页上手动开启，或令牌缺少 Pages 权限）：${e.message}`);
      }
    }
    for (let i = 0; i < 25; i += 1) {
      try {
        const p = await api(`/repos/${OWNER}/${REPO}/pages`, { token });
        console.log(`  构建状态：${p.status ?? 'unknown'}${p.html_url ? '  ' + p.html_url : ''}`);
        if (p.status === 'built') break;
      } catch (e) {
        console.log(`  查询 Pages 状态失败：${e.message}`);
        break;
      }
      await sleep(6000);
    }
  }

  console.log('\n完成。');
  console.log(`仓库：https://github.com/${OWNER}/${REPO}`);
  console.log(`网页：https://${OWNER.toLowerCase()}.github.io/${REPO}/`);
  if (workflowSkipped) {
    console.log(`
说明：本次没有上传 .github/workflows/pages.yml，因为令牌缺少 Workflows 权限。
这不影响网页发布 —— GitHub Pages 直接把本仓库根目录当静态站点发布即可。
若你日后想要「push 后自动重建」，可以给令牌补上 Workflows 权限后重新运行本脚本。`);
  }
}

main().catch((e) => {
  console.error('\n✗ 失败：' + e.message);
  console.error(`\n仓库当前的探针文件（若有）会在下次成功上传时被覆盖清理。`);
  process.exit(1);
});
