import React, { useEffect, useState, useCallback } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import SettingsIcon from '@mui/icons-material/Settings';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import CloudIcon from '@mui/icons-material/Cloud';
import AppsIcon from '@mui/icons-material/Apps';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import StorageIcon from '@mui/icons-material/Storage';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import axios from 'axios';
import API_URL from '../config';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine
} from 'recharts';

/* ── Types ── */
interface MetricData { time: string; value: number; }
interface SystemInfo {
    uptime: string; load1: number; load5: number; load15: number;
    processesRunning: number; processesBlocked: number;
    temperature: { value: number; status: string; available: boolean };
}
interface ContainerInfo { name: string; cpu: number; memory: number; }

/* ── Thresholds ── */
const THRESHOLDS = {
    cpu: { warning: 60, critical: 80 },
    memory: { warning: 70, critical: 85 },
    disk: { warning: 75, critical: 90 },
};

const getStatusColor = (value: number, thresholds = { warning: 60, critical: 80 }) => {
    if (value >= thresholds.critical) return '#f44336';
    if (value >= thresholds.warning) return '#ff9800';
    return '#4caf50';
};

const getOverallStatus = (cpu: number, mem: number, disk: number) => {
    if (cpu >= 80 || mem >= 85 || disk >= 90) return { color: '#f44336', label: 'Degraded Performance' };
    if (cpu >= 60 || mem >= 70 || disk >= 75) return { color: '#ff9800', label: 'Elevated Usage' };
    return { color: '#4caf50', label: 'All Systems Operational' };
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
                {/* Track */}
                <circle cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
                {/* Progress */}
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
                {/* <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {label}
                </Typography> */}
            </Box>
        </Box>
    );
};

/* ── Glass Card ── */
const GlassCard: React.FC<{ children: React.ReactNode; sx?: any }> = ({ children, sx }) => (
    <Box sx={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 3,
        backdropFilter: 'blur(12px)',
        p: 2.5,
        ...sx,
    }}>
        {children}
    </Box>
);

