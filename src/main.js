import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
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
    currentFilePath = path
    currentMarkdown = content
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
    if (!findBar.hidden) {
      originalHTML = preview.innerHTML
      runFind()
    }
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

// ── Find ──
const findBar = document.getElementById('find-bar')
const findInput = document.getElementById('find-input')
const findCount = document.getElementById('find-count')
const findPrev = document.getElementById('find-prev')
const findNext = document.getElementById('find-next')
const findClose = document.getElementById('find-close')
const findWholeWords = document.getElementById('find-whole-words')
const findCase = document.getElementById('find-case')
const findRegex = document.getElementById('find-regex')

let findMatches = []
let findCurrent = -1
let originalHTML = ''

function buildRegex(query) {
  if (!query) return null
  try {
    let pattern = findRegex.checked ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (findWholeWords.checked) pattern = `\\b${pattern}\\b`
    return new RegExp(pattern, findCase.checked ? 'g' : 'gi')
  } catch {
    return null
  }
}

function runFind() {
  if (originalHTML) preview.innerHTML = originalHTML

  const query = findInput.value
  if (!query) {
    findCount.textContent = ''
    findInput.classList.remove('no-match')
    findMatches = []
    findCurrent = -1
    return
  }

  const re = buildRegex(query)
  if (!re) {
    findInput.classList.add('no-match')
    findCount.textContent = 'invalid'
    return
  }

  let idx = 0
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent
      re.lastIndex = 0
      const parts = []
      let last = 0, m
      while ((m = re.exec(text)) !== null) {
        if (m.index > last) parts.push(document.createTextNode(text.slice(last, m.index)))
        const mark = document.createElement('mark')
        mark.className = 'find-highlight'
        mark.dataset.idx = idx++
        mark.textContent = m[0]
        parts.push(mark)
        last = re.lastIndex
      }
      if (parts.length) {
        if (last < text.length) parts.push(document.createTextNode(text.slice(last)))
        node.replaceWith(...parts)
      }
    } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
      for (const child of [...node.childNodes]) walk(child)
    }
  }
  walk(preview)

  findMatches = [...preview.querySelectorAll('mark.find-highlight')]
  findInput.classList.toggle('no-match', findMatches.length === 0)

  if (findMatches.length === 0) {
    findCount.textContent = 'No matches'
    findCurrent = -1
    return
  }

  findCurrent = 0
  highlightCurrent()
}

function highlightCurrent() {
  findMatches.forEach((m, i) => m.classList.toggle('current', i === findCurrent))
  if (findMatches[findCurrent]) {
    findMatches[findCurrent].scrollIntoView({ block: 'center' })
    findCount.textContent = `${findCurrent + 1} of ${findMatches.length}`
  }
}

function openFind() {
  originalHTML = preview.innerHTML
  findBar.hidden = false
  document.body.classList.add('find-open')
  findInput.focus()
  findInput.select()
  if (findInput.value) runFind()
}

function closeFind() {
  findBar.hidden = true
  document.body.classList.remove('find-open')
  if (originalHTML) { preview.innerHTML = originalHTML; originalHTML = '' }
  findMatches = []
  findCurrent = -1
  findCount.textContent = ''
}

findInput.addEventListener('input', runFind)
findWholeWords.addEventListener('change', runFind)
findCase.addEventListener('change', runFind)
findRegex.addEventListener('change', runFind)

findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      findCurrent = (findCurrent - 1 + findMatches.length) % findMatches.length
    } else {
      findCurrent = (findCurrent + 1) % findMatches.length
    }
    highlightCurrent()
    e.preventDefault()
  } else if (e.key === 'Escape') {
    closeFind()
  }
})

findNext.addEventListener('click', () => {
  if (!findMatches.length) return
  findCurrent = (findCurrent + 1) % findMatches.length
  highlightCurrent()
})

findPrev.addEventListener('click', () => {
  if (!findMatches.length) return
  findCurrent = (findCurrent - 1 + findMatches.length) % findMatches.length
  highlightCurrent()
})

findClose.addEventListener('click', closeFind)

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault()
    openFind()
  }
})

// ── Theme ──
const THEMES = [
  { id: 'obsidian', name: 'Obsidian', key: '1' },
  { id: 'swiss', name: 'Swiss', key: '2' },
  { id: 'ink', name: 'Ink', key: '3' },
  { id: 'multi-column', name: 'Multi-Column', key: '4' },
  { id: 'github', name: 'GitHub', key: '5' },
  { id: 'amblin', name: 'Amblin', key: '6' },
  { id: 'upstanding-citizen', name: 'Upstanding Citizen', key: '7' },
  { id: 'lopash', name: 'Lopash', key: '8' },
  { id: 'manuscript', name: 'Manuscript', key: '9' },
  { id: 'grump', name: 'Grump', key: '1', alt: true },
]

let themeLink = document.getElementById('theme-link')
if (!themeLink) {
  themeLink = document.createElement('link')
  themeLink.id = 'theme-link'
  themeLink.rel = 'stylesheet'
  document.head.appendChild(themeLink)
}
const themeMenu = document.getElementById('theme-menu')
const themeBackdrop = document.getElementById('theme-backdrop')
const toolbarThemeBtn = document.getElementById('toolbar-theme')
const toolbarThemeName = document.getElementById('toolbar-theme-name')
const customCssInput = document.getElementById('custom-css-input')

let activeTheme = localStorage.getItem('theme') || 'obsidian'

function applyTheme(id, customUrl) {
  activeTheme = id
  localStorage.setItem('theme', id)
  themeLink.href = customUrl ?? `/themes/${id}.css`
  toolbarThemeName.textContent = THEMES.find(t => t.id === id)?.name ?? 'Custom'
  document.querySelectorAll('#theme-list li').forEach(li => {
    li.classList.toggle('active', li.dataset.theme === id)
  })
}

