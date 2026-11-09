// Blocks a commit that carries a secret. Run by .githooks/pre-commit on the staged changes, and
// by hand on the whole tree: node scripts/check-secrets.mjs --all
// Dependency-free on purpose. It looks for key shapes, secret files and `NAME=value` lines.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

export const PATTERNS = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/],
  ['Anthropic or OpenAI key', /\bsk-(ant-)?[A-Za-z0-9_-]{32,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['DuckDNS token in a URL', /duckdns\.org\/update\?[^\s"']*token=[0-9a-f-]{20,}/i],
  ['secret assigned in a file', /^\s*(export\s+)?[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*=\s*["']?(?!\$|<|your|change|example|xxx|\*|["']?\s*$)[A-Za-z0-9+/_=.-]{16,}/m],
  ['secret in a JSON value', /"(token|secret|password|api_?key)"\s*:\s*"(?!\$|<|your|change|example|xxx|\*)[A-Za-z0-9+/_=.-]{16,}/i],
]

// Files that should never be tracked, whatever they contain.
export const FORBIDDEN_FILES = [
  /(^|\/)\.env($|\.(?!example|sample))/,
  // prod.env, server.env... (any prefix), unless the name says it is an example.
  /(^|\/)(?![^/]*(example|sample))[^/]+\.env$/i,
  /\.(keystore|jks|p12|pfx|pem|key)$/i,
  /(^|\/)(google-services\.json|GoogleService-Info\.plist)$/,
  /(^|\/)(keystore-password|dev-test-accounts)\b/,
  /(^|\/)(vapid\.json|db\.json|secret)$/,
  /(^|\/)state-[^/]+\.json$/,
  /(^|\/)(id_rsa|id_ed25519|opengym_deploy|opengym_oracle)$/,
]

const ALLOW_LINE = /secret-scan:\s*allow/

/** Findings for one file: [{ file, line, what }]. */
export function scanText(file, text) {
  const out = []
  if (FORBIDDEN_FILES.some(re => re.test(file))) out.push({ file, line: 0, what: 'file that must not be committed' })
  text.split('\n').forEach((line, i) => {
    if (ALLOW_LINE.test(line)) return
    for (const [what, re] of PATTERNS) if (re.test(line)) out.push({ file, line: i + 1, what })
  })
  return out
}

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 28 })

function main() {
  const all = process.argv.includes('--all')
  const files = (all ? git('ls-files', '-z') : git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'))
    .split('\0').filter(Boolean)
  const findings = []
  for (const f of files) {
    // Whole-tree runs read the disk (one spawn per file would take minutes); a commit reads the index.
    let text = ''
    try { text = all ? readFileSync(f, 'utf8') : git('show', `:${f}`) } catch { continue }
    if (text.length > 2_000_000 || text.includes('\0')) { findings.push(...scanText(f, '')); continue }
    findings.push(...scanText(f, text))
  }
  if (!findings.length) return
  console.error('\nPossible secret in the commit:')
  for (const f of findings) console.error(`  ${f.file}${f.line ? ':' + f.line : ''}  ${f.what}`)
  console.error('\nRemove it, or add "secret-scan: allow" on a line that is a safe example.\n')
  process.exit(1)
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('check-secrets.mjs')) main()
