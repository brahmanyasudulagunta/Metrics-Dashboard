import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Paper, Box, Alert, Avatar } from '@mui/material';
import MetricsLogo from './MetricsLogo';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';

interface LoginProps {
  setAuth: (auth: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ setAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/login`, { username, password });
      localStorage.setItem('token', response.data.access_token);
      setAuth(true);

      if (response.data.must_change_password) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={0} sx={{ padding: 4, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #2c3235' }}>
        <Avatar sx={{ m: 1, bgcolor: 'transparent', width: 56, height: 56 }}>
          <MetricsLogo sx={{ fontSize: 48, filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.6))' }} />
        </Avatar>
        <Typography component="h1" variant="h5" color="textPrimary">
          Metrics
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Sign in to continue
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2, width: '100%', mt: 2 }}>{error}</Alert>}
        <Box component="form" noValidate sx={{ mt: 1, width: '100%' }} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            fullWidth
            variant="contained"
            type="submit"
            sx={{ mt: 3, mb: 2 }}
          >
            Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;
