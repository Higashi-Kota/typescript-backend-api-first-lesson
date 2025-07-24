import * as fs from 'node:fs'
import * as path from 'node:path'
import * as dotenv from 'dotenv'
import { setupTestHooks } from './shared-global-setup.js'

// Load environment variables from project root .env.test file
// Find project root by looking for package.json with name "beauty-salon-reservation-app"
let currentDir = process.cwd()
let projectRoot = currentDir

while (currentDir !== path.dirname(currentDir)) {
  const packageJsonPath = path.join(currentDir, 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    if (packageJson.name === 'beauty-salon-reservation-app') {
      projectRoot = currentDir
      break
    }
  }
  currentDir = path.dirname(currentDir)
}

const envTestPath = path.join(projectRoot, '.env.test')

if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath })
} else {
  console.error(`❌ .env.test not found at ${envTestPath}`)
}

// vitestのsetupFilesで読み込まれるファイル
// afterAllフックでグローバルティアダウンを実行
setupTestHooks()
