import { dirname, join } from 'node:path'
import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')))
}

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-themes'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },
  async viteFinal(config) {
    // Import Tailwind Vite plugin dynamically
    const tailwindcss = (await import('@tailwindcss/vite')).default

    // Merge custom configuration into the default config
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      optimizeDeps: {
        include: ['@beauty-salon-frontend/theme'],
      },
    })
  },
}

export default config
