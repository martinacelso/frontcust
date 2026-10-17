import { defineConfig, transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";

// This plugin forces Vite to parse JSX inside .js files
const transformJsxInJs = () => ({
  name: "transform-jsx-in-js",
  enforce: "pre", // Runs before other plugins
  async transform(code, id) {
    if (!id.match(/.*\.js$/)) {
      return null;
    }
    return await transformWithOxc(code, id, {
      lang: "jsx",
    });
  },
});

export default defineConfig({
  server: { proxy: { "/api": { target: "http://127.0.0.1:5000", changeOrigin: true } } },
  optimizeDeps: {
    rolldownOptions: {
      moduleTypes: { ".js": "jsx" },
    },
  },
  plugins: [
    transformJsxInJs(), // Must be before react()
    react(),
  ],
});
