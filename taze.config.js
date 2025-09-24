import { defineConfig } from "taze"

export default defineConfig({
  // Exclude specific packages from updates
  exclude: ["tailwindcss", "storybook", "@storybook/react", "@storybook/react-vite"],

  // Force fetch latest package info without cache
  force: true,

  // Write updates directly to package.json
  write: false,

  // Install after updating
  install: false,

  // Ignore specific paths when searching for package.json files
  ignorePaths: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.next/**"],

  // Package-specific update strategies
  // You can override the global behavior for specific packages if needed
  packageMode: {
    // Keep these packages at their current major version
    // 'tailwindcss': 'ignore',  // Already in exclude
    // '@biomejs/biome': 'ignore',  // Already in exclude
    // Force specific update strategies for other packages if needed
    // Example: 'typescript': 'minor'
  },

  // Control which dependency fields to check
  depFields: {
    dependencies: true,
    devDependencies: true,
    peerDependencies: false,
    optionalDependencies: true,
    packageManager: false,
    overrides: false,
  },
})
