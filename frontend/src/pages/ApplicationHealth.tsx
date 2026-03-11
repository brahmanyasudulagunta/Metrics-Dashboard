import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, Chip, Tooltip } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import HubIcon from '@mui/icons-material/Hub';
import VerifiedIcon from '@mui/icons-material/Verified';
import axios from 'axios';
import API_URL from '../config';
import { tokens } from '../theme';

interface APMStatus {
    available: boolean;
    providers: {
        cadvisor: boolean;
        envoy: boolean;
    };
}

interface APMSummary {
    rps: number;
    throughput_kbps: number;
    error_rate: number;
    apps_monitored: number;
}

interface APMRoute {
    name: string;
    namespace: string;
    status: string;
    throughput_kbps: number;
    rps: number | null;
    error_rate: number;
    has_premium: boolean;
}

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color: string; icon?: React.ReactNode }> = ({ label, value, sub, color, icon }) => (
    <Paper sx={{ p: 3, flex: '1 1 0', minWidth: 200, display: 'flex', flexDirection: 'column', gap: 1, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" sx={{ color: tokens.text.muted }}>{label}</Typography>
            {icon && <Box sx={{ color: tokens.text.muted, opacity: 0.5 }}>{icon}</Box>}
        </Box>
        <Typography variant="h4" sx={{ color, fontWeight: 700 }}>{value}</Typography>
        {sub && <Typography variant="caption" sx={{ color: tokens.text.muted }}>{sub}</Typography>}
    </Paper>
);

const ApplicationHealth: React.FC = () => {
    const [status, setStatus] = useState<APMStatus | null>(null);
    const [summary, setSummary] = useState<APMSummary | null>(null);
    const [routes, setRoutes] = useState<APMRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAPM = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [statusRes, sumRes, routeRes] = await Promise.all([
                axios.get(`${API_URL}/api/metrics/apm/status`, { headers }),
                axios.get(`${API_URL}/api/metrics/apm/summary`, { headers }),
                axios.get(`${API_URL}/api/metrics/apm/routes`, { headers })
            ]);

            setStatus(statusRes.data);
            setSummary(sumRes.data);
            setRoutes(routeRes.data.routes || []);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Failed to fetch application metrics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAPM();
        const interval = setInterval(fetchAPM, 15000);
        return () => clearInterval(interval);
    }, []);

    const getHealthColor = (errorRate: number) => {
        if (errorRate >= 5) return tokens.accent.red;
        if (errorRate > 0) return tokens.accent.yellow;
        return tokens.accent.green;
    };

    if (loading && !summary && !status) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Application Health</Typography>
                    <Typography variant="body2" sx={{ color: tokens.text.muted }}>
                        Auto-discovered cluster applications and live traffic performance
                    </Typography>
                </Box>
                {status?.providers.envoy ? (
                    <Chip 
                        icon={<VerifiedIcon style={{ color: tokens.accent.blue }} />} 
                        label="Envoy L7 Enabled" 
                        size="small" 
                        sx={{ bgcolor: 'rgba(56,139,253,0.1)', color: tokens.accent.blue, border: '1px solid rgba(56,139,253,0.2)' }} 
                    />
                ) : (
                    <Chip label="Basic L4 Health" size="small" sx={{ opacity: 0.7 }} />
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Global Summary Row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                <StatCard
                    label="Active Apps"
                    value={summary?.apps_monitored || 0}
                    sub="Auto-discovered deployments"
                    color={tokens.text.primary}
                    icon={<HubIcon />}
                />
                <StatCard
                    label="Cluster Throughput"
                    value={`${summary?.throughput_kbps || 0} kB/s`}
                    sub="Total L4 network activity"
                    color={tokens.accent.blue}
                    icon={<SpeedIcon />}
                />
                <StatCard
                    label="Global Request Rate"
                    value={summary?.rps || 0}
                    sub="L7 Reqs/sec (via Envoy)"
                    color={tokens.text.primary}
                />
                <StatCard
                    label="Global Error Rate"
                    value={`${summary?.error_rate || 0}%`}
                    sub="L7 5xx failures"
                    color={getHealthColor(summary?.error_rate || 0)}
                />
            </Box>

            {/* Application List Table */}
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Cluster Applications (Last 2m)</Typography>
            <TableContainer component={Paper} sx={{ borderRadius: '8px', border: `1px solid ${tokens.border.default}` }}>
                <Table>
                    <TableHead sx={{ bgcolor: tokens.bg.surface }}>
                        <TableRow>
                            <TableCell>Application</TableCell>
                            <TableCell>Namespace</TableCell>
                            <TableCell align="center">Pod Status</TableCell>
                            <TableCell align="right">Throughput</TableCell>
                            <TableCell align="right">RPS (L7)</TableCell>
                            <TableCell align="right">Error Rate</TableCell>
                            <TableCell align="center">Mode</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {routes.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                    <Typography sx={{ color: tokens.text.muted }}>No applications discovered yet.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {routes.map((app, i) => (
                            <TableRow key={i} hover>
                                <TableCell sx={{ fontWeight: 600, color: tokens.text.primary }}>{app.name}</TableCell>
                                <TableCell>
                                    <Chip label={app.namespace} size="small" sx={{ fontSize: '0.7rem', height: 20, bgcolor: tokens.bg.surface }} />
                                </TableCell>
                                <TableCell align="center">
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: app.status.startsWith(app.status.split('/')[1]) ? tokens.accent.green : tokens.accent.yellow }}>
                                        {app.status}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{app.throughput_kbps} kB/s</TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                    {app.rps !== null ? app.rps : <Typography variant="caption" sx={{ color: tokens.text.muted }}>N/A</Typography>}
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'monospace', color: getHealthColor(app.error_rate) }}>
                                    {app.rps !== null ? `${app.error_rate}%` : '—'}
                                </TableCell>
                                <TableCell align="center">
                                    {app.has_premium ? (
                                        <Tooltip title="L7 API Performance Metrics (via Envoy)">
                                            <VerifiedIcon sx={{ fontSize: 18, color: tokens.accent.blue }} />
                                        </Tooltip>
                                    ) : (
                                        <Tooltip title="Basic L4 Network Throughput (Auto-discovered)">
                                            <HubIcon sx={{ fontSize: 18, color: tokens.text.muted, opacity: 0.5 }} />
                                        </Tooltip>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ApplicationHealth;
