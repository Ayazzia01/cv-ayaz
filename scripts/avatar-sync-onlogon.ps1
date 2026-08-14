# avatar-sync-onlogon.ps1
# Runs on user logon. Checks if it's been >7 days since the last LinkedIn
# avatar sync. If yes, runs `npm run sync:avatar` (headed browser, uses
# your saved LinkedIn session). If the laptop was off for a year, this
# runs once when you log back in.
#
# Registered as a Windows Task Scheduler task on user logon.

$ErrorActionPreference = 'Stop'
$ROOT = 'C:\Users\ayazz\Desktop\Coding\cv-ayaz'
$STAMP_FILE = Join-Path $ROOT '.avatar-sync-last-run'
$INTERVAL_DAYS = 7

# Check if we need to run
$shouldRun = $true
if (Test-Path $STAMP_FILE) {
    $lastRun = Get-Content $STAMP_FILE -Raw | ForEach-Object { $_.Trim() }
    try {
        $lastDate = [datetime]::Parse($lastRun)
        $daysSince = ((Get-Date) - $lastDate).Days
        if ($daysSince -lt $INTERVAL_DAYS) {
            $shouldRun = $false
            Write-Output "[avatar-sync] Last run was $daysSince days ago (< $INTERVAL_DAYS). Skipping."
        } else {
            Write-Output "[avatar-sync] Last run was $daysSince days ago. Sync needed."
        }
    } catch {
        Write-Output "[avatar-sync] Could not parse last-run timestamp. Running sync."
    }
} else {
    Write-Output "[avatar-sync] No previous run recorded. Running sync."
}

if (-not $shouldRun) { exit 0 }

# Run the sync
Write-Output "[avatar-sync] Running npm run sync:avatar..."
try {
    Push-Location $ROOT
    $result = & npm run sync:avatar 2>&1
    Write-Output $result

    # Check if sync succeeded (script exits 0 on success or "no changes")
    if ($LASTEXITCODE -eq 0) {
        (Get-Date).ToString('o') | Out-File -FilePath $STAMP_FILE -Encoding utf8 -NoNewline
        Write-Output "[avatar-sync] Success. Timestamp updated."
    } else {
        Write-Output "[avatar-sync] Script exited with code $LASTEXITCODE. Timestamp NOT updated (will retry next logon)."
    }
    Pop-Location
} catch {
    Write-Output "[avatar-sync] Error: $_"
    Write-Output "[avatar-sync] Timestamp NOT updated (will retry next logon)."
}