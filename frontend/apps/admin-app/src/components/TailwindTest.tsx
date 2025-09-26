export const TailwindTest = () => {
  return (
    <div className='p-8 space-y-4'>
      <h1 className='text-3xl font-bold text-primary-600'>Tailwind CSS Test</h1>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='bg-primary-100 p-4 rounded-lg shadow-md'>
          <h2 className='text-xl font-semibold text-primary-800'>
            Primary Color
          </h2>
          <p className='text-primary-600'>This uses custom primary colors</p>
        </div>

        <div className='bg-secondary-100 p-4 rounded-lg shadow-md'>
          <h2 className='text-xl font-semibold text-secondary-800'>
            Secondary Color
          </h2>
          <p className='text-secondary-600'>
            This uses custom secondary colors
          </p>
        </div>

        <div className='bg-success-100 p-4 rounded-lg shadow-md'>
          <h2 className='text-xl font-semibold text-success-800'>
            Success Color
          </h2>
          <p className='text-success-600'>This uses custom success colors</p>
        </div>
      </div>

      <div className='flex gap-2'>
        <button
          type='button'
          className='px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors'
        >
          Primary Button
        </button>
        <button
          type='button'
          className='px-4 py-2 bg-secondary-500 text-white rounded hover:bg-secondary-600 transition-colors'
        >
          Secondary Button
        </button>
      </div>

      <div className='animate-pulse bg-gray-200 h-4 w-full rounded' />
    </div>
  )
}
