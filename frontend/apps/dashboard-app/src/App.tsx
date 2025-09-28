import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EnvironmentBanner,
} from '@beauty-salon-frontend/ui'
import { endOfWeek, format, startOfWeek } from 'date-fns'
import { NavLink, Route, Routes } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const revenueData = [
  { month: 'Jan', revenue: 65000, lastYear: 58000 },
  { month: 'Feb', revenue: 72000, lastYear: 62000 },
  { month: 'Mar', revenue: 78000, lastYear: 65000 },
  { month: 'Apr', revenue: 85000, lastYear: 71000 },
  { month: 'May', revenue: 91000, lastYear: 75000 },
  { month: 'Jun', revenue: 94000, lastYear: 79000 },
]

const serviceBreakdown = [
  { name: 'Hair Services', value: 45, color: '#e91e63' },
  { name: 'Nail Services', value: 25, color: '#9c27b0' },
  { name: 'Spa Services', value: 20, color: '#673ab7' },
  { name: 'Other', value: 10, color: '#3f51b5' },
]

const staffPerformance = [
  { name: 'Sarah J.', appointments: 142, revenue: 11360, satisfaction: 4.8 },
  { name: 'Mike C.', appointments: 128, revenue: 8960, satisfaction: 4.7 },
  { name: 'Emma W.', appointments: 115, revenue: 13800, satisfaction: 4.9 },
  { name: 'Lisa T.', appointments: 98, revenue: 7840, satisfaction: 4.6 },
  { name: 'John D.', appointments: 87, revenue: 10440, satisfaction: 4.5 },
]

const weeklyBookings = [
  { day: 'Mon', bookings: 24, capacity: 40 },
  { day: 'Tue', bookings: 28, capacity: 40 },
  { day: 'Wed', bookings: 32, capacity: 40 },
  { day: 'Thu', bookings: 35, capacity: 40 },
  { day: 'Fri', bookings: 38, capacity: 40 },
  { day: 'Sat', bookings: 40, capacity: 40 },
  { day: 'Sun', bookings: 30, capacity: 35 },
]

