import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import path from "path";
import { Strategy as OAuth2Strategy } from "passport-oauth2";
import apiRoutes from "./api";
import { loginRoutes } from "./api/login";
import { env, connectToDatabase, setupDatabaseEventHandlers } from "./config";
import { notFoundHandler, errorHandler, configurePassport } from "./middleware";
import { logger, morganStream } from "./utils";
import { User, UserRole } from "./models";

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
    const clientBuildPath = path.join(__dirname, "../client-build");
    app.use(express.static(clientBuildPath));

    // Configure passport
    configurePassport("fake-server");
    app.use(passport.initialize());

    // Configure OAuth2 strategy
    if (env.oauth.clientId && env.oauth.clientSecret) {
      passport.use(
        new OAuth2Strategy(
          {
            authorizationURL: "https://oauth-provider.com/auth",
            tokenURL: "https://oauth-provider.com/token",
            clientID: env.oauth.clientId,
            clientSecret: env.oauth.clientSecret,
            callbackURL: env.oauth.callbackUrl,
            passReqToCallback: true, // Pass request to callback
          },
          async (
            req: express.Request,
            accessToken: string,
            refreshToken: string,
            profile: any,
            done: (error: any, user?: any) => void
          ) => {
            try {
              // Find or create user
              const UserModel = User as any; // Type assertion to avoid TypeScript errors
              let user = await UserModel.findOne({ email: profile.email });

              if (!user) {
                // Create new user
                user = await UserModel.create({
                  email: profile.email,
                  name: profile.name || profile.email,
                  role: UserRole.USER,
                });
              }

              // Update last login
              user.lastLogin = new Date();
              await user.save();

              return done(null, user);
            } catch (error) {
              return done(error);
            }
          }
        )
      );
    }

    // Mount login routes at root level
    app.use("/login", loginRoutes);

    // Mount API routes
    app.use("/api", apiRoutes);

    // For any other request, send the index.html file (for client-side routing)
    app.get("*", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(clientBuildPath, "index.html"));
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
