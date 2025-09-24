import { Button, Card } from '@beauty-salon-frontend/ui'
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
    <div className='overview'>
      <div className='page-header'>
        <h1>Business Overview</h1>
        <p className='date-range'>
          Week of {currentWeek.start} - {currentWeek.end}
        </p>
      </div>

      <div className='metrics-grid'>
        <Card className='metric-card primary'>
          <h3>Total Revenue</h3>
          <p className='metric-value'>$94,000</p>
          <p className='metric-change positive'>+18.9% vs last month</p>
        </Card>
        <Card className='metric-card'>
          <h3>Appointments</h3>
          <p className='metric-value'>570</p>
          <p className='metric-change positive'>+12.3% vs last month</p>
        </Card>
        <Card className='metric-card'>
          <h3>Average Ticket</h3>
          <p className='metric-value'>$165</p>
          <p className='metric-change positive'>+5.8% vs last month</p>
        </Card>
        <Card className='metric-card'>
          <h3>Customer Retention</h3>
          <p className='metric-value'>78%</p>
          <p className='metric-change positive'>+2.1% vs last month</p>
        </Card>
      </div>

      <div className='chart-grid'>
        <Card className='chart-card'>
          <h3>Revenue Trend</h3>
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
        </Card>

        <Card className='chart-card'>
          <h3>Service Breakdown</h3>
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
        </Card>
      </div>
    </div>
  )
}

function Analytics() {
  return (
    <div className='analytics'>
      <h1>Analytics & Insights</h1>

      <div className='chart-grid'>
        <Card className='chart-card'>
          <h3>Weekly Booking Capacity</h3>
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
        </Card>

        <Card className='chart-card'>
          <h3>Top Performing Staff</h3>
          <div className='staff-performance'>
            <table>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Appointments</th>
                  <th>Revenue</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.map((staff) => (
                  <tr key={staff.name}>
                    <td>{staff.name}</td>
                    <td>{staff.appointments}</td>
                    <td>${staff.revenue.toLocaleString()}</td>
                    <td>
                      <span className='rating'>⭐ {staff.satisfaction}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className='insights-card'>
        <h3>Key Insights</h3>
        <div className='insights-list'>
          <div className='insight'>
            <span className='insight-icon'>📈</span>
            <div>
              <h4>Revenue Growth</h4>
              <p>
                June revenue is on track to exceed $100k, a 20% increase from
                May.
              </p>
            </div>
          </div>
          <div className='insight'>
            <span className='insight-icon'>🎯</span>
            <div>
              <h4>Capacity Optimization</h4>
              <p>
                Saturday bookings are at 100% capacity. Consider adding staff or
                extending hours.
              </p>
            </div>
          </div>
          <div className='insight'>
            <span className='insight-icon'>⭐</span>
            <div>
              <h4>Customer Satisfaction</h4>
              <p>
                Average rating has improved to 4.7/5, with Emma W. leading at
                4.9/5.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function Reports() {
  return (
    <div className='reports'>
      <h1>Reports</h1>

      <div className='report-filters'>
        <Button variant='secondary'>This Week</Button>
        <Button variant='secondary'>This Month</Button>
        <Button variant='secondary'>This Quarter</Button>
        <Button variant='secondary'>This Year</Button>
        <Button variant='secondary'>Custom Range</Button>
      </div>

      <div className='reports-grid'>
        <Card className='report-card'>
          <h3>Financial Report</h3>
          <p>
            Comprehensive breakdown of revenue, expenses, and profit margins.
          </p>
          <Button variant='primary'>Generate Report</Button>
        </Card>

        <Card className='report-card'>
          <h3>Staff Performance</h3>
          <p>
            Individual staff metrics including bookings, revenue, and customer
            ratings.
          </p>
          <Button variant='primary'>Generate Report</Button>
        </Card>

        <Card className='report-card'>
          <h3>Customer Analytics</h3>
          <p>
            Customer acquisition, retention rates, and lifetime value analysis.
          </p>
          <Button variant='primary'>Generate Report</Button>
        </Card>

        <Card className='report-card'>
          <h3>Service Analysis</h3>
          <p>Popular services, pricing optimization, and demand forecasting.</p>
          <Button variant='primary'>Generate Report</Button>
        </Card>

        <Card className='report-card'>
          <h3>Marketing ROI</h3>
          <p>
            Campaign performance, customer acquisition costs, and conversion
            rates.
          </p>
          <Button variant='primary'>Generate Report</Button>
        </Card>

        <Card className='report-card'>
          <h3>Inventory Report</h3>
          <p>Product usage, stock levels, and reorder recommendations.</p>
          <Button variant='primary'>Generate Report</Button>
        </Card>
      </div>
    </div>
  )
}

function Settings() {
  return (
    <div className='settings'>
      <h1>Dashboard Settings</h1>

      <Card className='settings-section'>
        <h3>Data Refresh</h3>
        <p>Configure how often dashboard data is updated.</p>
        <select>
          <option>Real-time</option>
          <option>Every 5 minutes</option>
          <option>Every 15 minutes</option>
          <option>Every hour</option>
        </select>
      </Card>

      <Card className='settings-section'>
        <h3>Export Settings</h3>
        <p>Default format for report exports.</p>
        <select>
          <option>PDF</option>
          <option>Excel</option>
          <option>CSV</option>
        </select>
      </Card>

      <Card className='settings-section'>
        <h3>Notifications</h3>
        <p>Configure dashboard alerts and notifications.</p>
        <label>
          <input type='checkbox' defaultChecked />
          Revenue milestones
        </label>
        <label>
          <input type='checkbox' defaultChecked />
          Capacity alerts
        </label>
        <label>
          <input type='checkbox' />
          Daily summary email
        </label>
      </Card>
    </div>
  )
}

function App() {
  return (
    <div className='app'>
      <aside className='app-sidebar'>
        <div className='logo'>
          <h2>Analytics Dashboard</h2>
        </div>
        <nav>
          <NavLink to='/' className='nav-link'>
            <span>Overview</span>
          </NavLink>
          <NavLink to='/analytics' className='nav-link'>
            <span>Analytics</span>
          </NavLink>
          <NavLink to='/reports' className='nav-link'>
            <span>Reports</span>
          </NavLink>
          <NavLink to='/settings' className='nav-link'>
            <span>Settings</span>
          </NavLink>
        </nav>
        <div className='sidebar-footer'>
          <p>Environment: {import.meta.env.VITE_MODE}</p>
        </div>
      </aside>

      <div className='app-content'>
        <header className='app-header'>
          <h1>{import.meta.env.VITE_APP_TITLE}</h1>
          <div className='header-actions'>
            <Button variant='secondary'>Export</Button>
            <Button variant='secondary'>Share</Button>
          </div>
        </header>

        <main className='app-main'>
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
