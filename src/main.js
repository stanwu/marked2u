import MarkdownIt from 'markdown-it'
import markdownItObsidianCallouts from 'markdown-it-obsidian-callouts'
import mermaid from 'mermaid'
import hljs from 'highlight.js'

const { invoke } = window.__TAURI__.core
const { listen } = window.__TAURI__.event

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return `<pre><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`
    }
    return `<pre><code class="hljs">${hljs.highlightAuto(code).value}</code></pre>`
  },
})

md.use(markdownItObsidianCallouts)

// Intercept mermaid fenced blocks before rendering
const defaultFence = md.renderer.rules.fence?.bind(md.renderer)
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token.info.trim() === 'mermaid') {
    return `<div class="mermaid">${md.utils.escapeHtml(token.content)}</div>`
  }
  if (defaultFence) return defaultFence(tokens, idx, options, env, self)
  return `<pre><code>${md.utils.escapeHtml(token.content)}</code></pre>`
}

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

const preview = document.getElementById('preview')
const emptyState = document.getElementById('empty-state')

async function renderFile(path) {
  try {
    const content = await invoke('read_file', { path })
    preview.innerHTML = md.render(content)
    emptyState.style.display = 'none'
    preview.style.display = 'block'
    await mermaid.run({ nodes: preview.querySelectorAll('.mermaid') })
  } catch (e) {
    preview.innerHTML = `<div class="callout callout-danger"><p>${e}</p></div>`
    preview.style.display = 'block'
    emptyState.style.display = 'none'
  }
}

async function init() {
  const filePath = await invoke('get_initial_file')
  if (filePath) {
    await renderFile(filePath)
    await invoke('watch_file', { path: filePath })
  }

  await listen('file-changed', async (e) => {
    await renderFile(e.payload)
  })
}

// Drag and drop
const dropOverlay = document.getElementById('drop-overlay')

document.addEventListener('dragover', (e) => {
  e.preventDefault()
  dropOverlay.classList.add('active')
})

document.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) dropOverlay.classList.remove('active')
})

document.addEventListener('drop', async (e) => {
  e.preventDefault()
  dropOverlay.classList.remove('active')
  const file = e.dataTransfer?.files[0]
  if (file?.name.endsWith('.md')) {
    const path = file.path ?? file.name
    await renderFile(path)
    await invoke('watch_file', { path })
  }
})

init()
