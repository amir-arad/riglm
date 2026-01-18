# RigLM - An AI Extension Manager

## Project Overview

RigLM is a TypeScript-based MCP (Model Context Protocol) router server. It acts as a unified platform that routes multiple MCP servers through a single endpoint. This allows users to define their LLM extensions in one place and connect from any MCP-compatible client. The project includes a command-line interface (CLI) for starting the server, validating the configuration, and initializing a new configuration file. It also provides a web UI for monitoring and management.

The project is built with Bun and uses Express to create the server. It has a clear hexagonal architecture, with a separation of concerns between the domain logic, application services, and adapters for external technologies like HTTP and storage.

## Building and Running

### Prerequisites

*   Bun 1.x or higher

### Installation

Build a single executable with embedded web client:

```bash
bun install
bun run build:standalone
```

This creates a standalone executable at `dist/riglm`.

### Running the Server

To start the server, use the `serve` command (which is the default):

```bash
# Start the server with the default configuration
riglm serve

# Or simply
riglm
```

The server will start on port 3000 by default, and the web UI will be available at `http://localhost:3000`.

### Development

To run the server in development mode with hot reload:

```bash
bun run dev
```

### Testing

To run the test suite:

```bash
bun test
```

To run the end-to-end tests:

```bash
bun run test:e2e
```

## Development Conventions

### Code Style

The project uses ESLint for linting and Prettier for code formatting. You can run the linter with `bun run lint` and format the code with `bun run format`.

### Testing

The project has both unit tests and end-to-end tests. Unit tests are located in the `test` directory and are run with the Bun test runner. End-to-end tests are located in the `e2e-ui` directory and are run with Playwright.

### Architecture

The project follows a hexagonal architecture, which separates the core business logic from the outside world. The main components of the architecture are:

*   **`src/domain`**: Contains the pure business logic of the application.
*   **`src/application`**: Contains the application services that orchestrate the business logic.
*   **`src/ports`**: Defines the interfaces for the adapters.
*   **`src/adapters`**: Contains the concrete implementations of the adapters for external technologies like HTTP, logging, and storage.
*   **`src/cli`**: The command-line interface.
*   **`src/server.ts`**: The Express server.
*   **`src/index.ts`**: The entry point of the application.
