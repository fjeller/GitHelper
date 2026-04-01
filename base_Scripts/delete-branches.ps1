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

# Branch to delete
$branchName = "feature_main_licenseservice"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Delete Branch Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Branch to delete: $branchName" -ForegroundColor White
Write-Host "Repositories to process: $($repositories.Count)" -ForegroundColor White
Write-Host ""

$results = @()

foreach ($repo in $repositories) {
    $repoName = Split-Path $repo -Leaf
    Write-Host "Processing: $repoName" -ForegroundColor Yellow

    if (-not (Test-Path $repo)) {
        Write-Host "  [SKIP] Repository path not found: $repo" -ForegroundColor DarkYellow
        $results += [PSCustomObject]@{ Repository = $repoName; Local = "skipped"; Remote = "skipped" }
        continue
    }

    Push-Location $repo

    try {
        # Fetch and prune to get up-to-date remote info
        git fetch --all --prune 2>&1 | Out-Null

        # --- Delete local branch ---
        $localBranches = git branch --list $branchName 2>&1
        if ($localBranches -match $branchName.Replace("/", "\/")) {
            # Make sure we are not on the branch we want to delete
            $currentBranch = git rev-parse --abbrev-ref HEAD 2>&1
            if ($currentBranch -eq $branchName) {
                git checkout main 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    git checkout develop 2>&1 | Out-Null
                }
            }

            git branch -D $branchName 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK]   Local branch deleted" -ForegroundColor Green
                $localResult = "deleted"
            } else {
                Write-Host "  [FAIL] Could not delete local branch" -ForegroundColor Red
                $localResult = "failed"
            }
        } else {
            Write-Host "  [--]   Local branch does not exist, skipping" -ForegroundColor Gray
            $localResult = "not found"
        }

        # --- Delete remote branch ---
        $remoteBranches = git branch -r --list "origin/$branchName" 2>&1
        if ($remoteBranches -match $branchName.Replace("/", "\/")) {
            git push origin --delete $branchName 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK]   Remote branch deleted" -ForegroundColor Green
                $remoteResult = "deleted"
            } else {
                Write-Host "  [FAIL] Could not delete remote branch" -ForegroundColor Red
                $remoteResult = "failed"
            }
        } else {
            Write-Host "  [--]   Remote branch does not exist, skipping" -ForegroundColor Gray
            $remoteResult = "not found"
        }

        $results += [PSCustomObject]@{ Repository = $repoName; Local = $localResult; Remote = $remoteResult }
    }
    finally {
        Pop-Location
    }

    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$results | Format-Table -AutoSize
