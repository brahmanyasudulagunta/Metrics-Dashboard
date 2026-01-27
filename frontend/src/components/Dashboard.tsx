import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Card, CardContent, Button, Tabs, Tab, Box, CircularProgress, Alert,
  ThemeProvider, createTheme, CssBaseline, IconButton, Paper, Chip, FormControl, InputLabel,
  Select, MenuItem, Menu
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DownloadIcon from '@mui/icons-material/Download';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MetricCharts from './MetricCharts';

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

interface ContainerInfo {
  name: string;
  cpu: number;
  memory: number;
}

// Time range options
const TIME_RANGES = [
  { label: 'Last 1 Hour', value: '1h', seconds: 3600, step: '15s' },
  { label: 'Last 6 Hours', value: '6h', seconds: 21600, step: '1m' },
  { label: 'Last 12 Hours', value: '12h', seconds: 43200, step: '2m' },
  { label: 'Last 24 Hours', value: '24h', seconds: 86400, step: '5m' },
  { label: 'Last 7 Days', value: '7d', seconds: 604800, step: '30m' },
];

// Threshold configuration
const THRESHOLDS = {
  cpu: { warning: 60, critical: 80 },
  memory: { warning: 70, critical: 85 },
  disk: { warning: 75, critical: 90 },
};

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);
  return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
};

// Get status color and label based on value and thresholds
const getStatusColor = (value: number, thresholds = { warning: 60, critical: 80 }) => {
  if (value >= thresholds.critical) return { color: '#f44336', label: 'Critical', bgColor: '#ffebee' };
  if (value >= thresholds.warning) return { color: '#ff9800', label: 'Warning', bgColor: '#fff3e0' };
  return { color: '#4caf50', label: 'Healthy', bgColor: '#e8f5e9' };
};

