import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * Firebase keys are read from (first match wins):
 *   1. officer-web/.env            -> VITE_FIREBASE_*
 *   2. ../frontend/.env (mobile)   -> EXPO_PUBLIC_FIREBASE_*   (so no extra setup is needed)
 */
export default defineConfig(({ mode }) => {
  const own = loadEnv(mode, process.cwd(), ['VITE_', 'EXPO_PUBLIC_']);
  const mobile = loadEnv(mode, resolve(process.cwd(), '../frontend'), ['EXPO_PUBLIC_']);
  const pick = (k: string) => own[`VITE_FIREBASE_${k}`] || own[`EXPO_PUBLIC_FIREBASE_${k}`] || mobile[`EXPO_PUBLIC_FIREBASE_${k}`] || '';

  return {
    plugins: [react()],
    server: { port: 5173, open: true },
    define: {
      __FIREBASE_CONFIG__: JSON.stringify({
        apiKey: pick('API_KEY'),
        authDomain: pick('AUTH_DOMAIN'),
        projectId: pick('PROJECT_ID'),
        storageBucket: pick('STORAGE_BUCKET'),
        messagingSenderId: pick('MESSAGING_SENDER_ID'),
        appId: pick('APP_ID'),
      }),
    },
    build: { chunkSizeWarningLimit: 1500 },
  };
});
