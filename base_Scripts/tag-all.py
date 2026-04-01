#!/usr/bin/env python3
"""
Create an annotated tag on a base branch and push it across multiple repositories.
Update DEFAULT_TAG_NAME, DEFAULT_BASE_BRANCH, and REPOSITORIES below before running.
On macOS/Linux, update the repository paths accordingly.

Usage:
    python tag-all.py                          # uses defaults
    python tag-all.py --tag 1.9.0              # custom tag
    python tag-all.py --tag 1.9.0 --branch Releases/v1.9
"""

import argparse
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
    # r"C:\__dev\__tracto\myTRACTO-UserService",
    # r"C:\__dev\__tracto\myTRACTO-CompanyService",
    r"C:\__dev\__tracto\myTRACTO-LicenseService",
    # r"C:\__dev\__tracto\myTRACTO-HelpService",
    # r"C:\__dev\__tracto\myTRACTO-NewsService",
    # r"C:\__dev\__tracto\myTRACTO-AppService",
    r"C:\__dev\__tracto\myTRACTO-AdminApp",
    # r"C:\__dev\__tracto\myTRACTO-UI",
]

DEFAULT_TAG_NAME    = "1.8.5"
DEFAULT_BASE_BRANCH = "Releases/v1.8"

# ----------------------------------------------------------------------------

def git(args: list[str], cwd: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Tag all repositories")
    parser.add_argument("--tag",    default=DEFAULT_TAG_NAME,    help="Tag name to create")
    parser.add_argument("--branch", default=DEFAULT_BASE_BRANCH, help="Base branch to tag from")
    args = parser.parse_args()

    tag_name    = args.tag
    base_branch = args.branch
    tag_message = f"Tagged for release {tag_name}"

    print(f"{CYAN}========================================{R}")
    print(f"{CYAN}Tag-All Script{R}")
    print(f"{CYAN}========================================{R}")
    print(f"{WHITE}Tag name    : {tag_name}{R}")
    print(f"{WHITE}Base branch : {base_branch}{R}")
    print(f"{WHITE}Message     : {tag_message}{R}")
    print(f"{WHITE}Repositories: {len(REPOSITORIES)}{R}")
    for repo in REPOSITORIES:
        print(f"  {WHITE}- {Path(repo).name}{R}")
    print()

    confirm = input("Continue? (yes/no): ").strip().lower()
    if confirm not in ("yes", "y"):
        print(f"{RED}Aborted.{R}")
        sys.exit(0)

    success_repos: list[str] = []
    failed_repos:  list[dict] = []

    for repo in REPOSITORIES:
        repo_name = Path(repo).name
        print()
        print(f"{CYAN}========================================{R}")
        print(f"{CYAN}Processing: {repo_name}{R}")
        print(f"{CYAN}========================================{R}")

        if not Path(repo).exists():
            print(f"  {RED}[ERROR] Repository not found: {repo}{R}")
            failed_repos.append({"Repository": repo_name, "Reason": "Repository path not found"})
            continue

        try:
            # Fetch
            print(f"  {GRAY}Fetching latest changes...{R}")
            git(["fetch", "--all", "--prune"], cwd=repo)

            # Verify base branch exists on remote
            r = git(["rev-parse", "--verify", f"origin/{base_branch}"], cwd=repo)
            if r.returncode != 0:
                print(f"  {RED}[ERROR] Base branch 'origin/{base_branch}' not found{R}")
                failed_repos.append({"Repository": repo_name, "Reason": f"Base branch 'origin/{base_branch}' does not exist"})
                continue

            # Check if tag already exists
            existing = git(["tag", "--list", tag_name], cwd=repo)
            if existing.stdout.strip():
                print(f"  {RED}[ERROR] Tag '{tag_name}' already exists{R}")
                failed_repos.append({"Repository": repo_name, "Reason": f"Tag '{tag_name}' already exists"})
                continue

            # Create annotated tag from tip of remote base branch
            print(f"  {GRAY}Creating tag '{tag_name}' from 'origin/{base_branch}'...{R}")
            r = git(["tag", "-a", tag_name, f"origin/{base_branch}", "-m", tag_message], cwd=repo)
            if r.returncode != 0:
                print(f"  {RED}[ERROR] Failed to create tag{R}")
                failed_repos.append({"Repository": repo_name, "Reason": "Failed to create tag"})
                continue

            # Push tag
            print(f"  {GRAY}Pushing tag to remote...{R}")
            r = git(["push", "origin", tag_name], cwd=repo)
            if r.returncode != 0:
                print(f"  {RED}[ERROR] Failed to push tag{R}")
                failed_repos.append({"Repository": repo_name, "Reason": "Failed to push tag to remote"})
                continue

            print(f"  {GREEN}[OK] Tag '{tag_name}' created and pushed successfully{R}")
            success_repos.append(repo_name)

        except Exception as exc:
            print(f"  {RED}[ERROR] Unexpected error: {exc}{R}")
            failed_repos.append({"Repository": repo_name, "Reason": str(exc)})

    # Summary
    print()
    print(f"{CYAN}========================================{R}")
    print(f"{CYAN}Summary{R}")
    print(f"{CYAN}========================================{R}")
    print(f"{GREEN}Successful : {len(success_repos)}{R}")
    fail_color = RED if failed_repos else GREEN
    print(f"{fail_color}Failed     : {len(failed_repos)}{R}")

    if failed_repos:
        print()
        print(f"{RED}Failed repositories:{R}")
        for f in failed_repos:
            print(f"  {RED}- {f['Repository']}: {f['Reason']}{R}")


if __name__ == "__main__":
    main()
