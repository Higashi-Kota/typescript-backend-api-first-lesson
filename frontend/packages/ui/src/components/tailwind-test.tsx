export const TailwindTest = () => {
  return (
    <div className='p-8 space-y-4'>
      <h1 className='text-3xl font-bold text-blue-600'>Tailwind CSS Test</h1>
      <div className='grid grid-cols-3 gap-4'>
        <div className='p-4 text-white bg-red-500 rounded'>Red Box</div>
        <div className='p-4 text-white bg-green-500 rounded'>Green Box</div>
        <div className='p-4 text-white bg-blue-500 rounded'>Blue Box</div>
      </div>
      <div className='flex gap-2'>
        <button
          type='button'
          className='px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90'
        >
          Primary Button
        </button>
        <button
          type='button'
          className='px-4 py-2 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80'
        >
          Secondary Button
        </button>
      </div>
    </div>
  )
}
