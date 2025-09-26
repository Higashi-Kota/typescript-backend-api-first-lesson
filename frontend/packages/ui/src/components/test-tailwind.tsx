import type * as React from 'react'
import { cn } from '../lib/utils'

/**
 * Test component to verify Tailwind CSS IntelliSense is working
 *
 * When typing className values, you should see autocomplete suggestions for:
 * - Basic utilities: bg-red-500, text-white, p-4, etc.
 * - Flexbox: flex, justify-center, items-center
 * - Grid: grid, grid-cols-3, gap-4
 * - Animations: animate-pulse, animate-spin
 * - Responsive: sm:, md:, lg:, xl:, 2xl:
 * - States: hover:, focus:, active:, disabled:
 * - Dark mode: dark:
 */
export const TestTailwind: React.FC = () => {
  return (
    <div className='min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500'>
      <div className='container px-4 py-8 mx-auto'>
        {/* Grid layout test */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {/* Card with hover effects */}
          <div className='p-6 transition-shadow duration-300 bg-white rounded-lg shadow-lg hover:shadow-xl'>
            <h2 className='mb-4 text-2xl font-bold text-gray-800'>
              Card Title
            </h2>
            <p className='leading-relaxed text-gray-600'>
              This is a test card to verify Tailwind IntelliSense is working
              properly.
            </p>
            <button
              type='button'
              className='px-6 py-2 mt-4 font-medium text-white transition-colors bg-blue-500 rounded-md hover:bg-blue-600'
            >
              Click Me
            </button>
          </div>

          {/* Flexbox test */}
          <div className='flex flex-col items-center justify-center p-8 bg-gray-100 rounded-lg'>
            <div className='w-16 h-16 mb-4 bg-green-500 rounded-full animate-pulse' />
            <span className='text-lg font-semibold text-gray-700'>
              Flexbox Test
            </span>
          </div>

          {/* Complex utilities test */}
          <div
            className={cn(
              'relative overflow-hidden rounded-lg',
              'bg-gradient-to-r from-cyan-500 to-blue-500',
              'transform hover:scale-105 transition-transform duration-200',
            )}
          >
            <div className='absolute inset-0 bg-black/20' />
            <div className='relative z-10 p-6 text-white'>
              <h3 className='mb-2 text-xl font-bold'>Gradient Card</h3>
              <p className='text-white/90'>Testing complex utilities</p>
            </div>
          </div>
        </div>

        {/* Responsive design test */}
        <div className='p-4 mt-8 bg-white rounded-lg'>
          <p className='text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl'>
            Responsive text size
          </p>
          <div className='flex flex-col gap-4 mt-4 sm:flex-row'>
            <div className='flex-1 p-4 bg-red-100 rounded'>Column 1</div>
            <div className='flex-1 p-4 bg-green-100 rounded'>Column 2</div>
            <div className='flex-1 p-4 bg-blue-100 rounded'>Column 3</div>
          </div>
        </div>

        {/* Dark mode test */}
        <div className='p-6 mt-8 bg-white rounded-lg dark:bg-gray-800'>
          <h2 className='mb-4 text-2xl font-bold text-gray-800 dark:text-white'>
            Dark Mode Support
          </h2>
          <p className='text-gray-600 dark:text-gray-300'>
            This component adapts to dark mode preferences.
          </p>
        </div>
      </div>
    </div>
  )
}

// Export for Storybook
export default TestTailwind
