import { env } from '../env'

export const isProductionMode = () => env.VITE_MODE.value === 'production'
export const isStagingMode = () => env.VITE_MODE.value === 'staging'
export const isDevelopmentMode = () => env.VITE_MODE.value === 'development'
export const isTestMode = () => env.VITE_MODE.value === 'test'
export const isLocalhostMode = () => env.VITE_MODE.value === 'localhost'
export const isBrowser = () => typeof window !== 'undefined'
