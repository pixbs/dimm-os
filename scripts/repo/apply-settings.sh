#!/usr/bin/env bash
# Sets this repository's settings and reads them back, so nothing is clicked by hand.
#   apply-settings.sh           set everything, then compare
#   apply-settings.sh --check   compare only; runs after every merge to main
# The ruleset is .github/rulesets/main.json. Everything else is listed in this file.
# Setting needs gh signed in as an admin of the repository. Vercel's part runs where the Vercel
# CLI is signed in and is skipped elsewhere. Three things have no API and are set once by hand:
# on GitHub, Copilot Autofix (off) and the social preview image; on Vercel, data sharing for
# AI model training (off, in Team Settings > Data Preferences). The last one is read back here.
set -euo pipefail
export MSYS_NO_PATHCONV=1 # Git Bash on Windows would rewrite the API paths

repo="${GITHUB_REPOSITORY:-pixbs/dimm-os}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ruleset="$root/.github/rulesets/main.json"
vercel_team="pixbs-projects"
vercel_project="dimm-os"
apply=true
[[ "${1:-}" == "--check" ]] && apply=false

repository='{
  "description": "A portfolio built as an operating system: every page is a window.",
  "homepage": "https://dimm.co",
  "has_issues": true,
  "has_wiki": false,
  "has_projects": false,
  "has_discussions": false,
  "pull_request_creation_policy": "collaborators_only"
}'
# Squash only: the commit takes the pull request's title and a blank body.
merging='{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "allow_auto_merge": true,
  "delete_branch_on_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "BLANK"
}'
# The same seven, as GraphQL names them: only GraphQL shows them to a read-only token.
merging_read='{
  "squashMergeAllowed": true,
  "mergeCommitAllowed": false,
  "rebaseMergeAllowed": false,
  "autoMergeAllowed": true,
  "deleteBranchOnMerge": true,
  "squashMergeCommitTitle": "PR_TITLE",
  "squashMergeCommitMessage": "BLANK"
}'
security='{
  "secret_scanning": { "status": "enabled" },
  "secret_scanning_push_protection": { "status": "enabled" }
}'
topics='{ "names": ["design-system", "nextjs", "payload-cms", "portfolio"] }'
actions='{ "enabled": true, "allowed_actions": "all", "sha_pinning_required": true }'
workflow_token='{ "default_workflow_permissions": "read", "can_approve_pull_request_reviews": false }'
code_scanning='{ "state": "configured", "query_suite": "default" }'
# name|colour|description
labels='feature|1f6feb|Something new, from the roadmap
bug|d73a4a|Something that does not work as specified
chore|8b949e|Upkeep: dependencies, tooling, settings'
# Dependabot opens no pull request and makes no commit, ever. Its alerts go on at launch.
dependabot_alerts=off
vercel='{
  "ssoProtection": { "deploymentType": "all" },
  "gitComments": { "onPullRequest": false, "onCommit": false },
  "serverlessFunctionRegion": "fra1"
}'
vercel_team_settings='{ "dataSharingConsent": { "consent": "refused" } }'

# compare runs at the end of a pipe, in a shell of its own, so it counts in a file.
differences="$(mktemp)"
trap 'rm -f "$differences"' EXIT

