import React, { useEffect, useState } from 'react';
import { Typography, Box, CircularProgress, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress } from '@mui/material';
import axios from 'axios';
import API_URL from '../config';

interface ContainerInfo { name: string; cpu: number; memory: number; }

const Containers: React.FC = () => {
    const [containers, setContainers] = useState<ContainerInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchContainers = async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const res = await axios.get(`${API_URL}/api/metrics/containers`, { headers });
            setContainers(res.data.containers || []);
        } catch (err) {
            setError('Failed to fetch Container metrics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContainers();
        const interval = setInterval(fetchContainers, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading && containers.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Containers</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                            <TableCell><strong>Container</strong></TableCell>
                            <TableCell><strong>CPU Usage</strong></TableCell>
                            <TableCell><strong>Memory (MB)</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {containers.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    <Typography color="textSecondary" sx={{ py: 3 }}>No container data available.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            containers.map((container) => {
                                const isWarning = container.cpu > 50;
                                const isCritical = container.cpu > 80;
                                const status = isCritical ? 'Critical' : isWarning ? 'Warning' : 'Healthy';
                                const statusColor = isCritical ? '#f44336' : isWarning ? '#ff9800' : '#4caf50';

                                return (
                                    <TableRow key={container.name} hover>
                                        <TableCell>
                                            <Typography fontWeight="medium">{container.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 100 }}>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min(container.cpu, 100)}
                                                        sx={{
                                                            height: 8,
                                                            borderRadius: 4,
                                                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                bgcolor: statusColor
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                                <Typography variant="body2">{container.cpu.toFixed(1)}%</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>{container.memory.toFixed(1)} <Typography component="span" variant="caption" color="textSecondary">MB</Typography></TableCell>
                                        <TableCell>
                                            <Chip
                                                label={status}
                                                size="small"
                                                sx={{ bgcolor: statusColor, color: 'white', fontWeight: 'bold', height: 20, fontSize: '0.7rem' }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default Containers;
