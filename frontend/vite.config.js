import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = (
    env.VITE_BACKEND_URL ||
    env.VITE_API_BASE_URL ||
    "http://127.0.0.1:5000"
  )
    .trim()
    .replace(/\/+$/, "");

  return {
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
    server: {
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
        },
        "/socket.io": {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
