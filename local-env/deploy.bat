@echo off
SETLOCAL

REM Change to project root directory (parent of where this file is running from) regardless of where script is called from
ECHO Changing directory to project root (%~dp0\..)
IF NOT EXIST "%~dp0\.." (
    ECHO ERROR: Project root directory not found.
    GOTO :EOF
)
cd /d %~dp0\..

REM Define a version based on timestamp (YYYYMMDD-HHMMSS)
FOR /F "tokens=1-4 delims=/ " %%i IN ('date /t') DO (SET D=%%l%%k%%j)
SET T=%time:~0,2%%time:~3,2%%time:~6,2%
SET T=%T: =0%
SET VERSION=%D%-%T%

ECHO.
ECHO ========================================================================
ECHO Deploying MyService - Version: %VERSION%
ECHO ========================================================================

ECHO.
ECHO Step 1: Building development/base image (ghostwheels-dev:latest)...
docker build -t ghostwheels-dev:latest -f server/Dockerfile server
IF ERRORLEVEL 1 (
    ECHO Docker build for ghostwheels-dev FAILED.
    GOTO :EOF
)
ECHO Development/base image built successfully.

ECHO.
ECHO Step 2: Building local deployment image (local/ghostwheels:%VERSION% and local/ghostwheels:current)...
docker build --build-arg DEV_IMAGE_TAG=latest -t local/ghostwheels:%VERSION% -t local/ghostwheels:current -f local-env/Dockerfile .
IF ERRORLEVEL 1 (
    ECHO Docker build for local/ghostwheels FAILED.
    GOTO :EOF
)
ECHO Local deployment image built successfully.

ECHO.
ECHO Step 3: Updating service using Docker Compose...
ECHO    Stopping existing services (if any) from local-env/docker-compose.yml...
docker-compose -f local-env/docker-compose.yml down
ECHO    Starting services from local-env/docker-compose.yml...
docker-compose -f local-env/docker-compose.yml up -d
IF ERRORLEVEL 1 (
    ECHO Docker Compose up FAILED.
    GOTO :EOF
)

ECHO.
ECHO ========================================================================
ECHO Deployment complete for local/ghostwheels:%VERSION% (also tagged as local/ghostwheels:current)
ECHO ========================================================================
ECHO.
ECHO To view logs, run:
ECHO   docker-compose -f local-env/docker-compose.yml logs -f
ECHO.

ENDLOCAL