/// <reference types="vite/client" />

declare module '*.json' {
  const value: unknown
  export default value
}

// Allows importing .jsx files without type errors
declare module '*.jsx' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _default: any
  export default _default
  // Allow any named exports from JSX files
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const SPRITE_ZONES: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const TYPE_ZONES: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const detectTypeFromImageData: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const combineMatchResults: any
}
