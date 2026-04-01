#!/usr/bin/env python3
"""
Delete a branch locally and remotely across multiple repositories.
Update BRANCH_NAME and REPOSITORIES below before running.
On macOS/Linux, update the repository paths accordingly.
"""

import subprocess
import sys
from pathlib import Path

# Enable ANSI colors on Windows
if sys.platform == "win32":
    import os
    os.system("")

# -- Colors ------------------------------------------------------------------
R = "\033[0m"
CYAN   = "\033[96m"
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
GRAY   = "\033[90m"
WHITE  = "\033[97m"
DYELLOW = "\033[33m"

# -- Configuration -----------------------------------------------------------
REPOSITORIES = [
    r"C:\__dev\__tracto\myTRACTO-Common",
    r"C:\__dev\__tracto\myTRACTO-Common_Backend",
    r"C:\__dev\__tracto\myTRACTO-UI_Shared",
    r"C:\__dev\__tracto\myTRACTO-TranslationService",
    r"C:\__dev\__tracto\myTRACTO-UserService",
    r"C:\__dev\__tracto\myTRACTO-CompanyService",
    r"C:\__dev\__tracto\myTRACTO-LicenseService",
    r"C:\__dev\__tracto\myTRACTO-HelpService",
    r"C:\__dev\__tracto\myTRACTO-NewsService",
    r"C:\__dev\__tracto\myTRACTO-AppService",
    r"C:\__dev\__tracto\myTRACTO-AdminApp",
    r"C:\__dev\__tracto\myTRACTO-UI",
]

BRANCH_NAME = "features/my-branch-name"

# ----------------------------------------------------------------------------

def git(args: list[str], cwd: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
    )


def print_summary(results: list[dict]) -> None:
    keys = ["Repository", "Local", "Remote"]
    widths = [
        max(len(str(r[k])) for r in results + [{k: k for k in keys}])
        for k in keys
    ]
    sep = "  " + "-" * (sum(widths) + 4)
    header = f"  {keys[0]:<{widths[0]}}  {keys[1]:<{widths[1]}}  {keys[2]:<{widths[2]}}"
    print(header)
    print(sep)
    for row in results:
        print(f"  {row['Repository']:<{widths[0]}}  {row['Local']:<{widths[1]}}  {row['Remote']:<{widths[2]}}")


def main() -> None:
    print(f"{CYAN}========================================{R}")
    print(f"{CYAN}Delete Branch Script{R}")
    print(f"{CYAN}========================================{R}")
    print(f"{WHITE}Branch to delete: {BRANCH_NAME}{R}")
    print(f"{WHITE}Repositories to process: {len(REPOSITORIES)}{R}")
    print()

    results = []

    for repo in REPOSITORIES:
        repo_name = Path(repo).name
        print(f"{YELLOW}Processing: {repo_name}{R}")

        if not Path(repo).exists():
            print(f"  {DYELLOW}[SKIP] Repository path not found: {repo}{R}")
            results.append({"Repository": repo_name, "Local": "skipped", "Remote": "skipped"})
            continue

        # Fetch and prune so remote tracking refs are current
        git(["fetch", "--all", "--prune"], cwd=repo)

        # -- Delete local branch ---------------------------------------------
        local_result = git(["branch", "--list", BRANCH_NAME], cwd=repo)
        if BRANCH_NAME in local_result.stdout:
            # Switch away if currently on the branch to delete
            current = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd=repo).stdout.strip()
            if current == BRANCH_NAME:
                if git(["checkout", "main"], cwd=repo).returncode != 0:
                    git(["checkout", "develop"], cwd=repo)

            r = git(["branch", "-D", BRANCH_NAME], cwd=repo)
            if r.returncode == 0:
                print(f"  {GREEN}[OK]   Local branch deleted{R}")
                local = "deleted"
            else:
                print(f"  {RED}[FAIL] Could not delete local branch{R}")
                local = "failed"
        else:
            print(f"  {GRAY}[--]   Local branch does not exist, skipping{R}")
            local = "not found"

        # -- Delete remote branch --------------------------------------------
        remote_result = git(["branch", "-r", "--list", f"origin/{BRANCH_NAME}"], cwd=repo)
        if BRANCH_NAME in remote_result.stdout:
            r = git(["push", "origin", "--delete", BRANCH_NAME], cwd=repo)
            if r.returncode == 0:
                print(f"  {GREEN}[OK]   Remote branch deleted{R}")
                remote = "deleted"
            else:
                print(f"  {RED}[FAIL] Could not delete remote branch{R}")
                remote = "failed"
        else:
            print(f"  {GRAY}[--]   Remote branch does not exist, skipping{R}")
            remote = "not found"

        results.append({"Repository": repo_name, "Local": local, "Remote": remote})
        print()

    # Summary
    print(f"{CYAN}========================================{R}")
    print(f"{CYAN}Summary{R}")
    print(f"{CYAN}========================================{R}")
    print_summary(results)


if __name__ == "__main__":
    main()
