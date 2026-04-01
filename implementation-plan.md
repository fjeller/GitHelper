# GitHelper — Implementation Plan

## 1. Project Overview

**GitHelper** is an Electron desktop application that provides a polished GUI for performing batch git operations across multiple repositories. It replaces a set of PowerShell scripts with a modern, extensible, dark-themed app built on Electron + React + TypeScript.

**Repository:** `__GitHelper` (this repo)
**Target platform:** Windows (primary)

---

## 2. Decisions Summary (from Q&A)

| Decision                  | Choice                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| App name                  | GitHelper                                                                                   |
| Location                  | This repository (`__GitHelper`)                                                             |
| Framework                 | Electron + React + TypeScript                                                               |
| Git library               | `simple-git` (well-maintained, Promise-based, TypeScript types included)                    |
| UI theme                  | Dark mode, blueish accent color, high contrast for readability                              |
| Repository management     | Single global editable list; per-operation checkbox selection (persisted per operation)      |
| Operation parameters      | All params (branch names, tag names, etc.) persisted per-operation, restored on restart     |
| Run history               | Full output log stored on error; summary log on success                                     |
| Dry run                   | Optional, user-triggered; mandatory pre-flight checks still halt on error (e.g., merge)     |
| Abort                     | Red abort button visible during running operations                                          |
| Data storage              | `%APPDATA%/GitHelper` (survives reinstalls)                                                 |
| Architecture              | Plugin/module system — each operation is a self-contained module                            |
| Sidebar                   | Flat list of operations; Settings pinned to bottom                                          |
| Re-Create Dev / Test      | Two dedicated operations, always run on ALL repositories (no per-repo selection)             |

---

## 3. Operations (derived from PS1 scripts)

### 3.1 Create New Branch
- **Source script:** `create-new-branch.ps1`
- **Parameters:** Branch name (text input), base branch (defaults to `main`)
- **Repo selection:** Per-operation checkboxes (persisted)
- **Behavior:**
  1. Pre-flight: fetch all, check branch doesn't exist locally or on remote in any selected repo
  2. If conflict found → stop and report
  3. For each repo: checkout base branch, pull, create new branch, push with `-u`
- **Dry run:** Runs only the pre-flight check phase and reports results

### 3.2 Delete Branch
- **Source script:** `delete-branches.ps1`
- **Parameters:** Branch name (text input)
- **Repo selection:** Per-operation checkboxes (persisted)
- **Behavior:**
  1. For each repo: fetch & prune
  2. If on the target branch, switch to `main` (fallback `develop`)
  3. Delete local branch (`-D`) if exists
  4. Delete remote branch (`push origin --delete`) if exists
  5. Summary table of results per repo
- **Dry run:** Check which repos have the branch locally/remotely without deleting

### 3.3 Auto-Merge
- **Source script:** `merge-auto.ps1`
- **Parameters:** Source branch, target branch (both text inputs, persisted)
- **Repo selection:** Per-operation checkboxes (persisted)
- **Behavior (2-phase, mandatory):**
  1. **Phase 1 — Conflict check (mandatory, always runs):**
     - For each repo: fetch, checkout target, pull, test-merge (`--no-commit --no-ff`), check for conflicts, abort test merge
     - If ANY repo has conflicts → halt entire operation, report conflicts
  2. **Phase 2 — Execute merge:**
     - For each repo: checkout target, pull, merge with `--no-ff`, push
- **Dry run:** Runs only Phase 1

### 3.4 Re-Create Development
- **Source script:** `recreate-branch.ps1` (with `development` target)
- **Parameters:** None (hardcoded: branch = `development`, base = `main`)
- **Repo selection:** Always ALL repositories (no checkboxes)
- **Behavior:**
  1. For each repo: fetch, checkout `main`, pull
  2. Delete `development` locally if exists (`-D`)
  3. Delete `development` on remote if exists
  4. Create `development` from `main`, push with `-u`
- **Dry run:** Report which repos have `development` and what would be deleted/recreated

### 3.5 Re-Create Test
- **Source script:** `recreate-branch.ps1` (with `test` target)
- **Parameters:** None (hardcoded: branch = `test`, base = `main`)
- **Repo selection:** Always ALL repositories (no checkboxes)
- **Behavior:** Identical to Re-Create Development but for `test` branch
- **Dry run:** Same as above but for `test`

