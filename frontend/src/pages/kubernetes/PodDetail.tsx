import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RefreshIcon from '@mui/icons-material/Refresh';
import TerminalIcon from '@mui/icons-material/Terminal';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import axios from 'axios';
import API_URL from '../../config';
import { tokens } from '../../theme';
import { 
    Typography, Box, CircularProgress, Alert, Button, Paper, Divider, 
    Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, 
    DialogContentText, DialogActions, Breadcrumbs, Link, TextField, Grid
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface Container {
    name: string;
    image: string;
    state: string;
    restarts: number;
    ready: boolean;
}

interface PodInfo {
    name: string;
    namespace: string;
    status: string;
    node: string;
    ip: string;
    host_ip: string;
    start_time: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    containers: Container[];
}

const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'running' || s === 'active') return tokens.accent.green;
    if (s === 'pending' || s === 'containercreating') return tokens.accent.yellow;
    if (s === 'failed' || s === 'error' || s === 'crashloopbackoff') return tokens.accent.red;
    return tokens.text.muted;
};

const PodDetail: React.FC = () => {
    const { namespace, name } = useParams<{ namespace: string, name: string }>();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<string>('');
    const [podInfo, setPodInfo] = useState<PodInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pathInput, setPathInput] = useState(`clusters/namespace/${namespace}/${name}`);
    const [isEditingPath, setIsEditingPath] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const [logsRes, detailsRes] = await Promise.all([
                axios.get(`${API_URL}/api/metrics/pods/${namespace}/${name}/logs?tail=200`, { headers }).catch(e => ({ data: { logs: 'Could not fetch logs.' } })),
                axios.get(`${API_URL}/api/metrics/pods/${namespace}/${name}/details`, { headers })
            ]);
            
            setLogs(logsRes.data.logs || 'No logs found.');
            setPodInfo(detailsRes.data);
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to fetch pod details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [name, namespace]);

    const executeDeletePod = async () => {
        setDeleteDialogOpen(false);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/metrics/pods/${namespace}/${name}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/dashboard/kubernetes');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to delete pod.');
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            flexGrow: 1, 
                            maxWidth: 800,
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
                                    if (e.key === 'Enter') {
                                        const parts = pathInput.toLowerCase().split('/').filter(p => p.trim());
                                        if (parts[0] === 'clusters') {
                                            if (parts.length === 1) navigate('/dashboard/kubernetes');
                                            else if (parts[1] === 'namespace') {
                                                if (parts.length === 2) navigate('/dashboard/kubernetes?ns=all&ot=1');
                                                else navigate(`/dashboard/kubernetes?ns=${parts[2]}&ot=1&rt=0`);
                                            }
                                        }
                                        setIsEditingPath(false);
                                    }
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
                                        navigate('/dashboard/kubernetes');
                                    }}
                                >
                                    <HomeIcon sx={{ fontSize: 16, mr: 0.5, color: '#8b949e' }} />
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>clusters</Typography>
                                </Box>
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
                                        navigate(`/dashboard/kubernetes?ns=all&ot=1`);
                                    }}
                                >
                                    <Typography sx={{ fontSize: '0.85rem', color: '#c9d1d9' }}>namespace</Typography>
                                </Box>
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
                                        navigate(`/dashboard/kubernetes?ns=${namespace}&ot=1&rt=0`);
                                    }}
                                >
                                    <Typography sx={{ fontSize: '0.85rem', color: '#c9d1d9' }}>{namespace}</Typography>
                                </Box>
                                <Box sx={{ px: 1.25, py: 0.6, borderRadius: '6px', bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Typography sx={{ fontWeight: 600, color: tokens.accent.blue, fontSize: '0.85rem' }}>
                                        {name}
                                    </Typography>
                                </Box>
                            </Breadcrumbs>
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" color="primary" onClick={fetchData} sx={{ textTransform: 'none' }}>
                        Refresh
                    </Button>
                    <Button variant="contained" color="error" onClick={() => setDeleteDialogOpen(true)} sx={{ textTransform: 'none' }}>
                        Delete Pod
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, minHeight: 0, overflow: 'hidden' }}>
                {/* Left Column: Pod Info */}
                <Box sx={{ flex: '0 0 35%', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
                    <Paper sx={{ p: 2, bgcolor: tokens.bg.surface, borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem' }}>Pod Status</Typography>
                        {loading && !podInfo ? <CircularProgress size={24} /> : podInfo && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Phase</Typography>
                                    <Typography variant="body2" sx={{ color: getStatusColor(podInfo.status), fontWeight: 700 }}>{podInfo.status}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Pod IP</Typography>
                                    <Typography variant="body2" fontFamily="monospace">{podInfo.ip}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Node</Typography>
                                    <Typography variant="body2" fontFamily="monospace">{podInfo.node}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">Started</Typography>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {podInfo.start_time ? new Date(podInfo.start_time).toLocaleString() : 'N/A'}
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Paper>

                    {podInfo && podInfo.containers && podInfo.containers.length > 0 && (
                        <Paper sx={{ p: 2, bgcolor: tokens.bg.surface, borderRadius: 2, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem', flexShrink: 0 }}>Containers</Typography>
                            <Box sx={{ overflowY: 'auto', pr: 1 }}>
                                {podInfo.containers.map((c, i) => (
                                    <Box key={i} sx={{ mb: i < podInfo.containers.length -1 ? 2 : 0 }}>
                                        <Typography variant="subtitle2" sx={{ color: tokens.accent.blue }}>{c.name}</Typography>
                                        <Typography variant="caption" fontFamily="monospace" sx={{ display: 'block', mb: 1, wordBreak: 'break-all', color: tokens.text.muted }}>{c.image}</Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip size="small" label={c.state} sx={{ bgcolor: getStatusColor(c.state.split(' ')[0]), color: '#fff', fontSize: '0.7rem' }} />
                                            <Chip size="small" label={`Restarts: ${c.restarts}`} variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                            {c.ready && <Chip size="small" label="Ready" color="success" variant="outlined" sx={{ fontSize: '0.7rem' }} />}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Paper>
                    )}

                    {podInfo && podInfo.labels && Object.keys(podInfo.labels).length > 0 && (
                        <Paper sx={{ p: 2, bgcolor: tokens.bg.surface, borderRadius: 2, display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontSize: '1rem', flexShrink: 0 }}>Labels</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, overflowY: 'auto', alignContent: 'flex-start', pr: 1 }}>
                                {Object.entries(podInfo.labels).map(([k, v]) => (
                                    <Chip key={k} size="small" label={`${k}: ${v}`} sx={{ bgcolor: tokens.bg.base, fontFamily: 'monospace', fontSize: '0.75rem' }} />
                                ))}
                            </Box>
                        </Paper>
                    )}
                </Box>

                {/* Right Column: Logs */}
                <Paper sx={{ flex: 1, bgcolor: tokens.bg.base, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden', minHeight: 0 }}>
                    <Box sx={{ bgcolor: tokens.bg.surface, p: 1.5, borderBottom: `1px solid ${tokens.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TerminalIcon fontSize="small" sx={{ color: tokens.text.muted }} />
                            <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>Pod Logs</Typography>
                        </Box>
                    </Box>
                    <Box sx={{
                        p: 2,
                        overflowY: 'auto',
                        flexGrow: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: tokens.text.secondary,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        lineHeight: 1.5
                    }}>
                        {loading && !logs ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>
                        ) : (
                            logs
                        )}
                    </Box>
                </Paper>
            </Box>
            {/* Dialogs */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete Pod</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete pod <strong>{name}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={executeDeletePod} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PodDetail;
