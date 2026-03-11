import React, { useEffect, useState, useCallback } from 'react';
import { Box, CircularProgress, Alert, Typography, Paper } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import StorageIcon from '@mui/icons-material/Storage';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import axios from 'axios';
import API_URL from '../config';
import { tokens } from '../theme';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, ReferenceDot
} from 'recharts';

/* ── Types ── */
interface MetricData { time: string; value: number; }
interface SystemInfo {
    uptime: string; load1: number; load5: number; load15: number;
    processesRunning: number; processesBlocked: number;
    temperature: { value: number; status: string; available: boolean };
}

/* ── Thresholds ── */
const THRESHOLDS = {
    cpu: { warning: 60, critical: 80 },
    memory: { warning: 60, critical: 85 },
    disk: { warning: 60, critical: 90 },
};

const getStatusColor = (value: number, thresholds = { warning: 60, critical: 80 }) => {
    if (value >= thresholds.critical) return tokens.accent.red;
    if (value >= thresholds.warning) return tokens.accent.yellow;
    return tokens.accent.green;
};

const getOverallStatus = (cpu: number, mem: number, disk: number) => {
    if (cpu >= 80 || mem >= 85 || disk >= 90) return { color: tokens.accent.red, label: 'Degraded Performance' };
    if (cpu >= 60 || mem >= 70 || disk >= 75) return { color: tokens.accent.yellow, label: 'Elevated Usage' };
    return { color: tokens.accent.green, label: 'All Systems Operational' };
};

/* ── Radial Gauge SVG ── */
const RadialGauge: React.FC<{
    value: number; label: string; color: string; size?: number; unit?: string;
}> = ({ value, label, color, size = 60, unit = '%' }) => {
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / 100, 1);
    const dashOffset = circumference * (1 - progress);

    return (
        <Box sx={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
            </svg>
            <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color, lineHeight: 1 }}>
                    {value.toFixed(0)}{unit}
                </Typography>
            </Box>
        </Box>
    );
};

/* ── Card Component ── */
const Card: React.FC<{ children: React.ReactNode; sx?: any }> = ({ children, sx }) => (
    <Paper sx={{ p: 3, ...sx }}>
        {children}
    </Paper>
);

/* ── Tooltips ── */
const PercentageTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <Box sx={{ p: 1.5, bgcolor: 'rgba(13,17,23,0.95)', border: `1px solid ${tokens.border.default}`, borderRadius: 1 }}>
                <Typography sx={{ fontSize: '0.7rem', color: tokens.text.muted, mb: 0.5 }}>{label}</Typography>
                {payload.map((p: any, i: number) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color || p.stroke }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.value.toFixed(2)}%</Typography>
                    </Box>
                ))}
            </Box>
        );
    }
    return null;
};

const NetworkTooltip = ({ active, payload, label }: any) => {
    const fmt = (b: number) => {
        if (b === 0) return '0 B/s';
        const k = 1024;
        const s = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.min(Math.floor(Math.log(Math.abs(b)) / Math.log(k)), s.length - 1);
        return `${(b / Math.pow(k, i)).toFixed(2)} ${s[i]}`;
    };
    if (active && payload?.length) {
        return (
            <Box sx={{ p: 1.5, bgcolor: 'rgba(13,17,23,0.95)', border: `1px solid ${tokens.border.default}`, borderRadius: 1 }}>
                <Typography sx={{ fontSize: '0.7rem', color: tokens.text.muted, mb: 0.5 }}>{label}</Typography>
                {payload.map((p: any, i: number) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color || p.stroke }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.name}: {fmt(p.value)}</Typography>
                    </Box>
                ))}
            </Box>
        );
    }
    return null;
};

const formatPercent = (v: number) => `${v}%`;
const formatNetworkTick = (v: number) => {
    if (v === 0) return '0';
    const k = 1000;
    if (v < k) return `${v.toFixed(0)}B`;
    if (v < k * k) return `${(v / k).toFixed(0)}k`;
    return `${(v / (k * k)).toFixed(1)}M`;
};

/* ── Chart Panel ── */
const ChartPanel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card sx={{ flex: '1 1 48%', minWidth: 320 }}>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
            {title}
        </Typography>
        {children}
    </Card>
);

/* ═══════════════════════════════════
   OVERVIEW PAGE
   ═══════════════════════════════════ */
