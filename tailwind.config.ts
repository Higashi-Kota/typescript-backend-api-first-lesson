import tailwindcssAnimate from 'tailwindcss-animate'
import { themePreset } from './frontend/packages/theme/src/presets/tailwind.js'

/**
 * VSCode の Tailwind CSS IntelliSense用にルートレベルに配置
 * @type {import('tailwindcss').Config}
 */
export default {
  presets: [themePreset],
  content: [
    './frontend/packages/apps/*/src/**/*.{js,ts,jsx,tsx}',
    './frontend/packages/features/*/src/**/*.{js,ts,jsx,tsx}',
    './frontend/packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [tailwindcssAnimate],
}
