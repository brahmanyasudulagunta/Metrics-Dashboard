import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert, CircularProgress } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import axios from 'axios';
import API_URL from '../config';

interface OptimizationData {
    namespace: string;
    pod: string;
    container: string;
    requested_mb: number;
    used_mb: number;
    waste_mb: number;
}

interface OptResponse {
    optimizations: OptimizationData[];
    total_waste_mb: number;
    estimated_monthly_waste_usd: number;
    error?: string;
}

const Optimization: React.FC = () => {
    const [data, setData] = useState<OptResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOptimization = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/metrics/optimization`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.error) {
                setError(res.data.error);
            } else {
                setData(res.data);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch optimization data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOptimization();
    }, []);

    if (loading) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    const { optimizations = [], total_waste_mb = 0, estimated_monthly_waste_usd = 0 } = data || {};

    return (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SavingsIcon color="primary" sx={{ fontSize: 28 }} />
                    Resource Optimization (FinOps)
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 4 }}>
                <Box>
                    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: '#161b22' }}>
                        <Typography variant="subtitle2" color="text.secondary">Total Memory Wasted</Typography>
                        <Typography variant="h4" color="warning.main" sx={{ fontWeight: 'bold' }}>
                            {(total_waste_mb / 1024).toFixed(2)} GB
                        </Typography>
                    </Paper>
                </Box>
                <Box>
                    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1, bgcolor: '#161b22' }}>
                        <Typography variant="subtitle2" color="text.secondary">Estimated Monthly Waste</Typography>
                        <Typography variant="h4" color="error.main" sx={{ fontWeight: 'bold' }}>
                            ${estimated_monthly_waste_usd}
                        </Typography>
                    </Paper>
                </Box>
            </Box>

            <Paper sx={{ width: '100%', overflow: 'hidden', bgcolor: '#0d1117' }}>
                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: '#161b22', fontWeight: 600 }}>Namespace / Pod</TableCell>
                                <TableCell sx={{ bgcolor: '#161b22', fontWeight: 600 }}>Container</TableCell>
                                <TableCell sx={{ bgcolor: '#161b22', fontWeight: 600 }}>Requested (MB)</TableCell>
                                <TableCell sx={{ bgcolor: '#161b22', fontWeight: 600 }}>Used (MB)</TableCell>
                                <TableCell sx={{ bgcolor: '#161b22', fontWeight: 600 }}>Waste (MB)</TableCell>
                                <TableCell sx={{ bgcolor: '#161b22', fontWeight: 600 }}>Recommendation</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {optimizations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                        <DoneAllIcon color="success" sx={{ fontSize: 48, mb: 1, opacity: 0.8 }} />
                                        <Typography color="text.secondary">Your cluster is highly optimized! No significant waste detected.</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                optimizations.map((opt, i) => (
                                    <TableRow key={i} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{opt.pod}</Typography>
                                            <Typography variant="caption" color="text.secondary">{opt.namespace}</Typography>
                                        </TableCell>
                                        <TableCell>{opt.container}</TableCell>
                                        <TableCell>{opt.requested_mb} MB</TableCell>
                                        <TableCell>{opt.used_mb} MB</TableCell>
                                        <TableCell>
                                            <Typography color="warning.main" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <WarningAmberIcon fontSize="small" />
                                                {opt.waste_mb} MB
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                size="small" 
                                                color="primary" 
                                                label={`Reduce requests to ~${(opt.used_mb * 1.5).toFixed(0)}MB`}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default Optimization;
