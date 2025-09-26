import type { RuntimeMode } from '@beauty-salon-frontend/config'
import { match } from 'ts-pattern'
import { cn } from '../lib/utils'

export interface EnvironmentBannerProps {
  environment?: RuntimeMode
  className?: string
}

/**
 * Environment indicator banner that displays as a diagonal ribbon in the top-left corner.
 * Only shows for non-production environments.
 */
export function EnvironmentBanner({
  environment = 'development',
  className,
}: EnvironmentBannerProps) {
  // Don't show banner for production environment
  if (!environment || environment.toLowerCase() === 'production') {
    return null
  }

  // Determine colors based on environment
  const getEnvironmentStyles = () =>
    match(environment)
      .with('development', () => 'bg-blue-600 text-white shadow-blue-900/20')
      .with('staging', () => 'bg-orange-600 text-white shadow-orange-900/20')
      .with('test', () => 'bg-purple-600 text-white shadow-purple-900/20')
      .with('localhost', () => 'bg-green-600 text-white shadow-green-900/20')
      .with('production', () => '')
      .exhaustive()
  return (
    <div
      className={cn(
        'fixed top-0 left-0 z-[9999] pointer-events-none',
        className,
      )}
    >
      <div
        className={cn(
          'absolute -left-24 top-8 w-48 py-1 text-center text-xs font-semibold uppercase tracking-wider',
          'rotate-[-45deg] transform shadow-lg',
          getEnvironmentStyles(),
        )}
      >
        {environment}
      </div>
    </div>
  )
}
