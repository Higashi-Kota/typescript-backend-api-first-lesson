import { config } from 'dotenv'
import path from 'node:path'

// Load .env.test file for CI tests from project root
config({ path: path.resolve(__dirname, '../.env.test') })