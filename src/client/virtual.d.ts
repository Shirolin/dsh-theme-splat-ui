declare module 'virtual:splat-ui-skin-css' {
  export const SKIN_CSS: string
}

declare module '*.png' {
  const uri: string
  export default uri
}

/** Injected by scripts/build.mjs; the version and local build time of this bundle. */
declare module 'virtual:splat-ui-build' {
  export const BUILD: { version: string; builtAt: string }
}
