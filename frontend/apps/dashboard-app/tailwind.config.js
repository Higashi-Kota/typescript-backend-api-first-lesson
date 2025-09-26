import { themePreset } from '@beauty-salon-frontend/theme'
import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [themePreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/features/*/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [tailwindcssAnimate],
}
