import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Alert, CircularProgress, Button, ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import MemoryIcon from '@mui/icons-material/Memory';
import DeveloperBoardIcon from '@mui/icons-material/DeveloperBoard';
import axios from 'axios';
import API_URL from '../config';
import { tokens } from '../theme';

interface OptimizationData {
    namespace: string;
    pod: string;
    deployment: string;
    requested_mb: number;
    used_mb: number;
    waste_mb: number;
    requested_cpu: number;
    used_cpu: number;
    waste_cpu: number;
}

interface OptResponse {
    optimizations: OptimizationData[];
    total_waste_mb: number;
    total_waste_cpu: number;
    estimated_monthly_waste_usd: number;
    error?: string;
}

const UsageBar: React.FC<{ used: number; requested: number; type: 'memory' | 'cpu' }> = ({ used, requested, type }) => {
    const percent = requested > 0 ? Math.min((used / requested) * 100, 100) : 0;
    const format = type === 'memory' ? `${used}MB / ${requested}MB` : `${used.toFixed(2)} / ${requested.toFixed(2)} CPU`;
    
    return (
        <Box sx={{ width: '100%', minWidth: 120 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: tokens.text.muted, fontSize: '0.7rem' }}>Usage</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{format}</Typography>
            </Box>
            <Box sx={{ width: '100%', height: 6, bgcolor: tokens.bg.surface, borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ 
                    height: '100%', 
                    width: `${percent}%`, 
                    bgcolor: percent > 80 ? tokens.accent.red : percent > 50 ? tokens.accent.yellow : tokens.chart.cpu,
                    borderRadius: 3
                }} />
            </Box>
        </Box>
    );
};

