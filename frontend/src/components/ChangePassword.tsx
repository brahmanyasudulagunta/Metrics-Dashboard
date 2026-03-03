import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Paper, Box, Alert, Avatar } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config';

const ChangePassword: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = async () => {
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 4) {
            setError('Password must be at least 4 characters.');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/change-password`, { new_password: newPassword }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to change password. Please try again.');
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={0} sx={{ padding: 4, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #2c3235' }}>
                <Avatar sx={{ m: 1, bgcolor: 'warning.main' }}>
                    <LockResetIcon />
                </Avatar>
                <Typography component="h1" variant="h5" color="textPrimary">
                    Change Password
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Please set a new password to continue
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2, width: '100%', mt: 2 }}>{error}</Alert>}
                <Box component="form" noValidate sx={{ mt: 1, width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoFocus
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button
                        fullWidth
                        variant="contained"
                        color="warning"
                        sx={{ mt: 3, mb: 2 }}
                        onClick={handleChange}
                    >
                        Update Password
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default ChangePassword;
