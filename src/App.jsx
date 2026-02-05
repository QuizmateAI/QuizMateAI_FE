import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HeroSection from './Pages/LandingPage/LandingPage';
import LoginPage from './Pages/Authentication/LoginPage';
import RegisterPage from './Pages/Authentication/RegisterPage';
import ForgotPasswordPage from './Pages/Authentication/ForgotPasswordPage';
import HomePage from './Pages/Users/HomePage';
import AdminLayout from './Pages/Admin/AdminLayout';
import AdminDashboard from './Pages/Admin/AdminDashboard';
import WorkspacePage from './Pages/Users/Individual/Workspace/WorkspacePage';
import Dark from './Pages/LandingPage/Darklanding';
import './i18n'; // Import i18n configuration
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/dark" element={<Dark />} />
        <Route path="/admin" element={<AdminLayout />} >
          <Route index element={<AdminDashboard />} />
          {/* Các route con khác của admin có thể được thêm ở đây */}
        </Route>
        <Route path="/workspace" element={<WorkspacePage />} />
      </Routes>
    </Router>
  )
}

export default App
