# How to: Tag All Repositories from a Release Branch

Use this operation when you want to create the same annotated git tag across multiple repositories at once — for example, tagging a release from a release branch.

---

## Before you begin

- The base branch you specify must exist on the **remote** (`origin`) in every selected repository. GitHelper tags directly from `origin/<baseBranch>`, so you do not need the branch checked out locally.
- The tag name must not already exist in any of the selected repositories. GitHelper checks this before tagging anything.
- Tags created by this operation are **annotated tags** (with a message). They are pushed to the remote immediately.

---

## Steps

### 1. Open the operation

Click **Tag All** in the left sidebar.

### 2. Fill in the parameters

| Field | Required | Description |
|---|---|---|
| **Tag Name** | Yes | The name of the tag to create (e.g. `v1.8.0`). |
| **Base Branch** | Yes | The remote branch to tag from (e.g. `Releases/v1.8`). The tag is created from the tip of `origin/<baseBranch>`. |
| **Tag Message** | No | A short description for the annotated tag. Defaults to `Release <tagName>` if left empty. |

Tag names may only contain letters, numbers, and the characters `. _ / -`.

### 3. Select repositories

Check the boxes next to the repositories you want to tag.

### 4. Run a Dry Run

Click **Dry Run**. For each selected repository, GitHelper will:

1. Fetch the latest state including all tags (`--tags`).
2. Check that `origin/<baseBranch>` exists (the check is case-insensitive).
3. Check that the tag name does not already exist.

The dry run will clearly report any repositories where the base branch is missing or the tag already exists. The operation will not proceed if any issues are found.

### 5. Run the operation

If the dry run passes cleanly, click **Run**.

GitHelper runs the same pre-flight check again, then for each selected repository:

1. Creates an annotated tag pointing to `origin/<baseBranch>`.
2. Pushes the tag to `origin`.

### 6. Review the results

The summary shows which repositories were tagged successfully and which encountered errors.

---

## Common issues

**"Tag already exists"**
The tag name you entered already exists in one or more repositories. Choose a different tag name, or manually delete the existing tag before retrying.

**"Remote branch not found"**
The base branch does not exist on `origin` in one or more repositories. Check the branch name for typos. Note that the check is case-insensitive, but the branch must be present on the remote (not just local).
