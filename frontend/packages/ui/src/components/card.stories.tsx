import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here. This is the main body of the card.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
}

export const SimpleCard: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Simple Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>A simple card with only title and content.</p>
      </CardContent>
    </Card>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-2'>
        <div className='flex items-center p-4 space-x-4 border rounded-md'>
          <div className='flex-1 space-y-1'>
            <p className='text-sm font-medium leading-none'>
              Push Notifications
            </p>
            <p className='text-sm text-muted-foreground'>
              Send notifications to device.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className='grid items-center w-full gap-4'>
            <div className='flex flex-col space-y-1.5'>
              <label htmlFor='name'>Name</label>
              {/** biome-ignore lint/correctness/useUniqueElementIds: For storybook */}
              <input
                id='name'
                placeholder='Name of your project'
                className='flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              />
            </div>
            <div className='flex flex-col space-y-1.5'>
              <label htmlFor='framework'>Framework</label>
              {/** biome-ignore lint/correctness/useUniqueElementIds: For storybook */}
              <select
                id='framework'
                className='flex w-full h-10 px-3 py-2 text-sm border rounded-md border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              >
                <option value=''>Select</option>
                <option value='next'>Next.js</option>
                <option value='sveltekit'>SvelteKit</option>
                <option value='astro'>Astro</option>
                <option value='nuxt'>Nuxt.js</option>
              </select>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className='flex justify-between'>
        <Button variant='outline'>Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
}

export const ProfileCard: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <div className='flex items-center space-x-4'>
          <div className='w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500' />
          <div>
            <CardTitle>John Doe</CardTitle>
            <CardDescription>Software Engineer</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className='text-sm text-muted-foreground'>
          Building amazing web applications with modern technologies. Passionate
          about clean code and user experience.
        </p>
      </CardContent>
      <CardFooter className='flex gap-2'>
        <Button size='sm'>Follow</Button>
        <Button size='sm' variant='outline'>
          Message
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const Multiple: Story = {
  render: () => (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle>Card 1</CardTitle>
          <CardDescription>First card in grid</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for the first card</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Card 2</CardTitle>
          <CardDescription>Second card in grid</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Content for the second card</p>
        </CardContent>
      </Card>
    </div>
  ),
}
