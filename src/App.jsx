import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HeroSection from './Pages/LandingPage';
import LoginPage from './Pages/Authentication/Login';
import RegisterPage from './Pages/Authentication/RegisterPage';
import ForgotPasswordPage from './Pages/Authentication/ForgotPasswordPage';
import './App.css'


function App() {
  const [count, setCount] = useState(0)

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>
    </Router>
  )
}

export default App
