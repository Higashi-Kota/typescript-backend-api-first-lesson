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

// Define backend package groups with their colors
const BACKEND_PACKAGE_GROUPS: readonly PackageGroup[] = [
  {
    name: "config",
    filter: "./backend/packages/config",
    color: "yellow",
    description: "Configuration",
  },
  {
    name: "utility",
    filter: "./backend/packages/utility",
    color: "cyan",
    description: "Utilities",
  },
  {
    name: "database",
    filter: "./backend/packages/database",
    color: "magenta",
    description: "Database layer",
  },
  {
    name: "generated",
    filter: "./backend/packages/generated",
    color: "green",
    description: "Generated types",
  },
  {
    name: "domain",
    filter: "./backend/packages/domain",
    color: "blue",
    description: "Domain logic",
  },
  {
    name: "infrastructure",
    filter: "./backend/packages/infrastructure",
    color: "red",
    description: "Infrastructure",
  },
  {
    name: "api",
    filter: "./backend/packages/api",
    color: "white",
    description: "API layer",
  },
] as const

// Build concurrently command
const concurrentCommands: string[] = []
const names: string[] = []
const colors: string[] = []

// Add backend package groups with build:watch
for (const group of BACKEND_PACKAGE_GROUPS) {
  concurrentCommands.push(`"pnpm --filter '${group.filter}' build:watch"`)
  names.push(group.name)
  colors.push(group.color)
}

// Add server dev command (uses tsx watch)
concurrentCommands.push(`"pnpm --filter '@beauty-salon-backend/server' dev"`)
names.push("server")
colors.push("bgBlue")

// Build the final command
const command = `concurrently ${concurrentCommands.join(" ")} --names "${names.join(",")}" --prefix-colors "${colors.join(",")}"`

console.log("🚀 Starting backend development environment...")
console.log(`📦 Building packages: ${BACKEND_PACKAGE_GROUPS.map((g) => g.description).join(", ")}`)
console.log("🎯 Running server with auto-reload")
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