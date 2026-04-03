# How to: Re-Create a Branch Across Multiple Repositories

Use this operation when you want to reset a branch to the exact state of your master branch — discarding all commits that exist only on that branch. This is commonly used to reset `development` or `test` branches at the start of a new release cycle.

---

## Before you begin

> **Warning: This is a destructive operation.**
>
> Re-creating a branch deletes it (locally and remotely) and creates a fresh copy from the master branch. Any commits that exist on the branch but not on the master branch will be **permanently lost**. Run a Dry Run and make sure everyone on your team is aware before proceeding.

- The branch is always recreated from the **master branch** configured in Settings. There is no option to choose a different base — if you need that, use the [Create Branch](create-branch.md) operation instead.
- If the branch does not yet exist, GitHelper will create it. This operation works whether the branch already exists or not.

---

## Steps

### 1. Open the operation

Click **Re-Create Branch** in the left sidebar.

### 2. Fill in the parameters

| Field | Required | Description |
|---|---|---|
| **Branch Name** | Yes | The name of the branch to re-create (e.g. `development` or `test`). |

The branch will be deleted and recreated from the master branch currently set in Settings.

### 3. Select repositories

Check the boxes next to the repositories where you want to re-create the branch.

### 4. Run a Dry Run

Click **Dry Run**. GitHelper will report for each selected repository:

- Whether the branch currently exists locally
- Whether the branch currently exists remotely
- What will happen (delete + recreate, or just create)

Review this output carefully. This is your last chance to confirm the scope before any changes are made.

### 5. Run the operation

Click **Run**.

For each selected repository, GitHelper will:

1. Fetch the latest state from the remote.
2. Check out the master branch.
3. Delete the target branch locally (if it exists).
4. Delete the target branch from the remote (if it exists).
5. Create a new branch of the same name from the current state of the master branch.
6. Push the new branch to the remote and set the upstream tracking reference.

### 6. Review the results

The summary shows the status per repository. Check the log output for any errors.

---

## Common issues

**"Could not check out master branch"**
The master branch does not exist locally in one of the selected repositories. Make sure your master branch is present and up to date in every repository.

**"Could not delete remote branch"**
GitHelper could not push the delete to the remote. This sometimes happens if you do not have the necessary permissions, or if the branch is protected in your git hosting provider (e.g. GitHub, GitLab). Check your repository's branch protection rules.