const Optimization: React.FC = () => {
    const [data, setData] = useState<OptResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'memory' | 'cpu'>('memory');
    const [applying, setApplying] = useState<string | null>(null);
    const [applyDialog, setApplyDialog] = useState<{ open: boolean, opt: OptimizationData | null }>({ open: false, opt: null });

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

    const handleApply = async (opt: OptimizationData) => {
        if (!opt.deployment) {
            alert("Could not identify deployment name for this pod.");
            return;
        }
        setApplyDialog({ open: true, opt });
    };

    const executeApply = async () => {
        const opt = applyDialog.opt;
        if (!opt) return;
        setApplyDialog({ open: false, opt: null });

        const newCpu = Math.max((opt.used_cpu * 1.5), 0.1).toFixed(3);
        const newMem = Math.max((opt.used_mb * 1.5), 64).toFixed(0);
        
        setApplying(opt.pod);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                deployment: opt.deployment,
                namespace: opt.namespace,
                cpu_limit: viewMode === 'cpu' ? `${newCpu}` : undefined,
                memory_limit: viewMode === 'memory' ? `${newMem}Mi` : undefined
            };
            await axios.post(`${API_URL}/api/metrics/optimization/apply`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh after short delay
            setTimeout(fetchOptimization, 1000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to apply optimization.');
        } finally {
            setApplying(null);
        }
    };

    const renderDialogContent = () => {
        if (!applyDialog.opt) return null;
        const opt = applyDialog.opt;
        const newCpu = Math.max((opt.used_cpu * 1.5), 0.1).toFixed(3);
        const newMem = Math.max((opt.used_mb * 1.5), 64).toFixed(0);

        return (
            <>
                <DialogContentText>
                    Are you sure you want to apply optimization for <strong>{opt.deployment}</strong>?
                </DialogContentText>
                <DialogContentText sx={{ mt: 2, fontFamily: 'monospace', p: 1.5, bgcolor: tokens.bg.base, borderRadius: 1 }}>
                    {viewMode === 'cpu' ? `New CPU Limit: ~${newCpu} cores` : `New Memory Limit: ~${newMem}Mi`}
                </DialogContentText>
            </>
        );
    };

    if (loading && !data) {
        return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
    }

    const { optimizations = [], total_waste_mb = 0, total_waste_cpu = 0, estimated_monthly_waste_usd = 0 } = data || {};

    // Filter and sort based on viewMode
    const displayList = [...optimizations]
        .filter(opt => viewMode === 'memory' ? opt.waste_mb > 0 : opt.waste_cpu > 0.01)
        .sort((a, b) => viewMode === 'memory' ? b.waste_mb - a.waste_mb : b.waste_cpu - a.waste_cpu);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Resource Optimization</Typography>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(e, v) => v && setViewMode(v)}
                    size="small"
                >
                    <ToggleButton value="memory"><MemoryIcon sx={{ mr: 1, fontSize: 18 }}/> Memory</ToggleButton>
                    <ToggleButton value="cpu"><DeveloperBoardIcon sx={{ mr: 1, fontSize: 18 }}/> CPU</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mb: 4 }}>
                <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Total Memory Wasted</Typography>
                    <Typography variant="h4" sx={{ color: tokens.accent.purple, fontWeight: 700 }}>
                        {(total_waste_mb / 1024).toFixed(2)} GB
                    </Typography>
                </Paper>
                <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Total CPU Wasted</Typography>
                    <Typography variant="h4" sx={{ color: tokens.accent.cyan, fontWeight: 700 }}>
                        {total_waste_cpu.toFixed(2)} Cores
                    </Typography>
                </Paper>
                <Paper sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Potential Monthly Savings</Typography>
                    <Typography variant="h4" sx={{ color: tokens.accent.green, fontWeight: 700 }}>
                        ${estimated_monthly_waste_usd}
                    </Typography>
                </Paper>
            </Box>

            <TableContainer component={Paper} sx={{ overflowX: 'auto', borderRadius: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Workload</TableCell>
                            <TableCell>Resource Comparison</TableCell>
                            <TableCell align="right">Waste</TableCell>
                            <TableCell align="center">Recommendation</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {displayList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                                    <DoneAllIcon sx={{ fontSize: 48, mb: 1, opacity: 0.6, color: tokens.accent.green }} />
                                    <Typography sx={{ color: tokens.text.muted }}>Your cluster is highly optimized! No significant waste detected.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayList.map((opt, i) => (
                                <TableRow key={i} hover>
                                    <TableCell sx={{ minWidth: 200 }}>
                                        <Typography sx={{ fontWeight: 600, color: tokens.accent.blue }}>
                                            {opt.deployment || opt.pod}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">{opt.namespace}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 250 }}>
                                        <UsageBar 
                                            used={viewMode === 'memory' ? opt.used_mb : opt.used_cpu} 
                                            requested={viewMode === 'memory' ? opt.requested_mb : opt.requested_cpu} 
                                            type={viewMode} 
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography sx={{ color: tokens.accent.yellow, fontWeight: 700, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5 }}>
                                            <WarningAmberIcon fontSize="small" />
                                            {viewMode === 'memory' ? `${opt.waste_mb} MB` : `${opt.waste_cpu} CPU`}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Button 
                                            variant="outlined" 
                                            size="small" 
                                            color="primary"
                                            startIcon={applying === opt.pod ? <CircularProgress size={14} /> : <AutoFixHighIcon />}
                                            disabled={applying !== null || !opt.deployment}
                                            onClick={() => handleApply(opt)}
                                            sx={{ borderRadius: 4, textTransform: 'none' }}
                                        >
                                            {viewMode === 'memory' ? `Scale down to ${(opt.used_mb * 1.5).toFixed(0)}MB` : `Scale down to ${(opt.used_cpu * 1.5).toFixed(2)} CPU`}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialogs */}
            <Dialog open={applyDialog.open} onClose={() => setApplyDialog({ ...applyDialog, open: false })}>
                <DialogTitle>Confirm Apply Optimization</DialogTitle>
                <DialogContent>
                    {renderDialogContent()}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApplyDialog({ ...applyDialog, open: false })} color="inherit">Cancel</Button>
                    <Button onClick={executeApply} color="primary" variant="contained">Apply Optimization</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Optimization;