### 3.6 Tag All
- **Source script:** `tag-all.ps1`
- **Parameters:** Tag name (text input), base branch (text input, e.g., `Releases/v1.8`), tag message (auto-generated or editable)
- **Repo selection:** Per-operation checkboxes (persisted)
- **Behavior:**
  1. For each repo: fetch, verify base branch exists on remote, check tag doesn't already exist
  2. Create annotated tag from `origin/<baseBranch>`, push tag
  3. Summary of success/failure per repo
- **Dry run:** Check base branch existence and tag name availability without creating

---

## 4. Technology Stack

| Layer              | Technology                                                     |
| ------------------ | -------------------------------------------------------------- |
| Desktop shell      | Electron (latest stable)                                       |
| Frontend framework | React 18+                                                      |
| Language           | TypeScript (strict mode)                                       |
| Build tool         | Vite (for React/renderer) + electron-builder (for packaging)   |
| Git operations     | `simple-git` npm package                                       |
| IPC                | Electron `ipcMain` / `ipcRenderer` via `contextBridge`         |
| State management   | React Context + useReducer (lightweight, no Redux needed)      |
| Styling            | CSS Modules or Tailwind CSS (dark theme with blue accents)     |
| Data persistence   | JSON files in `%APPDATA%/GitHelper`                            |
| Logging            | Custom log collector piped via IPC to renderer                 |

---

## 5. Project Structure

```
__GitHelper/
├── base_Scripts/                # Original PS1/PY scripts (kept for reference)
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main process entry point, window creation
│   │   ├── ipc/                 # IPC handlers
│   │   │   ├── operations.ts    # IPC handlers for running operations
│   │   │   ├── config.ts        # IPC handlers for config read/write
│   │   │   └── history.ts       # IPC handlers for run history
│   │   ├── services/
│   │   │   ├── config.service.ts    # Read/write config from %APPDATA%
│   │   │   ├── history.service.ts   # Read/write run history
│   │   │   └── git.service.ts       # Shared git helpers (wraps simple-git)
│   │   └── operations/             # Operation modules (plugin system)
│   │       ├── types.ts             # Operation interface definition
│   │       ├── registry.ts          # Auto-discovers and registers operations
│   │       ├── create-branch.ts
│   │       ├── delete-branch.ts
│   │       ├── auto-merge.ts
│   │       ├── recreate-development.ts
│   │       ├── recreate-test.ts
│   │       └── tag-all.ts
│   ├── renderer/                # React frontend (Vite-bundled)
│   │   ├── index.html
│   │   ├── main.tsx             # React entry point
│   │   ├── App.tsx              # Root component (layout: sidebar + content)
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   │   ├── OperationView.tsx    # Generic operation page (params + repos + run)
│   │   │   ├── LogViewer.tsx        # Live log output component
│   │   │   ├── RepoSelector.tsx     # Checkbox list of repositories
│   │   │   ├── RunHistory.tsx       # History list with expandable details
│   │   │   ├── SettingsPage.tsx     # Global settings / repository management
│   │   │   └── AbortButton.tsx      # Red abort button
│   │   ├── hooks/
│   │   │   ├── useOperation.ts      # Hook for running operations via IPC
│   │   │   ├── useConfig.ts         # Hook for reading/writing config
│   │   │   └── useHistory.ts        # Hook for run history
│   │   ├── styles/
│   │   │   ├── global.css           # Dark theme base, CSS variables
│   │   │   └── components/          # Per-component styles
│   │   └── types/
│   │       └── index.ts             # Shared frontend types
│   └── preload/
│       └── index.ts             # contextBridge exposing safe IPC API
├── electron-builder.json        # Packaging config
├── vite.config.ts               # Vite config for renderer
├── tsconfig.json                # TypeScript config
├── package.json
├── implementation-plan.md       # This file
└── README.md
```

---

## 6. Architecture Details

### 6.1 Plugin / Module System

Each operation implements the `Operation` interface:

