import type { Meta, StoryObj } from '@storybook/react'
import { TailwindTest } from './tailwind-test'

const meta: Meta<typeof TailwindTest> = {
  title: 'Components/TailwindTest',
  component: TailwindTest,
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
