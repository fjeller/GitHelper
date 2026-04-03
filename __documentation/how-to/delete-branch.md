# How to: Delete a Branch Across Multiple Repositories

Use this operation when a branch is no longer needed and you want to remove it — both locally and from the remote — across several repositories at once.

---

## Before you begin

- The **master branch** (configured in Settings) cannot be deleted. GitHelper will refuse the operation if you enter that branch name.
- If any repository currently has the target branch checked out, GitHelper will automatically switch to the master branch before deleting it.
- The operation deletes the branch **locally and remotely**. This cannot be undone. Run a Dry Run first to confirm the scope.

---

## Steps

### 1. Open the operation

Click **Delete Branch** in the left sidebar.

### 2. Fill in the parameters

| Field | Required | Description |
|---|---|---|
| **Branch Name** | Yes | The exact name of the branch to delete (e.g. `feature/old-feature`). |

### 3. Select repositories

Check the boxes next to the repositories from which you want to delete the branch. A branch that does not exist in a given repository is simply skipped for that repository — it is not treated as an error.

### 4. Run a Dry Run

Click **Dry Run**. GitHelper will fetch and prune each selected repository, then report:

- Which repositories have the branch **locally**
- Which repositories have the branch **remotely**
- Which repositories do not have the branch at all (will be skipped)

Review the output to confirm you are deleting the right branch in the right repositories.

### 5. Run the operation

Click **Run**.

For each selected repository where the branch exists, GitHelper will:

1. Fetch the latest state (with pruning).
2. If the branch is currently checked out, switch to the master branch first.
3. Delete the local branch (forced delete).
4. Delete the remote branch from `origin`.

Repositories where the branch does not exist are skipped without error.

### 6. Review the results

A summary table shows which repositories had the branch deleted and which were skipped. Check the log for any errors.

---

## Common issues

**"Cannot delete the master branch"**
The branch name you entered matches the master branch configured in Settings. Change the branch name, or update your master branch setting if it is set incorrectly.

**"Could not switch away from branch"**
GitHelper tried to check out the master branch before deleting the target branch, but the master branch does not exist locally in that repository. Make sure the master branch is present in every repository.
