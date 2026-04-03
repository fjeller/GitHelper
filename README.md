# GitHelper

GitHelper is a desktop application for Windows and macOS that lets you run batch git operations across multiple repositories at the same time — from a single, clean interface. Instead of opening a terminal and repeating the same commands in each project folder, you select your repositories, fill in a few fields, and let GitHelper handle the rest.

---

## Features

- **Create a branch** in multiple repositories at once
- **Delete a branch** locally and remotely across all selected repos
- **Auto-merge** a source branch into a target branch, with a built-in conflict pre-check
- **Re-create a branch** from your master branch (useful for resetting `development` or `test`)
- **Tag all repositories** from a release branch in one step
- **Dry Run** mode on every operation — see exactly what *would* happen before committing
- Live log output streamed directly to the app as operations run
- Run history — review past operations and inspect logs for failed runs

---

## Prerequisites

Before installing GitHelper, make sure you have the following:

- **Git** installed and available on your system's PATH
  - Windows: [git-scm.com/download/win](https://git-scm.com/download/win)
  - macOS: run `git --version` in Terminal; if not installed, macOS will prompt you to install it
- The repositories you want to manage must already be **cloned to your local machine**

---

## Installation

### Windows

1. Download the latest release from the [Releases page](../../releases).
2. Choose one of:
   - **Installer:** Run `githelper-setup-<version>.exe` and follow the prompts. GitHelper will be added to your Start Menu.
   - **Portable:** Run `githelper-<version>.exe` directly — no installation required.
3. Launch GitHelper from the Start Menu or by double-clicking the portable exe.

### macOS

1. Download the latest release from the [Releases page](../../releases).
2. Open the `.dmg` file and drag **GitHelper** into your Applications folder.
3. On first launch, macOS may show a security warning because the app is not from the App Store. To allow it:
   - Go to **System Settings → Privacy & Security** and click **Open Anyway**.
4. Launch GitHelper from your Applications folder.

---

## First Launch & Setup

When you open GitHelper for the first time, the first thing to do is add your repositories and verify your settings.

### 1. Open Settings

Click **Settings** at the bottom of the left sidebar.

### 2. Add your repositories

- Click **Add Repository** (or drag a folder directly into the list).
- For each repository, provide:
  - **Path** — the full path to the repository folder on your machine (e.g. `C:\Projects\my-app` or `/Users/you/projects/my-app`)
  - **Name** — a short display name shown in the UI (e.g. `my-app`)
- Repeat for every repository you want to manage.
- Use the **↑ / ↓** arrows to reorder the list, or the **Remove** button to delete an entry.

### 3. Set your master branch

In Settings, find the **Master Branch** field. This is the branch that GitHelper treats as the source of truth — it is used as the base for re-creating branches, and it is protected from accidental deletion. The default value is `main`. Change it if your repositories use a different name (e.g. `master`).

### 4. Save

Settings are saved automatically as you make changes. You can navigate away from the Settings page at any time.

---

## Running Your First Operation

Once your repositories are added, you are ready to run an operation.

1. **Select an operation** from the left sidebar (e.g. *Create New Branch*).
2. **Fill in the parameters** — each operation has its own set of fields. Required fields are marked clearly.
3. **Select repositories** — check the boxes next to the repositories you want to include. Use *Select All* to check everything at once.
4. Click **Dry Run** first. This performs a read-only pre-flight check and shows you exactly what the operation would do — without making any changes.
5. Review the log output. If everything looks correct, click **Run** to execute the operation.
6. The log panel streams output in real time. A summary appears at the end showing which repositories succeeded and which (if any) failed.

> **Tip:** You can click **Abort** at any time during a run to stop the operation. Already-completed repositories are not rolled back.

---

## How-to Guides

For step-by-step instructions on each operation, see:

- [Create a new branch](__documentation/how-to/create-branch.md)
- [Delete a branch](__documentation/how-to/delete-branch.md)
- [Auto-merge a branch](__documentation/how-to/auto-merge.md)
- [Re-create a branch](__documentation/how-to/recreate-branch.md)
- [Tag all repositories](__documentation/how-to/tag-all.md)

## Reference

- [Configuration Reference](__documentation/reference/configuration.md)
