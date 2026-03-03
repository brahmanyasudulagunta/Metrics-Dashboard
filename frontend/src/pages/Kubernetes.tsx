import React, { useEffect, useState } from 'react';
import { Typography, Box, CircularProgress, Alert, Tabs, Tab, Select, MenuItem, FormControl, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import axios from 'axios';
import API_URL from '../config';
import { useNavigate } from 'react-router-dom';

interface Namespace { name: string; status: string; }
interface Pod { name: string; namespace: string; status: string; restarts: number; age: string; node: string; }
interface Deployment { name: string; namespace: string; ready: string; age: string; }
interface Service { name: string; namespace: string; type: string; cluster_ip: string; ports: string; }

const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'running' || s === 'active') return '#4caf50';
    if (s === 'pending' || s === 'containercreating') return '#ff9800';
    if (s === 'failed' || s === 'error' || s === 'crashloopbackoff') return '#f44336';
    return '#8b949e';
};

const Kubernetes: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState(0);
    const [namespaces, setNamespaces] = useState<Namespace[]>([]);
    const [selectedNs, setSelectedNs] = useState('all');
    const [pods, setPods] = useState<Pod[]>([]);
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const init = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/metrics/namespaces`, { headers });
                setNamespaces(res.data.namespaces || []);
            } catch (err) {
                setError('Failed to connect to Kubernetes cluster.');
            }
        };
        init();
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [selectedNs]);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [podRes, depRes, svcRes] = await Promise.all([
                axios.get(`${API_URL}/api/metrics/pods?namespace=${selectedNs}`, { headers }),
                axios.get(`${API_URL}/api/metrics/deployments?namespace=${selectedNs}`, { headers }),
                axios.get(`${API_URL}/api/metrics/services?namespace=${selectedNs}`, { headers }),
            ]);
            setPods(podRes.data.pods || []);
            setDeployments(depRes.data.deployments || []);
            setServices(svcRes.data.services || []);
        } catch (err) {
            setError('Failed to fetch Kubernetes resources.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoString: string | null) => {
        if (!isoString) return 'N/A';
        const d = new Date(isoString);
        const diff = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
        return `${Math.floor(diff / 86400)}d ${Math.floor((diff % 86400) / 3600)}h`;
    };

    if (loading && pods.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>Kubernetes Cluster</Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                        value={selectedNs}
                        onChange={(e) => setSelectedNs(e.target.value)}
                        sx={{ bgcolor: '#161b22', borderRadius: 1 }}
                    >
                        <MenuItem value="all">All Namespaces</MenuItem>
                        {namespaces.map(ns => (
                            <MenuItem key={ns.name} value={ns.name}>{ns.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}



            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Pods" sx={{ textTransform: 'none', fontWeight: 600 }} />
                    <Tab label="Deployments" sx={{ textTransform: 'none', fontWeight: 600 }} />
                    <Tab label="Services" sx={{ textTransform: 'none', fontWeight: 600 }} />
                </Tabs>
            </Box>

            {tab === 0 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Namespace</strong></TableCell>
                                <TableCell><strong>Status</strong></TableCell>
                                <TableCell><strong>Restarts</strong></TableCell>
                                <TableCell><strong>Node</strong></TableCell>
                                <TableCell><strong>Age</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pods.map(pod => (
                                <TableRow key={pod.name} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/kubernetes/${pod.namespace}/${pod.name}`)}>
                                    <TableCell>
                                        <Typography fontWeight="medium" color="primary" sx={{ '&:hover': { textDecoration: 'underline' } }}>
                                            {pod.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>{pod.namespace}</TableCell>
                                    <TableCell sx={{ color: getStatusColor(pod.status), fontWeight: 600 }}>{pod.status}</TableCell>
                                    <TableCell>{pod.restarts}</TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>{pod.node}</TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{formatDate(pod.age)}</TableCell>
                                </TableRow>
                            ))}
                            {pods.length === 0 && <TableRow><TableCell colSpan={6} align="center">No pods found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 1 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Namespace</strong></TableCell>
                                <TableCell><strong>Ready</strong></TableCell>
                                <TableCell><strong>Age</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {deployments.map(d => (
                                <TableRow key={d.name}>
                                    <TableCell>
                                        <Typography fontWeight="medium" color="primary">
                                            {d.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>{d.namespace}</TableCell>
                                    <TableCell>{d.ready}</TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{formatDate(d.age)}</TableCell>
                                </TableRow>
                            ))}
                            {deployments.length === 0 && <TableRow><TableCell colSpan={4} align="center">No deployments found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 2 && (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }}>
                                <TableCell><strong>Name</strong></TableCell>
                                <TableCell><strong>Namespace</strong></TableCell>
                                <TableCell><strong>Type</strong></TableCell>
                                <TableCell><strong>Cluster IP</strong></TableCell>
                                <TableCell><strong>Ports</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {services.map(s => (
                                <TableRow key={s.name}>
                                    <TableCell>
                                        <Typography fontWeight="medium" color="primary">
                                            {s.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: 'text.secondary' }}>{s.namespace}</TableCell>
                                    <TableCell>{s.type}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{s.cluster_ip}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.ports}</TableCell>
                                </TableRow>
                            ))}
                            {services.length === 0 && <TableRow><TableCell colSpan={5} align="center">No services found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default Kubernetes;
