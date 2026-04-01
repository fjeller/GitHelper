# Configuration: Define repositories in desired order
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

# Branch configuration
$sourceBranch = "features/add_rider_cache_to_gitignore"  # Branch to merge FROM
$targetBranch = "main"         # Branch to merge INTO

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Auto-Merge Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Source: $sourceBranch -> Target: $targetBranch" -ForegroundColor White
Write-Host "Repositories to process: $($repositories.Count)" -ForegroundColor White
Write-Host ""

# Phase 1: Check for merge conflicts in all repositories
Write-Host "Phase 1: Checking for merge conflicts..." -ForegroundColor Yellow
Write-Host ""

$conflictRepos = @()

foreach ($repo in $repositories) {
    $repoName = Split-Path $repo -Leaf
    Write-Host "  Checking: $repoName..." -ForegroundColor Gray
    
    if (-not (Test-Path $repo)) {
        Write-Host "    [ERROR] Repository not found: $repo" -ForegroundColor Red
        $conflictRepos += [PSCustomObject]@{
            Repository = $repoName
            Reason = "Repository path not found"
        }
        continue
    }
    
    Push-Location $repo
    
    try {
        # Fetch latest changes
        git fetch --all --prune 2>&1 | Out-Null
        
        # Checkout target branch
        git checkout $targetBranch 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "    [ERROR] Target branch '$targetBranch' not found" -ForegroundColor Red
            $conflictRepos += [PSCustomObject]@{
                Repository = $repoName
                Reason = "Target branch '$targetBranch' does not exist"
            }
            Pop-Location
            continue
        }
        
        # Pull latest changes
        git pull origin $targetBranch 2>&1 | Out-Null
        
        # Check if source branch exists
        $sourceBranchExists = git rev-parse --verify "origin/$sourceBranch" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "    [ERROR] Source branch '$sourceBranch' not found" -ForegroundColor Red
            $conflictRepos += [PSCustomObject]@{
                Repository = $repoName
                Reason = "Source branch '$sourceBranch' does not exist"
            }
            Pop-Location
            continue
        }
        
        # Attempt test merge (no commit, no fast-forward)
        $mergeOutput = git merge --no-commit --no-ff "origin/$sourceBranch" 2>&1
        
        # Check if already up-to-date
        if ($mergeOutput -match "Already up.to.date|Already up-to-date") {
            Write-Host "    [OK] Already up-to-date" -ForegroundColor Cyan
        } else {
            # Check for conflicts
            $conflictFiles = git diff --name-only --diff-filter=U 2>&1
            
            if ($conflictFiles) {
                Write-Host "    [CONFLICT] Merge conflicts detected" -ForegroundColor Red
                $conflictRepos += [PSCustomObject]@{
                    Repository = $repoName
                    Reason = "Merge conflicts in files: $($conflictFiles -join ', ')"
                }
            } else {
                Write-Host "    [OK] No conflicts" -ForegroundColor Green
            }
            
            # Abort the test merge
            git merge --abort 2>&1 | Out-Null
        }
        
    } catch {
        Write-Host "    [ERROR] Failed to check: $_" -ForegroundColor Red
        $conflictRepos += [PSCustomObject]@{
            Repository = $repoName
            Reason = "Error during conflict check: $_"
        }
    } finally {
        Pop-Location
    }
}

Write-Host ""

# If conflicts found, report and exit
if ($conflictRepos.Count -gt 0) {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "MERGE ABORTED - Conflicts Detected!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "The following repositories have issues:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($conflict in $conflictRepos) {
        Write-Host "  Repository: $($conflict.Repository)" -ForegroundColor White
        Write-Host "    Reason: $($conflict.Reason)" -ForegroundColor Red
        Write-Host ""
    }
    
    Write-Host "Please resolve conflicts manually before running this script again." -ForegroundColor Yellow
    exit 1
}

# Phase 2: Perform actual merges
Write-Host "========================================" -ForegroundColor Green
Write-Host "Phase 2: Performing merges..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($repo in $repositories) {
    $repoName = Split-Path $repo -Leaf
    Write-Host "Processing: $repoName" -ForegroundColor Cyan
    
    if (-not (Test-Path $repo)) {
        Write-Host "  [SKIPPED] Repository not found" -ForegroundColor Yellow
        $failCount++
        continue
    }
    
    Push-Location $repo
    
    try {
        # Fetch latest changes
        Write-Host "  Fetching latest changes..." -ForegroundColor Gray
        git fetch --all --prune
        
        # Checkout target branch
        Write-Host "  Checking out $targetBranch..." -ForegroundColor Gray
        git checkout $targetBranch
        
        # Pull latest changes
        Write-Host "  Pulling latest changes..." -ForegroundColor Gray
        git pull origin $targetBranch
        
        # Merge source branch
        Write-Host "  Merging $sourceBranch into $targetBranch..." -ForegroundColor Gray
        $mergeOutput = git merge "origin/$sourceBranch" --no-ff -m "Merge branch '$sourceBranch' into '$targetBranch'" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            # Check if already up-to-date
            if ($mergeOutput -match "Already up.to.date|Already up-to-date") {
                Write-Host "  [SUCCESS] Already up-to-date (nothing to merge)" -ForegroundColor Green
            } else {
                # Push changes
                Write-Host "  Pushing changes..." -ForegroundColor Gray
                git push origin $targetBranch
                Write-Host "  [SUCCESS] Merge completed and pushed" -ForegroundColor Green
            }
            $successCount++
        } else {
            Write-Host "  [ERROR] Merge failed" -ForegroundColor Red
            $failCount++
        }
        
    } catch {
        Write-Host "  [ERROR] Failed: $_" -ForegroundColor Red
        $failCount++
    } finally {
        Pop-Location
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Merge Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""
