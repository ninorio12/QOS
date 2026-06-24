import { defineConfig } from "vitest/config"

// Tests Convex (convex-test) + logique pure de permissions.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts"],
  },
})
