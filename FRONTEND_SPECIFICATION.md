# Product Specification: Gemini Extension Manager UI

## 1. Overview

This document outlines the requirements for a simple desktop graphical user interface (GUI) to manage the Gemini AI Extension Manager server. The application will provide a straightforward way for users to view, create, edit, and delete the server's configuration. It will be bundled with the server into a single executable, so no authentication or complex security measures are required.

The primary goal is **simplicity** and **clarity**. The UI should be intuitive and directly map to the concepts in the server's configuration file.

## 2. Core Concepts

The server's configuration is based on three main entities:

*   **Servers:** These are connections to individual AI/tool providers. A server can be:
    *   **Local:** Runs a command-line tool on the user's machine.
    *   **Remote:** Connects to a remote endpoint via a URL.
*   **Endpoints:** These are aggregated groups of one or more **Servers**. An endpoint exposes a single, unified interface to a client application (like a chatbot or an IDE extension), which can then access all the tools from the servers in that endpoint.
*   **Filters:** These are string patterns used to include or exclude specific tools from being exposed. Filters can be applied globally, to a specific server, or to a specific endpoint.

## 3. Tech Stack

The application should be built using a modern, simple, and popular web frontend stack.

*   **Framework:** **React** (using Vite for project setup).
*   **Language:** **JavaScript** (ES6+). TypeScript is optional but recommended if the generator is proficient.
*   **Styling:** A simple component library like **shadcn/ui** or **MUI**, or a CSS framework like **Tailwind CSS** or **Bootstrap**. The default styling should be clean, modern, and have a dark mode.
*   **State Management:** Use simple React hooks (`useState`, `useContext`, `useReducer`). No complex state management libraries like Redux are needed.
*   **API Communication:** Use the built-in `fetch` API to communicate with the server's backend REST API.

## 4. API Layer

The frontend will communicate with the Gemini server over a local REST API. The server must expose the following endpoints.

*   `GET /api/status`: Returns the server's status.
    *   Response: `{ "status": "running" | "stopped" | "error", "message"?: "string" }`
*   `GET /api/config`: Retrieves the entire current configuration.
    *   Response: A JSON object matching the structure defined by `ConfigSchema` (see Appendix).
*   `PUT /api/config`: Updates the entire configuration.
    *   Request Body: A JSON object matching the `ConfigSchema`.
    *   Response: `200 OK` or an error object.
*   `POST /api/server/start`: Starts the server.
*   `POST /api/server/stop`: Stops the server.
*   `GET /api/logs`: Returns recent server logs.
    *   Response: `{ "logs": ["log line 1", "log line 2", ...] }`
*   `GET /api/logs/stream`: (Optional, for advanced implementation) A Server-Sent Events (SSE) endpoint to stream logs in real-time.

## 5. UI Layout and Pages

The application should have a simple, sidebar-based navigation layout.

*   **Main Layout:**
    *   A fixed sidebar on the left with navigation links.
    *   A main content area on the right that displays the selected page.
    *   A header or footer area displaying the main server status (e.g., a green "Running" indicator or a red "Stopped" indicator) and Start/Stop buttons.

*   **Navigation Links / Pages:**
    1.  **Dashboard / Status:** The default page.
    2.  **Servers:** Manages server configurations.
    3.  **Endpoints:** Manages endpoint configurations.
    4.  **Global Settings:** Manages global filters and other settings.
    5.  **Logs:** Displays server logs.

---

### 5.1. Dashboard Page

*   **Purpose:** Provide a quick overview of the system's status.
*   **Components:**
    *   A large status indicator showing if the main server is "Running" or "Stopped".
    *   Quick summary cards:
        *   "Total Servers": A number showing the count of configured servers.
        *   "Total Endpoints": A number showing the count of configured endpoints.
    *   A small, real-time log viewer showing the last 5-10 log messages.

### 5.2. Servers Page

