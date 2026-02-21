import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import Login from './components/Login';
import Signup from './components/Signup';
import MainLayout from './components/layout/MainLayout';
import Overview from './pages/Overview';
import Network from './pages/Network';
import Containers from './pages/Containers';
import Settings from './pages/Settings';
import theme from './theme';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

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
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes wrapped in MainLayout */}
            <Route path="/dashboard" element={isAuthenticated ? <MainLayout onLogout={handleLogout} /> : <Navigate to="/login" />}>
              <Route index element={<Overview />} />
              <Route path="network" element={<Network />} />
              <Route path="containers" element={<Containers />} />
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
