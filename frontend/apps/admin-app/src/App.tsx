import { Button, Card } from '@beauty-salon-frontend/ui'
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
    <div className='dashboard'>
      <h1>Dashboard</h1>
      <div className='dashboard-stats'>
        <Card className='stat-card'>
          <h3>Total Appointments</h3>
          <p className='stat-value'>165</p>
          <p className='stat-change positive'>+12% from last week</p>
        </Card>
        <Card className='stat-card'>
          <h3>Total Revenue</h3>
          <p className='stat-value'>$21,700</p>
          <p className='stat-change positive'>+8% from last week</p>
        </Card>
        <Card className='stat-card'>
          <h3>Active Customers</h3>
          <p className='stat-value'>342</p>
          <p className='stat-change positive'>+5% from last week</p>
        </Card>
        <Card className='stat-card'>
          <h3>Staff Utilization</h3>
          <p className='stat-value'>87%</p>
          <p className='stat-change negative'>-2% from last week</p>
        </Card>
      </div>

      <div className='charts'>
        <Card className='chart-card'>
          <h3>Weekly Appointments</h3>
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
        </Card>

        <Card className='chart-card'>
          <h3>Revenue by Day</h3>
          <ResponsiveContainer width='100%' height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis />
              <Tooltip />
              <Bar dataKey='revenue' fill='#9c27b0' />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}

function Staff() {
  return (
    <div className='staff'>
      <h1>Staff Management</h1>
      <Button variant='primary'>Add New Staff</Button>
      <div className='staff-list'>
        <Card>
          <h3>Sarah Johnson</h3>
          <p>Senior Stylist</p>
          <p>Schedule: Mon-Fri, 9:00 AM - 5:00 PM</p>
        </Card>
        <Card>
          <h3>Mike Chen</h3>
          <p>Nail Technician</p>
          <p>Schedule: Tue-Sat, 10:00 AM - 6:00 PM</p>
        </Card>
        <Card>
          <h3>Emma Williams</h3>
          <p>Massage Therapist</p>
          <p>Schedule: Wed-Sun, 11:00 AM - 7:00 PM</p>
        </Card>
      </div>
    </div>
  )
}

function Services() {
  return (
    <div className='services'>
      <h1>Service Management</h1>
      <Button variant='primary'>Add New Service</Button>
      <div className='service-list'>
        <Card>
          <h3>Hair Cut & Style</h3>
          <p>Duration: 60 min</p>
          <p>Price: $80</p>
        </Card>
        <Card>
          <h3>Manicure</h3>
          <p>Duration: 45 min</p>
          <p>Price: $45</p>
        </Card>
        <Card>
          <h3>Swedish Massage</h3>
          <p>Duration: 90 min</p>
          <p>Price: $120</p>
        </Card>
      </div>
    </div>
  )
}

function Appointments() {
  return (
    <div className='appointments'>
      <h1>Appointment Management</h1>
      <div className='appointment-filters'>
        <Button variant='secondary'>Today</Button>
        <Button variant='secondary'>This Week</Button>
        <Button variant='secondary'>This Month</Button>
      </div>
      <div className='appointment-list'>
        <Card>
          <h3>Jane Doe - Hair Cut & Style</h3>
          <p>Today, 2:00 PM - 3:00 PM</p>
          <p>Stylist: Sarah Johnson</p>
          <p>Status: Confirmed</p>
        </Card>
        <Card>
          <h3>John Smith - Swedish Massage</h3>
          <p>Today, 3:30 PM - 5:00 PM</p>
          <p>Therapist: Emma Williams</p>
          <p>Status: Pending</p>
        </Card>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className='app'>
      <aside className='app-sidebar'>
        <div className='logo'>
          <h2>Admin Panel</h2>
        </div>
        <nav>
          <Link to='/' className='nav-link'>
            <span>Dashboard</span>
          </Link>
          <Link to='/appointments' className='nav-link'>
            <span>Appointments</span>
          </Link>
          <Link to='/staff' className='nav-link'>
            <span>Staff</span>
          </Link>
          <Link to='/services' className='nav-link'>
            <span>Services</span>
          </Link>
        </nav>
        <div className='sidebar-footer'>
          <p>Environment: {import.meta.env.VITE_MODE}</p>
        </div>
      </aside>

      <div className='app-content'>
        <header className='app-header'>
          <h1>{import.meta.env.VITE_APP_TITLE}</h1>
          <div className='header-actions'>
            <Button variant='secondary'>Profile</Button>
            <Button variant='secondary'>Logout</Button>
          </div>
        </header>

        <main className='app-main'>
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