*   **Purpose:** CRUD management for Server configurations.
*   **Components:**
    *   A button: "**+ Add Server**".
    *   A list/table of all existing servers. Each item in the list should show:
        *   Server Name (e.g., `my_local_cli`)
        *   Server Type ("Local" or "Remote")
        *   A short description.
        *   Edit and Delete buttons.
    *   Clicking "**+ Add Server**" or "Edit" should open a modal dialog or a dedicated sub-page with a form.

*   **"Add/Edit Server" Form:**
    *   The form should first ask to select the **Server Type**: "Local" or "Remote".
    *   Based on the selection, the following fields appear:
        *   **Common Fields:**
            *   `Name`: Text input. Must be a valid identifier (`[a-zA-Z_][a-zA-Z0-9_]*`).
            *   `Description`: Text area (optional).
            *   `Filters`: A tag-like input where the user can add or remove string filter patterns (e.g., `allow:*`, `deny:secret_tool`).
        *   **Local Server Fields:**
            *   `Command`: Text input (e.g., `python`).
            *   `Args`: A tag-like input for command-line arguments (e.g., `-u`, `my_script.py`).
            *   `Environment Variables`: A key-value editor to add environment variables.
        *   **Remote Server Fields:**
            *   `URL`: Text input for the server URL.
            *   `Headers`: A key-value editor to add HTTP headers.
    *   The form should have "Save" and "Cancel" buttons.

### 5.3. Endpoints Page

*   **Purpose:** CRUD management for Endpoint configurations.
*   **Components:**
    *   A button: "**+ Add Endpoint**".
    *   A list/table of existing endpoints. Each item should show:
        *   Endpoint Name.
        *   The names of the servers it includes.
        *   Edit and Delete buttons.
    *   Clicking "**+ Add Endpoint**" or "Edit" opens a form.

*   **"Add/Edit Endpoint" Form:**
    *   `Name`: Text input. Must be a valid identifier.
    *   `Description`: Text area (optional).
    *   `Servers`: A multi-select checklist showing all available servers by name. The user can check which servers to include in this endpoint.
    *   `Filters`: A tag-like input for endpoint-specific filters.
    *   `API Key`: A text input, hidden by default. A "show" button can reveal it. (Optional, can be auto-generated by the server).
    *   The form should have "Save" and "Cancel" buttons.

### 5.4. Global Settings Page

*   **Purpose:** Manage global configuration that doesn't fit into Servers or Endpoints.
*   **Components:**
    *   **Global Filters:** A tag-like input for managing the root-level list of filter patterns.
    *   A "Save Settings" button.

### 5.5. Logs Page

*   **Purpose:** Display detailed server logs for debugging.
*   **Components:**
    *   A text area or a virtualized list view showing the full log output from the server.
    *   A "Clear Logs" button.
    *   A "Refresh" button to fetch the latest logs.
    *   (Optional) A toggle to enable/disable real-time log streaming.

## 6. Appendix: Zod Schemas for Reference

This section provides the data structures that the frontend will need to work with. These are defined in the server using Zod.

```typescript
// Identifier pattern: starts with letter/underscore, alphanumeric + underscore
const IdentifierSchema = z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/);

// Filter patterns for tool filtering
const FiltersSchema = z.array(z.string());

// Local MCP server configuration
const LocalServerConfigSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

// Remote MCP server configuration
const RemoteServerConfigSchema = z.object({
  url: z.string().min(1),
  headers: z.record(z.string()).optional(),
  description: z.string().optional(),
  filters: FiltersSchema.optional(),
});

// Union of server types
const ServerConfigSchema = z.union([
  LocalServerConfigSchema,
  RemoteServerConfigSchema,
]);

// Endpoint configuration
const EndpointConfigSchema = z.object({
  description: z.string().optional(),
  servers: z.array(z.string()).min(1),
  filters: FiltersSchema.optional(),
  apiKey: z.string().optional(),
});

// Root application configuration
const ConfigSchema = z.object({
  servers: z.record(IdentifierSchema, ServerConfigSchema),
  endpoints: z.record(IdentifierSchema, EndpointConfigSchema),
  filters: FiltersSchema.optional(),
});
```
