import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({
      vercel: {
        edgeServer: true,
      },
    }),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
