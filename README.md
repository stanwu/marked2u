# marked2u — Cross-Platform Markdown Previewer

> Developed with [Claude Code](https://claude.ai/code) AI assistance.

A lightweight desktop Markdown previewer built with [Tauri](https://tauri.app/). Features live file watching, Mermaid diagrams, syntax highlighting, and Obsidian-style Callouts.

**[繁體中文 README](README.zh-TW.md)**

## Screenshots

### Preview (Obsidian theme)
![Preview](docs/screenshots/preview.png)
> Renders Markdown files with the bottom toolbar showing the current theme and export button.

### Find Bar (Ctrl+F / Cmd+F)
![Find Bar](docs/screenshots/find.png)
> Live full-text search with highlighter. Supports Whole words, Case sensitive, and Regex.

### CSS Theme Switcher
![CSS Theme Switcher](docs/screenshots/themes.png)
> 10 built-in themes: Obsidian, Swiss, Ink, Multi-Column, GitHub, Amblin, Upstanding Citizen, Lopash, Manuscript, Grump — plus Custom CSS. Switch with ⌘1–⌘9.

### Export Panel
![Export Panel](docs/screenshots/export.png)
> Click the share icon (↑) at the bottom right to export as HTML (with CDN), PDF (A4 paginated), DOCX, MD, or OPML.

## Features

- **Drag & Drop** — Drag any `.md` file onto the window to preview
- **CLI Launch** — Open a file from the terminal with `marked2u yourfile.md`
- **Live Reload** — Auto-detects file changes and updates the preview on save
- **Syntax Highlighting** — Powered by [highlight.js](https://highlightjs.org/) for dozens of languages
- **Mermaid Diagrams** — Render flowcharts, sequence diagrams, and more inline
- **Obsidian Callouts** — Supports `[!NOTE]`, `[!WARNING]`, and other callout blocks
- **Find Bar** — Ctrl+F / Cmd+F full-text search with Whole words, Case sensitive, Regex
- **10 CSS Themes** — Built-in Obsidian, GitHub, Grump, and more; Custom CSS supported
- **Export** — One-click export to HTML, PDF, DOCX, MD, OPML
- **File Association** — Double-click `.md` / `.markdown` files to open after install
- **Window State** — Remembers last window size and position

## Getting Started

The fastest way: hand this repo to an AI agent.

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) toolchain
- Tauri CLI [system dependencies](https://tauri.app/start/prerequisites/) (varies by OS)

### Install Dependencies

```bash
npm install
```

### Development Mode

```bash
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

Output artifacts are in `src-tauri/target/release/bundle/`.

## Usage

**Drag & Drop**: Drag any `.md` file onto the marked2u window.

**Command Line**:

```bash
marked2u /path/to/yourfile.md
```

The preview updates automatically when the file is saved — no manual refresh needed.

## Security

All release installers are compiled from source by GitHub Actions and scanned before publishing:

- **Linux** (`.deb`, `.rpm`) — Built on GitHub Ubuntu runner, scanned with [ClamAV](https://www.clamav.net/)
- **Windows** (`.exe`, `.msi`) — Built on GitHub Windows runner, scanned with Windows Defender

If any scan fails, the release is not published. View the full build log for each release on the [Actions](../../actions) page.

### FAQ

**Q: The binaries are already built from source — why scan for malware?**

Scanning at the artifact output stage detects known malicious signatures in the final binary, serving as the last layer of defense-in-depth. It complements dependency auditing, pinned package versions, and isolated build environments to cover the full supply chain threat surface.

**Q: Why not use VirusTotal?**

The free VirusTotal API is limited to 1 request per day — not enough for CI/CD (each release scans 4 files). This project uses platform-native alternatives instead: ClamAV on Linux and Windows Defender on Windows.

**Q: Why no macOS (.dmg)?**

macOS requires installers to be signed and notarized by an Apple Developer account. Unsigned `.dmg` files are blocked by Gatekeeper on macOS 13+. This project does not yet have an Apple Developer certificate ($99/year). A macOS build will be added once funding is available.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Tauri v2 |
| Frontend | Vite + Vanilla JS |
| Markdown | markdown-it |
| Diagrams | Mermaid |
| Syntax Highlighting | highlight.js |
| Backend | Rust (`notify`, `tauri-plugin-window-state`) |

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE).
