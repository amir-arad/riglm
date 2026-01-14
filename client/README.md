# Extension Manager Web UI

React-based dashboard for the Personal AI Extension Manager.

> **Status:** Placeholder - Backend API integration planned for Phase 4

## Quick Start

```bash
bun install
bun run dev    # Vite dev server at http://localhost:8080
```

## Commands

```bash
bun run dev      # Development server
bun run build    # Production build
bun run preview  # Preview production build
bun run lint     # ESLint
```

## Structure

```
src/
├── pages/           # Dashboard, Servers, Endpoints, Monitoring, Settings
├── components/
│   ├── ui/          # shadcn/ui components
│   ├── dashboard/   # Dashboard-specific components
│   ├── servers/     # Server form components
│   └── endpoints/   # Endpoint form components
├── hooks/           # React hooks
└── api/             # API client (Phase 4)
```

## Tech Stack

- **React 18** with Vite
- **Tailwind CSS** for styling
- **shadcn/ui** component library (50+ components)
- **React Router** for navigation
- **React Hook Form** for forms
- **Recharts** for data visualization
