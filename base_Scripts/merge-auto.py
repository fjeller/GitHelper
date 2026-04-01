#!/usr/bin/env python3
"""
Auto-merge a source branch into a target branch across multiple repositories.
Phase 1 checks all repos for conflicts first; only proceeds to Phase 2 if clean.
Update SOURCE_BRANCH, TARGET_BRANCH, and REPOSITORIES below before running.
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

SOURCE_BRANCH = "features/add_rider_cache_to_gitignore"  # Branch to merge FROM
TARGET_BRANCH = "main"                                    # Branch to merge INTO

# ----------------------------------------------------------------------------

def git(args: list[str], cwd: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
    )


def main() -> None:
    print(f"{CYAN}========================================{R}")
    print(f"{CYAN}Auto-Merge Script{R}")
    print(f"{CYAN}========================================{R}")
    print(f"{WHITE}Source: {SOURCE_BRANCH} -> Target: {TARGET_BRANCH}{R}")
    print(f"{WHITE}Repositories to process: {len(REPOSITORIES)}{R}")
    print()

    # -------------------------------------------------------------------------
    # Phase 1 – conflict check
    # -------------------------------------------------------------------------
    print(f"{YELLOW}Phase 1: Checking for merge conflicts...{R}")
    print()

    conflict_repos: list[dict] = []

    for repo in REPOSITORIES:
        repo_name = Path(repo).name
        print(f"  {GRAY}Checking: {repo_name}...{R}")

        if not Path(repo).exists():
            print(f"    {RED}[ERROR] Repository not found: {repo}{R}")
            conflict_repos.append({"Repository": repo_name, "Reason": "Repository path not found"})
            continue

        git(["fetch", "--all", "--prune"], cwd=repo)

        # Checkout target branch
        r = git(["checkout", TARGET_BRANCH], cwd=repo)
        if r.returncode != 0:
            print(f"    {RED}[ERROR] Target branch '{TARGET_BRANCH}' not found{R}")
            conflict_repos.append({"Repository": repo_name, "Reason": f"Target branch '{TARGET_BRANCH}' does not exist"})
            continue

        git(["pull", "origin", TARGET_BRANCH], cwd=repo)

        # Check source branch exists on remote
        r = git(["rev-parse", "--verify", f"origin/{SOURCE_BRANCH}"], cwd=repo)
        if r.returncode != 0:
            print(f"    {RED}[ERROR] Source branch '{SOURCE_BRANCH}' not found{R}")
            conflict_repos.append({"Repository": repo_name, "Reason": f"Source branch '{SOURCE_BRANCH}' does not exist"})
            continue

        # Test merge (no commit, no fast-forward)
        merge_out = git(["merge", "--no-commit", "--no-ff", f"origin/{SOURCE_BRANCH}"], cwd=repo)
        combined = (merge_out.stdout + merge_out.stderr).lower()

        if "already up to date" in combined or "already up-to-date" in combined:
            print(f"    {CYAN}[OK] Already up-to-date{R}")
        else:
            conflict_files = git(["diff", "--name-only", "--diff-filter=U"], cwd=repo).stdout.strip()
            if conflict_files:
                print(f"    {RED}[CONFLICT] Merge conflicts detected{R}")
                conflict_repos.append({"Repository": repo_name, "Reason": f"Merge conflicts in: {conflict_files.replace(chr(10), ', ')}"})
            else:
                print(f"    {GREEN}[OK] No conflicts{R}")
            git(["merge", "--abort"], cwd=repo)

    print()

    if conflict_repos:
        print(f"{RED}========================================{R}")
        print(f"{RED}MERGE ABORTED - Conflicts Detected!{R}")
        print(f"{RED}========================================{R}")
        print()
        print(f"{YELLOW}The following repositories have issues:{R}")
        print()
        for c in conflict_repos:
            print(f"  {WHITE}Repository: {c['Repository']}{R}")
            print(f"    {RED}Reason: {c['Reason']}{R}")
            print()
        print(f"{YELLOW}Please resolve conflicts manually before running this script again.{R}")
        sys.exit(1)

    # -------------------------------------------------------------------------
    # Phase 2 – perform merges
    # -------------------------------------------------------------------------
    print(f"{GREEN}========================================{R}")
    print(f"{GREEN}Phase 2: Performing merges...{R}")
    print(f"{GREEN}========================================{R}")
    print()

    success_count = 0
    fail_count = 0

    for repo in REPOSITORIES:
        repo_name = Path(repo).name
        print(f"{CYAN}Processing: {repo_name}{R}")

        if not Path(repo).exists():
            print(f"  {YELLOW}[SKIPPED] Repository not found{R}")
            fail_count += 1
            continue

        # Fetch
        print(f"  {GRAY}Fetching latest changes...{R}")
        git(["fetch", "--all", "--prune"], cwd=repo)

        # Checkout target
        print(f"  {GRAY}Checking out {TARGET_BRANCH}...{R}")
        git(["checkout", TARGET_BRANCH], cwd=repo)

        # Pull
        print(f"  {GRAY}Pulling latest changes...{R}")
        git(["pull", "origin", TARGET_BRANCH], cwd=repo)

        # Merge
        print(f"  {GRAY}Merging {SOURCE_BRANCH} into {TARGET_BRANCH}...{R}")
        merge = git(
            ["merge", f"origin/{SOURCE_BRANCH}", "--no-ff",
             "-m", f"Merge branch '{SOURCE_BRANCH}' into '{TARGET_BRANCH}'"],
            cwd=repo,
        )
        combined = (merge.stdout + merge.stderr).lower()

        if merge.returncode == 0:
            if "already up to date" in combined or "already up-to-date" in combined:
                print(f"  {GREEN}[SUCCESS] Already up-to-date (nothing to merge){R}")
            else:
                print(f"  {GRAY}Pushing changes...{R}")
                git(["push", "origin", TARGET_BRANCH], cwd=repo)
                print(f"  {GREEN}[SUCCESS] Merge completed and pushed{R}")
            success_count += 1
        else:
            print(f"  {RED}[ERROR] Merge failed{R}")
            fail_count += 1

        print()

    # Summary
    print(f"{CYAN}========================================{R}")
    print(f"{CYAN}Merge Complete!{R}")
    print(f"{CYAN}========================================{R}")
    print(f"{GREEN}Successful: {success_count}{R}")
    fail_color = RED if fail_count > 0 else GREEN
    print(f"{fail_color}Failed:     {fail_count}{R}")
    print()


if __name__ == "__main__":
    main()