```typescript
interface OperationParameter {
  id: string;
  label: string;
  type: 'text' | 'select' | 'boolean';
  defaultValue?: string | boolean;
  options?: string[];            // For 'select' type
  required?: boolean;
}

interface OperationLogEntry {
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  repository?: string;           // Which repo this log line pertains to
  message: string;
}

interface OperationResult {
  success: boolean;
  summary: string;               // Short summary (always stored)
  logs: OperationLogEntry[];     // Full logs (stored only on error)
  perRepo: {
    repository: string;
    status: 'success' | 'failed' | 'skipped';
    detail?: string;
  }[];
}

interface Operation {
  id: string;                    // Unique identifier, e.g., 'create-branch'
  name: string;                  // Display name, e.g., 'Create New Branch'
  description: string;           // Short description for UI
  icon?: string;                 // Optional icon identifier
  parameters: OperationParameter[];
  repoSelection: 'user' | 'all'; // 'user' = per-op checkboxes, 'all' = always all repos

  // Optional dry-run support
  supportsDryRun: boolean;
  dryRun?(
    repos: string[],
    params: Record<string, string | boolean>,
    log: (entry: OperationLogEntry) => void,
    abortSignal: AbortSignal
  ): Promise<OperationResult>;

  // Main execution
  execute(
    repos: string[],
    params: Record<string, string | boolean>,
    log: (entry: OperationLogEntry) => void,
    abortSignal: AbortSignal
  ): Promise<OperationResult>;
}
```

**Adding a new operation** requires:
1. Create a new `.ts` file in `src/main/operations/` that exports an object implementing `Operation`
2. The registry auto-discovers all modules in that folder
3. The sidebar and UI automatically pick it up — no other files need to change

### 6.2 IPC Communication

The main process and renderer communicate via typed IPC channels:

| Channel                         | Direction         | Purpose                                    |
| ------------------------------- | ----------------- | ------------------------------------------ |
| `operations:list`               | renderer → main   | Get list of registered operations          |
| `operations:run`                | renderer → main   | Start an operation (returns stream of logs) |
| `operations:dry-run`            | renderer → main   | Start a dry run                            |
| `operations:abort`              | renderer → main   | Abort a running operation                  |
| `operations:log`                | main → renderer   | Stream log entries in real-time            |
| `operations:complete`           | main → renderer   | Signal operation completed with result     |
| `config:get`                    | renderer → main   | Read config                                |
| `config:set`                    | renderer → main   | Write config                               |
| `history:list`                  | renderer → main   | Get run history entries                    |
| `history:get`                   | renderer → main   | Get a specific history entry with full log |

All IPC is exposed through `contextBridge` in the preload script — the renderer never has direct access to Node.js APIs.

### 6.3 Abort Mechanism

- Each operation receives an `AbortSignal` (from `AbortController`)
- The operation checks `abortSignal.aborted` before processing each repository
- When the user clicks the red Abort button, the controller's `.abort()` is called via IPC
- The current git command finishes (atomic per-repo), but no further repos are processed
- The result is marked with a summary indicating partial execution

### 6.4 Live Log Streaming

- When an operation runs, it calls `log(entry)` for each meaningful event
- The main process forwards each log entry to the renderer via `operations:log` IPC event
- The `LogViewer` component renders entries in real-time with color-coded levels:
  - `info` → neutral/gray
  - `success` → green
  - `warning` → amber/yellow
  - `error` → red
- Auto-scroll to bottom with a "pin to bottom" toggle
- Repository name displayed as a prefix/badge on each log line

---

## 7. Data Persistence

### 7.1 Storage Location

All data lives under `%APPDATA%/GitHelper/`:

```
%APPDATA%/GitHelper/
├── config.json          # Global config (repositories, per-operation settings)
└── history/
    ├── index.json       # History index (list of runs with summary)
    └── logs/
        └── <run-id>.json  # Full log (only for failed runs)
```

### 7.2 Config Schema

```jsonc
{
  "repositories": [
    { "path": "C:\\__dev\\__tracto\\myTRACTO-Common", "name": "myTRACTO-Common" },
    { "path": "C:\\__dev\\__tracto\\myTRACTO-UI", "name": "myTRACTO-UI" }
    // ...
  ],
  "operations": {
    "create-branch": {
      "selectedRepos": ["C:\\__dev\\__tracto\\myTRACTO-Common", "C:\\__dev\\__tracto\\myTRACTO-UI"],
      "params": {
        "branchName": "feature/last-used-name",
        "baseBranch": "main"
      }
    },
    "auto-merge": {
      "selectedRepos": ["C:\\__dev\\__tracto\\myTRACTO-Common"],
      "params": {
        "sourceBranch": "development",
        "targetBranch": "main"
      }
    },
    "tag-all": {
      "selectedRepos": [...],
      "params": {
        "tagName": "1.8.5",
        "baseBranch": "Releases/v1.8",
        "tagMessage": ""
      }
    }
    // delete-branch, etc.
  }
}
```

### 7.3 History Schema

