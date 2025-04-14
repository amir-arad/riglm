import { Router } from "express";
import { entityRoutes } from "./entities";

// Create router
const router = Router();

// Mount routes
router.use("/apps", entityRoutes);

export default router;
