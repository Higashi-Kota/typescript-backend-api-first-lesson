import type { Meta, StoryObj } from '@storybook/react'
import { TestTailwind } from './test-tailwind'

const meta: Meta<typeof TestTailwind> = {
  title: 'Components/TestTailwind',
  component: TestTailwind,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <TestTailwind />,
}

export const InContainer: Story = {
  render: () => (
    <div className='p-8 bg-gray-100'>
      <div className='max-w-7xl mx-auto'>
        <h1 className='text-3xl font-bold mb-8 text-center'>
          Tailwind CSS IntelliSense Test
        </h1>
        <p className='text-center mb-8 text-gray-600'>
          This story tests if Tailwind CSS IntelliSense is working correctly.
          When editing className values in VS Code, you should see autocomplete
          suggestions.
        </p>
        <TestTailwind />
      </div>
    </div>
  ),
}
