import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { isDshRuntime } from './dsh-runtime.mjs'
import { prepareDshRuntime } from './prepare-dsh-runtime.mjs'

let heroCityImageDataUri

function getHeroCityImageDataUri() {
  if (!heroCityImageDataUri) {
    const file = new URL('../src/client/assets/inkopolis-square.png', import.meta.url)
    heroCityImageDataUri = `data:image/png;base64,${readFileSync(file).toString('base64')}`
  }
  return heroCityImageDataUri
}

/**
 * Resolve a DSH runtime directory from CLI flags (`--dsh`, `--asar`,
 * `--desktop`), `DSH_APP`, `~/.dsh/app`, or an installed desktop `app.asar`.
 */
export function resolveDshRuntime(args = process.argv.slice(2)) {
  const flag = (name, fallback) => {
    const index = args.indexOf(`--${name}`)
    return index === -1 ? fallback : args[index + 1]
  }
  const explicitDsh = flag('dsh')
  const explicitAsar = flag('asar')
  const useDesktop = args.includes('--desktop')
  if (explicitDsh !== undefined && (useDesktop || explicitAsar !== undefined)) {
    console.error('choose one of --dsh, --asar or --desktop')
    process.exit(1)
  }

  const candidateDsh = resolve(explicitDsh ?? process.env.DSH_APP ?? join(homedir(), '.dsh', 'app'))
  let dsh
  if (useDesktop || explicitAsar !== undefined) {
    dsh = prepareDshRuntime({ asarPath: explicitAsar })
  } else if (isDshRuntime(candidateDsh)) {
    dsh = candidateDsh
  } else if (explicitDsh === undefined && process.env.DSH_APP === undefined) {
    try {
      dsh = prepareDshRuntime()
    } catch {
      dsh = candidateDsh
    }
  } else {
    dsh = candidateDsh
  }

  if (!isDshRuntime(dsh)) {
    console.error(`no DSH install at ${dsh}\n  pass --dsh <app dir>, --desktop, or set DSH_APP`)
    process.exit(1)
  }
  return dsh
}

/** Format `buildTokenOverrides()` entries for an HTML `style="..."` attribute. */
export function formatTokenVars(overrides, mode) {
  return Object.entries(overrides)
    .map(([token, value]) => `${token}:${value[mode]}`)
    .join(';')
    .replaceAll('"', '&quot;')
}

/** Substitute fixture placeholders with inline `<style>` or external `<link>` tags. */
export function renderFixturePage(body, { dshCss, themeBaseCss, pluginCss, skinCss, tokens, dark, bodyStyle, tail = '' }) {
  const rendered = body
    .replaceAll('<!--{{DSH_CSS}}-->', dshCss)
    .replaceAll('<!--{{THEME_BASE_CSS}}-->', themeBaseCss)
    .replaceAll('<!--{{PLUGIN_CSS}}-->', pluginCss)
    .replaceAll('<!--{{SKIN_CSS}}-->', skinCss)
    .replaceAll('{{TOKENS}}', tokens)
    .replaceAll('{{BODY_ATTRIBUTES}}', dark ? ' data-ds-dark-theme=""' : '')
    .replaceAll('{{BODY_STYLE}}', bodyStyle ?? '')
    .replace('</body>', tail ? `${tail}\n</body>` : '</body>')
  return rendered.includes('{{HERO_CITY_IMAGE}}') ? rendered.replaceAll('{{HERO_CITY_IMAGE}}', getHeroCityImageDataUri()) : rendered
}
