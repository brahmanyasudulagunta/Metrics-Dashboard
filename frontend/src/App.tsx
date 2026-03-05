import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import Login from './components/Login';
import ChangePassword from './components/ChangePassword';
import MainLayout from './components/layout/MainLayout';
import Overview from './pages/Overview';
import Explore from './pages/Explorer';
import Containers from './pages/Containers';
import ContainerDetail from './pages/ContainerDetail';
import Kubernetes from './pages/Kubernetes';
import PodDetail from './pages/PodDetail';
import Settings from './pages/Settings';
import { getTheme } from './theme';
import axios from 'axios';
import API_URL from './config';

const theme = getTheme('dark');

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  // Validate stored token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios.get(`${API_URL}/api/metrics/system`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch((err) => {
      // Only logout on 401 (expired/invalid token), not on network errors
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login setAuth={setIsAuthenticated} />} />
            <Route path="/change-password" element={<ChangePassword />} />

            {/* Protected Routes wrapped in MainLayout */}
            <Route path="/dashboard" element={isAuthenticated ? <MainLayout onLogout={handleLogout} /> : <Navigate to="/login" />}>
              <Route index element={<Overview />} />
              <Route path="explore" element={<Explore />} />
              <Route path="containers" element={<Containers />} />
              <Route path="containers/:id" element={<ContainerDetail />} />
              <Route path="kubernetes" element={<Kubernetes />} />
              <Route path="kubernetes/:namespace/:name" element={<PodDetail />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;
