// Use mock SDK for Docker build
import { createClient, getAccessToken } from 'b44-sdk';

// Create a client with authentication required
export const appSdk = createClient({
    appId: '67f92d8d8df675b48c5f25b2',
    requiresAuth: false,
    auth: getAccessToken,
    serverUrl: 'http://localhost:3000',
});
