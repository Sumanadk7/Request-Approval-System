# =========================================================
#  Register a Windows Scheduled Task that runs the request
#  deadline checker every 10 minutes.
#  Run once as Administrator:
#    powershell -ExecutionPolicy Bypass -File scripts\schedule_deadlines.ps1
#  Linux/Mac equivalent (cron, runs every 10 minutes):
#    */10 * * * * /path/to/backend/venv/bin/python /path/to/backend/manage.py check_deadlines
# =========================================================

$BackendDir = Split-Path -Parent $PSScriptRoot
$PythonExe = Join-Path $BackendDir "venv\Scripts\python.exe"
$TaskName = "RAS-Check-Deadlines"

if (-not (Test-Path $PythonExe)) {
    Write-Error "Python venv not found at $PythonExe. Create it first (see setup steps)."
    exit 1
}

$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "manage.py check_deadlines" `
    -WorkingDirectory $BackendDir

$Trigger = New-ScheduledTaskTrigger `
    -Once `
    -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Minutes 10)

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

$Existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Existing) {
    Set-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings | Out-Null
    Write-Output "Updated scheduled task '$TaskName' (every 10 minutes)."
} else {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings | Out-Null
    Write-Output "Registered scheduled task '$TaskName' (every 10 minutes)."
}

Write-Output "Run manually any time with: python manage.py check_deadlines"
