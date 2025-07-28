// vite.config.ts
import { defineConfig } from "file:///C:/Users/bandujar/Projectes%20adeptify/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/bandujar/Projectes%20adeptify/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\bandujar\\Projectes adeptify\\client";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 3e3,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  build: {
    outDir: "../dist/client",
    sourcemap: false,
    // Deshabilitar sourcemaps en producción
    emptyOutDir: true,
    // Limpiar el directorio de salida
    rollupOptions: {
      output: {
        // Configuración más simple para evitar problemas con chunks
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks: void 0
        // Deshabilitar manualChunks para evitar problemas
      },
      external: []
      // Asegurar que FullCalendar no se marque como externo
    },
    // Configuraciones adicionales para Docker
    target: "es2015",
    minify: "esbuild",
    chunkSizeWarningLimit: 1e3
  },
  define: {
    "process.env": {},
    // Definir variables de entorno para el cliente
    __PROD__: JSON.stringify(process.env.NODE_ENV === "production"),
    __DEV__: JSON.stringify(process.env.NODE_ENV === "development")
  },
  // Configuración para evitar problemas en Docker
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "wouter",
      "@tanstack/react-query",
      "sonner",
      "@fullcalendar/react",
      "@fullcalendar/daygrid",
      "@fullcalendar/timegrid",
      "@fullcalendar/interaction",
      "@fullcalendar/core"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxiYW5kdWphclxcXFxQcm9qZWN0ZXMgYWRlcHRpZnlcXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxiYW5kdWphclxcXFxQcm9qZWN0ZXMgYWRlcHRpZnlcXFxcY2xpZW50XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9iYW5kdWphci9Qcm9qZWN0ZXMlMjBhZGVwdGlmeS9jbGllbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMScsXHJcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgY29uZmlndXJlOiAocHJveHksIF9vcHRpb25zKSA9PiB7XHJcbiAgICAgICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyLCBfcmVxLCBfcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdwcm94eSBlcnJvcicsIGVycik7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCBfcmVzKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFJlcXVlc3QgdG8gdGhlIFRhcmdldDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzLCByZXEsIF9yZXMpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFJlc3BvbnNlIGZyb20gdGhlIFRhcmdldDonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIG91dERpcjogJy4uL2Rpc3QvY2xpZW50JyxcclxuICAgIHNvdXJjZW1hcDogZmFsc2UsIC8vIERlc2hhYmlsaXRhciBzb3VyY2VtYXBzIGVuIHByb2R1Y2NpXHUwMEYzblxyXG4gICAgZW1wdHlPdXREaXI6IHRydWUsIC8vIExpbXBpYXIgZWwgZGlyZWN0b3JpbyBkZSBzYWxpZGFcclxuICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgLy8gQ29uZmlndXJhY2lcdTAwRjNuIG1cdTAwRTFzIHNpbXBsZSBwYXJhIGV2aXRhciBwcm9ibGVtYXMgY29uIGNodW5rc1xyXG4gICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxyXG4gICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxyXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uW2V4dF0nLFxyXG4gICAgICAgIG1hbnVhbENodW5rczogdW5kZWZpbmVkLCAvLyBEZXNoYWJpbGl0YXIgbWFudWFsQ2h1bmtzIHBhcmEgZXZpdGFyIHByb2JsZW1hc1xyXG4gICAgICB9LFxyXG4gICAgICBleHRlcm5hbDogW10sIC8vIEFzZWd1cmFyIHF1ZSBGdWxsQ2FsZW5kYXIgbm8gc2UgbWFycXVlIGNvbW8gZXh0ZXJub1xyXG4gICAgfSxcclxuICAgIC8vIENvbmZpZ3VyYWNpb25lcyBhZGljaW9uYWxlcyBwYXJhIERvY2tlclxyXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcclxuICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxyXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxyXG4gIH0sXHJcbiAgZGVmaW5lOiB7XHJcbiAgICAncHJvY2Vzcy5lbnYnOiB7fSxcclxuICAgIC8vIERlZmluaXIgdmFyaWFibGVzIGRlIGVudG9ybm8gcGFyYSBlbCBjbGllbnRlXHJcbiAgICBfX1BST0RfXzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyksXHJcbiAgICBfX0RFVl9fOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyksXHJcbiAgfSxcclxuICAvLyBDb25maWd1cmFjaVx1MDBGM24gcGFyYSBldml0YXIgcHJvYmxlbWFzIGVuIERvY2tlclxyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogW1xyXG4gICAgICAncmVhY3QnLCBcclxuICAgICAgJ3JlYWN0LWRvbScsIFxyXG4gICAgICAnd291dGVyJywgXHJcbiAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLCBcclxuICAgICAgJ3Nvbm5lcicsXHJcbiAgICAgICdAZnVsbGNhbGVuZGFyL3JlYWN0JyxcclxuICAgICAgJ0BmdWxsY2FsZW5kYXIvZGF5Z3JpZCcsXHJcbiAgICAgICdAZnVsbGNhbGVuZGFyL3RpbWVncmlkJyxcclxuICAgICAgJ0BmdWxsY2FsZW5kYXIvaW50ZXJhY3Rpb24nLFxyXG4gICAgICAnQGZ1bGxjYWxlbmRhci9jb3JlJ1xyXG4gICAgXVxyXG4gIH1cclxufSk7ICJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1QsU0FBUyxvQkFBb0I7QUFDNVYsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUt6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLFFBQ1IsV0FBVyxDQUFDLE9BQU8sYUFBYTtBQUM5QixnQkFBTSxHQUFHLFNBQVMsQ0FBQyxLQUFLLE1BQU0sU0FBUztBQUNyQyxvQkFBUSxJQUFJLGVBQWUsR0FBRztBQUFBLFVBQ2hDLENBQUM7QUFDRCxnQkFBTSxHQUFHLFlBQVksQ0FBQyxVQUFVLEtBQUssU0FBUztBQUM1QyxvQkFBUSxJQUFJLGtDQUFrQyxJQUFJLFFBQVEsSUFBSSxHQUFHO0FBQUEsVUFDbkUsQ0FBQztBQUNELGdCQUFNLEdBQUcsWUFBWSxDQUFDLFVBQVUsS0FBSyxTQUFTO0FBQzVDLG9CQUFRLElBQUksc0NBQXNDLFNBQVMsWUFBWSxJQUFJLEdBQUc7QUFBQSxVQUNoRixDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBO0FBQUEsSUFDWCxhQUFhO0FBQUE7QUFBQSxJQUNiLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQTtBQUFBLFFBRU4sZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsZ0JBQWdCO0FBQUEsUUFDaEIsY0FBYztBQUFBO0FBQUEsTUFDaEI7QUFBQSxNQUNBLFVBQVUsQ0FBQztBQUFBO0FBQUEsSUFDYjtBQUFBO0FBQUEsSUFFQSxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUix1QkFBdUI7QUFBQSxFQUN6QjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sZUFBZSxDQUFDO0FBQUE7QUFBQSxJQUVoQixVQUFVLEtBQUssVUFBVSxRQUFRLElBQUksYUFBYSxZQUFZO0FBQUEsSUFDOUQsU0FBUyxLQUFLLFVBQVUsUUFBUSxJQUFJLGFBQWEsYUFBYTtBQUFBLEVBQ2hFO0FBQUE7QUFBQSxFQUVBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
