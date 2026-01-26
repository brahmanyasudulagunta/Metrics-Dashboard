import React, { useEffect, useState } from 'react';
import {
  Container, Typography, Card, CardContent, Button, Tabs, Tab, Box, CircularProgress, Alert
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

interface MetricData {
  time: string;
  value: number;
}

const Dashboard: React.FC = () => {
  const [cpuData, setCpuData] = useState<MetricData[]>([]);
  const [memData, setMemData] = useState<MetricData[]>([]);
  const [diskData, setDiskData] = useState<MetricData[]>([]);
  const [rxData, setRxData] = useState<MetricData[]>([]);
  const [txData, setTxData] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    try {
      const [cpuRes, memRes, diskRes, rxRes, txRes] = await Promise.all([
        axios.get('http://localhost:8000/api/metrics/cpu', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/metrics/memory', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/metrics/disk', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/metrics/network_rx', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:8000/api/metrics/network_tx', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setCpuData(cpuRes.data);
      setMemData(memRes.data);
      setDiskData(diskRes.data);
      setRxData(rxRes.data);
      setTxData(txRes.data);
    } catch (err) {
      setError('Failed to fetch metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => fetchMetrics();

  const getCurrentValue = (data: MetricData[]) => data.length > 0 ? data[data.length - 1].value : 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        📊 DevOps Monitoring Dashboard
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleRefresh} disabled={loading}>
          Refresh
        </Button>
      </Box>

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
            <Typography variant="h5">{getCurrentValue(rxData).toFixed(2)} bytes/s</Typography>
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
                  <Typography variant="h6" gutterBottom>CPU Usage</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cpuData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                  <Typography variant="h6" gutterBottom>Memory Usage</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={memData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ flex: '1 1 100%', minWidth: 300 }}>
                  <Typography variant="h6" gutterBottom>Disk Usage</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={diskData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
            {tabValue === 1 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                  <Typography variant="h6" gutterBottom>Network RX</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={rxData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#ff7300" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                  <Typography variant="h6" gutterBottom>Network TX</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={txData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#00ff00" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;