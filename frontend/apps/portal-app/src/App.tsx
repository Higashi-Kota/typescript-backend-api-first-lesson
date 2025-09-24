import { Button } from '@beauty-salon-frontend/ui'
import { Link, Route, Routes } from 'react-router-dom'

function Home() {
  return (
    <div className='home'>
      <h1>Welcome to Beauty Salon Portal</h1>
      <p>Book your appointments and manage your beauty services.</p>
      <Button variant='primary'>Book Appointment</Button>
    </div>
  )
}

function Services() {
  return (
    <div className='services'>
      <h1>Our Services</h1>
      <ul>
        <li>Hair Styling</li>
        <li>Nail Care</li>
        <li>Facial Treatments</li>
        <li>Massage Therapy</li>
      </ul>
    </div>
  )
}

function Appointments() {
  return (
    <div className='appointments'>
      <h1>My Appointments</h1>
      <p>No appointments scheduled.</p>
    </div>
  )
}

function App() {
  return (
    <div className='app'>
      <header className='app-header'>
        <h1>{import.meta.env.VITE_APP_TITLE}</h1>
        <nav>
          <Link to='/'>Home</Link>
          <Link to='/services'>Services</Link>
          <Link to='/appointments'>Appointments</Link>
        </nav>
      </header>

      <main className='app-main'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/services' element={<Services />} />
          <Route path='/appointments' element={<Appointments />} />
        </Routes>
      </main>

      <footer className='app-footer'>
        <p>© 2024 Beauty Salon. All rights reserved.</p>
        <p>Environment: {import.meta.env.VITE_MODE}</p>
      </footer>
    </div>
  )
}

export default App
