import { describe, expect, it } from 'vitest'
import { scanText } from '../../../../scripts/check-secrets.mjs'

const fake = (...parts) => parts.join('')

describe('check-secrets', () => {
  it('flags key shapes', () => {
    expect(scanText('a.js', fake('const k = "AIza', 'SyA1234567890abcdefghijklmnopqrstuv"'))).toHaveLength(1)
    expect(scanText('a.js', fake('-----BEGIN RSA ', 'PRIVATE KEY-----'))).toHaveLength(1)
    expect(scanText('a.md', fake('ghp_', 'a'.repeat(36)))).toHaveLength(1)
    expect(scanText('a.sh', fake('curl "https://www.duckdns.org/update?domains=x&token=', '0123456789abcdef0123', '"'))).toHaveLength(1)
  })

  it('flags a secret assigned in a file, but not placeholders', () => {
    expect(scanText('deploy.sh', 'API_SECRET=Zk3p9Xw27QmN41vLbT8yRe5H')).toHaveLength(1)
    expect(scanText('x.sh', 'API_SECRET=$FROM_ENV')).toHaveLength(0)
    expect(scanText('x.md', 'TOKEN=<your token>')).toHaveLength(0)
    expect(scanText('x.md', 'PASSWORD=changeme-please-edit')).toHaveLength(0)
  })

  it('flags a secret in a JSON value, but not placeholders', () => {
    const value = fake('Zk3p9Xw27Q', 'mN41vLbT8yRe5H')
    for (const key of ['token', 'secret', 'password', 'api_key', 'apiKey', 'TOKEN']) {
      expect(scanText('a.json', fake('{ "', key, '": "', value, '" }'))).toHaveLength(1)
    }
    expect(scanText('a.json', fake('{"token":"', value, '"}'))).toHaveLength(1)
    expect(scanText('a.json', '{ "token": "<your token>" }')).toHaveLength(0)
    expect(scanText('a.json', '{ "token": "short" }')).toHaveLength(0)
    expect(scanText('a.json', fake('{ "name": "', value, '" }'))).toHaveLength(0)
  })

  it('flags files that must never be committed', () => {
    for (const f of ['.env', 'a/.env.local', 'release/opengym.keystore', 'android/app/google-services.json',
      '.claude/dev-test-accounts.json', 'data/vapid.json', 'data/state-abc.json',
      'prod.env', 'deploy/server.env', 'a/staging.prod.env']) {
      expect(scanText(f, '').length).toBeGreaterThan(0)
    }
  })

  it('lets examples through', () => {
    expect(scanText('.env.example', 'ADMIN_UIDS=')).toHaveLength(0)
    expect(scanText('deploy/example.env', '')).toHaveLength(0)
    expect(scanText('src/environment.js', '')).toHaveLength(0)
    expect(scanText('docs/a.md', 'Set it with `FIRST_USER_ADMIN=1`')).toHaveLength(0)
    expect(scanText('a.js', fake('const k = "AIza', 'SyA1234567890abcdefghijklmnopqrstuv" // secret-scan: allow'))).toHaveLength(0)
  })
})
