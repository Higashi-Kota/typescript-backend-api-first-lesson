// Auto-generated SQL content - DO NOT EDIT
// This file is generated at build time to embed SQL content

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Determine if we're running from dist or src
const isBuilt = __dirname.endsWith('/dist') || __dirname.includes('/dist/')

// Set SQL directory based on where we're running from
const sqlDir = isBuilt
  ? join(__dirname, 'sql') // In dist: dist/sql (sql is at same level as index.js after bundling)
  : join(__dirname, '..', '..', 'sql') // In src: go up to package root from src/scripts/

export const SETUP_SQL = (() => {
  try {
    return readFileSync(join(sqlDir, 'setup.sql'), 'utf-8')
  } catch (error) {
    console.error('Failed to load setup.sql from:', join(sqlDir, 'setup.sql'))
    console.error('Current directory:', __dirname)
    console.error('Is built:', isBuilt)
    console.error('Error:', error)
    return ''
  }
})()

export const DROP_SQL = (() => {
  try {
    return readFileSync(join(sqlDir, 'drop.sql'), 'utf-8')
  } catch (error) {
    console.error('Failed to load drop.sql from:', join(sqlDir, 'drop.sql'))
    console.error('Current directory:', __dirname)
    console.error('Is built:', isBuilt)
    console.error('Error:', error)
    return ''
  }
})()

export const RESET_SQL = (() => {
  try {
    return readFileSync(join(sqlDir, 'reset.sql'), 'utf-8')
  } catch (error) {
    console.error('Failed to load reset.sql from:', join(sqlDir, 'reset.sql'))
    console.error('Current directory:', __dirname)
    console.error('Is built:', isBuilt)
    console.error('Error:', error)
    return ''
  }
})()
