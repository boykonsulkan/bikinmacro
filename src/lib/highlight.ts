// Penyorot kode VBA yang ringan untuk browser: mesin regex JavaScript (tanpa wasm Oniguruma) dengan HANYA bahasa vb dan
// tema github-dark, dimuat saat pertama kali dibutuhkan. Jauh lebih kecil dibanding `import { codeToHtml } from 'shiki'`
// yang menarik mesin wasm dan indeks ratusan bahasa.
import type { HighlighterCore } from 'shiki/core'

let highlighter: Promise<HighlighterCore> | null = null

function load(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, vb, theme] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('@shikijs/langs/vb'),
      import('@shikijs/themes/github-dark'),
    ])
    return createHighlighterCore({ themes: [theme.default], langs: [vb.default], engine: createJavaScriptRegexEngine() })
  })()
  return highlighter
}

export async function highlightVba(code: string): Promise<string> {
  return (await load()).codeToHtml(code, { lang: 'vb', theme: 'github-dark' })
}
