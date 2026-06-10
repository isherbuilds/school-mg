import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["src/schema/__tests__/**/*.test.ts"]
  }
});
