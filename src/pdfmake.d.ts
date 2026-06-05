// pdfmake ships a prebuilt browser bundle (no Node deps) under build/* — typed loosely
// here since @types/pdfmake only declares the main entry.
declare module 'pdfmake/build/pdfmake' {
  interface PdfMakeStatic {
    vfs?: Record<string, string>
    fonts?: unknown
    createPdf: (def: unknown) => {
      download: (filename?: string) => void
      open: () => void
      getBlob: (cb: (blob: Blob) => void) => void
    }
  }
  const pdfMake: PdfMakeStatic
  export default pdfMake
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: unknown
  export default vfs
}