**index.json:**
```jsonc
[
  {
    "id": "run-2026-03-31-143022-create-branch",
    "operationId": "create-branch",
    "operationName": "Create New Branch",
    "timestamp": "2026-03-31T14:30:22.000Z",
    "success": true,
    "summary": "Branch 'feature/xyz' created in 12/12 repositories",
    "hasFullLog": false
  },
  {
    "id": "run-2026-03-31-150100-auto-merge",
    "operationId": "auto-merge",
    "operationName": "Auto-Merge",
    "timestamp": "2026-03-31T15:01:00.000Z",
    "success": false,
    "summary": "Merge conflicts in 2 repositories",
    "hasFullLog": true          // Full log saved because of failure
  }
]
```

---

## 8. UI Design

### 8.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│  GitHelper                                    [─] [□] [×]│
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  OPERATIONS│   [Operation Name]                          │
│            │   Description text                          │
│  • Create  │                                             │
│    Branch  │   ┌─ Parameters ──────────────────────┐     │
│  • Delete  │   │ Branch name: [_______________]    │     │
│    Branch  │   │ Base branch: [main___________]    │     │
│  • Auto    │   └───────────────────────────────────┘     │
│    Merge   │                                             │
│  • Re-Create│  ┌─ Repositories ────────────────────┐     │
│    Dev     │   │ ☑ myTRACTO-Common                 │     │
│  • Re-Create│  │ ☑ myTRACTO-Common_Backend         │     │
│    Test    │   │ ☐ myTRACTO-UI_Shared              │     │
│  • Tag All │   │ ☑ myTRACTO-UI                     │     │
│            │   └───────────────────────────────────┘     │
│            │                                             │
│            │   [▶ Run]  [🔍 Dry Run]                     │
│            │                                             │
│            │   ┌─ Log Output ──────────────────────┐     │
│            │   │ [14:30:22] Processing: myTRACTO.. │     │
│            │   │ [14:30:23] ✓ Branch created       │     │
│            │   │ [14:30:24] Processing: myTRACTO.. │     │
│  ─────────│   │                                    │     │
│  • History │   │                     [🔴 Abort]    │     │
│  ⚙ Settings│  └───────────────────────────────────┘     │
│            │                                             │
└────────────┴─────────────────────────────────────────────┘
```

### 8.2 Theme & Colors

| Element              | Color                                                    |
| -------------------- | -------------------------------------------------------- |
| Background (main)    | `#1a1d23` (very dark blue-gray)                          |
| Background (sidebar) | `#151820` (slightly darker)                              |
| Surface / cards      | `#222630` (elevated surfaces)                            |
| Primary accent       | `#5b8af5` (medium blue, good contrast on dark)           |
| Primary hover        | `#7ba3ff`                                                |
| Text (primary)       | `#e8eaf0` (off-white, easy on eyes)                      |
| Text (secondary)     | `#9ca3b4` (muted)                                        |
| Success              | `#4caf77` (green)                                        |
| Warning              | `#e8a84c` (amber)                                       |
| Error / Abort btn    | `#e05555` (red)                                          |
| Borders              | `#2d3344`                                                |
| Input backgrounds    | `#1a1d23` with `#2d3344` border                         |
| Selected sidebar     | `#5b8af5` left border accent + `#222630` background     |

Contrast ratios target WCAG AA (4.5:1 for normal text, 3:1 for large text).

### 8.3 Key UI Components

- **Sidebar:** Fixed width (~220px), flat list of operations, icons optional. Active item highlighted with blue left accent border. "History" and "Settings" pinned at the bottom, separated by a divider line.
- **Operation View:** The main content area. Shows operation name, description, parameter inputs, repository checkboxes, Run/Dry Run buttons, and log output area.
- **Log Viewer:** Monospaced font, color-coded entries, auto-scroll, timestamp prefix. During execution the Abort button (red, prominent) appears.
- **Settings Page:** Editable list of repositories (add/remove/reorder), folder-picker dialog for adding repos. No external config file editing needed.
- **History Page:** Chronological list of past runs. Each entry shows: operation name, timestamp, success/fail badge. Click to expand — shows summary always, full log only on failed runs.

---

## 9. Implementation Phases

### Phase 1: Project Scaffolding
1. Initialize `package.json` with Electron + React + TypeScript + Vite
2. Set up Electron main process boilerplate (`src/main/index.ts`)
3. Set up Vite for the renderer process
4. Set up preload script with `contextBridge`
5. Configure `electron-builder.json` for packaging
6. Create `tsconfig.json` (strict mode)
7. Add `.gitignore` for `node_modules/`, `dist/`, `out/`
8. Verify the app launches with a blank window

