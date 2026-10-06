import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import os from "os";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Nur lokal (npm run dev): /__simulation.json liefert ~/Vergleichswerte/simulation.json,
// damit /dashboard?sim eine echte Teilnahme als eigene Werte zeigen kann. Die Datei liegt
// ausserhalb des Repositorys und gelangt nie in den Build. Antwortet nur auf Anfragen vom
// eigenen Rechner, weil der Dev-Server auch im Netz erreichbar ist (host "::"), und nur mit
// lokalem Host-Header: Die Route laeuft vor Vites eigener Host-Pruefung, ohne diese Sperre
// koennte eine fremde Seite per DNS-Rebinding oder ein lokaler Tunnel die Datei abholen.
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const simulation = (): Plugin => ({
  name: "simulation",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__simulation.json", (req, res) => {
      const file = path.join(os.homedir(), "Vergleichswerte", "simulation.json");
      const host = (req.headers.host || "").toLowerCase().replace(/:\d+$/, "");
      if (!LOOPBACK.has(req.socket.remoteAddress || "") || !LOCAL_HOSTS.has(host) || !fs.existsSync(file)) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(fs.readFileSync(file));
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), simulation(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
