# Configuration Reference

This page describes all configuration options available in GitHelper, where they are stored, and what they control.

---

## Accessing settings

All settings are managed through the **Settings page**, accessible by clicking **Settings** at the bottom of the left sidebar. Changes take effect immediately — there is no Save button.

---

## Repositories

The repository list tells GitHelper which local git repositories to work with.

| Property | Description |
|---|---|
| **Path** | The absolute path to the repository folder on your machine (e.g. `C:\Projects\my-app` or `/Users/you/projects/my-app`). The folder must exist and contain a `.git` directory. |
| **Name** | A short label shown in the repository selector when running operations. Does not need to match the folder name. |

### Adding a repository

- Click **Add Repository**, enter the path and name, and confirm.
- Alternatively, drag a folder from your file explorer directly into the repository list. GitHelper will use the folder name as the display name.

### Removing a repository

Click the **Remove** button next to any repository. This only removes it from GitHelper's list — it does not delete anything on disk.

### Reordering

Use the **↑** and **↓** buttons to change the order repositories appear in the selector. The order is purely cosmetic.

---

## Master Branch

| Setting | Default | Description |
|---|---|---|
| **Master Branch** | `main` | The branch GitHelper treats as the source of truth across all operations. |

The master branch setting affects the following operations:

- **Delete Branch** — The master branch is protected and cannot be deleted.
- **Re-Create Branch** — The new branch is always created from the current state of the master branch.

**Valid values:** Any branch name consisting of letters, numbers, and the characters `. _ / -`. Whitespace and special characters are not allowed.

If you change this setting, make sure the branch exists in all of your repositories before running any operations that rely on it.

---

## Persisted operation state

GitHelper automatically remembers the last-used state for each operation, so you do not have to re-enter values every time. The following are persisted per operation:

| What is saved | Details |
|---|---|
| **Selected repositories** | The checkbox state for each operation is saved independently. Selecting repos for Auto-Merge does not affect the selection for Create Branch. |
| **Parameter values** | The last values you entered in each field are restored when you return to the operation. |

This state is stored inside the main configuration file alongside your repository list.

---

## Configuration file location

GitHelper stores all configuration on disk in a single JSON file:

| Platform | Path |
|---|---|
| Windows | `%APPDATA%\GitHelper\config.json` |
| macOS | `~/Library/Application Support/GitHelper/config.json` |

You can open this file in a text editor if you need to inspect it, but editing it manually is not recommended. If the file becomes corrupted or invalid, GitHelper will reset it to defaults on the next launch.

---

## Run history storage

GitHelper stores the history of past operations in the same data directory:

| Platform | Path |
|---|---|
| Windows | `%APPDATA%\GitHelper\history\` |
| macOS | `~/Library/Application Support/GitHelper/history/` |

The history directory contains:

- `index.json` — a list of the last 500 run entries (operation name, timestamp, success/failure, summary).
- `logs/<id>.json` — full log files, stored only for **failed** runs. Successful runs store only the summary.

You can safely delete the `history\` folder to clear all run history. GitHelper will recreate it automatically.
