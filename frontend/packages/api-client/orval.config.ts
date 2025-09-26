import { defineConfig } from 'orval'

export default defineConfig({
  beautySalon: {
    input: {
      target:
        '../../../specs/tsp-output/@typespec/openapi3/generated/openapi.yaml',
    },
    output: {
      clean: true,
      mode: 'tags-split',
      target: './src/generated/endpoints',
      schemas: './src/generated/models',
      client: 'react-query',
      httpClient: 'fetch',
      mock: false,
      override: {
        mutator: {
          path: '../io/src/libs/fetcher/fetcher.ts',
          name: 'customInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'pnpm run format',
    },
  },
})
