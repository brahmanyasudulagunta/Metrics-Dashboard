import React, { useEffect, useState } from 'react';
import { Typography, Card, CardContent, Box, CircularProgress, Alert, Paper, Chip } from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import DiscFullIcon from '@mui/icons-material/DiscFull';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import axios from 'axios';
import API_URL from '../config';
import MetricCharts from '../components/MetricCharts';

// Interfaces and common config duplicated temporarily until generalized hook/context
interface MetricData { time: string; value: number; }
interface SystemInfo {
    uptime: string; load1: number; load5: number; load15: number;
    processesRunning: number; processesBlocked: number;
    temperature: { value: number; status: string; available: boolean };
}
interface ContainerInfo { name: string; cpu: number; memory: number; }

const THRESHOLDS = {
    cpu: { warning: 60, critical: 80 },
    memory: { warning: 70, critical: 85 },
    disk: { warning: 75, critical: 90 },
};

const getStatusColor = (value: number, thresholds = { warning: 60, critical: 80 }) => {
    if (value >= thresholds.critical) return { color: '#f44336', label: 'Critical' };
    if (value >= thresholds.warning) return { color: '#ff9800', label: 'Warning' };
    return { color: '#4caf50', label: 'Healthy' };
};

const Overview: React.FC = () => {
    const [cpuData, setCpuData] = useState<MetricData[]>([]);
    const [memData, setMemData] = useState<MetricData[]>([]);
    const [diskData, setDiskData] = useState<MetricData[]>([]);
    const [containers, setContainers] = useState<ContainerInfo[]>([]);
    const [systemInfo, setSystemInfo] = useState<SystemInfo>({
        uptime: 'Loading...', load1: 0, load5: 0, load15: 0, processesRunning: 0, processesBlocked: 0,
        temperature: { value: 0, status: 'N/A', available: false }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const getTimeRangeParams = () => {
        const end = Math.floor(Date.now() / 1000);
        const start = end - 3600; // Fixed 1 hour window
        return { start, end, step: '15s' };
    };

    const fetchMetrics = async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const { start, end, step } = getTimeRangeParams();

        try {
            const [cpuRes, memRes, diskRes, uptimeRes, loadRes, procRes, containersRes, tempRes] = await Promise.all([
                axios.get(`${API_URL}/api/metrics/cpu?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/memory?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/disk?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/uptime`, { headers }),
                axios.get(`${API_URL}/api/metrics/load`, { headers }),
                axios.get(`${API_URL}/api/metrics/processes`, { headers }),
                axios.get(`${API_URL}/api/metrics/containers`, { headers }),
                axios.get(`${API_URL}/api/metrics/temperature`, { headers }),
            ]);
            setCpuData(cpuRes.data);
            setMemData(memRes.data);
            setDiskData(diskRes.data);
            setContainers(containersRes.data.containers || []);
            setSystemInfo({
                uptime: uptimeRes.data.uptime,
                load1: loadRes.data.load1, load5: loadRes.data.load5, load15: loadRes.data.load15,
                processesRunning: procRes.data.running, processesBlocked: procRes.data.blocked,
                temperature: tempRes.data,
            });
        } catch (err) {
            setError('Failed to fetch Overview metrics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        // Auto-refresh interval (Grafana style)
        const interval = setInterval(fetchMetrics, 15000);
        return () => clearInterval(interval);
    }, []);

    const getCurrentValue = (data: MetricData[]) => data.length > 0 ? data[data.length - 1].value : 0;

    const cpuStatus = getStatusColor(getCurrentValue(cpuData), THRESHOLDS.cpu);
    const memStatus = getStatusColor(getCurrentValue(memData), THRESHOLDS.memory);
    const diskStatus = getStatusColor(getCurrentValue(diskData), THRESHOLDS.disk);

    if (loading && cpuData.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>System Overview</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Card sx={{ flex: '1 1 180px', bgcolor: 'transparent', boxShadow: 'none' }}>
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography color="textSecondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><AccessTimeIcon fontSize="small" color="primary" /> Uptime</Typography>
                            <Typography variant="h5" sx={{ mt: 1 }}>{systemInfo.uptime}</Typography>
                        </CardContent>
                    </Card>
                    <Card sx={{ flex: '1 1 180px', bgcolor: 'transparent', boxShadow: 'none' }}>
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography color="textSecondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><SpeedIcon fontSize="small" sx={{ color: '#5794f2' }} /> Load Average</Typography>
                            <Typography variant="h5" sx={{ mt: 1 }}>{systemInfo.load1} / {systemInfo.load5} / {systemInfo.load15}</Typography>
                            <Typography variant="caption" color="textSecondary">1 / 5 / 15 min</Typography>
                        </CardContent>
                    </Card>
                    <Card sx={{ flex: '1 1 180px', bgcolor: 'transparent', boxShadow: 'none' }}>
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography color="textSecondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><SettingsIcon fontSize="small" sx={{ color: '#ff9830' }} /> Processes</Typography>
                            <Typography variant="h5" sx={{ mt: 1 }}>{systemInfo.processesRunning} <Typography component="span" variant="body2" color="textSecondary">running</Typography></Typography>
                            <Typography variant="caption" color="textSecondary">{systemInfo.processesBlocked} blocked</Typography>
                        </CardContent>
                    </Card>
                    <Card sx={{ flex: '1 1 180px', bgcolor: 'transparent', boxShadow: 'none' }}>
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography color="textSecondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><StorageIcon fontSize="small" sx={{ color: '#73bf69' }} /> Containers</Typography>
                            <Typography variant="h5" sx={{ mt: 1 }}>{containers.length} <Typography component="span" variant="body2" color="textSecondary">running</Typography></Typography>
                        </CardContent>
                    </Card>
                    <Card sx={{ flex: '1 1 180px', bgcolor: 'transparent', boxShadow: 'none', borderLeft: systemInfo.temperature.available ? (systemInfo.temperature.value > 80 ? '2px solid #f44336' : '2px solid #4caf50') : 'none' }}>
                        <CardContent sx={{ p: '16px !important' }}>
                            <Typography color="textSecondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ThermostatIcon fontSize="small" /> Temperature</Typography>
                            <Typography variant="h5" sx={{ mt: 1 }}>
                                {systemInfo.temperature.available ? `${systemInfo.temperature.value}°C` : 'N/A'}
                            </Typography>
                            <Typography variant="caption" color={systemInfo.temperature.available ? (systemInfo.temperature.value > 80 ? 'error' : 'textSecondary') : 'textSecondary'}>
                                {systemInfo.temperature.status}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Paper>

            {/* Metric Cards summary */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
                <Card sx={{ flex: '1 1 200px', borderTop: `3px solid ${cpuStatus.color}`, borderRadius: 1 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography color="textSecondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><MemoryIcon fontSize="small" /> CPU Usage</Typography>
                            <Chip label={cpuStatus.label} size="small" sx={{ bgcolor: cpuStatus.color, color: 'white', fontWeight: 'bold', height: 20, fontSize: '0.7rem' }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 500 }}>{getCurrentValue(cpuData).toFixed(1)}%</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', borderTop: `3px solid ${memStatus.color}`, borderRadius: 1 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography color="textSecondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><StorageIcon fontSize="small" /> Memory Usage</Typography>
                            <Chip label={memStatus.label} size="small" sx={{ bgcolor: memStatus.color, color: 'white', fontWeight: 'bold', height: 20, fontSize: '0.7rem' }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 500 }}>{getCurrentValue(memData).toFixed(1)}%</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', borderTop: `3px solid ${diskStatus.color}`, borderRadius: 1 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography color="textSecondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><DiscFullIcon fontSize="small" /> Disk Usage</Typography>
                            <Chip label={diskStatus.label} size="small" sx={{ bgcolor: diskStatus.color, color: 'white', fontWeight: 'bold', height: 20, fontSize: '0.7rem' }} />
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 500 }}>{getCurrentValue(diskData).toFixed(1)}%</Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Render System charts from MetricCharts component passing tabValue 0 to reuse the layout */}
            <MetricCharts
                cpuData={cpuData}
                memData={memData}
                diskData={diskData}
                rxData={[]} txData={[]} containers={[]} // Unused in System tab
                thresholds={THRESHOLDS}
                tabValue={0} // System
            />
        </Box>
    );
};

export default Overview;
