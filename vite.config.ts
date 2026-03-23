import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
          exportType: "named",
          namedExport: "ReactComponent",
        },
      }),
    ],

    resolve: {
      alias: {
        "@": resolve(process.cwd(), "./src"),
      },
    },

    server: {
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: env.VITE_API_BASE_URL?.startsWith("https"),
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.log("❌ Proxy error:", err);
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log(
                "➡️ Proxy Request:",
                req.method,
                req.url,
                "→",
                env.VITE_API_BASE_URL
              );
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log(
                "⬅️ Proxy Response:",
                proxyRes.statusCode,
                req.url
              );
            });
          },
        },
      },
    },
  };
});



