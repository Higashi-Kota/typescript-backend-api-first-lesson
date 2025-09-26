import type { Meta, StoryObj } from '@storybook/react'
import { EnvironmentBanner } from './environment-banner'

const meta: Meta<typeof EnvironmentBanner> = {
  title: 'Components/EnvironmentBanner',
  component: EnvironmentBanner,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Environment indicator banner that displays as a diagonal ribbon in the top-left corner. Only visible for non-production environments.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className='min-h-[400px] bg-gray-50 p-8 relative'>
        <Story />
        <div className='mt-24 space-y-4'>
          <h2 className='text-xl font-bold'>Page Content Example</h2>
          <p className='text-gray-600'>
            The environment banner appears in the top-left corner and does not
            interfere with page content.
          </p>
          <p className='text-gray-600'>
            It automatically hides in production environments.
          </p>
        </div>
      </div>
    ),
  ],
  argTypes: {
    environment: {
      control: { type: 'select' },
      options: ['development', 'staging', 'test', 'local', 'production'],
      description: 'The environment name to display',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Development: Story = {
  args: {
    environment: 'development',
  },
}

export const Staging: Story = {
  args: {
    environment: 'staging',
  },
}

export const Test: Story = {
  args: {
    environment: 'test',
  },
}

export const Local: Story = {
  args: {
    environment: 'localhost',
  },
}

export const Production: Story = {
  args: {
    environment: 'production',
  },
  parameters: {
    docs: {
      description: {
        story:
          'In production environment, the banner is hidden and returns null.',
      },
    },
  },
}

export const CustomEnvironment: Story = {
  args: {
    environment: 'development',
  },
  parameters: {
    docs: {
      description: {
        story: 'Unknown environments default to gray styling.',
      },
    },
  },
}

export const AllEnvironments: Story = {
  render: () => (
    <>
      <div className='grid grid-cols-2 gap-8'>
        <div className='relative h-48 overflow-hidden bg-white border rounded-lg'>
          <EnvironmentBanner environment='development' />
          <div className='p-4 pt-20'>
            <h3 className='font-bold'>Development</h3>
            <p className='text-sm text-gray-600'>Blue banner</p>
          </div>
        </div>
        <div className='relative h-48 overflow-hidden bg-white border rounded-lg'>
          <EnvironmentBanner environment='staging' />
          <div className='p-4 pt-20'>
            <h3 className='font-bold'>Staging</h3>
            <p className='text-sm text-gray-600'>Orange banner</p>
          </div>
        </div>
        <div className='relative h-48 overflow-hidden bg-white border rounded-lg'>
          <EnvironmentBanner environment='test' />
          <div className='p-4 pt-20'>
            <h3 className='font-bold'>Test</h3>
            <p className='text-sm text-gray-600'>Purple banner</p>
          </div>
        </div>
        <div className='relative h-48 overflow-hidden bg-white border rounded-lg'>
          <EnvironmentBanner environment='localhost' />
          <div className='p-4 pt-20'>
            <h3 className='font-bold'>Local</h3>
            <p className='text-sm text-gray-600'>Green banner</p>
          </div>
        </div>
      </div>
    </>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available environment banner styles displayed together.',
      },
    },
  },
}
