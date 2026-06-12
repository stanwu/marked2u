# marked2u

輕量級的桌面 Markdown 預覽器，基於 [Tauri](https://tauri.app/) 打造。支援即時檔案監聽、Mermaid 圖表、語法高亮與 Obsidian 風格 Callout。

## 功能特色

- **拖曳開啟** — 直接將 `.md` 檔案拖曳到視窗即可預覽
- **CLI 啟動** — 在終端機以 `marked2u yourfile.md` 開啟指定檔案
- **即時重新整理** — 儲存檔案後自動偵測變更並更新預覽
- **語法高亮** — 透過 [highlight.js](https://highlightjs.org/) 支援數十種程式語言
- **Mermaid 圖表** — 直接在 Markdown 中渲染流程圖、時序圖等
- **Obsidian Callout** — 支援 `[!NOTE]`、`[!WARNING]` 等提示區塊
- **檔案關聯** — 安裝後可直接雙擊 `.md` / `.markdown` 檔案開啟
- **視窗狀態記憶** — 記住上次視窗大小與位置

## 快速開始

### 開發環境需求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 工具鏈
- Tauri CLI 的[系統相依套件](https://tauri.app/start/prerequisites/)（依作業系統而異）

### 安裝相依套件

```bash
npm install
```

### 開發模式

```bash
npm run tauri dev
```

### 建置正式版本

```bash
npm run tauri build
```

編譯產物位於 `src-tauri/target/release/bundle/`。

## 使用方式

**拖曳**：將任意 `.md` 檔案拖曳到 marked2u 視窗。

**命令列**：

```bash
marked2u /path/to/yourfile.md
```

檔案儲存後，預覽會自動更新，無需手動重新整理。

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | Tauri v2 |
| 前端 | Vite + Vanilla JS |
| Markdown | markdown-it |
| 圖表 | Mermaid |
| 語法高亮 | highlight.js |
| 後端 | Rust (`notify`、`tauri-plugin-window-state`) |
