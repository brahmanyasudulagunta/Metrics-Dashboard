import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, CircularProgress, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import API_URL from '../config';
import { tokens } from '../theme';

interface MetricResult {
    metric: Record<string, string>;
    values: [number, string][];
}

interface ChartDataPoint {
    time: string;
    [key: string]: any;
}

interface SeriesStat {
    name: string;
    color: string;
    last: number;
    min: number;
    max: number;
    avg: number;
}

const Explorer: React.FC = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [lines, setLines] = useState<string[]>([]);
    const [seriesStats, setSeriesStats] = useState<SeriesStat[]>([]);
    const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');

    const colors = [
        tokens.chart.cpu, tokens.chart.memory, tokens.chart.disk, tokens.chart.danger, tokens.accent.purple,
        tokens.accent.cyan, '#ff1493', '#32cd32', '#ffeb3b', '#00ffff',
        '#ff69b4', '#7b68ee', '#20b2aa', '#ff6347', '#ba55d3'
    ];

    const formatValue = (val: number) => {
        if (val === 0) return '0';
        if (Math.abs(val) > 1000000) return (val / 1000000).toFixed(2) + 'M';
        if (Math.abs(val) > 1000) return (val / 1000).toFixed(2) + 'k';
        if (Math.abs(val) < 0.01) return val.toExponential(2);
        return val.toFixed(2);
    };

    const handleRunQuery = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setError('');
        setChartData([]);
        setLines([]);
        setSeriesStats([]);

        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const end = Math.floor(Date.now() / 1000);
        const start = end - 3600;
        const step = '15s';

        try {
            const encodedQuery = encodeURIComponent(query);
            const res = await axios.get(
                `${API_URL}/api/metrics/query_range_raw?query=${encodedQuery}&start=${start}&end=${end}&step=${step}`,
                { headers }
            );

            const resultData: MetricResult[] = res.data.data?.result || [];

            if (resultData.length === 0) {
                setError('Query returned no results.');
                return;
            }

            const transformedData: Record<string, ChartDataPoint> = {};
            const lineKeys: string[] = [];
            const stats: SeriesStat[] = [];

            resultData.forEach((series, index) => {
                const labelKeys = Object.keys(series.metric).filter(k => k !== '__name__');
                let lineName = `Result ${index + 1}`;
                if (labelKeys.length > 0) {
                    lineName = labelKeys.map(k => `${k}="${series.metric[k]}"`).join(', ');
                }
                lineKeys.push(lineName);

                const color = colors[index % colors.length];
                let sum = 0, min = Number.MAX_VALUE, max = -Number.MAX_VALUE, last = 0, count = 0;

                series.values.forEach(([timestamp, value]) => {
                    const timeStr = new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const numVal = parseFloat(value);

                    if (!transformedData[timeStr]) {
                        transformedData[timeStr] = { time: timeStr };
                    }
                    transformedData[timeStr][lineName] = numVal;

                    if (!isNaN(numVal)) {
                        sum += numVal;
                        if (numVal < min) min = numVal;
                        if (numVal > max) max = numVal;
                        last = numVal;
                        count++;
                    }
                });

                if (min === Number.MAX_VALUE) min = 0;
                if (max === -Number.MAX_VALUE) max = 0;
                const avg = count > 0 ? sum / count : 0;
                stats.push({ name: lineName, color, last, min, max, avg });
            });

            const finalChartData = Object.values(transformedData).sort((a, b) => a.time.localeCompare(b.time));
            setLines(lineKeys);
            setChartData(finalChartData);
            setSeriesStats(stats);
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to execute query.');
        } finally {
            setLoading(false);
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const sortedPayload = [...payload].sort((a: any, b: any) => b.value - a.value);
            const displayPayload = sortedPayload.slice(0, 15);
            const hiddenCount = sortedPayload.length - displayPayload.length;

            return (
                <Box sx={{ p: 1.5, bgcolor: 'rgba(13,17,23,0.95)', border: `1px solid ${tokens.border.default}`, borderRadius: 1, maxWidth: 400 }}>
                    <Typography sx={{ mb: 1, fontWeight: 600, fontSize: '0.8125rem' }}>{label}</Typography>
                    {displayPayload.map((entry: any, index: number) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, mr: 1, flexShrink: 0 }} />
                            <Typography variant="caption" sx={{ flexGrow: 1, mr: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.name}
                            </Typography>
                            <Typography variant="caption" fontWeight={700}>
                                {formatValue(entry.value)}
                            </Typography>
                        </Box>
                    ))}
                    {hiddenCount > 0 && (
                        <Typography variant="caption" sx={{ mt: 1, display: 'block', color: tokens.text.muted }}>
                            ...and {hiddenCount} more series
                        </Typography>
                    )}
                </Box>
            );
        }
        return null;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="h5" sx={{ mb: 3 }}>PromQL Explorer</Typography>

            {/* Query Bar */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    <Typography sx={{ color: tokens.text.muted, px: 1, fontFamily: 'monospace' }}>{`>_`}</Typography>
                    <TextField
                        fullWidth
                        size="small"
                        variant="outlined"
                        placeholder="Enter expression (press Enter to run)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRunQuery()}
                        InputProps={{
                            style: { fontFamily: '"SF Mono", "Fira Code", monospace', fontSize: '0.875rem' }
                        }}
                    />
                    <Button
                        variant="contained"
                        sx={{
                            bgcolor: tokens.accent.green,
                            '&:hover': { bgcolor: tokens.accent.greenHover },
                            fontWeight: 600,
                            px: 3,
                            whiteSpace: 'nowrap',
                            boxShadow: 'none',
                        }}
                        onClick={handleRunQuery}
                        disabled={loading || !query.trim()}
                    >
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'Execute'}
                    </Button>
                </Box>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Content Area */}
            {chartData.length > 0 && (
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs value={viewMode} onChange={(e, newValue) => setViewMode(newValue)}>
                            <Tab label="Table" value="table" />
                            <Tab label="Graph" value="graph" />
                        </Tabs>
                    </Box>

                    {viewMode === 'graph' && (
                        <Paper sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', height: 500 }}>
                            <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={tokens.border.subtle} vertical={false} />
                                        <XAxis dataKey="time" stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 12 }} />
                                        <YAxis stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 12 }} tickFormatter={formatValue} width={60} />
                                        <Tooltip content={<CustomTooltip />} />
                                        {lines.map((lineKey, index) => (
                                            <Line
                                                key={lineKey}
                                                type="monotone"
                                                dataKey={lineKey}
                                                name={lineKey}
                                                stroke={colors[index % colors.length]}
                                                strokeWidth={1.5}
                                                dot={false}
                                                activeDot={{ r: 4, strokeWidth: 0 }}
                                                isAnimationActive={false}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>
                    )}

                    {viewMode === 'table' && (
                        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ minWidth: 150 }}>Item</TableCell>
                                        <TableCell align="right">Last</TableCell>
                                        <TableCell align="right">Avg</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {seriesStats.map((stat, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
                                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: stat.color, flexShrink: 0 }} />
                                                <Typography sx={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.8125rem',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: 800
                                                }} title={stat.name}>
                                                    {stat.name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatValue(stat.last)}</TableCell>
                                            <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: tokens.text.muted }}>{formatValue(stat.avg)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}

            {chartData.length === 0 && !loading && !error && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400, color: tokens.text.muted }}>
                    <Typography>Enter expression (press Execute for results)</Typography>
                </Box>
            )}
        </Box>
    );
};

export default Explorer;