function Overview() {
  const currentWeek = {
    start: format(startOfWeek(new Date()), 'MMM d'),
    end: format(endOfWeek(new Date()), 'MMM d, yyyy'),
  }

  return (
    <div className='space-y-6'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Business Overview</h1>
        <p className='mt-1 text-sm text-gray-500'>
          Week of {currentWeek.start} - {currentWeek.end}
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold text-gray-900'>$94,000</p>
            <p className='mt-1 text-sm text-green-600'>↑ 18.9% vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold text-gray-900'>570</p>
            <p className='mt-1 text-sm text-green-600'>↑ 12.3% vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              Average Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold text-gray-900'>$165</p>
            <p className='mt-1 text-sm text-green-600'>↑ 5.8% vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium text-gray-600'>
              Customer Retention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-2xl font-bold text-gray-900'>78%</p>
            <p className='mt-1 text-sm text-green-600'>↑ 2.1% vs last month</p>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Area
                  type='monotone'
                  dataKey='revenue'
                  stackId='1'
                  stroke='#e91e63'
                  fill='#e91e63'
                  fillOpacity={0.6}
                  name='This Year'
                />
                <Area
                  type='monotone'
                  dataKey='lastYear'
                  stackId='2'
                  stroke='#9c27b0'
                  fill='#9c27b0'
                  fillOpacity={0.4}
                  name='Last Year'
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={serviceBreakdown}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill='#8884d8'
                  dataKey='value'
                >
                  {serviceBreakdown.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Analytics() {
  return (
    <div className='space-y-6'>
      <h1 className='mb-6 text-3xl font-bold text-gray-900'>
        Analytics & Insights
      </h1>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Weekly Booking Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={weeklyBookings}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='day' />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey='bookings' fill='#e91e63' name='Bookings' />
                <Bar dataKey='capacity' fill='#ddd' name='Capacity' />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='py-2 text-sm font-medium text-left text-gray-600'>
                      Staff Member
                    </th>
                    <th className='py-2 text-sm font-medium text-right text-gray-600'>
                      Appointments
                    </th>
                    <th className='py-2 text-sm font-medium text-right text-gray-600'>
                      Revenue
                    </th>
                    <th className='py-2 text-sm font-medium text-right text-gray-600'>
                      Rating
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y'>
                  {staffPerformance.map((staff) => (
                    <tr key={staff.name} className='hover:bg-gray-50'>
                      <td className='py-3 text-sm'>{staff.name}</td>
                      <td className='py-3 text-sm text-right'>
                        {staff.appointments}
                      </td>
                      <td className='py-3 text-sm text-right'>
                        ${staff.revenue.toLocaleString()}
                      </td>
                      <td className='py-3 text-sm text-right'>
                        <span className='inline-flex items-center'>
                          <span className='mr-1 text-yellow-500'>⭐</span>
                          {staff.satisfaction}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex gap-4 p-4 rounded-lg bg-blue-50'>
              <span className='text-2xl'>📈</span>
              <div>
                <h4 className='font-semibold text-gray-900'>Revenue Growth</h4>
                <p className='mt-1 text-sm text-gray-600'>
                  June revenue is on track to exceed $100k, a 20% increase from
                  May.
                </p>
              </div>
            </div>
            <div className='flex gap-4 p-4 rounded-lg bg-orange-50'>
              <span className='text-2xl'>🎯</span>
              <div>
                <h4 className='font-semibold text-gray-900'>
                  Capacity Optimization
                </h4>
                <p className='mt-1 text-sm text-gray-600'>
                  Saturday bookings are at 100% capacity. Consider adding staff
                  or extending hours.
                </p>
              </div>
            </div>
            <div className='flex gap-4 p-4 rounded-lg bg-green-50'>
              <span className='text-2xl'>⭐</span>
              <div>
                <h4 className='font-semibold text-gray-900'>
                  Customer Satisfaction
                </h4>
                <p className='mt-1 text-sm text-gray-600'>
                  Average rating has improved to 4.7/5, with Emma W. leading at
                  4.9/5.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Reports() {
  return (
    <div className='space-y-6'>
      <h1 className='mb-6 text-3xl font-bold text-gray-900'>Reports</h1>

      <div className='flex flex-wrap gap-2 mb-6'>
        <Button variant='outline'>This Week</Button>
        <Button variant='outline'>This Month</Button>
        <Button variant='outline'>This Quarter</Button>
        <Button variant='outline'>This Year</Button>
        <Button variant='outline'>Custom Range</Button>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Financial Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-gray-600'>
              Comprehensive breakdown of revenue, expenses, and profit margins.
            </p>
            <Button className='w-full'>Generate Report</Button>
          </CardContent>
        </Card>

        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Staff Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-gray-600'>
              Individual staff metrics including bookings, revenue, and customer
              ratings.
            </p>
            <Button className='w-full'>Generate Report</Button>
          </CardContent>
        </Card>

        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Customer Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-gray-600'>
              Customer acquisition, retention rates, and lifetime value
              analysis.
            </p>
            <Button className='w-full'>Generate Report</Button>
          </CardContent>
        </Card>

        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Service Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-gray-600'>
              Popular services, pricing optimization, and demand forecasting.
            </p>
            <Button className='w-full'>Generate Report</Button>
          </CardContent>
        </Card>

        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Marketing ROI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-gray-600'>
              Campaign performance, customer acquisition costs, and conversion
              rates.
            </p>
            <Button className='w-full'>Generate Report</Button>
          </CardContent>
        </Card>

        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Inventory Report</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='mb-4 text-sm text-gray-600'>
              Product usage, stock levels, and reorder recommendations.
            </p>
            <Button className='w-full'>Generate Report</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Settings() {
  return (
    <div className='space-y-6'>
      <h1 className='mb-6 text-3xl font-bold text-gray-900'>
        Dashboard Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Data Refresh</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-3 text-sm text-gray-600'>
            Configure how often dashboard data is updated.
          </p>
          <select className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'>
            <option>Real-time</option>
            <option>Every 5 minutes</option>
            <option>Every 15 minutes</option>
            <option>Every hour</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-3 text-sm text-gray-600'>
            Default format for report exports.
          </p>
          <select className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'>
            <option>PDF</option>
            <option>Excel</option>
            <option>CSV</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='mb-4 text-sm text-gray-600'>
            Configure dashboard alerts and notifications.
          </p>
          <div className='space-y-3'>
            <label className='flex items-center'>
              <input
                type='checkbox'
                defaultChecked
                className='w-4 h-4 mr-2 text-primary'
              />
              <span className='text-sm'>Revenue milestones</span>
            </label>
            <label className='flex items-center'>
              <input
                type='checkbox'
                defaultChecked
                className='w-4 h-4 mr-2 text-primary'
              />
              <span className='text-sm'>Capacity alerts</span>
            </label>
            <label className='flex items-center'>
              <input type='checkbox' className='w-4 h-4 mr-2 text-primary' />
              <span className='text-sm'>Daily summary email</span>
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function App() {
  return (
    <div className='flex h-screen bg-gray-50'>
      <EnvironmentBanner environment={import.meta.env.VITE_MODE} />
      {/* Sidebar */}
      <aside className='flex flex-col w-64 bg-white border-r border-gray-200'>
        <div className='p-6 border-b border-gray-200'>
          <h2 className='text-xl font-bold text-gray-900'>
            Analytics Dashboard
          </h2>
        </div>

        <nav className='flex-1 p-4'>
          <div className='space-y-1'>
            <NavLink
              to='/'
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span>Overview</span>
            </NavLink>
            <NavLink
              to='/analytics'
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span>Analytics</span>
            </NavLink>
            <NavLink
              to='/reports'
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span>Reports</span>
            </NavLink>
            <NavLink
              to='/settings'
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>

        <div className='p-4 border-t border-gray-200'>
          <p className='text-xs text-gray-500'>
            Environment: {import.meta.env.VITE_MODE}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className='flex flex-col flex-1 overflow-hidden'>
        <header className='px-6 py-4 bg-white border-b border-gray-200'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-semibold text-gray-900'>
              {import.meta.env.VITE_APP_TITLE}
            </h1>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm'>
                Export
              </Button>
              <Button variant='outline' size='sm'>
                Share
              </Button>
            </div>
          </div>
        </header>

        <main className='flex-1 p-6 overflow-auto'>
          <Routes>
            <Route path='/' element={<Overview />} />
            <Route path='/analytics' element={<Analytics />} />
            <Route path='/reports' element={<Reports />} />
            <Route path='/settings' element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
