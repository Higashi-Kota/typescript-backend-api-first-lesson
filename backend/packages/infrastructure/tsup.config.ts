import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'database/index': 'src/database/index.ts',
    'database/schema': 'src/database/schema.ts',
    'test/db-test-helper': 'src/test/db-test-helper.ts',
  },
  format: ['esm'],
  dts: {
    resolve: true,
    compilerOptions: {
      composite: false,
      incremental: false,
    },
  },
  clean: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  target: 'esnext',
  external: [
    /^@beauty-salon\//,
    'drizzle-orm',
    'postgres',
    '@testcontainers/postgresql',
    'testcontainers',
  ],
  bundle: true,
  treeshake: true,
  platform: 'node',
  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'default']
    options.format = 'esm'
    options.outExtension = {
      '.js': '.js',
    }
  },
  outDir: 'dist',
  onSuccess: async () => {
    console.log('✅ @beauty-salon-backend/infrastructure built successfully!')
  },
})
