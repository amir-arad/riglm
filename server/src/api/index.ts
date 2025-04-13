import { Router } from 'express';
import { authRoutes, meRoutes } from './auth';
import { entityRoutes } from './entities';
import { loginRoutes } from './login';

// Create router
const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/apps/:appId/entities/User/me', meRoutes);
router.use('/apps', entityRoutes);
router.use('/login', loginRoutes);

export default router;