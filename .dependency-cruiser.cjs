/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ============================================
    // PORTS LAYER - Can import domain types only
    // ============================================
    {
      name: "ports-no-application",
      comment: "Ports layer cannot import from application layer",
      severity: "error",
      from: { path: "^src/ports" },
      to: { path: "^src/application" }
    },
    {
      name: "ports-no-adapters",
      comment: "Ports layer cannot import from adapters layer",
      severity: "error",
      from: { path: "^src/ports" },
      to: { path: "^src/adapters" }
    },
    {
      name: "ports-no-cli",
      comment: "Ports layer cannot import from CLI",
      severity: "error",
      from: { path: "^src/ports" },
      to: { path: "^src/cli" }
    },
    {
      name: "ports-no-crosscutting",
      comment: "Ports layer cannot import from cross-cutting modules",
      severity: "error",
      from: { path: "^src/ports" },
      to: { path: "^src/(etc|host-gateway|extension-manager)" }
    },

    // ============================================
    // DOMAIN LAYER - Pure business logic
    // ============================================
    {
      name: "domain-no-adapters",
      comment: "Domain layer cannot import from adapters (infrastructure)",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/adapters" }
    },
    {
      name: "domain-no-application",
      comment: "Domain layer cannot import from application (use cases)",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/application" }
    },
    {
      name: "domain-no-cli",
      comment: "Domain layer cannot import from CLI",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/cli" }
    },
    {
      name: "domain-no-crosscutting",
      comment: "Domain layer cannot import from cross-cutting concerns",
      severity: "error",
      from: { path: "^src/domain" },
      to: { path: "^src/(host-gateway|extension-manager|etc)" }
    },

    // ============================================
    // APPLICATION LAYER - Use cases
    // ============================================
    {
      name: "application-no-adapters",
      comment: "Application layer cannot import from adapters directly",
      severity: "error",
      from: { path: "^src/application" },
      to: { path: "^src/adapters" }
    },
    {
      name: "application-no-cli",
      comment: "Application layer cannot import from CLI",
      severity: "error",
      from: { path: "^src/application" },
      to: { path: "^src/cli" }
    },

    // ============================================
    // GENERAL RULES
    // ============================================
    {
      name: "no-circular",
      comment: "No circular dependencies allowed",
      severity: "error",
      from: {},
      to: { circular: true }
    },
    {
      name: "no-orphans",
      comment: "No orphan modules (unused files)",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts|json)$", // config files
          "\\.d\\.ts$",                             // type definitions
          "(^|/)tsconfig\\.json$",
          "^src/index\\.ts$"                        // entrypoint
        ]
      },
      to: {}
    },
    {
      name: "no-deprecated-core",
      comment: "Don't use deprecated Node.js core modules",
      severity: "warn",
      from: {},
      to: { dependencyTypes: ["core"], path: "^(punycode|domain|constants|sys|_linklist|_stream_wrap)$" }
    },
    {
      name: "no-non-package-json",
      comment: "Don't import packages not in package.json",
      severity: "error",
      from: {},
      to: {
        dependencyTypes: ["npm-no-pkg", "npm-unknown"]
      }
    }
  ],

  options: {
    doNotFollow: {
      path: "node_modules"
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json"
    },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"]
    },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/(@[^/]+/[^/]+|[^/]+)",
        theme: {
          graph: {
            splines: "ortho",
            rankdir: "TB",
            fontname: "Helvetica",
            fontsize: "12"
          },
          node: {
            fontname: "Helvetica",
            fontsize: "10"
          },
          edge: {
            fontname: "Helvetica",
            fontsize: "8"
          },
          modules: [
            // Ports - Blue (interfaces)
            {
              criteria: { source: "^src/ports" },
              attributes: { fillcolor: "#e3f2fd", style: "filled" }
            },
            // Domain - Green (business logic)
            {
              criteria: { source: "^src/domain" },
              attributes: { fillcolor: "#e8f5e9", style: "filled" }
            },
            // Application - Yellow (use cases)
            {
              criteria: { source: "^src/application" },
              attributes: { fillcolor: "#fff9c4", style: "filled" }
            },
            // Adapters - Orange (infrastructure)
            {
              criteria: { source: "^src/adapters" },
              attributes: { fillcolor: "#ffe0b2", style: "filled" }
            },
            // CLI - Purple (entrypoint)
            {
              criteria: { source: "^src/cli" },
              attributes: { fillcolor: "#f3e5f5", style: "filled" }
            },
            // Cross-cutting - Gray
            {
              criteria: { source: "^src/(etc|host-gateway|extension-manager)" },
              attributes: { fillcolor: "#f5f5f5", style: "filled" }
            },
            // Server & Index - Red (composition root)
            {
              criteria: { source: "^src/(server|index)\\.ts$" },
              attributes: { fillcolor: "#ffebee", style: "filled" }
            }
          ],
          dependencies: [
            // Violations in red
            {
              criteria: { valid: false },
              attributes: { color: "#e53935", fontcolor: "#e53935", style: "bold" }
            },
            // Circular in red dashed
            {
              criteria: { circular: true },
              attributes: { color: "#e53935", style: "dashed" }
            }
          ]
        }
      },
      archi: {
        collapsePattern: "^src/([^/]+)",
        theme: {
          graph: {
            splines: "ortho",
            rankdir: "TB"
          },
          modules: [
            { criteria: { source: "^src/ports" }, attributes: { fillcolor: "#e3f2fd", style: "filled" } },
            { criteria: { source: "^src/domain" }, attributes: { fillcolor: "#e8f5e9", style: "filled" } },
            { criteria: { source: "^src/application" }, attributes: { fillcolor: "#fff9c4", style: "filled" } },
            { criteria: { source: "^src/adapters" }, attributes: { fillcolor: "#ffe0b2", style: "filled" } },
            { criteria: { source: "^src/cli" }, attributes: { fillcolor: "#f3e5f5", style: "filled" } }
          ]
        }
      }
    }
  }
};
