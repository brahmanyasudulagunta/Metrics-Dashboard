import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Paper, Box, Alert, Avatar } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';

const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/signup`, { username, password });
      setSuccess('User created successfully! Please login.');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
      setSuccess('');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={0} sx={{ padding: 4, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #2c3235' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" color="textPrimary">
          Sign up
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2, width: '100%', mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2, width: '100%', mt: 2 }}>{success}</Alert>}
        <Box component="form" noValidate sx={{ mt: 1, width: '100%' }}>
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
            sx={{ mt: 3, mb: 2 }}
            onClick={handleSignup}
          >
            Sign Up
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/login')}
          >
            Already have an account? Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Signup;
