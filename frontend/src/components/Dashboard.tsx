import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Card, CardContent, Button, Tabs, Tab, Box, CircularProgress, Alert,
  ThemeProvider, createTheme, CssBaseline, IconButton, Paper
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface MetricData {
  time: string;
  value: number;
}

interface SystemInfo {
  uptime: string;
  load1: number;
  load5: number;
  load15: number;
  processesRunning: number;
  processesBlocked: number;
}

// Helper function to format bytes to human-readable units
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);
  return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
};

// Custom tooltip for percentage charts
const PercentageTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1.5 }}>
        <Typography variant="body2" fontWeight="bold">{label}</Typography>
        <Typography variant="body2" color="primary">
          {payload[0].value.toFixed(2)}%
        </Typography>
      </Paper>
    );
  }
  return null;
};

// Custom tooltip for network charts
const NetworkTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Paper sx={{ p: 1.5 }}>
        <Typography variant="body2" fontWeight="bold">{label}</Typography>
        <Typography variant="body2" color="primary">
          {formatBytes(payload[0].value)}
        </Typography>
      </Paper>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const [cpuData, setCpuData] = useState<MetricData[]>([]);
  const [memData, setMemData] = useState<MetricData[]>([]);
  const [diskData, setDiskData] = useState<MetricData[]>([]);
  const [rxData, setRxData] = useState<MetricData[]>([]);
  const [txData, setTxData] = useState<MetricData[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    uptime: 'Loading...',
    load1: 0, load5: 0, load15: 0,
    processesRunning: 0, processesBlocked: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
    },
  });

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [cpuRes, memRes, diskRes, rxRes, txRes, uptimeRes, loadRes, procRes] = await Promise.all([
        axios.get('http://localhost:8000/api/metrics/cpu', { headers }),
        axios.get('http://localhost:8000/api/metrics/memory', { headers }),
        axios.get('http://localhost:8000/api/metrics/disk', { headers }),
        axios.get('http://localhost:8000/api/metrics/network_rx', { headers }),
        axios.get('http://localhost:8000/api/metrics/network_tx', { headers }),
        axios.get('http://localhost:8000/api/metrics/uptime', { headers }),
        axios.get('http://localhost:8000/api/metrics/load', { headers }),
        axios.get('http://localhost:8000/api/metrics/processes', { headers }),
      ]);
      setCpuData(cpuRes.data);
      setMemData(memRes.data);
      setDiskData(diskRes.data);
      setRxData(rxRes.data);
      setTxData(txRes.data);
      setSystemInfo({
        uptime: uptimeRes.data.uptime,
        load1: loadRes.data.load1,
        load5: loadRes.data.load5,
        load15: loadRes.data.load15,
        processesRunning: procRes.data.running,
        processesBlocked: procRes.data.blocked,
      });
    } catch (err) {
      setError('Failed to fetch metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => fetchMetrics();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const getCurrentValue = (data: MetricData[]) => data.length > 0 ? data[data.length - 1].value : 0;

  // Y-axis tick formatter for percentage
  const formatPercent = (value: number) => `${value}%`;

  // Y-axis tick formatter for network (auto-scale)
  const formatNetworkTick = (value: number) => {
    if (value === 0) return '0';
    const k = 1024;
    if (value < k) return `${value.toFixed(0)}B`;
    if (value < k * k) return `${(value / k).toFixed(0)}K`;
    return `${(value / (k * k)).toFixed(1)}M`;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            📊 DevOps Monitoring Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={toggleDarkMode} color="inherit">
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>
              Refresh
            </Button>
            <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* System Info Cards - Quick Wins */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: darkMode ? 'grey.900' : 'grey.100' }}>
          <Typography variant="h6" gutterBottom>⚡ System Overview</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Card sx={{ flex: '1 1 180px', bgcolor: darkMode ? 'grey.800' : 'white' }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">⏱️ Uptime</Typography>
                <Typography variant="h6">{systemInfo.uptime}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 180px', bgcolor: darkMode ? 'grey.800' : 'white' }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">📊 Load Average</Typography>
                <Typography variant="h6">{systemInfo.load1} / {systemInfo.load5} / {systemInfo.load15}</Typography>
                <Typography variant="caption" color="textSecondary">1 / 5 / 15 min</Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 180px', bgcolor: darkMode ? 'grey.800' : 'white' }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">⚙️ Processes</Typography>
                <Typography variant="h6">{systemInfo.processesRunning} running</Typography>
                <Typography variant="caption" color="textSecondary">{systemInfo.processesBlocked} blocked</Typography>
              </CardContent>
            </Card>
          </Box>
        </Paper>

        {/* Metric Cards */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Card sx={{ flex: '1 1 200px', transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>🔴 CPU Usage</Typography>
              <Typography variant="h5">{getCurrentValue(cpuData).toFixed(1)}%</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>💾 Memory Usage</Typography>
              <Typography variant="h5">{getCurrentValue(memData).toFixed(1)}%</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>💿 Disk Usage</Typography>
              <Typography variant="h5">{getCurrentValue(diskData).toFixed(1)}%</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', transition: '0.3s', '&:hover': { boxShadow: 6 } }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>📡 Network RX</Typography>
              <Typography variant="h5">{formatBytes(getCurrentValue(rxData))}</Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Tabs for Charts */}
        <Box sx={{ width: '100%' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} aria-label="metrics tabs">
            <Tab label="System" />
            <Tab label="Network" />
          </Tabs>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {tabValue === 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                    <Typography variant="h6" gutterBottom>CPU Usage (%)</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={cpuData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis tickFormatter={formatPercent} domain={[0, 100]} />
                        <Tooltip content={<PercentageTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="CPU %" stroke="#8884d8" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                    <Typography variant="h6" gutterBottom>Memory Usage (%)</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={memData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis tickFormatter={formatPercent} domain={[0, 100]} />
                        <Tooltip content={<PercentageTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="Memory %" stroke="#82ca9d" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ flex: '1 1 100%', minWidth: 300 }}>
                    <Typography variant="h6" gutterBottom>Disk Usage (%)</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={diskData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis tickFormatter={formatPercent} domain={[0, 100]} />
                        <Tooltip content={<PercentageTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="Disk %" stroke="#ffc658" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              )}
              {tabValue === 1 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                    <Typography variant="h6" gutterBottom>Network Receive (Throughput)</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={rxData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis tickFormatter={formatNetworkTick} />
                        <Tooltip content={<NetworkTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="RX" stroke="#ff7300" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                    <Typography variant="h6" gutterBottom>Network Transmit (Throughput)</Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={txData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis tickFormatter={formatNetworkTick} />
                        <Tooltip content={<NetworkTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="value" name="TX" stroke="#00c853" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default Dashboard;