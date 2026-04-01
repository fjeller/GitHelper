#!/usr/bin/env python3
"""
Delete and recreate a target branch (development or test) from a base branch
across multiple repositories.
Update REPOSITORIES and BASE_BRANCH below before running.
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

BASE_BRANCH = "main"

VALID_BRANCHES = ["development", "test"]

# ----------------------------------------------------------------------------

def git(args: list[str], cwd: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
    )


def prompt_branch(arg: str | None) -> str:
    """Return target branch from CLI arg or interactive prompt."""
    if arg and arg in VALID_BRANCHES:
        return arg

    print(f"{CYAN}Select branch to recreate:{R}")
    for i, name in enumerate(VALID_BRANCHES, start=1):
        print(f"  {WHITE}{i}. {name}{R}")
    print()

    while True:
        choice = input("Enter your choice (1 or 2): ").strip()
        if choice == "1":
            return VALID_BRANCHES[0]
        if choice == "2":
            return VALID_BRANCHES[1]
        print(f"{RED}Invalid choice. Please enter 1 or 2.{R}")


def main() -> None:
    # Optional CLI argument: python recreate-branch.py development
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    target_branch = prompt_branch(arg)

    print(f"\n{GREEN}Selected branch: {target_branch}{R}\n")

    print(f"{YELLOW}This script will:{R}")
    print(f"{YELLOW}  1. Delete branch: {target_branch}{R}")
    print(f"{YELLOW}  2. Create branch: {target_branch} from {BASE_BRANCH}{R}")
    print(f"{YELLOW}  3. Process {len(REPOSITORIES)} repositories{R}")
    print()

    confirm = input("Continue? (yes/no): ").strip().lower()
    if confirm not in ("yes", "y"):
        print(f"{RED}Aborted.{R}")
        sys.exit(0)

    for repo in REPOSITORIES:
        repo_name = Path(repo).name
        print(f"\n{CYAN}========================================{R}")
        print(f"{CYAN}Processing: {repo_name}{R}")
        print(f"{CYAN}========================================{R}")

        if not Path(repo).exists():
            print(f"  {RED}[ERROR] Repository not found: {repo}{R}")
            continue

        try:
            # Fetch
            print(f"  {GRAY}Fetching latest changes...{R}")
            git(["fetch", "--all", "--prune"], cwd=repo)

            # Switch to base branch
            print(f"  {GRAY}Switching to {BASE_BRANCH}...{R}")
            git(["checkout", BASE_BRANCH], cwd=repo)

            # Pull
            print(f"  {GRAY}Pulling latest changes...{R}")
            git(["pull", "origin", BASE_BRANCH], cwd=repo)

            # Delete local branch if exists
            print(f"  {GRAY}Deleting branch: {target_branch}...{R}")
            local = git(["branch", "--list", target_branch], cwd=repo)
            if target_branch in local.stdout:
                git(["branch", "-D", target_branch], cwd=repo)
                print(f"    {GREEN}Local branch deleted{R}")
            else:
                print(f"    {YELLOW}Local branch not found{R}")

            # Delete remote branch if exists
            remote = git(["ls-remote", "--heads", "origin", target_branch], cwd=repo)
            if remote.stdout.strip():
                git(["push", "origin", "--delete", target_branch], cwd=repo)
                print(f"    {GREEN}Remote branch deleted{R}")
            else:
                print(f"    {YELLOW}Remote branch not found{R}")

            # Create new branch
            print(f"  {GRAY}Creating new branch: {target_branch}...{R}")
            git(["checkout", "-b", target_branch], cwd=repo)

            # Push
            print(f"  {GRAY}Pushing new branch to remote...{R}")
            git(["push", "-u", "origin", target_branch], cwd=repo)

            print(f"  {GREEN}[SUCCESS] {repo_name} completed{R}")

        except Exception as exc:
            print(f"  {RED}[ERROR] Failed: {exc}{R}")

    print(f"\n{CYAN}========================================{R}")
    print(f"{CYAN}All repositories processed!{R}")
    print(f"{CYAN}========================================{R}")


if __name__ == "__main__":
    main()
