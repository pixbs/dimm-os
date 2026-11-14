// Claude Code pre-tool hook for the Bash and PowerShell tools. It refuses a command that would
// put tool attribution into a commit, pull request, issue or comment, skip the commit hook,
// merge with a hand-written message, or change the repository's rules. Exit code 2 blocks the
// command and shows the reason to the agent. If anything in here fails, the command is blocked.
// Written to run both as CommonJS and as an ES module: no require, no static import.
(async () => {
  const block = (why) => {
    process.stderr.write(`Blocked by .claude/hooks/guard.js: ${why}\n`);
    process.exit(2);
  };
  try {
    const { existsSync, readFileSync, statSync } = await import('node:fs');
    const { dirname, join, resolve } = await import('node:path');
    const { pathToFileURL } = await import('node:url');

    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const call = JSON.parse(input);
    const command = call.tool_input?.command;
    if (typeof command !== 'string') process.exit(0);

    const guard = join(dirname(process.argv[1]), '..', '..', 'scripts', 'attribution', 'check.mjs');
    const { loadPatterns, attributed } = await import(pathToFileURL(guard).href);
    const patterns = loadPatterns();

    // Flags are looked for outside quotes, so a word inside a message is not taken for a flag.
    const bare = command.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
    // The arguments of one call, up to the next pipe or separator; undefined when it is not made.
    const args = (program) => bare.match(new RegExp(`\\b${program}\\b([^|;&\\n]*)`, 'i'))?.[1];
    const git = (verbs) => args(`git(?:\\.exe)?\\b[^|;&\\n]*\\b(?:${verbs})`);
    const gh = (verbs) => args(`gh(?:\\.exe)?\\s+(?:${verbs})`);

    if (git('commit|tag|notes|merge|rebase|cherry-pick|am|revert') !== undefined || gh('pr|issue|api|release|repo') !== undefined) {
      // The command itself, and the files it hands over as a message or a body.
      let text = command;
      const files = command.matchAll(/(?:-F|--file|--body-file|--input|--notes-file)[=\s]+["']?([^\s"']+)|=@["']?([^\s"']+)/g);
      for (const [, flagged, field] of files) {
        const file = resolve(call.cwd ?? '.', (flagged ?? field).replace(/^\/([a-zA-Z])\//, '$1:/'));
        if (existsSync(file) && statSync(file).isFile() && statSync(file).size < 1e6) text += `\n${readFileSync(file, 'utf8')}`;
      }
      const found = attributed(text, patterns);
      if (found.length) block(`tool attribution (${JSON.stringify(found[0].trim().slice(0, 80))}). Remove it and run the command again.`);
    }

    const identities = command.matchAll(/(?:--author[=\s]+|user\.(?:name|email)\s+|GIT_(?:AUTHOR|COMMITTER)_(?:NAME|EMAIL)=)("[^"]*"|'[^']*'|\S+)/gi);
    for (const [, quoted] of identities) {
      const identity = quoted.replace(/^["']|["']$/g, '');
      if (patterns.identity.some((pattern) => pattern.test(identity) || pattern.test(`<${identity}>`))) {
        block('a tool or a bot as author or committer. Commits carry the identity git already has.');
      }
    }

    // The hooks live in .husky; pointing git anywhere else, or nowhere, switches them off.
    const hooksPath = bare.match(/core\.hooksPath[=\s]+(\S+)/i)?.[1];
    const movesHooks = (hooksPath && !/^\.husky(\/_)?$/.test(hooksPath)) || /--unset(-all)?\s+core\.hooksPath/i.test(bare);
    if (/--no-verify\b|\bHUSKY=0\b/i.test(bare) || movesHooks || /\s-[a-mo-zA-Z]*n[a-zA-Z]*(\s|$)/.test(git('commit') ?? '')) {
      block('this skips the commit hook. Commit without --no-verify, -n, HUSKY=0 or a changed hooks path.');
    }

    const ownMessage =
      /\s(--subject|--body|--body-file|--admin|-[a-zA-Z]*[tbF][a-zA-Z]*)(\s|=|$)/.test(gh('pr\\s+merge') ?? '') ||
      (gh('api') !== undefined && /pulls\/\d+\/merge/.test(command) && /commit_(title|message)/.test(command)) ||
      (gh('api\\s+graphql') !== undefined && /commit(Headline|Body)/.test(command));
    if (ownMessage) {
      block('a merge with its own message or with --admin. Use "gh pr merge <n> --squash --auto": the commit takes the pull request title.');
    }

    const api = gh('api');
    const writes = api !== undefined && !/(-X|--method)[=\s]*["']?GET\b/i.test(api) && /(-X|--method)[=\s]*["']?[A-Za-z]|\s(-f|-F|--field|--raw-field|--input)\b/.test(api);
    const rules = /repos\/[^/\s"']+\/[^/\s"']+(["']?(\s|$)|\/(rulesets|branches\/[^/\s]+\/protection|actions\/permissions|code-scanning\/default-setup|vulnerability-alerts|automated-security-fixes|private-vulnerability-reporting|collaborators))/i;
    const mutation = /\b(updateRepository|(create|update|delete)RepositoryRuleset|(create|update|delete)BranchProtectionRule)\b/;
    if ((writes && rules.test(command)) || (api !== undefined && mutation.test(command)) || gh('repo\\s+(?:edit|delete|archive|unarchive|rename)') !== undefined) {
      block("a change to the repository's rules or settings. They are set by scripts/repo/apply-settings.sh from the files in the repository; a change to them is a pull request.");
    }

    process.exit(0);
  } catch (error) {
    block(`the hook itself failed (${error.message}), so the command is not run.`);
  }
})();
