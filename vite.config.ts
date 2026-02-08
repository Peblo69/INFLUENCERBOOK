import react from "@vitejs/plugin-react";
import tailwind from "tailwindcss";
import { defineConfig } from "vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Optimize react imports
      jsxRuntime: 'automatic',
    })
  ],
  publicDir: "public",
  base: "./",
  css: {
    postcss: {
      plugins: [tailwind()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // Optimize chunk size and loading
    target: 'esnext',
    modulePreload: {
      polyfill: false, // Modern browsers don't need polyfill
    },
    rollupOptions: {
      output: {
        // Better code splitting
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Lottie is huge — isolate it
            if (id.includes("lottie-web") || id.includes("lottie-react")) {
              return "vendor-lottie";
            }
            // Markdown renderer — only needed by chat pages
            if (
              id.includes("react-markdown") ||
              id.includes("remark-") ||
              id.includes("rehype-") ||
              id.includes("micromark") ||
              id.includes("mdast") ||
              id.includes("unist") ||
              id.includes("hast")
            ) {
              return "vendor-markdown";
            }
            // Supabase SDK
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            // React core — cached separately
            if (
              id.includes("react-dom") ||
              (id.includes("/react/") && !id.includes("react-"))
            ) {
              return "vendor-react";
            }
            // Three.js - heavy 3D library
            if (id.includes("three") || id.includes("@react-three")) {
              return "vendor-three";
            }
            // All other node_modules
            return "vendor";
          }
        },
        // Add preload hints for critical chunks
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Optimize build speed and output
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false, // Disable in production for faster builds
  },
  optimizeDeps: {
    // Pre-bundle these dependencies for faster dev and production
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'zustand',
      'framer-motion',
      'lottie-react',
      'lottie-web',
    ],
    // Exclude heavy libs that are only used in specific routes
    exclude: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },
  server: {
    host: true,
    hmr: {
      host: 'localhost',
    },
    watch: {
      usePolling: true,
    },
    // Optimize dev server
    preTransformRequests: true,
  },
});