const Dashboard: React.FC = () => {
  const [cpuData, setCpuData] = useState<MetricData[]>([]);
  const [memData, setMemData] = useState<MetricData[]>([]);
  const [diskData, setDiskData] = useState<MetricData[]>([]);
  const [rxData, setRxData] = useState<MetricData[]>([]);
  const [txData, setTxData] = useState<MetricData[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    uptime: 'Loading...',
    load1: 0, load5: 0, load15: 0,
    processesRunning: 0, processesBlocked: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#1976d2' },
      secondary: { main: '#dc004e' },
    },
  });

  const getTimeRangeParams = () => {
    const range = TIME_RANGES.find(r => r.value === timeRange) || TIME_RANGES[0];
    const end = Math.floor(Date.now() / 1000);
    const start = end - range.seconds;
    return { start, end, step: range.step };
  };

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const { start, end, step } = getTimeRangeParams();

    try {
      const [cpuRes, memRes, diskRes, rxRes, txRes, uptimeRes, loadRes, procRes, containersRes] = await Promise.all([
        axios.get(`http://localhost:8000/api/metrics/cpu?start=${start}&end=${end}&step=${step}`, { headers }),
        axios.get(`http://localhost:8000/api/metrics/memory?start=${start}&end=${end}&step=${step}`, { headers }),
        axios.get(`http://localhost:8000/api/metrics/disk?start=${start}&end=${end}&step=${step}`, { headers }),
        axios.get(`http://localhost:8000/api/metrics/network_rx?start=${start}&end=${end}&step=${step}`, { headers }),
        axios.get(`http://localhost:8000/api/metrics/network_tx?start=${start}&end=${end}&step=${step}`, { headers }),
        axios.get('http://localhost:8000/api/metrics/uptime', { headers }),
        axios.get('http://localhost:8000/api/metrics/load', { headers }),
        axios.get('http://localhost:8000/api/metrics/processes', { headers }),
        axios.get('http://localhost:8000/api/metrics/containers', { headers }),
      ]);
      setCpuData(cpuRes.data);
      setMemData(memRes.data);
      setDiskData(diskRes.data);
      setRxData(rxRes.data);
      setTxData(txRes.data);
      setContainers(containersRes.data.containers || []);
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
  }, [timeRange]);

  const handleRefresh = () => fetchMetrics();
  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const getCurrentValue = (data: MetricData[]) => data.length > 0 ? data[data.length - 1].value : 0;

  // Export to CSV
  const exportToCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const headers = ['Time', 'CPU (%)', 'Memory (%)', 'Disk (%)', 'Network RX (bytes)', 'Network TX (bytes)'];
    const maxLen = Math.max(cpuData.length, memData.length, diskData.length, rxData.length, txData.length);
    const rows = [];
    for (let i = 0; i < maxLen; i++) {
      rows.push([
        cpuData[i]?.time || '',
        cpuData[i]?.value?.toFixed(2) || '',
        memData[i]?.value?.toFixed(2) || '',
        diskData[i]?.value?.toFixed(2) || '',
        rxData[i]?.value?.toFixed(2) || '',
        txData[i]?.value?.toFixed(2) || '',
      ].join(','));
    }
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `metrics_export_${timestamp}.csv`;
    link.click();
    setExportAnchor(null);
  };

  // Export to JSON
  const exportToJSON = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const data = {
      exportedAt: new Date().toISOString(),
      timeRange: timeRange,
      systemInfo: systemInfo,
      containers: containers,
      metrics: { cpu: cpuData, memory: memData, disk: diskData, networkRx: rxData, networkTx: txData }
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `metrics_export_${timestamp}.json`;
    link.click();
    setExportAnchor(null);
  };

  const cpuStatus = getStatusColor(getCurrentValue(cpuData), THRESHOLDS.cpu);
  const memStatus = getStatusColor(getCurrentValue(memData), THRESHOLDS.memory);
  const diskStatus = getStatusColor(getCurrentValue(diskData), THRESHOLDS.disk);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" component="h1">📊 DevOps Monitoring Dashboard</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Time Range</InputLabel>
              <Select value={timeRange} label="Time Range" onChange={(e) => setTimeRange(e.target.value)}>
                {TIME_RANGES.map(range => (
                  <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={(e) => setExportAnchor(e.currentTarget)}>Export</Button>
            <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
              <MenuItem onClick={exportToCSV}>Export as CSV</MenuItem>
              <MenuItem onClick={exportToJSON}>Export as JSON</MenuItem>
            </Menu>
            <IconButton onClick={toggleDarkMode} color="inherit">
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>Refresh</Button>
            <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>Logout</Button>
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* System Info Cards */}
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
            <Card sx={{ flex: '1 1 180px', bgcolor: darkMode ? 'grey.800' : 'white' }}>
              <CardContent>
                <Typography color="textSecondary" variant="body2">🐳 Containers</Typography>
                <Typography variant="h6">{containers.length} running</Typography>
              </CardContent>
            </Card>
          </Box>
        </Paper>

        {/* Metric Cards with Alert Thresholds */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Card sx={{ flex: '1 1 200px', transition: '0.3s', '&:hover': { boxShadow: 6 }, borderLeft: `4px solid ${cpuStatus.color}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography color="textSecondary" variant="body2">🔴 CPU Usage</Typography>
                <Chip label={cpuStatus.label} size="small" sx={{ bgcolor: cpuStatus.color, color: 'white', fontWeight: 'bold' }} />
              </Box>
              <Typography variant="h5">{getCurrentValue(cpuData).toFixed(1)}%</Typography>
              <Typography variant="caption" color="textSecondary">Warn: {THRESHOLDS.cpu.warning}% | Crit: {THRESHOLDS.cpu.critical}%</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', transition: '0.3s', '&:hover': { boxShadow: 6 }, borderLeft: `4px solid ${memStatus.color}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography color="textSecondary" variant="body2">💾 Memory Usage</Typography>
                <Chip label={memStatus.label} size="small" sx={{ bgcolor: memStatus.color, color: 'white', fontWeight: 'bold' }} />
              </Box>
              <Typography variant="h5">{getCurrentValue(memData).toFixed(1)}%</Typography>
              <Typography variant="caption" color="textSecondary">Warn: {THRESHOLDS.memory.warning}% | Crit: {THRESHOLDS.memory.critical}%</Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 200px', transition: '0.3s', '&:hover': { boxShadow: 6 }, borderLeft: `4px solid ${diskStatus.color}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography color="textSecondary" variant="body2">💿 Disk Usage</Typography>
                <Chip label={diskStatus.label} size="small" sx={{ bgcolor: diskStatus.color, color: 'white', fontWeight: 'bold' }} />
              </Box>
              <Typography variant="h5">{getCurrentValue(diskData).toFixed(1)}%</Typography>
              <Typography variant="caption" color="textSecondary">Warn: {THRESHOLDS.disk.warning}% | Crit: {THRESHOLDS.disk.critical}%</Typography>
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
            <Tab label="Containers" />
          </Tabs>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <MetricCharts
              cpuData={cpuData}
              memData={memData}
              diskData={diskData}
              rxData={rxData}
              txData={txData}
              containers={containers}
              thresholds={THRESHOLDS}
              tabValue={tabValue}
              darkMode={darkMode}
            />
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default Dashboard;