import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axios from 'axios';
import API_URL from '../config';
import { tokens } from '../theme';

interface APMStatus {
    available: boolean;
    provider: string;
}

interface APMSummary {
    rps: number;
    error_rate: number;
    p95_latency_ms: number;
    error?: string;
}

interface APMRoute {
    gateway: string;
    path: string;
    rps: number;
    errors: number;
    error_rate: number;
    p95_ms: number;
}

const StatCard: React.FC<{ label: string; value: string | number; sub?: string; color: string }> = ({ label, value, sub, color }) => (
    <Paper sx={{ p: 3, flex: '1 1 0', minWidth: 200, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="subtitle2">{label}</Typography>
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

    useEffect(() => {
        const fetchAPM = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                // First check if Envoy metrics are available
                const statusRes = await axios.get(`${API_URL}/api/metrics/apm/status`, { headers });
                setStatus(statusRes.data);

                if (!statusRes.data.available) {
                    setLoading(false);
                    return;
                }

                const [sumRes, routeRes] = await Promise.all([
                    axios.get(`${API_URL}/api/metrics/apm/summary`, { headers }),
                    axios.get(`${API_URL}/api/metrics/apm/routes`, { headers })
                ]);

                if (sumRes.data.error) throw new Error(sumRes.data.error);
                if (routeRes.data.error) throw new Error(routeRes.data.error);

                setSummary(sumRes.data);
                setRoutes(routeRes.data.routes || []);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch application metrics from Envoy Gateway.');
            } finally {
                setLoading(false);
            }
        };

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

    // Show "Not Configured" state when Envoy metrics are not detected
    if (status && !status.available) {
        return (
            <Box>
                <Typography variant="h5" sx={{ mb: 3 }}>Application Health (RED Metrics)</Typography>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <WarningAmberIcon sx={{ fontSize: 56, color: tokens.accent.yellow, mb: 2 }} />
                    <Typography variant="h6" sx={{ mb: 1, color: tokens.text.primary }}>
                        Envoy Gateway Not Detected
                    </Typography>
                    <Typography variant="body2" sx={{ color: tokens.text.muted, mb: 3, maxWidth: 520, mx: 'auto' }}>
                        The App Health tab requires Envoy Gateway to export Prometheus metrics.
                        No <code>envoy_http_downstream_rq_total</code> metrics were found.
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: tokens.bg.base, maxWidth: 520, mx: 'auto', textAlign: 'left' }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>To enable, upgrade your Helm release:</Typography>
                        <Box component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: tokens.accent.green, m: 0, whiteSpace: 'pre-wrap' }}>
{`helm upgrade metrics metrics/metrics \\
  --set envoyGateway.enabled=true \\
  --set gateway.enabled=true`}
                        </Box>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: tokens.text.muted }}>
                            If you already have Envoy Gateway installed, just enable the gateway resources:
                        </Typography>
                        <Box component="pre" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: tokens.accent.blue, m: 0, mt: 0.5, whiteSpace: 'pre-wrap' }}>
{`helm upgrade metrics metrics/metrics \\
  --set gateway.enabled=true`}
                        </Box>
                    </Paper>
                </Paper>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" sx={{ mb: 3 }}>Application Health (RED Metrics)</Typography>
            
            {error && <Alert severity="warning" sx={{ mb: 3 }}>{error} <br/>(Note: This requires Envoy Gateway exporting Prometheus metrics.)</Alert>}

            {/* Global Summary Row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                <StatCard 
                    label="Global Request Rate (RPS)" 
                    value={summary?.rps || 0} 
                    sub="Reqs per second across all routes"
                    color={tokens.text.primary} 
                />
                <StatCard 
                    label="Global 5xx Error Rate" 
                    value={`${summary?.error_rate || 0}%`} 
                    sub="Percentage of requests returning 5xx status"
                    color={getHealthColor(summary?.error_rate || 0)} 
                />
                <StatCard 
                    label="Global P95 Latency" 
                    value={`${summary?.p95_latency_ms || 0} ms`} 
                    sub="95% of requests are faster than this"
                    color={summary?.p95_latency_ms && summary.p95_latency_ms > 1000 ? tokens.accent.yellow : tokens.accent.blue} 
                />
            </Box>

            {/* Route Detail Table */}
            <Typography variant="subtitle2" sx={{ mb: 2 }}>Route Performance Details (Last 2 minutes)</Typography>
            <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Gateway Route</TableCell>
                            <TableCell align="right">Req Rate (RPS)</TableCell>
                            <TableCell align="right">5xx Errors / sec</TableCell>
                            <TableCell align="right">Error Rate</TableCell>
                            <TableCell align="right">P95 Latency</TableCell>
                            <TableCell align="center">Health</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {routes.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 6, color: tokens.text.muted }}>
                                    No active HTTP traffic detected in the last 2 minutes.
                                </TableCell>
                            </TableRow>
                        )}
                        {routes.map((route, i) => (
                            <TableRow key={i} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <Typography sx={{ fontWeight: 600, color: tokens.text.primary, fontFamily: 'monospace' }}>
                                            {route.path}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: tokens.text.muted }}>
                                            Gateway: {route.gateway}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>{route.rps}</TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'monospace', color: route.errors > 0 ? tokens.accent.red : 'inherit' }}>
                                    {route.errors}
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'monospace', color: getHealthColor(route.error_rate) }}>
                                    {route.error_rate}%
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                    {route.p95_ms} ms
                                </TableCell>
                                <TableCell align="center">
                                    <Chip 
                                        size="small" 
                                        label={route.error_rate >= 5 ? 'Critical' : (route.error_rate > 0 ? 'Degraded' : 'Healthy')} 
                                        sx={{ 
                                            bgcolor: `rgba(${route.error_rate >= 5 ? '218,54,51' : (route.error_rate > 0 ? '210,153,34' : '35,134,54')}, 0.15)`,
                                            color: getHealthColor(route.error_rate),
                                            fontWeight: 700,
                                            border: `1px solid rgba(${route.error_rate >= 5 ? '218,54,51' : (route.error_rate > 0 ? '210,153,34' : '35,134,54')}, 0.3)`
                                        }} 
                                    />
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
