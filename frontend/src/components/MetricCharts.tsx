import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

interface MetricData {
    time: string;
    value: number;
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
    thresholds: {
        cpu: ChartThresholds;
        memory: ChartThresholds;
        disk: ChartThresholds;
    };
    tabValue: number;
}

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const index = Math.min(i, sizes.length - 1);
    return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
};

const PercentageTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <Paper sx={{ p: 1.5, bgcolor: '#181b1f', border: '1px solid #2c3235' }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>{label}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: payload[0].color || payload[0].stroke, mr: 1 }} />
                    <Typography variant="body2" fontWeight="bold">
                        {payload[0].name}: {payload[0].value.toFixed(2)}%
                    </Typography>
                </Box>
            </Paper>
        );
    }
    return null;
}

const NetworkTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <Paper sx={{ p: 1.5, bgcolor: '#181b1f', border: '1px solid #2c3235' }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>{label}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: payload[0].color || payload[0].stroke, mr: 1 }} />
                    <Typography variant="body2" fontWeight="bold">
                        {payload[0].name}: {formatBytes(payload[0].value)}
                    </Typography>
                </Box>
            </Paper>
        );
    }
    return null;
}

const formatPercent = (value: number) => `${value}%`;

const formatNetworkTick = (value: number) => {
    if (value === 0) return '0';
    const k = 1000;
    if (value < k) return `${value.toFixed(0)}B`;
    if (value < k * k) return `${(value / k).toFixed(0)}k`;
    return `${(value / (k * k)).toFixed(1)}M`;
};

const MetricCharts: React.FC<MetricChartsProps> = ({
    cpuData,
    memData,
    diskData,
    rxData,
    txData,
    thresholds,
    tabValue,
}) => {
    return (
        <Box sx={{ mt: 2 }}>
            {tabValue === 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                        <Typography variant="h6" gutterBottom>CPU Usage (%)</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={cpuData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5794f2" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#5794f2" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2c3235" vertical={false} />
                                <XAxis dataKey="time" stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <Tooltip content={<PercentageTooltip />} cursor={{ stroke: '#5c6370', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Legend wrapperStyle={{ paddingTop: 10 }} />
                                {thresholds.cpu.warning > 0 && <ReferenceLine y={thresholds.cpu.warning} stroke="#ff9800" strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: 'Warn', fill: '#ff9800', fontSize: 12 }} />}
                                {thresholds.cpu.critical > 0 && <ReferenceLine y={thresholds.cpu.critical} stroke="#f44336" strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: 'Crit', fill: '#f44336', fontSize: 12 }} />}
                                <Area type="monotone" dataKey="value" name="CPU" stroke="#5794f2" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" activeDot={{ r: 6, strokeWidth: 0 }} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                    <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                        <Typography variant="h6" gutterBottom>Memory Usage (%)</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={memData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#73bf69" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#73bf69" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2c3235" vertical={false} />
                                <XAxis dataKey="time" stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <Tooltip content={<PercentageTooltip />} cursor={{ stroke: '#5c6370', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Legend wrapperStyle={{ paddingTop: 10 }} />
                                {thresholds.memory.warning > 0 && <ReferenceLine y={thresholds.memory.warning} stroke="#ff9800" strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: 'Warn', fill: '#ff9800', fontSize: 12 }} />}
                                {thresholds.memory.critical > 0 && <ReferenceLine y={thresholds.memory.critical} stroke="#f44336" strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: 'Crit', fill: '#f44336', fontSize: 12 }} />}
                                <Area type="monotone" dataKey="value" name="Memory" stroke="#73bf69" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" activeDot={{ r: 6, strokeWidth: 0 }} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                    <Box sx={{ flex: '1 1 100%', minWidth: 300 }}>
                        <Typography variant="h6" gutterBottom>Disk Usage (%)</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={diskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDisk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ff9830" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ff9830" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2c3235" vertical={false} />
                                <XAxis dataKey="time" stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <Tooltip content={<PercentageTooltip />} cursor={{ stroke: '#5c6370', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Legend wrapperStyle={{ paddingTop: 10 }} />
                                {thresholds.disk.warning > 0 && <ReferenceLine y={thresholds.disk.warning} stroke="#ff9800" strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: 'Warn', fill: '#ff9800', fontSize: 12 }} />}
                                {thresholds.disk.critical > 0 && <ReferenceLine y={thresholds.disk.critical} stroke="#f44336" strokeDasharray="5 5" label={{ position: 'insideTopLeft', value: 'Crit', fill: '#f44336', fontSize: 12 }} />}
                                <Area type="monotone" dataKey="value" name="Disk" stroke="#ff9830" strokeWidth={2} fillOpacity={1} fill="url(#colorDisk)" activeDot={{ r: 6, strokeWidth: 0 }} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Box>
            )}

            {tabValue === 1 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                        <Typography variant="h6" gutterBottom>Network Receive (Throughput)</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={rxData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00ced1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00ced1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2c3235" vertical={false} />
                                <XAxis dataKey="time" stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <YAxis tickFormatter={formatNetworkTick} stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <Tooltip content={<NetworkTooltip />} cursor={{ stroke: '#5c6370', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Legend wrapperStyle={{ paddingTop: 10 }} />
                                <Area type="monotone" dataKey="value" name="RX" stroke="#00ced1" strokeWidth={2} fillOpacity={1} fill="url(#colorRx)" activeDot={{ r: 6, strokeWidth: 0 }} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                    <Box sx={{ flex: '1 1 45%', minWidth: 300 }}>
                        <Typography variant="h6" gutterBottom>Network Transmit (Throughput)</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={txData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8a2be2" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8a2be2" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2c3235" vertical={false} />
                                <XAxis dataKey="time" stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <YAxis tickFormatter={formatNetworkTick} stroke="#8e9297" tick={{ fill: '#8e9297' }} />
                                <Tooltip content={<NetworkTooltip />} cursor={{ stroke: '#5c6370', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                <Legend wrapperStyle={{ paddingTop: 10 }} />
                                <Area type="monotone" dataKey="value" name="TX" stroke="#8a2be2" strokeWidth={2} fillOpacity={1} fill="url(#colorTx)" activeDot={{ r: 6, strokeWidth: 0 }} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default MetricCharts;
