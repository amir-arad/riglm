# Local Docker Development-to-Deployment Workflow for Windows 11

I understand better now - you want a development workflow where you can:
1. Develop your service
2. Build a new image when ready
3. Update your running service to use this new image
4. Have this change persist across restarts

Here's a comprehensive solution:

## Setup: Project Structure

```
project/
├── docker-compose.yml
├── deploy.bat
├── Dockerfile
└── src/
    └── (your application code)
```

## 1. Docker Compose Configuration

Create a `docker-compose.yml` that uses image tags:

```yaml
version: '3'
services:
  ghostwheels:
    image: local/ghostwheels:current
    # other configuration (ports, volumes, etc.)
    restart: always
```

## 2. Deployment Script

Create a `deploy.bat` script:

```batch
@echo off
SETLOCAL

SET VERSION=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
SET VERSION=%VERSION: =0%

ECHO Building new image with version: %VERSION%
docker build -t local/ghostwheels:%VERSION% -t local/ghostwheels:current .

ECHO Updating service...
docker-compose down
docker-compose up -d

ECHO Deployment complete! The service is now running with the latest build.
ECHO To view logs: docker-compose logs -f
```

## 3. Task Scheduler Setup

Set up a task in Windows Task Scheduler to run on startup:
- Action: Start a program
- Program: `cmd.exe`
- Arguments: `/c cd /d "C:\path\to\project" && docker-compose up -d`

## 4. IDE Integration

### VS Code
Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Deploy Service",
      "type": "shell",
      "command": "${workspaceFolder}/deploy.bat",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "Start Service",
      "type": "shell",
      "command": "cd ${workspaceFolder} && docker-compose up -d"
    },
    {
      "label": "Stop Service",
      "type": "shell",
      "command": "cd ${workspaceFolder} && docker-compose down"
    },
    {
      "label": "View Logs",
      "type": "shell",
      "command": "cd ${workspaceFolder} && docker-compose logs -f"
    }
  ]
}
```

### JetBrains IDEs
Create Run Configurations for:
- Deploy: `deploy.bat`
- Start: `docker-compose up -d`
- Stop: `docker-compose down`
- Logs: `docker-compose logs -f`

## How This Works

1. You develop your application
2. When ready to deploy, run the `deploy.bat` script or IDE task
3. The script builds a new image with two tags:
   - A timestamped version (for history/rollback)
   - The `:current` tag (which docker-compose uses)
4. Docker Compose automatically uses the latest `:current` image
5. This setup persists after system restarts

## Optional: Quick Rollback Feature

Add this to your `deploy.bat` to keep a history of the last 5 versions:

```batch
ECHO Keeping the last 5 versions...
FOR /F "tokens=*" %%i IN ('docker images local/ghostwheels --format "{{.Tag}}" ^| findstr /v "current" ^| sort /R') DO (
    SET /A COUNT+=1
    IF !COUNT! GTR 5 docker rmi local/ghostwheels:%%i
)
```

Would you like me to modify any part of this solution to better match your workflow?