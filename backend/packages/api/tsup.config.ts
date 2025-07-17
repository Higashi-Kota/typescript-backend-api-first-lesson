import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
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
    '@hono/swagger-ui',
    '@hono/zod-openapi',
    '@hono/zod-validator',
    'hono',
    'zod',
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
    console.log('✅ @beauty-salon-backend/api built successfully!')
  },
})
