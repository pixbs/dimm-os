#!/usr/bin/env node
// The attribution guard. One pattern file (patterns.txt) feeds every mode:
//   check.mjs strip <file>            commit-msg hook: removes attribution lines from a message
//   check.mjs pull-request <number>   required check: cleans the description, then judges the pull request
//   check.mjs push <before> <after>   after a merge: judges the commits that reached main
// A pull request is read through the API and handled as data. Nothing of it is ever run.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export function loadPatterns(file = join(here, 'patterns.txt')) {
  const patterns = { text: [], identity: [], branch: [] };
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [, kind, source] = line.match(/^(identity|branch) +(.+)$/) ?? [null, 'text', line];
    patterns[kind].push(new RegExp(source, 'i'));
  }
  return patterns;
}

const lines = (text) => String(text ?? '').split(/\r?\n/);
const matches = (list, value) => list.some((pattern) => pattern.test(value));

// The lines of a text that carry attribution.
export function attributed(text, patterns) {
  return lines(text).filter((line) => matches(patterns.text, line));
}

// How a line a tool appends begins: an emoji, a "made by" phrase, a trailer key or a link.
const footer = /^[\s>_*-]*(🤖|(\w+ ){0,3}(with|by) |[\w -]{1,40}: |(\[[^\]]*\]\()?https?:\/\/)/i;

// Removes attribution footers and the blank lines or rule they leave hanging at the end.
export function strip(text, patterns) {
  const kept = lines(text).filter((line) => !(footer.test(line) && matches(patterns.text, line)));
  if (kept.length === lines(text).length) return String(text ?? '');
  while (kept.length && !kept.at(-1).trim()) kept.pop();
  if (kept.length && /^\s*([-*_])\1{2,}\s*$/.test(kept.at(-1))) kept.pop();
  while (kept.length && !kept.at(-1).trim()) kept.pop();
  return kept.length ? `${kept.join('\n')}\n` : '';
}

const title = /^(feat|fix|chore|docs|refactor|test|ci|build|perf|revert)(\([a-z0-9-]+\))?!?: [^A-Z\s]\S*( \S+)*$/;
const closes = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?) +#(\d+)\b/i;

// What is wrong with one commit, as the API describes it.
export function judgeCommit(commit, patterns) {
  const problems = [];
  const id = commit.sha.slice(0, 7);
  for (const line of attributed(commit.commit.message, patterns)) {
    problems.push(`commit ${id}: attribution in the message: ${JSON.stringify(line)}`);
  }
  for (const role of ['author', 'committer']) {
    const identity = `${commit.commit[role]?.name} <${commit.commit[role]?.email}>`;
    if (matches(patterns.identity, identity) || commit[role]?.type === 'Bot') {
      problems.push(`commit ${id}: the ${role} ${JSON.stringify(identity)} is a tool or a bot`);
    }
  }
  return problems;
}

// What is wrong with a pull request. `pull` and `commits` are the API's objects; `issue` is the
// linked issue as the API returns it, or null when it does not exist.
export function judgePullRequest(pull, commits, issue, patterns) {
  const problems = [];
  if (!title.test(pull.title)) {
    problems.push('title: not a Conventional Commit, for example "feat: window frame" (type, colon, lower-case subject)');
  }
  if (!closes.test(pull.body ?? '')) problems.push('description: no linked issue, write "Closes #n"');
  else if (!issue || issue.pull_request) problems.push('description: the linked number is not an issue of this repository');
  for (const [where, text] of [['title', pull.title], ['description', pull.body]]) {
    for (const line of attributed(text, patterns)) problems.push(`${where}: attribution: ${JSON.stringify(line)}`);
  }
  if (matches(patterns.branch, pull.head.ref) || attributed(pull.head.ref, patterns).length) {
    problems.push(`branch: ${JSON.stringify(pull.head.ref)} carries a tool's name, use <type>/<issue>-<slug>`);
  }
  if (pull.user?.type === 'Bot') problems.push(`author: ${JSON.stringify(pull.user.login)} is a bot`);
  for (const commit of commits) problems.push(...judgeCommit(commit, patterns));
  return problems;
}

async function api(path, init = {}) {
  const response = await fetch(`https://api.github.com/${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.GH_TOKEN}`,
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} answered ${response.status}`);
  return response.json();
}

async function everyPage(path) {
  const all = [];
  for (let page = 1; ; page++) {
    const batch = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

// Untrusted text is printed inside a list item, so a log line never starts a workflow command.
function report(problems, what) {
  if (!problems.length) return console.log(`conventions: ${what} is fine`);
  for (const problem of problems) console.log(`- ${problem}`);
  console.log(`::error::conventions: ${problems.length} problem(s) in ${what}`);
  process.exitCode = 1;
}

async function main([mode, first, second]) {
  const patterns = loadPatterns();
  const repo = process.env.GITHUB_REPOSITORY;

  if (mode === 'strip') {
    const before = readFileSync(first, 'utf8');
    const after = strip(before, patterns);
    if (after !== before) {
      writeFileSync(first, after);
      console.error('check.mjs: removed attribution lines from the commit message');
    }
  } else if (mode === 'pull-request') {
    const pull = await api(`repos/${repo}/pulls/${first}`);
    const cleaned = strip(pull.body, patterns);
    if (cleaned !== (pull.body ?? '')) {
      await api(`repos/${repo}/pulls/${first}`, { method: 'PATCH', body: JSON.stringify({ body: cleaned }) });
      pull.body = cleaned;
      console.log('conventions: removed tool footer lines from the description');
    }
    const linked = (pull.body ?? '').match(closes)?.[1];
    const issue = linked ? await api(`repos/${repo}/issues/${linked}`).catch(() => null) : null;
    const commits = await everyPage(`repos/${repo}/pulls/${first}/commits`);
    report(judgePullRequest(pull, commits, issue, patterns), `pull request #${first}`);
  } else if (mode === 'push') {
    const commits = /^0+$/.test(first)
      ? await everyPage(`repos/${repo}/commits?sha=${second}`)
      : (await api(`repos/${repo}/compare/${first}...${second}`)).commits;
    report(commits.flatMap((commit) => judgeCommit(commit, patterns)), `${commits.length} commit(s) on main`);
  } else {
    console.error('usage: check.mjs strip <file> | pull-request <number> | push <before> <after>');
    process.exitCode = 2;
  }
}

if (basename(process.argv[1] ?? '') === 'check.mjs') {
  main(process.argv.slice(2)).catch((error) => {
    console.log(`::error::conventions could not run: ${error.message}`);
    process.exitCode = 1;
  });
}