const Overview: React.FC = () => {
    const [cpuData, setCpuData] = useState<MetricData[]>([]);
    const [memData, setMemData] = useState<MetricData[]>([]);
    const [diskData, setDiskData] = useState<MetricData[]>([]);
    const [rxData, setRxData] = useState<MetricData[]>([]);
    const [txData, setTxData] = useState<MetricData[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [systemInfo, setSystemInfo] = useState<SystemInfo>({
        uptime: 'Loading...', load1: 0, load5: 0, load15: 0,
        processesRunning: 0, processesBlocked: 0,
        temperature: { value: 0, status: 'N/A', available: false }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchMetrics = useCallback(async () => {
        setLoading(true); setError('');
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const end = Math.floor(Date.now() / 1000);
        const start = end - 3600;
        const step = '15s';

        try {
            const [cpuRes, memRes, diskRes, rxRes, txRes, uptimeRes, loadRes, procRes, tempRes, eventsRes] = await Promise.all([
                axios.get(`${API_URL}/api/metrics/cpu?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/memory?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/disk?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/network_rx?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/network_tx?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/uptime`, { headers }),
                axios.get(`${API_URL}/api/metrics/load`, { headers }),
                axios.get(`${API_URL}/api/metrics/processes`, { headers }),
                axios.get(`${API_URL}/api/metrics/temperature`, { headers }),
                axios.get(`${API_URL}/api/metrics/events`, { headers }),
            ]);
            setCpuData(cpuRes.data); setMemData(memRes.data); setDiskData(diskRes.data);
            setRxData(rxRes.data); setTxData(txRes.data);
            setEvents(eventsRes.data.events || []);
            setSystemInfo({
                uptime: uptimeRes.data.uptime,
                load1: loadRes.data.load1, load5: loadRes.data.load5, load15: loadRes.data.load15,
                processesRunning: procRes.data.running, processesBlocked: procRes.data.blocked,
                temperature: tempRes.data,
            });

            // Removed k8s stats fallback since this is full kubernetes now
            setLastUpdated(new Date());
        } catch { setError('Failed to fetch metrics.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchMetrics(); const i = setInterval(fetchMetrics, 15000); return () => clearInterval(i); }, [fetchMetrics]);

    const getCurrentValue = (data: MetricData[]) => data.length > 0 ? data[data.length - 1].value : 0;
    const cpuVal = getCurrentValue(cpuData);
    const memVal = getCurrentValue(memData);
    const diskVal = getCurrentValue(diskData);
    const rxVal = getCurrentValue(rxData);
    const txVal = getCurrentValue(txData);

    // Merge RX and TX into one dataset for combined chart
    const networkData = rxData.map((r, i) => ({
        time: r.time,
        rx: r.value,
        tx: txData[i]?.value ?? 0,
    }));

    const fmt = (b: number | undefined) => {
        if (!b || b === 0) return '0 B/s';
        const k = 1024;
        const s = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        const i = Math.min(Math.floor(Math.log(Math.abs(b)) / Math.log(k)), s.length - 1);
        return `${(b / Math.pow(k, i)).toFixed(2)} ${s[i]}`;
    };

    if (loading && cpuData.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* ── Page Header ── */}
            <Typography variant="h5" sx={{ mb: 3 }}>Overview</Typography>

            {/* ── Top Row: 4 Resource Gauge Cards ── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Card sx={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <RadialGauge value={cpuVal} label="CPU" color={getStatusColor(cpuVal, THRESHOLDS.cpu)} size={96} />
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>CPU</Typography>
                </Card>

                <Card sx={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <RadialGauge value={memVal} label="Memory" color={getStatusColor(memVal, THRESHOLDS.memory)} size={96} />
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Memory</Typography>
                </Card>

                <Card sx={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <RadialGauge value={diskVal} label="Disk" color={getStatusColor(diskVal, THRESHOLDS.disk)} size={96} />
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Disk</Typography>
                </Card>

                <Card sx={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <RadialGauge
                        value={systemInfo.temperature.available ? systemInfo.temperature.value : 0}
                        label="Temp"
                        color={systemInfo.temperature.available && systemInfo.temperature.value > 80 ? tokens.accent.red : (systemInfo.temperature.available ? tokens.accent.green : tokens.text.muted)}
                        size={96}
                        unit="°C"
                    />
                    <Typography variant="subtitle2" sx={{ mt: 2 }}>Temperature</Typography>
                </Card>
            </Box>

            {/* ── Row 2: System Stats ── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <StatCard icon={<AccessTimeIcon sx={{ fontSize: 18, color: tokens.chart.cpu }} />} label="Uptime" value={systemInfo.uptime} />
                <StatCard icon={<SpeedIcon sx={{ fontSize: 18, color: tokens.chart.cpu }} />} label="Load Avg" value={`${systemInfo.load1} / ${systemInfo.load5}`} sub="1 & 5 min" />
                <StatCard icon={<SettingsIcon sx={{ fontSize: 18, color: tokens.accent.yellow }} />} label="Processes" value={`${systemInfo.processesRunning}`} sub="Running" />
                <StatCard
                    icon={<NetworkCheckIcon sx={{ fontSize: 18, color: tokens.accent.purple }} />}
                    label="Network"
                    value={fmt(rxVal)}
                    sub={`RX / ${fmt(txVal)} TX`}
                />
            </Box>

            {/* ── Row 3: CPU & Memory Charts ── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <ChartPanel title="CPU Usage">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={cpuData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={tokens.chart.cpu} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={tokens.chart.cpu} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="time" stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 11 }} tickLine={false} />
                            <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<PercentageTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem' }} />
                            <ReferenceLine y={THRESHOLDS.cpu.warning} stroke="rgba(255,152,0,0.25)" strokeDasharray="5 5" />
                            <ReferenceLine y={THRESHOLDS.cpu.critical} stroke="rgba(244,67,54,0.25)" strokeDasharray="5 5" />
                            {events.filter(e => ["OOMKilled", "CrashLoopBackOff", "ScalingReplicaSet"].includes(e.reason)).slice(0, 15).map((e, i) => {
                                const t = new Date(e.time);
                                const timeStr = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
                                return (
                                    <ReferenceLine 
                                        key={i} 
                                        x={timeStr} 
                                        stroke="rgba(244,67,54,0.6)" 
                                        strokeDasharray="3 3"
                                        label={{ position: 'insideTopLeft', value: e.reason, fill: tokens.accent.red, fontSize: 10 }}
                                    />
                                );
                            })}
                            <Area type="monotone" dataKey="value" name="CPU" stroke={tokens.chart.cpu} strokeWidth={1.5} fillOpacity={1} fill="url(#gCpu)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Memory Usage">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={memData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={tokens.chart.memory} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={tokens.chart.memory} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="time" stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 11 }} tickLine={false} />
                            <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<PercentageTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem' }} />
                            <ReferenceLine y={THRESHOLDS.memory.warning} stroke="rgba(255,152,0,0.25)" strokeDasharray="5 5" />
                            <ReferenceLine y={THRESHOLDS.memory.critical} stroke="rgba(244,67,54,0.25)" strokeDasharray="5 5" />
                            {events.filter(e => ["OOMKilled", "CrashLoopBackOff", "ScalingReplicaSet"].includes(e.reason)).slice(0, 15).map((e, i) => {
                                const t = new Date(e.time);
                                const timeStr = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
                                return (
                                    <ReferenceLine 
                                        key={i} 
                                        x={timeStr} 
                                        stroke="rgba(244,67,54,0.6)" 
                                        strokeDasharray="3 3"
                                        label={{ position: 'insideTopLeft', value: e.reason, fill: tokens.accent.red, fontSize: 10 }}
                                    />
                                );
                            })}
                            <Area type="monotone" dataKey="value" name="Memory" stroke={tokens.chart.memory} strokeWidth={1.5} fillOpacity={1} fill="url(#gMem)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </Box>

            {/* ── Row 4: Disk & Network I/O ── */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <ChartPanel title="Disk Usage">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={diskData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gDisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={tokens.chart.disk} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={tokens.chart.disk} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="time" stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 11 }} tickLine={false} />
                            <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<PercentageTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem' }} />
                            <ReferenceLine y={THRESHOLDS.disk.warning} stroke="rgba(255,152,0,0.25)" strokeDasharray="5 5" />
                            <ReferenceLine y={THRESHOLDS.disk.critical} stroke="rgba(244,67,54,0.25)" strokeDasharray="5 5" />
                            <Area type="monotone" dataKey="value" name="Disk" stroke={tokens.chart.disk} strokeWidth={1.5} fillOpacity={1} fill="url(#gDisk)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Network I/O">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={networkData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gRx" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={tokens.chart.network.rx} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={tokens.chart.network.rx} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gTx" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={tokens.chart.network.tx} stopOpacity={0.25} />
                                    <stop offset="95%" stopColor={tokens.chart.network.tx} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="time" stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 11 }} tickLine={false} />
                            <YAxis tickFormatter={formatNetworkTick} stroke="transparent" tick={{ fill: tokens.text.faint, fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<NetworkTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem' }} />
                            <Area type="monotone" dataKey="rx" name="RX (Download)" stroke={tokens.chart.network.rx} strokeWidth={1.5} fillOpacity={1} fill="url(#gRx)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                            <Area type="monotone" dataKey="tx" name="TX (Upload)" stroke={tokens.chart.network.tx} strokeWidth={1.5} fillOpacity={1} fill="url(#gTx)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </Box>
        </Box>
    );
};

/* ── Stat Card ── */
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({ icon, label, value, sub }) => (
    <Card sx={{ flex: '1 1 0', minWidth: 140 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            {icon}
            <Typography variant="subtitle2">
                {label}
            </Typography>
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>{value}</Typography>
        {sub && <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>{sub}</Typography>}
    </Card>
);

export default Overview;
