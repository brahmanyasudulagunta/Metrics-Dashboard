import React, { useEffect, useState } from 'react';
import axios from 'axios';
import API_URL from '../../config';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Cluster, NodeInfo, Namespace, Pod, Deployment, Service } from './types';
import ClusterList from './ClusterList';
import ClusterOverview from './ClusterOverview';
import NamespaceView from './NamespaceView';
import { tokens } from '../../theme';
import { Button, Typography, Box, CircularProgress, Alert, Breadcrumbs, Link, Snackbar, TextField, InputAdornment, useTheme } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HomeIcon from '@mui/icons-material/Home';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'running' || s === 'active') return tokens.accent.green;
    if (s === 'pending' || s === 'containercreating') return tokens.accent.yellow;
    if (s === 'failed' || s === 'error' || s === 'crashloopbackoff') return tokens.accent.red;
    return tokens.text.muted;
};

const Kubernetes: React.FC = () => {
    const [namespaces, setNamespaces] = useState<Namespace[]>([]);
    const [selectedNs, setSelectedNs] = useState('all');
    const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
    const [pods, setPods] = useState<Pod[]>([]);
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [clusters, setClusters] = useState<Cluster[]>([]);
    const [nodes, setNodes] = useState<NodeInfo[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewType, setViewType] = useState<'clusters' | 'details'>('clusters');
    const [overviewTab, setOverviewTab] = useState(0); 
    const [resourceTab, setResourceTab] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, message: '', severity: 'info' });
    const [pathInput, setPathInput] = useState('');
    const [isEditingPath, setIsEditingPath] = useState(false);

    const openSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const ns = searchParams.get('ns');
        const ot = searchParams.get('ot'); 
        const rt = searchParams.get('rt');
        const cluster = searchParams.get('cluster');
        
        if (cluster) {
            setSelectedCluster(cluster);
            setViewType('details');
        } else {
            setSelectedCluster(null);
            setViewType('clusters');
        }

        if (ns) {
            setSelectedNs(ns);
        } else {
            setSelectedNs('all');
        }
        
        if (ot) setOverviewTab(parseInt(ot, 10));
        if (rt) setResourceTab(parseInt(rt, 10));

        // Sync path input string
        let path = 'clusters';
        if (cluster) {
            path += `/${cluster}`;
            if (ns && ns !== 'all') path += `/namespace/${ns}`;
            else if (ot === '0' || (!ot && overviewTab === 0)) path += '/nodes';
            else path += '/namespace';
        }
        setPathInput(path);
    }, [searchParams]);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/metrics/namespaces`, { headers });
                setNamespaces(res.data.namespaces || []);
                const cRes = await axios.get(`${API_URL}/api/metrics/clusters`, { headers });
                setClusters(cRes.data.clusters || []);
            } catch (err) {
                setError('Failed to connect to Kubernetes cluster.');
            }
        };
        init();
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [selectedNs, viewType]);

    const fetchData = async () => {
        if (viewType === 'clusters') {
            try {
                const cRes = await axios.get(`${API_URL}/api/metrics/clusters`, { headers });
                setClusters(cRes.data.clusters || []);
            } catch (err) {}
            return;
        }

        setError('');
        try {
            const [podRes, depRes, svcRes, nodeRes, nsRes] = await Promise.all([
                axios.get(`${API_URL}/api/metrics/pods?namespace=${selectedNs}`, { headers }),
                axios.get(`${API_URL}/api/metrics/deployments?namespace=${selectedNs}`, { headers }),
                axios.get(`${API_URL}/api/metrics/services?namespace=${selectedNs}`, { headers }),
                axios.get(`${API_URL}/api/metrics/nodes`, { headers }),
                axios.get(`${API_URL}/api/metrics/namespaces`, { headers }),
            ]);
            setPods(podRes.data.pods || []);
            setDeployments(depRes.data.deployments || []);
            setServices(svcRes.data.services || []);
            setNodes(nodeRes.data.nodes || []);
            setNamespaces(nsRes.data.namespaces || []);
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

    const handleSelectCluster = (cluster: Cluster) => {
        setSelectedNs('all');
        setViewType('details');
        setSearchParams({ ns: 'all', ot: '1', cluster: cluster.name });
    };

    const handleCreateNamespace = async (name: string) => {
        try {
            await axios.post(`${API_URL}/api/metrics/namespaces`, { name }, { headers });
            openSnackbar(`Namespace '${name}' created!`);
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to create namespace.');
        }
    };

    const handleDeleteNamespace = async (name: string) => {
        try {
            await axios.delete(`${API_URL}/api/metrics/namespaces/${name}`, { headers });
            openSnackbar(`Namespace '${name}' deletion initiated.`);
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete namespace.');
        }
    };

    const handleDeletePod = async (pod: Pod) => {
        setLoading(true);
        try {
            await axios.delete(`${API_URL}/api/metrics/pods/${pod.namespace}/${pod.name}`, { headers });
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete pod.');
            setLoading(false);
        }
    };

    const handleRestartDeployment = async (dep: Deployment) => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/metrics/deployments/${dep.namespace}/${dep.name}/restart`, {}, { headers });
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to restart deployment.');
            setLoading(false);
        }
    };

    const handleScaleDeployment = async (dep: Deployment, replicas: number) => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/metrics/deployments/${dep.namespace}/${dep.name}/scale`, { replicas }, { headers });
            await fetchData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to scale deployment.');
            setLoading(false);
        }
    };

    const updateParams = (clusterName: string | null, ns: string, ot?: number, rt?: number) => {
        const params: any = {};
        if (clusterName) params.cluster = clusterName;
        if (ns !== 'all') params.ns = ns;
        if (ot !== undefined && ot !== 0) params.ot = ot;
        else if (ns === 'all' && overviewTab !== 0) params.ot = overviewTab;
        
        if (rt !== undefined && rt !== 0) params.rt = rt;
        else if (ns !== 'all' && resourceTab !== 0) params.rt = resourceTab;

        setSearchParams(params);
    };

    const handleSelectNamespace = (ns: string) => {
        setSelectedNs(ns);
        updateParams(selectedCluster, ns, 1, 0);
    };

    const getResourceName = (tab: number) => {
        if (tab === 0) return 'pods';
        if (tab === 1) return 'deployments';
        if (tab === 2) return 'svc';
        return 'pods';
    };

    const handlePathSubmit = () => {
        setIsEditingPath(false);
        const parts = pathInput.toLowerCase().split('/').filter(p => p.trim());
        
        if (parts.length === 0 || parts[0] !== 'clusters') {
            openSnackbar('Invalid path. Start with "clusters/"', 'warning');
            return;
        }

        if (parts.length === 1) { // clusters
            setViewType('clusters');
            setSearchParams({});
            setPathInput('clusters');
            return;
        }

        const clusterName = parts[1];
        if (!clusters.some(c => c.name.toLowerCase() === clusterName)) {
            openSnackbar(`Cluster '${clusterName}' not found.`, 'error');
            return;
        }

        if (parts.length === 2) { // clusters/{clusterName}
            setViewType('details');
            updateParams(clusterName, 'all', 1, 0);
            return;
        }

        if (parts[2] === 'nodes') {
            setViewType('details');
            updateParams(clusterName, 'all', 0, 0);
            return;
        }

        if (parts[2] === 'namespace') {
            if (parts.length === 3) { // clusters/{clusterName}/namespace
                setViewType('details');
                updateParams(clusterName, 'all', 1, 0);
            } else { // clusters/{clusterName}/namespace/{ns}
                const ns = parts[3];
                const rt = parts[4] === 'deployments' ? 1 : parts[4] === 'svc' ? 2 : 0;
                setViewType('details');
                updateParams(clusterName, ns, 1, rt);
            }
            return;
        }

        openSnackbar('Path not found', 'error');
    };

    if (viewType === 'clusters') {
        return (
            <ClusterList 
                clusters={clusters} 
                onSelectCluster={handleSelectCluster}
            />
        );
    }

    if (loading && pods.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            flexGrow: 1, 
                            maxWidth: 600,
                            bgcolor: isEditingPath ? '#161b22' : '#0d1117',
                            border: '1px solid',
                            borderColor: isEditingPath ? tokens.accent.blue : '#30363d',
                            borderRadius: '6px',
                            px: 1,
                            py: 0.25,
                            cursor: 'text',
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: isEditingPath ? tokens.accent.blue : '#8b949e' },
                            boxShadow: isEditingPath ? `0 0 0 1px ${tokens.accent.blue}` : 'none'
                        }}
                        onClick={() => setIsEditingPath(true)}
                    >
                        {isEditingPath ? (
                            <TextField
                                autoFocus
                                fullWidth
                                variant="standard"
                                value={pathInput}
                                onChange={(e) => setPathInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handlePathSubmit();
                                    if (e.key === 'Escape') setIsEditingPath(false);
                                }}
                                onBlur={() => setIsEditingPath(false)}
                                InputProps={{ 
                                    disableUnderline: true, 
                                    sx: { fontSize: '0.85rem', color: '#c9d1d9', ml: 1 },
                                    startAdornment: <FolderOpenIcon sx={{ color: '#8b949e', fontSize: 18 }} />
                                }}
                            />
                        ) : (
                            <Breadcrumbs 
                                separator={<ChevronRightIcon sx={{ fontSize: 16, color: '#484f58', mx: -0.5 }} />} 
                                sx={{ '& .MuiBreadcrumbs-li': { fontSize: '0.85rem' } }}
                            >
                                <Box 
                                    sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        color: '#c9d1d9',
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' }
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewType('clusters');
                                        setSearchParams({});
                                    }}
                                >
                                    <HomeIcon sx={{ fontSize: 16, mr: 0.5, color: '#8b949e' }} />
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>clusters</Typography>
                                </Box>
                                
                                {selectedNs === 'all' ? (
                                    <Box sx={{ px: 1.25, py: 0.6, borderRadius: '6px', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Typography sx={{ fontWeight: 600, color: tokens.accent.blue, fontSize: '0.85rem' }}>
                                            {overviewTab === 0 ? 'nodes' : 'namespace'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box 
                                        sx={{ 
                                            px: 1, 
                                            py: 0.5, 
                                            borderRadius: '4px', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateParams(selectedCluster, 'all', 1, 0);
                                        }}
                                    >
                                        <Typography sx={{ fontSize: '0.85rem', color: '#c9d1d9' }}>namespace</Typography>
                                    </Box>
                                )}

                                {selectedNs !== 'all' && (
                                    <Box sx={{ px: 1.25, py: 0.6, borderRadius: '6px', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Typography sx={{ fontWeight: 600, color: tokens.accent.blue, fontSize: '0.85rem' }}>
                                            {selectedNs}
                                        </Typography>
                                    </Box>
                                )}
                            </Breadcrumbs>
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {loading && <CircularProgress size={20} />}
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {selectedCluster && !clusters.find(c => c.name === selectedCluster)?.status.includes('Active') ? (
                <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px' }}>
                    <Typography variant="h6" sx={{ color: tokens.text.primary, mb: 1 }}>Cluster Data Unavailable</Typography>
                    <Typography sx={{ color: tokens.text.muted }}>
                        The selected cluster '{selectedCluster}' is not the currently active host context. 
                        Data can only be displayed for the active cluster.
                    </Typography>
                    <Button 
                        variant="outlined" 
                        sx={{ mt: 2, textTransform: 'none' }} 
                        onClick={() => setViewType('clusters')}
                    >
                        Back to Clusters
                    </Button>
                </Box>
            ) : (
                selectedNs === 'all' ? (
                <ClusterOverview 
                    nodes={nodes} 
                    namespaces={namespaces} 
                    tab={overviewTab}
                    setTab={(t) => { setOverviewTab(t); updateParams(selectedCluster, 'all', t, 0); }}
                    formatDate={formatDate} 
                    onSelectNamespace={handleSelectNamespace} 
                    onCreateNamespace={handleCreateNamespace}
                    onDeleteNamespace={handleDeleteNamespace}
                />
            ) : (
                <NamespaceView 
                    namespace={selectedNs}
                    pods={pods}
                    deployments={deployments}
                    services={services}
                    tab={resourceTab}
                    setTab={(t) => { setResourceTab(t); updateParams(selectedCluster, selectedNs, 1, t); }}
                    formatDate={formatDate}
                    getStatusColor={getStatusColor}
                    onDeletePod={handleDeletePod}
                    onRestartDeployment={handleRestartDeployment}
                    onScaleDeployment={handleScaleDeployment}
                />
            ))}

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Kubernetes;
