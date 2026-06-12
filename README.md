# marked2u

> 本專案 100% 由 [Claude Code](https://claude.ai/code) 開發。

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

## 安全性

Release 頁面提供的所有安裝檔均由 GitHub Actions 從原始碼自動編譯，並在發布前完成掃毒驗證：

- **Linux**（`.deb`、`.rpm`）— 由 GitHub Ubuntu runner 編譯，經 [ClamAV](https://www.clamav.net/) 掃描
- **Windows**（`.exe`、`.msi`）— 由 GitHub Windows runner 編譯，經 Windows Defender 掃描

掃毒任一不通過，Release 即不發布。你可以在 [Actions](../../actions) 頁面查看每次 Release 的完整 build log。

> **為何沒有 macOS (.dmg)？** macOS 要求安裝檔必須經過 Apple 開發者簽章（$99/年）與 Notarization，未簽章的 `.dmg` 在 macOS 13+ 上會被 Gatekeeper 封鎖無法執行。本專案目前尚未取得 Apple Developer 憑證，待日後透過 donate 支持取得後再提供 macOS 版本。

> **為何不使用 VirusTotal？** VirusTotal 免費 API 限制為每日 1 次請求，不足以支援 CI/CD 流程（每次 Release 需掃描 4 個檔案）。本專案採用開源替代方案，在各平台原生環境直接掃描，確保檔案安全。

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | Tauri v2 |
| 前端 | Vite + Vanilla JS |
| Markdown | markdown-it |
| 圖表 | Mermaid |
| 語法高亮 | highlight.js |
| 後端 | Rust (`notify`、`tauri-plugin-window-state`) |
