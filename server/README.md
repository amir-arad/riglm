# Base44 Server

A RESTful server implementation for the Base44 API, designed to work with the Base44 SDK.

## Features

- RESTful API endpoints matching the SDK contract
- Single Sign-On (SSO) login flow
- Dynamic entity management
- TypeScript for type safety
- Express.js for HTTP server
- Multiple database options:
  - In-memory database for development and testing
  - SQLite database for persistent storage

## Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env file with your configuration
```

## Development

```bash
# Start development server
npm run dev
```

## Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Entities

- `GET /api/apps/:appId/entities/:entityName` - Get all entities
- `GET /api/apps/:appId/entities/:entityName?q={}` - Filter entities
- `GET /api/apps/:appId/entities/:entityName/:id` - Get entity by ID
- `POST /api/apps/:appId/entities/:entityName` - Create entity
- `PUT /api/apps/:appId/entities/:entityName/:id` - Update entity
- `DELETE /api/apps/:appId/entities/:entityName/:id` - Delete entity
- `DELETE /api/apps/:appId/entities/:entityName` - Delete multiple entities
- `POST /api/apps/:appId/entities/:entityName/bulk` - Create multiple entities
- `POST /api/apps/:appId/entities/:entityName/import` - Import entities from file

## Database Options

This server supports multiple database implementations:

### In-Memory Database

The in-memory database is a lightweight, self-contained solution designed for development and testing purposes.

Key features:

- MongoDB-compatible API
- No external dependencies
- Dynamic entity management
- Query capabilities (filtering, sorting, pagination)

### SQLite Database

The SQLite database provides persistent storage while maintaining the same API as the in-memory database.

Key features:

- MongoDB-compatible API
- Persistent storage
- Embedded database (no separate server required)
- Dynamic entity management
- Query capabilities (filtering, sorting, pagination)

To switch between database implementations, set the `DB_TYPE` environment variable to either `in-memory` or `sqlite`.

## Environment Variables

| Variable                 | Description                  | Default                                     |
| ------------------------ | ---------------------------- | ------------------------------------------- |
| PORT                     | Server port                  | 3000                                        |
| NODE_ENV                 | Environment                  | development                                 |
| DB_TYPE                  | Database type                | in-memory                                   |
| SQLITE_DB_PATH           | SQLite database path         | ./data/database.sqlite                      |
| JWT_SECRET               | JWT secret key               | default_jwt_secret_key_change_in_production |
| JWT_EXPIRES_IN           | JWT expiration time          | 1d                                          |
| LOG_LEVEL                | Logging level                | info                                        |
| CORS_ORIGIN              | CORS origin                  | *                                           |
| ALLOWED_REDIRECT_DOMAINS | Allowed domains for redirect | localhost:5173                              |

## Project Structure

```cli
server/
├── src/
│   ├── api/                  # API endpoints
│   │   ├── entities/         # Entity endpoints
│   ├── config/               # Configuration
│   ├── database/             # Database implementations
│   │   ├── common/           # Common database interfaces
│   │   ├── in-memory/        # In-memory database
│   │   └── sqlite/           # SQLite database
│   ├── middleware/           # Middleware
│   ├── models/               # Data models
│   ├── services/             # Business logic
│   ├── utils/                # Utility functions
│   └── index.ts              # Entry point
├── dist/                     # Compiled output
├── docs/                     # Documentation
├── .env.example              # Example environment variables
├── .gitignore                # Git ignore file
├── package.json              # Package configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation
```
