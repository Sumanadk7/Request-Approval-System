@echo off
setlocal enabledelayedexpansion
REM =========================================================
REM  Request Approval System - Database + Media Backup (Windows)
REM  Usage: scripts\backup.bat
REM  Reads connection settings from environment variables
REM  (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
REM  or falls back to the local development defaults.
REM  Restore with:
REM    psql -U %DB_USER% -h %DB_HOST% -d %DB_NAME% -f ^<backup.sql^>
REM =========================================================

if "%DB_NAME%"=="" set DB_NAME=requestapproval_db
if "%DB_USER%"=="" set DB_USER=postgres
if "%DB_PASSWORD%"=="" set DB_PASSWORD=12345
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432

set BACKUP_DIR=%~dp0..\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "delims=" %%x in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set STAMP=%%x

set BACKUP_FILE=%BACKUP_DIR%\requestapproval_db_!STAMP!.sql

set PGPASSWORD=%DB_PASSWORD%
pg_dump -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f "!BACKUP_FILE!"
set PGDUMP_EXIT=!ERRORLEVEL!
set PGPASSWORD=

if !PGDUMP_EXIT! neq 0 (
    echo BACKUP FAILED with exit code !PGDUMP_EXIT!
    exit /b !PGDUMP_EXIT!
)

echo Database backup written to !BACKUP_FILE!

if exist "%~dp0..\media" (
    set MEDIA_BACKUP=%BACKUP_DIR%\media_!STAMP!
    mkdir "!MEDIA_BACKUP!" 2>nul
    xcopy "%~dp0..\media" "!MEDIA_BACKUP!\" /E /I /Y >nul
    echo Media files copied to !MEDIA_BACKUP!
)

echo BACKUP COMPLETE
