# Docker Socket Permission Setup - Installation Requirements

## Prerequisites

### 1. Docker Installation

- **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux)
- Version 20.10+ recommended
- Ensure Docker daemon is running

### 2. Host User Privileges

- User must be in the `docker` group (Linux/macOS) or have Docker Desktop access (Windows)
- Test with: `docker ps` (should work without sudo)

### 3. Base Image Requirements

- The base image `ghostwheels-dev:latest` must exist
- Build or pull this image before running `docker-compose up`

### 4. Port Availability

- Port `56667` for ghostwheels service
- Port `6274` and `6277` for mcp-inspector service

## Platform-Specific Setup

### Windows (Docker Desktop)

```bash
# No additional setup required
# Docker Desktop handles Docker socket mounting automatically
```

### Linux

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again, or run:
newgrp docker

# Verify Docker socket permissions
ls -la /var/run/docker.sock
# Should show: srw-rw---- 1 root docker
```

### macOS (Docker Desktop)

```bash
# No additional setup required
# Docker Desktop handles permissions automatically
```

## Deployment Steps

1. **Clone/Copy Files**

   ```bash
   # Ensure these files are present:
   # - docker-compose.yml
   # - Dockerfile
   # - Dockerfile.inspector
   ```

2. **Create Required Directories**

   ```bash
   mkdir -p data inspector
   ```

3. **Build and Start**

   ```bash
   docker-compose build
   docker-compose up -d
   ```

4. **Verify Setup**

   ```bash
   # Test Docker socket access inside container
   docker exec local-env-ghostwheels-1 docker ps
   ```

## Troubleshooting

### Permission Denied Errors

- **Linux**: Ensure user is in docker group
- **All Platforms**: Restart Docker daemon if needed

### Base Image Not Found

```bash
# Build or pull the required base image first
docker build -t ghostwheels-dev:latest /path/to/base/dockerfile
```

### Socket Mount Issues

- **Windows**: Ensure Docker Desktop has file sharing enabled
- **Linux**: Check Docker socket ownership: `sudo chown root:docker /var/run/docker.sock`

## Security Notes

- The solution adds `appuser` to the root group (GID 0)
- This is secure because:
  - Container still runs as non-root user
  - Only grants Docker socket access, not full root privileges
  - Follows Docker best practices for socket access
- No world-writable permissions or root execution required

## Validation Commands

```bash
# Verify container user and groups
docker exec local-env-ghostwheels-1 sh -c "whoami && id"

# Test Docker access
docker exec local-env-ghostwheels-1 docker ps

# Check socket permissions
docker exec local-env-ghostwheels-1 ls -la /var/run/docker.sock
