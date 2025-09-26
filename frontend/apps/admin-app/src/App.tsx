import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EnvironmentBanner,
} from '@beauty-salon-frontend/ui'
import { Link, Route, Routes } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TailwindTest } from './components/TailwindTest'

const mockData = [
  { name: 'Mon', appointments: 12, revenue: 1800 },
  { name: 'Tue', appointments: 19, revenue: 2400 },
  { name: 'Wed', appointments: 15, revenue: 2200 },
  { name: 'Thu', appointments: 25, revenue: 3100 },
  { name: 'Fri', appointments: 32, revenue: 4200 },
  { name: 'Sat', appointments: 38, revenue: 4800 },
  { name: 'Sun', appointments: 24, revenue: 3200 },
]

function Dashboard() {
  return (
    <div>
      <h1 className='mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100'>
        Dashboard
      </h1>
      <div className='grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Total Appointments</CardDescription>
            <CardTitle className='text-3xl'>165</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-green-600 dark:text-green-400'>
              +12% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className='text-3xl'>$21,700</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-green-600 dark:text-green-400'>
              +8% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Active Customers</CardDescription>
            <CardTitle className='text-3xl'>342</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-green-600 dark:text-green-400'>
              +5% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Staff Utilization</CardDescription>
            <CardTitle className='text-3xl'>87%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-red-600 dark:text-red-400'>
              -2% from last week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Weekly Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Line
                  type='monotone'
                  dataKey='appointments'
                  stroke='#e91e63'
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={mockData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='revenue' fill='#9c27b0' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Staff() {
  return (
    <div>
      <h1 className='mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100'>
        Staff Management
      </h1>
      <Button variant='default' className='mb-6'>
        Add New Staff
      </Button>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle>Sarah Johnson</CardTitle>
            <CardDescription>Senior Stylist</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Schedule: Mon-Fri, 9:00 AM - 5:00 PM
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mike Chen</CardTitle>
            <CardDescription>Nail Technician</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Schedule: Tue-Sat, 10:00 AM - 6:00 PM
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Emma Williams</CardTitle>
            <CardDescription>Massage Therapist</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Schedule: Wed-Sun, 11:00 AM - 7:00 PM
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Services() {
  return (
    <div>
      <h1 className='mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100'>
        Service Management
      </h1>
      <Button variant='outline' className='mb-6'>
        Add New Service
      </Button>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle>Hair Cut & Style</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Duration: 60 min
            </p>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Price: $80
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manicure</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Duration: 45 min
            </p>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Price: $45
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Swedish Massage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Duration: 90 min
            </p>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Price: $120
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Appointments() {
  return (
    <div>
      <h1 className='mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100'>
        Appointment Management
      </h1>
      <div className='flex gap-4 mb-6'>
        <Button variant='secondary'>Today</Button>
        <Button variant='secondary'>This Week</Button>
        <Button variant='secondary'>This Month</Button>
      </div>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Jane Doe - Hair Cut & Style</CardTitle>
            <CardDescription>Today, 2:00 PM - 3:00 PM</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Stylist: Sarah Johnson
            </p>
            <p className='text-sm font-medium text-green-600 dark:text-green-400'>
              Status: Confirmed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>John Smith - Swedish Massage</CardTitle>
            <CardDescription>Today, 3:30 PM - 5:00 PM</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Therapist: Emma Williams
            </p>
            <p className='text-sm font-medium text-yellow-600 dark:text-yellow-400'>
              Status: Pending
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className='flex h-screen bg-gray-50 dark:bg-gray-900'>
      <EnvironmentBanner environment={import.meta.env.VITE_MODE} />
      <aside className='w-64 bg-gray-900 dark:bg-gray-950'>
        <div className='p-6 border-b border-gray-800'>
          <h2 className='text-2xl font-semibold text-white'>Admin Panel</h2>
        </div>
        <nav className='flex-1 p-4'>
          <Link
            to='/'
            className='flex items-center px-4 py-3 mb-2 text-gray-300 transition-colors rounded-lg hover:bg-gray-800 hover:text-white'
          >
            <span>Dashboard</span>
          </Link>
          <Link
            to='/appointments'
            className='flex items-center px-4 py-3 mb-2 text-gray-300 transition-colors rounded-lg hover:bg-gray-800 hover:text-white'
          >
            <span>Appointments</span>
          </Link>
          <Link
            to='/staff'
            className='flex items-center px-4 py-3 mb-2 text-gray-300 transition-colors rounded-lg hover:bg-gray-800 hover:text-white'
          >
            <span>Staff</span>
          </Link>
          <Link
            to='/services'
            className='flex items-center px-4 py-3 mb-2 text-gray-300 transition-colors rounded-lg hover:bg-gray-800 hover:text-white'
          >
            <span>Services</span>
          </Link>
        </nav>
        <div className='p-6 border-t border-gray-800'>
          <p className='text-sm text-gray-500'>
            Environment: {import.meta.env.VITE_MODE}
          </p>
        </div>
      </aside>

      <div className='flex flex-col flex-1'>
        <header className='bg-white border-b border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700'>
          <div className='flex items-center justify-between px-8 py-4'>
            <h1 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
              {import.meta.env.VITE_APP_TITLE}
            </h1>
            <div className='flex items-center gap-4'>
              <Button variant='secondary'>Profile</Button>
              <Button variant='secondary'>Logout</Button>
            </div>
          </div>
        </header>

        <main className='flex-1 p-8 overflow-auto'>
          <Routes>
            <Route path='/' element={<Dashboard />} />
            <Route path='/appointments' element={<Appointments />} />
            <Route path='/staff' element={<Staff />} />
            <Route path='/services' element={<Services />} />
            <Route path='/tailwind-test' element={<TailwindTest />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
