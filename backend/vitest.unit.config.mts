import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/unit/database.test.ts"],
    reporters: ["default", "junit"],
    outputFile: {
      junit: "reports/unit/junit.xml",
    },
  },
});