import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import test from 'node:test'

test('release verification rejects stale content, undeclared files and changed entry points', async () => {
  const verifier = resolve('scripts/verify-release.mjs')
  const scratchRoot = resolve('.tmp/release-tests')
  await mkdir(scratchRoot, { recursive: true })
  const scratch = await mkdtemp(join(scratchRoot, 'pack-'))
  const packedRoot = join(scratch, 'staging/package')
  const manifest = {
    name: 'splat-release-fixture',
    version: '1.2.3',
    packageManager: 'pnpm@11.1.2',
    main: 'lib/index.js',
    scripts: { prepack: 'node build.mjs' },
    files: ['lib', 'CHANGELOG.md'],
  }
  const packedManifest = structuredClone(manifest)
  delete packedManifest.packageManager
  delete packedManifest.scripts.prepack
  const files = { 'lib/index.js': 'export const ready = true\n', 'CHANGELOG.md': '## 1.2.3\n\nFixture release.\n' }
  try {
    await mkdir(join(scratch, 'lib'), { recursive: true })
    await mkdir(join(packedRoot, 'lib'), { recursive: true })
    await writeFile(join(scratch, 'package.json'), JSON.stringify(manifest))
    await writeFile(join(packedRoot, 'package.json'), JSON.stringify(packedManifest))
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(scratch, name), content)
      await writeFile(join(packedRoot, name), content)
    }
    const tarball = join(scratch, 'splat-release-fixture-1.2.3.tgz')
    const verify = () => {
      execFileSync('tar', ['-czf', 'splat-release-fixture-1.2.3.tgz', '-C', 'staging', 'package'], { cwd: scratch })
      return spawnSync(process.execPath, [verifier, 'v1.2.3', tarball], {
        cwd: scratch,
        encoding: 'utf8',
        env: { ...process.env, GITHUB_ACTIONS: '', GITHUB_OUTPUT: undefined },
      })
    }
    assert.equal(verify().status, 0, 'the matching pack passes')
    await writeFile(join(packedRoot, 'lib/index.js'), 'export const ready = false\n')
    assert.match(verify().stderr, /differs from the checkout/)
    await writeFile(join(packedRoot, 'lib/index.js'), await readFile(join(scratch, 'lib/index.js')))
    await writeFile(join(packedRoot, 'extra.txt'), 'not in files\n')
    assert.match(verify().stderr, /not declared/)
    await rm(join(packedRoot, 'extra.txt'))
    await writeFile(join(packedRoot, 'package.json'), JSON.stringify({ ...packedManifest, main: 'other.js' }))
    assert.match(verify().stderr, /metadata or entry points/)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
})