# Reads JSON on stdin and prints every place where it does not hold what <wanted> holds. Keys
# the wanted side does not name are ignored, so a new default of the API changes nothing.
# Lists are compared in sorted order and must have the same length.
compare() { # <command that prints JSON> | compare <label> <wanted json>
  local found
  found="$(node -e '
    const [label, wanted] = process.argv.slice(1);
    const key = (item) => JSON.stringify(item?.type ?? item?.context ?? item?.name ?? item);
    const sorted = (list) => [...list].sort((a, b) => (key(a) < key(b) ? -1 : 1));
    const walk = (want, have, path) => {
      const differs = [`${path} is ${JSON.stringify(have)}, wanted ${JSON.stringify(want)}`];
      if (Array.isArray(want)) {
        if (!Array.isArray(have) || have.length !== want.length) return differs;
        const live = sorted(have);
        return sorted(want).flatMap((item, i) => walk(item, live[i], `${path}[${i}]`));
      }
      if (want && typeof want === "object") {
        return Object.keys(want).flatMap((name) => walk(want[name], have?.[name], path ? `${path}.${name}` : name));
      }
      return want === have ? [] : differs;
    };
    let live = "";
    process.stdin.on("data", (chunk) => (live += chunk)).on("end", () => {
      if (!live.trim()) return console.log(`${label}: no answer`);
      for (const line of walk(JSON.parse(wanted), JSON.parse(live.slice(live.search(/[[{]/))), "")) console.log(`${label}: ${line}`);
    });
  ' "$1" "$2")"
  if [[ -z "$found" ]]; then
    echo "  ok       $1"
  elif [[ "$found" == *": no answer" && -n "${GITHUB_ACTIONS:-}" && "${3:-}" != "required" ]]; then
    echo "  skipped  $1 (this token may not read it)"
  else
    echo "$found" | sed 's/^/  DIFFERS  /'
    echo "$1" >>"$differences"
  fi
}

# Prints the API's answer, or nothing when it refuses.
get() {
  local answer
  if answer="$(gh api "$@" 2>/dev/null)"; then printf '%s
' "$answer"; fi
}
ruleset_id() { get "repos/$repo/rulesets" --jq '.[] | select(.name == "main") | .id'; }
signed_in_to_vercel() { [[ -z "${GITHUB_ACTIONS:-}" ]] && npx --yes vercel@latest whoami >/dev/null 2>&1; }
vercel_api() { npx --yes vercel@latest api "$@" --scope "$vercel_team" --raw 2>/dev/null || true; }

if $apply; then
  echo "Setting $repo"
  gh api -X PATCH "repos/$repo" --input - <<<"$repository" >/dev/null
  gh api -X PATCH "repos/$repo" --input - <<<"$merging" >/dev/null
  gh api -X PATCH "repos/$repo" --input - <<<"{ \"security_and_analysis\": $security }" >/dev/null
  gh api -X PUT "repos/$repo/topics" --input - <<<"$topics" >/dev/null
  gh api -X PUT "repos/$repo/actions/permissions" --input - <<<"$actions"
  gh api -X PUT "repos/$repo/actions/permissions/workflow" --input - <<<"$workflow_token"
  gh api -X PUT "repos/$repo/private-vulnerability-reporting"
  # Security updates exist only while alerts are on, so they go off before the alerts do.
  [[ "$dependabot_alerts" == on ]] && gh api -X PUT "repos/$repo/vulnerability-alerts"
  if [[ "$(get "repos/$repo/automated-security-fixes" --jq .enabled)" == true ]]; then gh api -X DELETE "repos/$repo/automated-security-fixes"; fi
  [[ "$dependabot_alerts" == on ]] || gh api -X DELETE "repos/$repo/vulnerability-alerts"
  if [[ "$(get "repos/$repo/code-scanning/default-setup" --jq .state)" != configured ]]; then
    gh api -X PATCH "repos/$repo/code-scanning/default-setup" --input - <<<"$code_scanning" >/dev/null
  fi

  wanted_names="$(cut -d'|' -f1 <<<"$labels")"
  while IFS= read -r name; do
    if [[ -n "$name" ]] && ! grep -qxF "$name" <<<"$wanted_names"; then gh api -X DELETE "repos/$repo/labels/${name// /%20}"; fi
  done < <(gh api "repos/$repo/labels" --paginate --jq '.[].name')
  while IFS='|' read -r name color description; do
    gh api -X PATCH "repos/$repo/labels/$name" -f color="$color" -f description="$description" >/dev/null 2>&1 ||
      gh api -X POST "repos/$repo/labels" -f name="$name" -f color="$color" -f description="$description" >/dev/null
  done <<<"$labels"

  id="$(ruleset_id)"
  if [[ -n "$id" ]]; then
    gh api -X PUT "repos/$repo/rulesets/$id" --input "$ruleset" >/dev/null
  else
    gh api -X POST "repos/$repo/rulesets" --input "$ruleset" >/dev/null
  fi

  if signed_in_to_vercel; then
    vercel_api "/v9/projects/$vercel_project" -X PATCH --input - <<<"$vercel" >/dev/null
  fi
fi

echo "Reading back $repo"
get "repos/$repo" | compare "repository" "$repository" required
get graphql -f owner="${repo%/*}" -f name="${repo#*/}" --jq .data.repository -f query='
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      squashMergeAllowed mergeCommitAllowed rebaseMergeAllowed autoMergeAllowed
      deleteBranchOnMerge squashMergeCommitTitle squashMergeCommitMessage
    }
  }' | compare "merging" "$merging_read" required
get "repos/$repo" --jq '.security_and_analysis // empty' | compare "secret scanning" "$security"
get "repos/$repo/topics" | compare "topics" "$topics"
get "repos/$repo/labels" --jq '{ names: [.[].name] }' | compare "labels" "{ \"names\": [\"$(cut -d'|' -f1 <<<"$labels" | paste -sd, | sed 's/,/","/g')\"] }"
get "repos/$repo/actions/permissions" | compare "actions" "$actions"
get "repos/$repo/actions/permissions/workflow" | compare "workflow token" "$workflow_token"
get "repos/$repo/private-vulnerability-reporting" | compare "private vulnerability reporting" '{ "enabled": true }'
get "repos/$repo/automated-security-fixes" | compare "dependabot security updates" '{ "enabled": false }'
# The alerts endpoint answers 204 when they are on and 404 when they are off.
alerts="$(gh api -i "repos/$repo/vulnerability-alerts" 2>/dev/null | head -n 1 || true)"
case "$alerts" in *204*) alerts=on ;; *404*) alerts=off ;; *) alerts= ;; esac
[[ -n "$alerts" ]] && echo "{ \"alerts\": \"$alerts\" }" | compare "dependabot alerts" "{ \"alerts\": \"$dependabot_alerts\" }"
[[ -z "$alerts" ]] && : | compare "dependabot alerts" '{}'
get "repos/$repo/code-scanning/default-setup" | compare "code scanning" "$code_scanning"

id="$(ruleset_id)"
if [[ -n "$id" ]]; then
  # Only an admin is shown who may bypass; for any other token that key is left out of the comparison.
  live="$(get "repos/$repo/rulesets/$id")"
  wanted="$(cat "$ruleset")"
  if [[ "$live" != *'"bypass_actors"'* ]]; then wanted="$(node -e 'const r = JSON.parse(process.argv[1]); delete r.bypass_actors; console.log(JSON.stringify(r))' "$wanted")"; fi
  echo "$live" | compare "ruleset main" "$wanted" required
else
  : | compare "ruleset main" '{}' required
fi

if signed_in_to_vercel; then
  vercel_api "/v9/projects/$vercel_project" | compare "vercel project" "$vercel"
  vercel_api "/v2/teams/$vercel_team" | compare "vercel team" "$vercel_team_settings"
else
  echo "  skipped  vercel (the Vercel CLI is not signed in here)"
fi

if [[ -s "$differences" ]]; then
  echo "$(wc -l <"$differences" | tr -d ' ') setting(s) differ. Run scripts/repo/apply-settings.sh, as an admin, to set them again."
  exit 1
fi
echo "No difference."
