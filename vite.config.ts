import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import framer from "vite-plugin-framer"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), framer()],
})
