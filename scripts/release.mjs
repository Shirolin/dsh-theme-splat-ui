import { execFileSync, execSync } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = process.argv[2]
if (version === undefined || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('usage: pnpm run release <version> — local pack only; no commit, tag, push or publish')
}
const changelog = await readFile(join(root, 'CHANGELOG.md'), 'utf8')
if (!new RegExp(`^##\\s+${version.replaceAll('.', '\\.')}(?:[（(]|\\s|$)`, 'm').test(changelog)) {
  throw new Error(`CHANGELOG.md has no section for ${version}`)
}
const manifestPath = join(root, 'package.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.version !== version) {
  console.log(`version: ${manifest.version} -> ${version}`)
  manifest.version = version
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}
const destination = join(root, 'artifacts', `release-v${version}`)
await mkdir(destination, { recursive: true })
// pnpm.cmd needs a shell on Windows; the only interpolated value is validated semver.
execSync(`pnpm pack --pack-destination "artifacts/release-v${version}"`, { cwd: root, stdio: 'inherit' })
const tarball = join(destination, `${manifest.name}-${version}.tgz`)
execFileSync(process.execPath, [join(root, 'scripts/verify-release.mjs'), `v${version}`, tarball], { cwd: root, stdio: 'inherit' })
await writeFile(
  join(destination, 'manifest.json'),
  `${JSON.stringify({ name: manifest.name, version, tarball: `${manifest.name}-${version}.tgz`, bytes: (await stat(tarball)).size, verifiedFiles: true, scope: 'local-pre-release', generatedAt: new Date().toISOString() }, null, 2)}\n`,
)
console.log(`Local verified pack: ${tarball}\nNo tag, push or publish was performed. Published checksums belong to CI output only.`)
