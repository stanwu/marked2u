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

init()
