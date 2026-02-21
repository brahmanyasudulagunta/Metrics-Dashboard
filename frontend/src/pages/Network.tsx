import React, { useEffect, useState } from 'react';
import { Typography, Box, CircularProgress, Alert, Card, CardContent } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import axios from 'axios';
import API_URL from '../config';
import MetricCharts from '../components/MetricCharts';

interface MetricData { time: string; value: number; }

const Network: React.FC = () => {
    const [rxData, setRxData] = useState<MetricData[]>([]);
    const [txData, setTxData] = useState<MetricData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const getTimeRangeParams = () => {
        const end = Math.floor(Date.now() / 1000);
        const start = end - 3600; // 1 hour
        return { start, end, step: '15s' };
    };

    const fetchNetworkMetrics = async () => {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const { start, end, step } = getTimeRangeParams();

        try {
            const [rxRes, txRes] = await Promise.all([
                axios.get(`${API_URL}/api/metrics/network_rx?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/network_tx?start=${start}&end=${end}&step=${step}`, { headers }),
            ]);
            setRxData(rxRes.data);
            setTxData(txRes.data);
        } catch (err) {
            setError('Failed to fetch Network metrics.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNetworkMetrics();
        const interval = setInterval(fetchNetworkMetrics, 15000);
        return () => clearInterval(interval);
    }, []);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B/s';
        const k = 1024;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        const index = Math.min(i, sizes.length - 1);
        return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
    };

    const getCurrentValue = (data: MetricData[]) => data.length > 0 ? data[data.length - 1].value : 0;

    if (loading && rxData.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Network Metrics</Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
                <Card sx={{ flex: '1 1 200px', borderTop: '3px solid #ff7300' }}>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><WifiIcon fontSize="small" /> Current RX</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 500 }}>{formatBytes(getCurrentValue(rxData))}</Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px', borderTop: '3px solid #00c853' }}>
                    <CardContent>
                        <Typography color="textSecondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><WifiIcon fontSize="small" /> Current TX</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 500 }}>{formatBytes(getCurrentValue(txData))}</Typography>
                    </CardContent>
                </Card>
            </Box>

            <MetricCharts
                cpuData={[]} memData={[]} diskData={[]} containers={[]} // unused
                rxData={rxData}
                txData={txData}
                thresholds={{ cpu: { warning: 0, critical: 0 }, memory: { warning: 0, critical: 0 }, disk: { warning: 0, critical: 0 } }}
                tabValue={1} // Network
            />
        </Box>
    );
};

export default Network;
