# local-env/Dockerfile
# This Dockerfile is for creating a local deployment environment
# that inherits from the development image.

# Define a build argument for the development image tag.
# This allows you to specify which version of the -dev image to use.
# It defaults to 'latest' if not provided during the build.
ARG DEV_IMAGE_TAG=latest

# Use the image built from server/Dockerfile as the base.
# 'ghostwheels-dev' is a placeholder for the tag you assign to the image
# built from 'server/Dockerfile'. Ensure this matches the actual tag used.
FROM ghostwheels-dev:${DEV_IMAGE_TAG}

# --- Local Environment Overrides & Additions ---
# This section is where you can add configurations or tools specific
# to your local deployment environment without modifying the base -dev image.
#
# Examples:
#
# Copy local-specific configuration files:
# COPY ./local-env/my-local-config.json /app/config/local-settings.json
#
# Install additional tools useful for local debugging:
# USER root # Switch to root if necessary for installations
# RUN apt-get update && apt-get install -y vim curl
# USER your_app_user # Switch back to the application user if applicable
#
# Set environment variables specific to the local setup:
# ENV MY_LOCAL_VARIABLE="some_value_for_local_only"

# Add appuser to root group to access Docker socket
USER root
RUN addgroup appuser root
USER appuser

# For now, it can remain minimal, just inheriting the base image.
# The primary application code is already included from the base image.