/* ── Tooltips ── */
const PercentageTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <Box sx={{ p: 1.5, bgcolor: 'rgba(13,17,23,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#8b949e', mb: 0.5 }}>{label}</Typography>
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
            <Box sx={{ p: 1.5, bgcolor: 'rgba(13,17,23,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#8b949e', mb: 0.5 }}>{label}</Typography>
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
    <GlassCard sx={{ flex: '1 1 48%', minWidth: 320 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
        </Typography>
        {children}
    </GlassCard>
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
    const [containers, setContainers] = useState<ContainerInfo[]>([]);
    const [k8sStats, setK8sStats] = useState({ pods: 0, deployments: 0, services: 0 });
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
            const [cpuRes, memRes, diskRes, rxRes, txRes, uptimeRes, loadRes, procRes, containersRes, tempRes] = await Promise.all([
                axios.get(`${API_URL}/api/metrics/cpu?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/memory?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/disk?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/network_rx?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/network_tx?start=${start}&end=${end}&step=${step}`, { headers }),
                axios.get(`${API_URL}/api/metrics/uptime`, { headers }),
                axios.get(`${API_URL}/api/metrics/load`, { headers }),
                axios.get(`${API_URL}/api/metrics/processes`, { headers }),
                axios.get(`${API_URL}/api/metrics/containers`, { headers }),
                axios.get(`${API_URL}/api/metrics/temperature`, { headers }),
            ]);
            setCpuData(cpuRes.data); setMemData(memRes.data); setDiskData(diskRes.data);
            setRxData(rxRes.data); setTxData(txRes.data);
            setContainers(containersRes.data.containers || []);
            setSystemInfo({
                uptime: uptimeRes.data.uptime,
                load1: loadRes.data.load1, load5: loadRes.data.load5, load15: loadRes.data.load15,
                processesRunning: procRes.data.running, processesBlocked: procRes.data.blocked,
                temperature: tempRes.data,
            });

            try {
                const [k8sPodRes, k8sDepRes, k8sSvcRes] = await Promise.all([
                    axios.get(`${API_URL}/api/metrics/pods?namespace=all`, { headers }),
                    axios.get(`${API_URL}/api/metrics/deployments?namespace=all`, { headers }),
                    axios.get(`${API_URL}/api/metrics/services?namespace=all`, { headers }),
                ]);
                setK8sStats({
                    pods: k8sPodRes.data.pods?.length || 0,
                    deployments: k8sDepRes.data.deployments?.length || 0,
                    services: k8sSvcRes.data.services?.length || 0,
                });
            } catch {
                // Ignore if not in K8s mode
            }

            setLastUpdated(new Date());
        } catch { setError('Failed to fetch metrics.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchMetrics(); const i = setInterval(fetchMetrics, 15000); return () => clearInterval(i); }, [fetchMetrics]);

    // Timer for "Updated X ago"
    const [, setTick] = useState(0);
    useEffect(() => { const t = setInterval(() => setTick(p => p + 1), 1000); return () => clearInterval(t); }, []);

    const getCurrentValue = (data: MetricData[]) => data.length > 0 ? data[data.length - 1].value : 0;
    const cpuVal = getCurrentValue(cpuData);
    const memVal = getCurrentValue(memData);
    const diskVal = getCurrentValue(diskData);
    const rxVal = getCurrentValue(rxData);
    const txVal = getCurrentValue(txData);
    const overallStatus = getOverallStatus(cpuVal, memVal, diskVal);

    const timeSinceUpdate = () => {
        const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
        if (seconds < 5) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        return `${Math.floor(seconds / 60)}m ago`;
    };

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
            {/* ── Status Header ── */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FiberManualRecordIcon sx={{ fontSize: 12, color: overallStatus.color }} />
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>{overallStatus.label}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>Updated {timeSinceUpdate()}</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* ── Top Row: 4 Separate Resource utilization Cards ── */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                <GlassCard sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <RadialGauge value={cpuVal} label="CPU" color={getStatusColor(cpuVal, THRESHOLDS.cpu)} size={96} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', mt: 2 }}>CPU</Typography>
                </GlassCard>

                <GlassCard sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <RadialGauge value={memVal} label="Memory" color={getStatusColor(memVal, THRESHOLDS.memory)} size={96} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', mt: 2 }}>Memory</Typography>
                </GlassCard>

                <GlassCard sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <RadialGauge value={diskVal} label="Disk" color={getStatusColor(diskVal, THRESHOLDS.disk)} size={96} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', mt: 2 }}>Disk</Typography>
                </GlassCard>

                <GlassCard sx={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                    <RadialGauge
                        value={systemInfo.temperature.available ? systemInfo.temperature.value : 0}
                        label="Temp"
                        color={systemInfo.temperature.available && systemInfo.temperature.value > 80 ? '#f44336' : (systemInfo.temperature.available ? '#73bf69' : '#8b949e')}
                        size={96}
                        unit="°C"
                    />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', mt: 2 }}>Temperature</Typography>
                </GlassCard>
            </Box>

            {/* ── Row 2: System Stats ── */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {containers.length > 0 && k8sStats.pods === 0 && (
                    <StatCard icon={<StorageIcon sx={{ fontSize: 18, color: '#73bf69' }} />} label="Containers" value={`${containers.length}`} sub="Running" />
                )}
                <StatCard icon={<AccessTimeIcon sx={{ fontSize: 18, color: '#5794f2' }} />} label="Uptime" value={systemInfo.uptime} />
                <StatCard icon={<SpeedIcon sx={{ fontSize: 18, color: '#5794f2' }} />} label="Load Avg" value={`${systemInfo.load1} / ${systemInfo.load5}`} sub="1 & 5 min" />
                <StatCard icon={<SettingsIcon sx={{ fontSize: 18, color: '#ff9830' }} />} label="Processes" value={`${systemInfo.processesRunning}`} sub="Running" />
                <StatCard
                    icon={<NetworkCheckIcon sx={{ fontSize: 18, color: '#8a2be2' }} />}
                    label="Network"
                    value={fmt(rxVal)}
                    sub={`RX / ${fmt(txVal)} TX`}
                />
            </Box>

            {/* ── Row 3: CPU & Memory Charts ── */}
            <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                <ChartPanel title="CPU Usage">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={cpuData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#5794f2" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#5794f2" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="time" stroke="transparent" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} />
                            <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="transparent" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<PercentageTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem' }} />
                            <ReferenceLine y={THRESHOLDS.cpu.warning} stroke="rgba(255,152,0,0.25)" strokeDasharray="5 5" />
                            <ReferenceLine y={THRESHOLDS.cpu.critical} stroke="rgba(244,67,54,0.25)" strokeDasharray="5 5" />
                            <Area type="monotone" dataKey="value" name="CPU" stroke="#5794f2" strokeWidth={1.5} fillOpacity={1} fill="url(#gCpu)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Memory Usage">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={memData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#73bf69" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#73bf69" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="time" stroke="transparent" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} />
                            <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="transparent" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<PercentageTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem' }} />
                            <ReferenceLine y={THRESHOLDS.memory.warning} stroke="rgba(255,152,0,0.25)" strokeDasharray="5 5" />
                            <ReferenceLine y={THRESHOLDS.memory.critical} stroke="rgba(244,67,54,0.25)" strokeDasharray="5 5" />
                            <Area type="monotone" dataKey="value" name="Memory" stroke="#73bf69" strokeWidth={1.5} fillOpacity={1} fill="url(#gMem)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </Box>

            {/* ── Row 4: Disk & Network I/O ── */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <ChartPanel title="Disk Usage">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={diskData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gDisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ff9830" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ff9830" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="time" stroke="transparent" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} />
                            <YAxis tickFormatter={formatPercent} domain={[0, 100]} stroke="transparent" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<PercentageTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem' }} />
                            <ReferenceLine y={THRESHOLDS.disk.warning} stroke="rgba(255,152,0,0.25)" strokeDasharray="5 5" />
                            <ReferenceLine y={THRESHOLDS.disk.critical} stroke="rgba(244,67,54,0.25)" strokeDasharray="5 5" />
                            <Area type="monotone" dataKey="value" name="Disk" stroke="#ff9830" strokeWidth={1.5} fillOpacity={1} fill="url(#gDisk)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>
                <ChartPanel title="Network I/O">
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={networkData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gRx" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00ced1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#00ced1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gTx" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8a2be2" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#8a2be2" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="time" stroke="transparent" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} />
                            <YAxis tickFormatter={formatNetworkTick} stroke="transparent" tick={{ fill: '#555', fontSize: 11 }} tickLine={false} />
                            <Tooltip content={<NetworkTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.08)' }} />
                            <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.75rem' }} />
                            <Area type="monotone" dataKey="rx" name="RX (Download)" stroke="#00ced1" strokeWidth={1.5} fillOpacity={1} fill="url(#gRx)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                            <Area type="monotone" dataKey="tx" name="TX (Upload)" stroke="#8a2be2" strokeWidth={1.5} fillOpacity={1} fill="url(#gTx)" activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartPanel>
            </Box>
        </Box>
    );
};

/* ── Stat Card ── */
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({ icon, label, value, sub }) => (
    <GlassCard sx={{ flex: '1 1 0', minWidth: 140 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            {icon}
            <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </Typography>
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>{value}</Typography>
        {sub && <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', mt: 0.5 }}>{sub}</Typography>}
    </GlassCard>
);

export default Overview;
