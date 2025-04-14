import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import apiRoutes from "./api";
import { connectToDatabase, env, setupDatabaseEventHandlers } from "./config";
import { errorHandler, notFoundHandler } from "./middleware";
import { logger, morganStream } from "./utils";

// Create Express app
const app = express();

// Connect to database
connectToDatabase()
  .then(() => {
    // Set up database event handlers
    setupDatabaseEventHandlers();

    // Configure middleware
    app.use(helmet());
    app.use(
      cors({
        origin: env.cors.origin,
        credentials: true,
      })
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(morgan("combined", { stream: morganStream }));

    // Serve static files from the client build
    app.use(express.static(env.clientBuildPath));

    // Mount API routes
    app.use("/api", apiRoutes);

    // For any other request, send the index.html file (for client-side routing)
    app.get("*", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(env.clientBuildPath, "index.html"));
    });

    // Handle 404 errors
    app.use(notFoundHandler);

    // Handle errors
    app.use(errorHandler);

    // Start server
    const server = app.listen(env.port, () => {
      logger.info(`Server running on http://localhost:${env.port}`);
    });

    // Handle unhandled rejections
    process.on("unhandledRejection", (error) => {
      logger.error("Unhandled rejection", { error });
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", { error });
      server.close(() => {
        process.exit(1);
      });
    });
  })
  .catch((error) => {
    logger.error("Failed to start server", { error });
    process.exit(1);
  });
