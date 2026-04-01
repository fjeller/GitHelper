param(
    [string]$TagName,
    [string]$BaseBranch
)

# Configuration: Define repositories in desired order
$repositories = @(
    "C:\__dev\__tracto\myTRACTO-Common"
    "c:\__dev\__tracto\myTRACTO-Common_Backend",
    "c:\__dev\__tracto\myTRACTO-UI_Shared",
    "c:\__dev\__tracto\myTRACTO-TranslationService",
    # "c:\__dev\__tracto\myTRACTO-UserService",
    # "c:\__dev\__tracto\myTRACTO-CompanyService",
    "c:\__dev\__tracto\myTRACTO-LicenseService",
    # "c:\__dev\__tracto\myTRACTO-HelpService",
    # "c:\__dev\__tracto\myTRACTO-NewsService",
    # "c:\__dev\__tracto\myTRACTO-AppService",
    "c:\__dev\__tracto\myTRACTO-AdminApp"
    # "c:\__dev\__tracto\myTRACTO-UI"
)

# Tag configuration
$defaultTagName = "1.8.5"  # Default tag name
$TagName = if ($TagName) { $TagName } else { $defaultTagName }

# Branch configuration
$defaultBaseBranch = "Releases/v1.8"  # Default base branch to create tags from
$baseBranch = if ($BaseBranch) { $BaseBranch } else { $defaultBaseBranch }

$tagMessage = "Tagged for release $TagName"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tag-All Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tag name    : $TagName" -ForegroundColor White
Write-Host "Base branch : $baseBranch" -ForegroundColor White
Write-Host "Message     : $tagMessage" -ForegroundColor White
Write-Host "Repositories: $($repositories.Count)" -ForegroundColor White
foreach ($repo in $repositories) {
    Write-Host "  - $(Split-Path $repo -Leaf)" -ForegroundColor White
}
Write-Host ""

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes" -and $confirmation -ne "y") {
    Write-Host "Aborted." -ForegroundColor Red
    exit
}

# Track results
$successRepos = @()
$failedRepos  = @()

# Process each repository
foreach ($repo in $repositories) {
    $repoName = Split-Path $repo -Leaf
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Processing: $repoName" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    if (-not (Test-Path $repo)) {
        Write-Host "  [ERROR] Repository not found: $repo" -ForegroundColor Red
        $failedRepos += [PSCustomObject]@{ Repository = $repoName; Reason = "Repository path not found" }
        continue
    }

    Push-Location $repo

    try {
        # Fetch latest changes
        Write-Host "  Fetching latest changes..." -ForegroundColor Gray
        git fetch --all --prune

        # Verify base branch exists on remote
        $remoteBranchExists = git rev-parse --verify "origin/$baseBranch"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [ERROR] Base branch 'origin/$baseBranch' not found" -ForegroundColor Red
            $failedRepos += [PSCustomObject]@{ Repository = $repoName; Reason = "Base branch 'origin/$baseBranch' does not exist" }
            Pop-Location
            continue
        }

        # Check if tag already exists
        $existingTag = git tag --list $TagName
        if ($existingTag) {
            Write-Host "  [ERROR] Tag '$TagName' already exists" -ForegroundColor Red
            $failedRepos += [PSCustomObject]@{ Repository = $repoName; Reason = "Tag '$TagName' already exists" }
            Pop-Location
            continue
        }

        # Create annotated tag from the tip of the remote base branch
        Write-Host "  Creating tag '$TagName' from 'origin/$baseBranch'..." -ForegroundColor Gray
        git tag -a $TagName "origin/$baseBranch" -m $tagMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [ERROR] Failed to create tag" -ForegroundColor Red
            $failedRepos += [PSCustomObject]@{ Repository = $repoName; Reason = "Failed to create tag" }
            Pop-Location
            continue
        }

        # Push tag to remote
        Write-Host "  Pushing tag to remote..." -ForegroundColor Gray
        git push origin $TagName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  [ERROR] Failed to push tag" -ForegroundColor Red
            $failedRepos += [PSCustomObject]@{ Repository = $repoName; Reason = "Failed to push tag to remote" }
            Pop-Location
            continue
        }

        Write-Host "  [OK] Tag '$TagName' created and pushed successfully" -ForegroundColor Green
        $successRepos += $repoName
    }
    catch {
        Write-Host "  [ERROR] Unexpected error: $_" -ForegroundColor Red
        $failedRepos += [PSCustomObject]@{ Repository = $repoName; Reason = $_.ToString() }
    }
    finally {
        Pop-Location
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Successful : $($successRepos.Count)" -ForegroundColor Green
Write-Host "Failed     : $($failedRepos.Count)" -ForegroundColor $(if ($failedRepos.Count -gt 0) { "Red" } else { "Green" })

if ($failedRepos.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed repositories:" -ForegroundColor Red
    $failedRepos | ForEach-Object {
        Write-Host "  - $($_.Repository): $($_.Reason)" -ForegroundColor Red
    }
}
