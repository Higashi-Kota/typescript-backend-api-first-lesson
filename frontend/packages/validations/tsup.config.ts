import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'validateBirthday/index': 'src/validateBirthday/index.ts',
    'validateEmail/index': 'src/validateEmail/index.ts',
    'validateEndDate/index': 'src/validateEndDate/index.ts',
    'validateFullWidthKatakana/index': 'src/validateFullWidthKatakana/index.ts',
    'validateHalfWidthKatakana/index': 'src/validateHalfWidthKatakana/index.ts',
    'validateMaxLength/index': 'src/validateMaxLength/index.ts',
    'validateMinLength/index': 'src/validateMinLength/index.ts',
    'validatePassword/index': 'src/validatePassword/index.ts',
    'validateStartDate/index': 'src/validateStartDate/index.ts',
    'validateURL/index': 'src/validateURL/index.ts',
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

  external: [/^@beauty-salon\//],

  bundle: true,

  treeshake: true,

  platform: 'neutral',

  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'default']
    options.format = 'esm'
    options.outExtension = {
      '.js': '.js',
    }
  },

  outDir: 'dist',

  onSuccess: async () => {
    console.log('✅ @beauty-salon-frontend/validations built successfully!')
  },
})
