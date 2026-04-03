# How to: Auto-Merge a Branch Across Multiple Repositories

Use this operation when you want to merge a source branch into a target branch across multiple repositories in one step — for example, merging `main` into `development` to bring it up to date.

---

## Before you begin

- Both the source branch and the target branch must exist in every repository you select.
- GitHelper performs a **conflict check before making any changes**. If any repository has conflicts, the entire operation stops and no merges are performed anywhere. This is by design — it prevents a partial merge across your repositories.
- This operation uses a non-fast-forward merge (`--no-ff`), so a merge commit is always created.

---

## Steps

### 1. Open the operation

Click **Auto-Merge** in the left sidebar.

### 2. Fill in the parameters

| Field | Required | Description |
|---|---|---|
| **Source Branch** | Yes | The branch whose changes you want to merge in (e.g. `main`). |
| **Target Branch** | Yes | The branch to merge into (e.g. `development`). |

### 3. Select repositories

Check the boxes next to the repositories where you want the merge to happen.

### 4. Run a Dry Run (conflict check)

Click **Dry Run**. This runs the conflict check phase without making any permanent changes:

For each selected repository, GitHelper will:

1. Fetch the latest state.
2. Check out the target branch and pull.
3. Attempt a trial merge (with `--no-commit --no-ff`) to detect conflicts.
4. Immediately abort the trial merge — nothing is committed.

The log will report for each repository whether the merge would be **clean** or **conflicted**.

> **If any repository reports conflicts, the Dry Run will flag it clearly.** You must resolve those conflicts manually before proceeding.

### 5. Run the operation

If the dry run shows all repositories are conflict-free, click **Run**.

GitHelper runs the same conflict check again as Phase 1. If everything is still clean, it then runs Phase 2 for each repository:

1. Check out the target branch.
2. Pull the latest changes.
3. Merge the source branch (`--no-ff`).
4. Push the result to the remote.

> **Important:** If conflicts are detected during the live run (e.g. because the remote changed between the dry run and the run), the operation halts **before any repository is merged**. No partial merges are made.

### 6. Review the results

The summary table shows what happened in each repository. If an error occurred, the log will show the details for that repository.

---

## Common issues

**"Conflicts detected — operation halted"**
One or more repositories have conflicting changes that cannot be merged automatically. You must resolve these manually:

1. Open a terminal in the conflicting repository.
2. Check out the target branch and pull: `git checkout <target> && git pull`
3. Merge the source branch: `git merge <source>`
4. Resolve the conflicts in your editor, then commit.
5. Once all repositories are manually resolved, you can use GitHelper's Auto-Merge for any remaining ones.

**"Branch not found"**
The source or target branch does not exist in one of the selected repositories. Check for typos and confirm the branch exists in every selected repository.
