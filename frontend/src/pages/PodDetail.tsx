import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Box, CircularProgress, Alert, Button, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TerminalIcon from '@mui/icons-material/Terminal';
import axios from 'axios';
import API_URL from '../config';

const PodDetail: React.FC = () => {
    const { namespace, name } = useParams<{ namespace: string, name: string }>();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/metrics/pods/${namespace}/${name}/logs?tail=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data.logs || 'No logs found.');
            setError('');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to fetch pod logs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [name, namespace]);

    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    return (
        <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/kubernetes')} sx={{ mr: 2, color: 'text.secondary' }}>
                    Back
                </Button>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600 }}>{name}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Namespace: {namespace}
                    </Typography>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Paper sx={{
                    bgcolor: '#0d1117',
                    border: '1px solid #30363d',
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <Box sx={{ bgcolor: '#161b22', p: 1.5, borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TerminalIcon fontSize="small" sx={{ color: '#8b949e' }} />
                        <Typography variant="subtitle2" sx={{ color: '#8b949e', fontFamily: 'monospace' }}>
                            Pod Logs (tail -n 100)
                        </Typography>
                    </Box>
                    <Box sx={{
                        p: 2,
                        overflowY: 'auto',
                        flexGrow: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        color: '#e6edf3',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        lineHeight: 1.5
                    }}>
                        {loading && !logs ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress size={24} /></Box>
                        ) : (
                            logs
                        )}
                        <div ref={logsEndRef} />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default PodDetail;
