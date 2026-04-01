param(
    [string]$BranchName
)

# Configuration: Define repositories
$repositories = @(
    "C:\__dev\__tracto\myTRACTO-Common",
    "c:\__dev\__tracto\myTRACTO-Common_Backend",
    "c:\__dev\__tracto\myTRACTO-UI_Shared",
    "c:\__dev\__tracto\myTRACTO-TranslationService",
    "c:\__dev\__tracto\myTRACTO-UserService",
    "c:\__dev\__tracto\myTRACTO-CompanyService",
    "c:\__dev\__tracto\myTRACTO-LicenseService",
    "c:\__dev\__tracto\myTRACTO-HelpService",
    "c:\__dev\__tracto\myTRACTO-NewsService",
    "c:\__dev\__tracto\myTRACTO-AppService",
    "c:\__dev\__tracto\myTRACTO-AdminApp",
    "c:\__dev\__tracto\myTRACTO-UI"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Create New Branch Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for branch name if not provided
if (-not $BranchName) {
    $BranchName = Read-Host "Enter the name of the new branch"
}

if (-not $BranchName) {
    Write-Host "[ERROR] No branch name provided. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "Branch to create : $BranchName" -ForegroundColor White
Write-Host "Based on         : main" -ForegroundColor White
Write-Host "Repositories     : $($repositories.Count)" -ForegroundColor White
Write-Host ""

# -------------------------------------------------------
# PRE-FLIGHT CHECK: verify the branch does not yet exist
# -------------------------------------------------------
Write-Host "----------------------------------------" -ForegroundColor DarkCyan
Write-Host "Pre-flight check: scanning all repositories..." -ForegroundColor DarkCyan
Write-Host "----------------------------------------" -ForegroundColor DarkCyan

$conflictFound = $false

foreach ($repo in $repositories) {
    $repoName = Split-Path $repo -Leaf

    if (-not (Test-Path $repo)) {
        Write-Host "  [SKIP] $repoName — path not found locally" -ForegroundColor DarkYellow
        continue
    }

    Push-Location $repo
    try {
        git fetch --all --prune 2>&1 | Out-Null

        $localExists  = git branch --list $BranchName 2>&1
        $remoteExists = git branch -r --list "origin/$BranchName" 2>&1

        if ($localExists -match [regex]::Escape($BranchName)) {
            Write-Host "  [CONFLICT] $repoName — branch already exists locally" -ForegroundColor Red
            $conflictFound = $true
        } elseif ($remoteExists -match [regex]::Escape($BranchName)) {
            Write-Host "  [CONFLICT] $repoName — branch already exists on remote" -ForegroundColor Red
            $conflictFound = $true
        } else {
            Write-Host "  [OK]  $repoName — branch does not exist" -ForegroundColor Green
        }
    } finally {
        Pop-Location
    }
}

Write-Host ""

if ($conflictFound) {
    Write-Host "[ERROR] Branch '$BranchName' already exists in one or more repositories. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "Pre-flight check passed. Ready to create branch '$BranchName' from main." -ForegroundColor Green
Write-Host ""

# -------------------------------------------------------
# CONFIRMATION
# -------------------------------------------------------
$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes" -and $confirmation -ne "y") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 0
}

Write-Host ""

# -------------------------------------------------------
# CREATE BRANCH IN ALL REPOSITORIES
# -------------------------------------------------------
$results = @()

foreach ($repo in $repositories) {
    $repoName = Split-Path $repo -Leaf
    Write-Host "----------------------------------------" -ForegroundColor DarkCyan
    Write-Host "Processing: $repoName" -ForegroundColor Cyan

    if (-not (Test-Path $repo)) {
        Write-Host "  [SKIP] Path not found locally" -ForegroundColor DarkYellow
        $results += [PSCustomObject]@{ Repository = $repoName; Result = "skipped (not found)" }
        continue
    }

    Push-Location $repo
    try {
        # Ensure we are on main and up to date
        Write-Host "  Checking out main and pulling latest..." -ForegroundColor Gray
        git checkout main 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] Could not checkout main" -ForegroundColor Red
            $results += [PSCustomObject]@{ Repository = $repoName; Result = "failed (checkout main)" }
            continue
        }

        git pull origin main 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] Could not pull main" -ForegroundColor Red
            $results += [PSCustomObject]@{ Repository = $repoName; Result = "failed (pull main)" }
            continue
        }

        # Create the new branch
        Write-Host "  Creating branch '$BranchName'..." -ForegroundColor Gray
        git checkout -b $BranchName 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] Could not create branch" -ForegroundColor Red
            $results += [PSCustomObject]@{ Repository = $repoName; Result = "failed (create branch)" }
            continue
        }

        # Push to remote
        Write-Host "  Pushing to remote..." -ForegroundColor Gray
        git push -u origin $BranchName 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [FAIL] Could not push branch to remote" -ForegroundColor Red
            $results += [PSCustomObject]@{ Repository = $repoName; Result = "failed (push)" }
            continue
        }

        Write-Host "  [OK]  Branch created and pushed" -ForegroundColor Green
        $results += [PSCustomObject]@{ Repository = $repoName; Result = "created" }
    } finally {
        Pop-Location
    }
}

# -------------------------------------------------------
# SUMMARY
# -------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize
