#!/usr/bin/env node --experimental-strip-types

import { spawn } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "..")

interface PackageGroup {
  name: string
  filter: string
  color: string
  description: string
}

// Define package groups with their colors
const PACKAGE_GROUPS: readonly PackageGroup[] = [
  {
    name: "core",
    filter: "./frontend/packages/{config,utils,validations}",
    color: "yellow",
    description: "Core utilities",
  },
  {
    name: "ui",
    filter: "./frontend/packages/{theme,ui,assets}",
    color: "magenta",
    description: "UI libraries",
  },
  {
    name: "features",
    filter: "./frontend/packages/{features,stores,api-client}",
    color: "cyan",
    description: "Feature modules",
  },
] as const

// Parse command line arguments
const args = process.argv.slice(2)
const appName = args[0] || "admin-app"

// Validate app name
const validApps = ["admin-app", "portal-app", "dashboard-app"]
if (!validApps.includes(appName)) {
  console.error(`❌ Invalid app name: ${appName}`)
  console.error(`Valid options: ${validApps.join(", ")}`)
  process.exit(1)
}

const appFilter = `./frontend/apps/${appName}`

// Build concurrently command
const concurrentCommands: string[] = []
const names: string[] = []
const colors: string[] = []

// Add package groups
for (const group of PACKAGE_GROUPS) {
  concurrentCommands.push(`"pnpm --filter '${group.filter}' -r build:watch"`)
  names.push(group.name)
  colors.push(group.color)
}

// Add app dev server
concurrentCommands.push(`"pnpm --filter ${appFilter} dev"`)
names.push(appName)
colors.push("blue")

// Build the final command
const command = `concurrently ${concurrentCommands.join(" ")} --names "${names.join(",")}" --prefix-colors "${colors.join(",")}"`

console.log("🚀 Starting development environment...")
console.log(`📦 Building packages: ${PACKAGE_GROUPS.map((g) => g.description).join(", ")}`)
console.log(`🎯 Running app: ${appName}`)
console.log("")

// Execute the command
const child = spawn(command, {
  shell: true,
  stdio: "inherit",
  cwd: rootDir,
})

child.on("error", (error: Error) => {
  console.error("Failed to start:", error)
  process.exit(1)
})

child.on("exit", (code: number | null) => {
  process.exit(code ?? 0)
})