function openThemeMenu() {
  themeMenu.hidden = false
  toolbarThemeBtn.classList.add('active')
}

function closeThemeMenu() {
  themeMenu.hidden = true
  toolbarThemeBtn.classList.remove('active')
}

toolbarThemeBtn.addEventListener('click', () => {
  themeMenu.hidden ? openThemeMenu() : closeThemeMenu()
})

themeBackdrop.addEventListener('click', closeThemeMenu)

document.querySelectorAll('#theme-list li').forEach(li => {
  li.addEventListener('click', () => {
    if (li.dataset.theme === 'custom') {
      customCssInput.click()
    } else {
      applyTheme(li.dataset.theme)
      closeThemeMenu()
    }
  })
})

customCssInput.addEventListener('change', () => {
  const file = customCssInput.files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  applyTheme('custom', url)
  closeThemeMenu()
})

document.addEventListener('keydown', (e) => {
  if (!e.metaKey && !e.ctrlKey) return
  const t = THEMES.find(th => th.key === e.key && !!th.alt === e.altKey)
  if (t) { e.preventDefault(); applyTheme(t.id); closeThemeMenu() }
})

applyTheme(activeTheme)

// ── Export ──
let currentFilePath = null
let currentMarkdown = null

const exportDrawer = document.getElementById('export-drawer')
const exportPanel = document.getElementById('export-panel')
const exportBackdrop = document.getElementById('export-backdrop')
const toolbarExportBtn = document.getElementById('toolbar-export')

function openExport() {
  exportDrawer.hidden = false
  toolbarExportBtn.classList.add('active')
  requestAnimationFrame(() => exportPanel.style.transform = '')
}

function closeExport() {
  exportDrawer.hidden = true
  toolbarExportBtn.classList.remove('active')
}

toolbarExportBtn.addEventListener('click', () => {
  exportDrawer.hidden ? openExport() : closeExport()
})

exportBackdrop.addEventListener('click', closeExport)

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'e') {
    e.preventDefault()
    exportDrawer.hidden ? openExport() : closeExport()
  }
  if (e.key === 'Escape' && !exportDrawer.hidden) closeExport()
})

function getBaseName() {
  if (!currentFilePath) return 'document'
  return currentFilePath.replace(/\\/g, '/').split('/').pop().replace(/\.md$/i, '')
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportHTML() {
  const styles = [...document.styleSheets]
    .flatMap(s => { try { return [...s.cssRules].map(r => r.cssText) } catch { return [] } })
    .join('\n')
  const html = `<!doctype html><html><head><meta charset="UTF-8"><style>${styles}</style></head><body><article class="markdown-body" style="max-width:740px;margin:0 auto;padding:48px 32px">${preview.innerHTML}</article></body></html>`
  saveBlob(new Blob([html], { type: 'text/html' }), `${getBaseName()}.html`)
}

function exportMD() {
  if (!currentMarkdown) return
  saveBlob(new Blob([currentMarkdown], { type: 'text/markdown' }), `${getBaseName()}.md`)
}

function exportPDF(paginated) {
  const style = document.createElement('style')
  style.id = '__pdf-style'
  if (paginated) {
    style.textContent = `@media print { * { -webkit-print-color-adjust: exact; } h2,h3,h4 { page-break-after: avoid; } pre,table,figure { page-break-inside: avoid; } }`
  } else {
    style.textContent = `@media print { * { -webkit-print-color-adjust: exact; } }`
  }
  document.head.appendChild(style)
  window.print()
  document.getElementById('__pdf-style')?.remove()
}

async function exportDOCX() {
  if (!currentMarkdown) return
  const lines = currentMarkdown.split('\n')
  const children = []
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/)
    const h2 = line.match(/^##\s+(.+)/)
    const h3 = line.match(/^###\s+(.+)/)
    if (h1) children.push(new Paragraph({ text: h1[1], heading: HeadingLevel.HEADING_1 }))
    else if (h2) children.push(new Paragraph({ text: h2[1], heading: HeadingLevel.HEADING_2 }))
    else if (h3) children.push(new Paragraph({ text: h3[1], heading: HeadingLevel.HEADING_3 }))
    else if (line.trim() === '') children.push(new Paragraph({}))
    else children.push(new Paragraph({ children: [new TextRun(line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1'))] }))
  }
  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)
  saveBlob(blob, `${getBaseName()}.docx`)
}

function exportOPML() {
  if (!currentMarkdown) return
  const lines = currentMarkdown.split('\n')
  const esc = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0"><head><title>${esc(getBaseName())}</title></head><body>\n`
  const stack = [{ level: 0, indent: '' }]
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)/)
    if (!m) continue
    const level = m[1].length
    const text = esc(m[2])
    while (stack.length > 1 && stack[stack.length-1].level >= level) stack.pop()
    const indent = '  '.repeat(stack.length)
    xml += `${indent}<outline text="${text}">\n`
    stack.push({ level, close: `${indent}</outline>\n` })
  }
  while (stack.length > 1) xml += stack.pop().close
  xml += '</body></opml>'
  saveBlob(new Blob([xml], { type: 'text/xml' }), `${getBaseName()}.opml`)
}

document.querySelectorAll('.fmt-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    btn.classList.add('loading')
    try {
      switch (btn.dataset.fmt) {
        case 'html': exportHTML(); break
        case 'pdf-continuous': exportPDF(false); break
        case 'pdf-paginated': exportPDF(true); break
        case 'docx': await exportDOCX(); break
        case 'md': exportMD(); break
        case 'opml': exportOPML(); break
      }
    } finally {
      btn.classList.remove('loading')
      closeExport()
    }
  })
})

init()
