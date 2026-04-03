# How to: Create a New Branch Across Multiple Repositories

Use this operation when you need to create the same branch in several repositories at once — for example, starting a new feature or release cycle that spans multiple projects.

---

## Before you begin

- Make sure all target repositories are added in **Settings**.
- The base branch (the branch you want to create the new one from) must exist in every repository you select.
- GitHelper will fetch the latest state of each repository before creating the branch, so your local copy does not need to be up to date first.

---

## Steps

### 1. Open the operation

Click **Create New Branch** in the left sidebar.

### 2. Fill in the parameters

| Field | Required | Description |
|---|---|---|
| **Branch Name** | Yes | The name of the new branch to create (e.g. `feature/my-feature`). |
| **Base Branch** | No | The branch to create the new one from. Defaults to `main` (or whatever your master branch is set to). |

Branch names may only contain letters, numbers, and the characters `. _ / -`.

### 3. Select repositories

Check the boxes next to the repositories where you want the branch created. Use **Select All** to include every repository in the list.

### 4. Run a Dry Run

Click **Dry Run**. GitHelper will:

1. Fetch the latest state from each selected repository.
2. Check whether the branch already exists locally or remotely in any of the repositories.

If the branch already exists in any repository, the dry run reports this and the operation will not proceed. This prevents accidental overwrites.

Review the log output to confirm everything looks correct.

### 5. Run the operation

If the dry run reports no issues, click **Run**.

For each selected repository, GitHelper will:

1. Check out the base branch.
2. Pull the latest changes.
3. Create and check out the new branch.
4. Push the new branch to the remote and set the upstream tracking reference.

### 6. Review the results

When the operation completes, a summary table shows the status of each repository — whether it succeeded or failed. If any repository failed, the log output will show the error for that specific repository.

---

## Common issues

**"Branch already exists"**
The dry run detected that the branch name already exists locally or remotely in one or more repositories. Either choose a different branch name, or delete the existing branch first using the [Delete Branch]( delete-branch.md) operation.

**"Base branch not found"**
The specified base branch does not exist in one of the selected repositories. Check the branch name for typos and make sure the base branch exists in every repository you selected.
