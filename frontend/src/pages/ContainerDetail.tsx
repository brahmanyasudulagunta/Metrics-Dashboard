import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Box, CircularProgress, Alert, IconButton, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TerminalIcon from '@mui/icons-material/Terminal';
import axios from 'axios';
import API_URL from '../config';

const ContainerDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [logs, setLogs] = useState<string>('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        if (!id) return;

        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const logsRes = await axios.get(`${API_URL}/api/metrics/container_logs?container_name=${id}&tail=100`, { headers }).catch(() => ({ data: { logs: 'Logs not available.' } }));

            setLogs(logsRes.data.logs || 'No logs available for this container.');
            setError('');
        } catch (err) {
            setError(`Failed to fetch diagnostics for container: ${id}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        fetchData();
        const interval = setInterval(fetchData, 10000); // 10s poll
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        // Auto-scroll logs to bottom
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    if (loading && !logs) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/dashboard/containers')} size="large">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4">{id}</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Box sx={{ width: '100%' }}>
                <Paper sx={{
                    bgcolor: '#0d1117',
                    border: '1px solid #30363d',
                    height: 600,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <Box sx={{ bgcolor: '#161b22', p: 1.5, borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TerminalIcon fontSize="small" sx={{ color: '#8b949e' }} />
                        <Typography variant="subtitle2" sx={{ color: '#8b949e', fontFamily: 'monospace' }}>
                            Container Logs (tail -n 100)
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
                        wordBreak: 'break-word',
                        lineHeight: 1.5
                    }}>
                        {logs}
                        <div ref={logsEndRef} />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default ContainerDetail;
