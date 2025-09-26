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

function Home() {
  return (
    <div className='container px-4 py-8 mx-auto'>
      <div className='max-w-4xl mx-auto space-y-8'>
        <div className='text-center'>
          <h1 className='mb-4 text-4xl font-bold text-gray-900'>
            Welcome to Beauty Salon Portal
          </h1>
          <p className='mb-8 text-lg text-gray-600'>
            Book your appointments and manage your beauty services.
          </p>
          <Button variant='default' size='lg'>
            Book Appointment
          </Button>
        </div>

        <div className='grid gap-6 mt-12 md:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>Quick Booking</CardTitle>
              <CardDescription>
                Schedule your next appointment in seconds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant='outline' className='w-full'>
                Select Service
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Special Offers</CardTitle>
              <CardDescription>Check out our latest promotions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant='secondary' className='w-full'>
                View Offers
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Services() {
  return (
    <div className='container px-4 py-8 mx-auto'>
      <h1 className='mb-8 text-3xl font-bold text-gray-900'>Our Services</h1>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Hair Styling</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600'>
              Professional cuts and styling
            </p>
          </CardContent>
        </Card>
        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Nail Care</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600'>
              Manicure and pedicure services
            </p>
          </CardContent>
        </Card>
        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Facial Treatments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600'>
              Rejuvenating skin treatments
            </p>
          </CardContent>
        </Card>
        <Card className='transition-shadow hover:shadow-lg'>
          <CardHeader>
            <CardTitle className='text-lg'>Massage Therapy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600'>Relaxing massage sessions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Appointments() {
  return (
    <div className='container px-4 py-8 mx-auto'>
      <h1 className='mb-8 text-3xl font-bold text-gray-900'>My Appointments</h1>
      <Card>
        <CardContent className='py-12 text-center'>
          <p className='mb-4 text-gray-500'>No appointments scheduled.</p>
          <Button>Schedule New Appointment</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function App() {
  return (
    <div className='flex flex-col min-h-screen bg-gray-50'>
      <EnvironmentBanner environment={import.meta.env.VITE_MODE} />
      <header className='bg-white border-b shadow-sm'>
        <div className='container px-4 py-4 mx-auto'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold text-primary'>
              {import.meta.env.VITE_APP_TITLE}
            </h1>
            <nav className='flex gap-6'>
              <Link
                to='/'
                className='text-gray-600 transition-colors hover:text-primary'
              >
                Home
              </Link>
              <Link
                to='/services'
                className='text-gray-600 transition-colors hover:text-primary'
              >
                Services
              </Link>
              <Link
                to='/appointments'
                className='text-gray-600 transition-colors hover:text-primary'
              >
                Appointments
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className='flex-1'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/services' element={<Services />} />
          <Route path='/appointments' element={<Appointments />} />
        </Routes>
      </main>

      <footer className='py-6 text-white bg-gray-900'>
        <div className='container px-4 mx-auto text-center'>
          <p className='mb-2'>© 2024 Beauty Salon. All rights reserved.</p>
          <p className='text-sm text-gray-400'>
            Environment: {import.meta.env.VITE_MODE}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
