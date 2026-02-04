import React, { useState } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, Typography, Box, Chip, Dialog, DialogTitle, DialogContent,
    DialogContentText, DialogActions, TextField, InputAdornment, IconButton,
    CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ProcessInfo {
    pid: number;
    name: string;
    user: string;
    cpu: number;
    memory: number;
}

interface ProcessTableProps {
    processes: ProcessInfo[];
    onStop: (pid: number) => Promise<void>;
    onRefresh: () => void;
    loading: boolean;
    darkMode: boolean;
}

const ProcessTable: React.FC<ProcessTableProps> = ({ processes, onStop, onRefresh, loading, darkMode }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState<ProcessInfo | null>(null);
    const [stopping, setStopping] = useState(false);

    const filteredProcesses = processes.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pid.toString().includes(searchTerm) ||
        p.user.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStopClick = (proc: ProcessInfo) => {
        setSelectedProcess(proc);
        setConfirmOpen(true);
    };

    const handleConfirmClose = async (confirmed: boolean) => {
        if (confirmed && selectedProcess) {
            setStopping(true);
            try {
                await onStop(selectedProcess.pid);
            } finally {
                setStopping(false);
            }
        }
        setConfirmOpen(false);
        setSelectedProcess(null);
    };

    return (
        <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6">⚙️ Active Processes (Top 30 by CPU)</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <TextField
                        size="small"
                        placeholder="Search by name, PID, or user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ width: 280 }}
                    />
                    <IconButton onClick={onRefresh} disabled={loading} color="primary" title="Refresh">
                        <RefreshIcon />
                    </IconButton>
                </Box>
            </Box>

            <TableContainer component={Paper} elevation={2} sx={{ maxHeight: 500 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: darkMode ? 'grey.800' : 'grey.100' }}>
                            <TableCell><strong>PID</strong></TableCell>
                            <TableCell><strong>Name</strong></TableCell>
                            <TableCell><strong>User</strong></TableCell>
                            <TableCell align="right"><strong>CPU %</strong></TableCell>
                            <TableCell align="right"><strong>Memory (MB)</strong></TableCell>
                            <TableCell align="center"><strong>Action</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <CircularProgress size={30} />
                                </TableCell>
                            </TableRow>
                        ) : filteredProcesses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Typography color="textSecondary">No matching processes found.</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProcesses.map((proc) => (
                                <TableRow key={proc.pid} hover>
                                    <TableCell>
                                        <Chip label={proc.pid} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 'medium' }}>{proc.name}</TableCell>
                                    <TableCell>{proc.user}</TableCell>
                                    <TableCell align="right">
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: proc.cpu > 50 ? 'error.main' : proc.cpu > 20 ? 'warning.main' : 'inherit',
                                                fontWeight: proc.cpu > 50 ? 'bold' : 'normal'
                                            }}
                                        >
                                            {proc.cpu.toFixed(1)}%
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">{proc.memory.toFixed(1)} MB</TableCell>
                                    <TableCell align="center">
                                        <Button
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                            startIcon={<StopIcon />}
                                            onClick={() => handleStopClick(proc)}
                                            disabled={proc.pid <= 1}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Stop
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Confirmation Dialog */}
            <Dialog open={confirmOpen} onClose={() => handleConfirmClose(false)}>
                <DialogTitle>⚠️ Stop Process?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to stop <strong>{selectedProcess?.name}</strong> (PID: {selectedProcess?.pid})?
                        <br /><br />
                        This action cannot be undone and may affect system stability if it's a critical process.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleConfirmClose(false)} disabled={stopping}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleConfirmClose(true)}
                        color="error"
                        variant="contained"
                        disabled={stopping}
                        startIcon={stopping ? <CircularProgress size={16} /> : <StopIcon />}
                    >
                        {stopping ? 'Stopping...' : 'Stop Process'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProcessTable;
