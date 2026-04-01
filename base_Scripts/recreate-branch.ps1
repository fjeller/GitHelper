param(
    [ValidateSet("development", "test")]
    [string]$TargetBranch
)

# Prompt for branch selection if not provided as parameter
if (-not $TargetBranch) {
    Write-Host "Select branch to recreate:" -ForegroundColor Cyan
    Write-Host "  1. development" -ForegroundColor White
    Write-Host "  2. test" -ForegroundColor White
    Write-Host ""
    
    do {
        $selection = Read-Host "Enter your choice (1 or 2)"
        switch ($selection) {
            "1" { $TargetBranch = "development"; break }
            "2" { $TargetBranch = "test"; break }
            default { 
                Write-Host "Invalid choice. Please enter 1 or 2." -ForegroundColor Red
                $selection = $null
            }
        }
    } while (-not $selection)
}

Write-Host "`nSelected branch: $TargetBranch" -ForegroundColor Green
Write-Host ""

# Configuration: Define repositories in desired order
$repositories = @(
    "C:\__dev\__tracto\myTRACTO-Common"
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

# Parameters
$branchToDelete = $TargetBranch
$baseBranch = "main"  # or "master"
$newBranch = $TargetBranch

# Confirmation
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Delete branch: $branchToDelete" -ForegroundColor Yellow
Write-Host "  2. Create branch: $newBranch from $baseBranch" -ForegroundColor Yellow
Write-Host "  3. Process $($repositories.Count) repositories" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes" -and $confirmation -ne "y") {
    Write-Host "Aborted." -ForegroundColor Red
    exit
}

# Process each repository
foreach ($repo in $repositories) {
    $repoName = Split-Path $repo -Leaf
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Processing: $repoName" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    if (-not (Test-Path $repo)) {
        Write-Host "  [ERROR] Repository not found: $repo" -ForegroundColor Red
        continue
    }
    
    Push-Location $repo
    
    try {
        # Fetch latest changes
        Write-Host "  Fetching latest changes..." -ForegroundColor Gray
        git fetch --all --prune
        
        # Switch to base branch
        Write-Host "  Switching to $baseBranch..." -ForegroundColor Gray
        git checkout $baseBranch
        
        # Pull latest changes
        Write-Host "  Pulling latest changes..." -ForegroundColor Gray
        git pull origin $baseBranch
        
        # Delete the old branch (local and remote)
        Write-Host "  Deleting branch: $branchToDelete..." -ForegroundColor Gray
        
        # Delete local branch if exists
        $localBranchExists = git branch --list $branchToDelete
        if ($localBranchExists) {
            git branch -D $branchToDelete
            Write-Host "    Local branch deleted" -ForegroundColor Green
        } else {
            Write-Host "    Local branch not found" -ForegroundColor Yellow
        }
        
        # Delete remote branch if exists
        $remoteBranchExists = git ls-remote --heads origin $branchToDelete
        if ($remoteBranchExists) {
            git push origin --delete $branchToDelete
            Write-Host "    Remote branch deleted" -ForegroundColor Green
        } else {
            Write-Host "    Remote branch not found" -ForegroundColor Yellow
        }
        
        # Create new branch
        Write-Host "  Creating new branch: $newBranch..." -ForegroundColor Gray
        git checkout -b $newBranch
        
        # Push new branch to remote
        Write-Host "  Pushing new branch to remote..." -ForegroundColor Gray
        git push -u origin $newBranch
        
        Write-Host "  [SUCCESS] $repoName completed" -ForegroundColor Green
        
    } catch {
        Write-Host "  [ERROR] Failed: $_" -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "All repositories processed!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan