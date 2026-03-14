import React, { useState } from 'react';
import { 
    Box, Typography, Button, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Paper, Chip, 
    Dialog, DialogTitle, DialogContent, DialogContentText, 
    DialogActions, TextField, IconButton, Tooltip 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SettingsInputComponentIcon from '@mui/icons-material/SettingsInputComponent';
import { Cluster } from './types';
import { tokens } from '../../theme';

interface ClusterListProps {
    clusters: Cluster[];
    onSelectCluster: (cluster: Cluster) => void;
}

const ClusterList: React.FC<ClusterListProps> = ({ clusters, onSelectCluster }) => {

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Kubernetes Clusters</Typography>
            </Box>
            <TableContainer 
                component={Paper} 
                sx={{ 
                    bgcolor: '#0d1117', 
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    boxShadow: 'none'
                }}
            >
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#161b22' }}>
                            <TableCell sx={{ color: tokens.text.muted, fontWeight: 600, borderBottom: '1px solid #30363d' }}>CLUSTER NAME</TableCell>
                            <TableCell sx={{ color: tokens.text.muted, fontWeight: 600, borderBottom: '1px solid #30363d' }}>STATUS</TableCell>
                            <TableCell sx={{ color: tokens.text.muted, fontWeight: 600, borderBottom: '1px solid #30363d' }}>PROVIDER</TableCell>
                            <TableCell align="right" sx={{ color: tokens.text.muted, fontWeight: 600, borderBottom: '1px solid #30363d' }}>ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {clusters.map(cluster => {
                            const isActive = cluster.status === "Active";
                            return (
                                <TableRow key={cluster.id} hover sx={{ '&:hover': { bgcolor: '#161b22' } }}>
                                    <TableCell sx={{ borderBottom: '1px solid #30363d' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <StorageIcon sx={{ color: isActive ? tokens.accent.green : tokens.text.muted, fontSize: 20 }} />
                                            <Box>
                                                <Typography sx={{ fontWeight: 600, color: tokens.text.primary }}>
                                                    {cluster.name}
                                                </Typography>
                                                {isActive && (
                                                    <Typography sx={{ color: tokens.accent.green, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <CheckCircleOutlineIcon sx={{ fontSize: 12 }} /> Current Context
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ borderBottom: '1px solid #30363d' }}>
                                        <Chip 
                                            label={cluster.status} 
                                            size="small"
                                            sx={{ 
                                                bgcolor: isActive ? 'rgba(35, 134, 54, 0.15)' : 'rgba(139, 148, 158, 0.15)', 
                                                color: isActive ? tokens.accent.green : tokens.text.muted,
                                                border: '1px solid',
                                                borderColor: isActive ? 'rgba(35, 134, 54, 0.3)' : 'rgba(139, 148, 158, 0.3)',
                                                fontWeight: 600,
                                                fontSize: '0.7rem'
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell sx={{ color: tokens.text.muted, borderBottom: '1px solid #30363d' }}>
                                        {cluster.provider}
                                    </TableCell>
                                    <TableCell align="right" sx={{ borderBottom: '1px solid #30363d' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                onClick={() => onSelectCluster(cluster)}
                                                sx={{ 
                                                    textTransform: 'none',
                                                    borderColor: 'rgba(255,255,255,0.1)',
                                                    color: tokens.text.primary,
                                                    '&:hover': { borderColor: tokens.accent.blue, bgcolor: 'rgba(0,163,255,0.05)' },
                                                    borderRadius: '6px',
                                                    fontWeight: 600,
                                                    px: 2
                                                }}
                                            >
                                                View Details
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ClusterList;
