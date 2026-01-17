// Manual type definitions to replace missing vite/client
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  [key: string]: any
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