### Phase 2: Core Infrastructure
1. Implement `config.service.ts` — read/write JSON from `%APPDATA%/GitHelper/`
2. Implement `history.service.ts` — manage run history index + per-run log files
3. Implement `git.service.ts` — thin wrapper around `simple-git` with common helpers
4. Define the `Operation` interface and types (`src/main/operations/types.ts`)
5. Implement operation registry (`registry.ts`) — auto-import all modules from the operations folder
6. Set up all IPC handlers (`src/main/ipc/`)
7. Set up the preload API surface

### Phase 3: Operation Modules
1. `create-branch.ts` — Create New Branch
2. `delete-branch.ts` — Delete Branch
3. `auto-merge.ts` — Auto-Merge (with mandatory 2-phase conflict check)
4. `recreate-development.ts` — Re-Create Development (always all repos)
5. `recreate-test.ts` — Re-Create Test (always all repos)
6. `tag-all.ts` — Tag All

Each module:
- Implements the `Operation` interface
- Has `execute()` and optionally `dryRun()`
- Uses `git.service.ts` for git commands
- Calls `log()` callback for real-time log streaming
- Respects `AbortSignal` between each repository iteration

### Phase 4: UI — Layout & Navigation
1. Implement dark theme (CSS variables / global styles)
2. Build `App.tsx` with sidebar + content area layout
3. Build `Sidebar.tsx` — flat operation list from registry, Settings at bottom
4. Implement React routing/state for switching between operations, history, settings

### Phase 5: UI — Operation Pages
1. Build `OperationView.tsx` — generic component that renders any operation's params + repo selector + buttons
2. Build `RepoSelector.tsx` — checkbox list populated from config, selection persisted via IPC
3. Build parameter input rendering (text fields, selects based on `OperationParameter` type)
4. Wire up Run / Dry Run buttons to IPC
5. Build `LogViewer.tsx` — real-time log display with color coding
6. Build `AbortButton.tsx` — red, appears only during execution

### Phase 6: UI — Settings & History
1. Build `SettingsPage.tsx` — repository list management (add via folder picker, remove, reorder)
2. Build `RunHistory.tsx` — list of past runs, expandable detail with full log on failures
3. Wire up history persistence

### Phase 7: Polish & Testing
1. Test all 6 operations against real repositories
2. Verify abort works correctly mid-operation
3. Verify config persistence across restarts
4. Verify history storage (full log on error, summary on success)
5. Verify dry-run mode for each operation
6. UI polish — consistent spacing, focus states, keyboard navigation
7. Contrast/accessibility check on all color combinations

### Phase 8: Packaging
1. Configure `electron-builder` for Windows (NSIS installer or portable)
2. Set app icon and metadata
3. Build and test packaged app
4. Verify `%APPDATA%` data location works correctly from packaged build

---

## 10. Key Dependencies

| Package              | Purpose                                | Version (approx) |
| -------------------- | -------------------------------------- | ----------------- |
| `electron`           | Desktop shell                          | ^30+              |
| `react`              | UI framework                           | ^18               |
| `react-dom`          | React DOM renderer                     | ^18               |
| `typescript`         | Language                               | ^5.4              |
| `vite`               | Bundler for renderer                   | ^5+               |
| `simple-git`         | Git operations                         | ^3                |
| `electron-builder`   | Packaging                              | ^24+              |
| `@electron/remote`   | NOT used (security) — raw IPC instead  | —                 |

Dev dependencies: `@types/react`, `@types/react-dom`, `vite-plugin-electron`, `concurrently` (for dev mode).

---

## 11. Security Considerations

- **Context isolation** enabled — renderer has no direct Node.js access
- **Preload script** exposes only specific, typed IPC methods via `contextBridge`
- All file paths validated before git operations (must exist, must be a git repo)
- No `shell: true` in child processes — `simple-git` uses direct git binary calls
- `nodeIntegration: false` in `BrowserWindow` config
- User input (branch names, tag names) sanitized — no shell metacharacters

---

## 12. Future Extensibility

To add a new operation:
1. Create `src/main/operations/my-new-operation.ts`
2. Export an object implementing the `Operation` interface
3. The registry picks it up automatically
4. The UI renders it in the sidebar and generates the parameter form

No changes needed in routing, sidebar, IPC handlers, or any other existing code.

Possible future operations:
- Checkout branch across all repos
- Pull all repos
- Status check across all repos
- Cherry-pick across repos
- Stash/unstash across repos
