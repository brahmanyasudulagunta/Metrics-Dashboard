import React from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, LinearProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MetricData {
    time: string;
    value: number;
}

interface ContainerInfo {
    name: string;
    cpu: number;
    memory: number;
}

interface ChartThresholds {
    warning: number;
    critical: number;
}

interface MetricChartsProps {
    cpuData: MetricData[];
    memData: MetricData[];
    diskData: MetricData[];
    rxData: MetricData[];
    txData: MetricData[];
    containers: ContainerInfo[];
    thresholds: {
        cpu: ChartThresholds;
        memory: ChartThresholds;
        disk: ChartThresholds;
    };
    tabValue: number;
    darkMode: boolean;
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

const MetricCharts: React.FC<MetricChartsProps> = ({
    cpuData,
    memData,
    diskData,
    rxData,
    txData,
    containers,
    thresholds,
    tabValue,
    darkMode
}) => {
    return (
        <Box sx={{ mt: 2 }}>
            {/* System Tab */}
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
                                <ReferenceLine y={thresholds.cpu.warning} stroke="#ff9800" strokeDasharray="5 5" label="Warning" />
                                <ReferenceLine y={thresholds.cpu.critical} stroke="#f44336" strokeDasharray="5 5" label="Critical" />
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
                                <ReferenceLine y={thresholds.memory.warning} stroke="#ff9800" strokeDasharray="5 5" label="Warning" />
                                <ReferenceLine y={thresholds.memory.critical} stroke="#f44336" strokeDasharray="5 5" label="Critical" />
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
                                <ReferenceLine y={thresholds.disk.warning} stroke="#ff9800" strokeDasharray="5 5" label="Warning" />
                                <ReferenceLine y={thresholds.disk.critical} stroke="#f44336" strokeDasharray="5 5" label="Critical" />
                                <Line type="monotone" dataKey="value" name="Disk %" stroke="#ffc658" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </Box>
            )}

            {/* Network Tab */}
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

            {/* Containers Tab */}
            {tabValue === 2 && (
                <Box>
                    <Typography variant="h6" gutterBottom>Container Metrics</Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: darkMode ? 'grey.800' : 'grey.100' }}>
                                    <TableCell><strong>Container</strong></TableCell>
                                    <TableCell><strong>CPU Usage</strong></TableCell>
                                    <TableCell><strong>Memory (MB)</strong></TableCell>
                                    <TableCell><strong>Status</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {containers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">
                                            <Typography color="textSecondary">No container data available. Make sure cAdvisor is running.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    containers.map((container) => {
                                        const status = container.cpu > 50 ? 'Warning' : 'Healthy';
                                        const statusColor = container.cpu > 50 ? '#ff9800' : '#4caf50';
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
                                                                    bgcolor: 'grey.300',
                                                                    '& .MuiLinearProgress-bar': {
                                                                        bgcolor: container.cpu > 80 ? '#f44336' : container.cpu > 50 ? '#ff9800' : '#4caf50'
                                                                    }
                                                                }}
                                                            />
                                                        </Box>
                                                        <Typography variant="body2">{container.cpu.toFixed(1)}%</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{container.memory.toFixed(1)} MB</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={status}
                                                        size="small"
                                                        sx={{ bgcolor: statusColor, color: 'white', fontWeight: 'bold' }}
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
            )}
        </Box>
    );
};

export default MetricCharts;
