import React, { useState } from 'react';
import { 
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, 
    TableCell, TableContainer, TableHead, TableRow, Button,
    IconButton, Dialog, DialogTitle, DialogContent, 
    DialogContentText, DialogActions, TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { NodeInfo, Namespace } from './types';
import { tokens } from '../../theme';

interface ClusterOverviewProps {
    nodes: NodeInfo[];
    namespaces: Namespace[];
    tab: number;
    setTab: (tab: number) => void;
    formatDate: (iso: string | null) => string;
    onSelectNamespace: (name: string) => void;
    onCreateNamespace: (name: string) => Promise<void>;
    onDeleteNamespace: (name: string) => Promise<void>;
}

const ClusterOverview: React.FC<ClusterOverviewProps> = ({ 
    nodes, namespaces, tab, setTab, formatDate, onSelectNamespace, onCreateNamespace, onDeleteNamespace 
}) => {
    const [createNsDialog, setCreateNsDialog] = useState<{ open: boolean, name: string }>({ open: false, name: '' });
    const [deleteNsDialog, setDeleteNsDialog] = useState<{ open: boolean, name: string }>({ open: false, name: '' });

    const handleCreateNs = async () => {
        if (createNsDialog.name.trim()) {
            await onCreateNamespace(createNsDialog.name);
            setCreateNsDialog({ open: false, name: '' });
        }
    };

    const handleDeleteNs = async () => {
        if (deleteNsDialog.name) {
            await onDeleteNamespace(deleteNsDialog.name);
            setDeleteNsDialog({ open: false, name: '' });
        }
    };

    return (
        <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Nodes" />
                    <Tab label="Namespaces" />
                </Tabs>
                <Button variant="contained" size="small" onClick={() => setCreateNsDialog({ open: true, name: '' })} sx={{ textTransform: 'none', mb: 0.5 }}>
                    Create Namespace
                </Button>
            </Box>

            {tab === 0 && (
                <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Roles</TableCell>
                                <TableCell>Internal IP</TableCell>
                                <TableCell>OS / Version</TableCell>
                                <TableCell>Age</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {nodes.map(node => (
                                <TableRow key={node.name} hover>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 500, color: tokens.accent.blue }}>{node.name}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: node.status === 'Ready' ? tokens.accent.green : tokens.accent.red, fontWeight: 600 }}>{node.status}</TableCell>
                                    <TableCell>{node.roles.join(', ')}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{node.ip}</TableCell>
                                    <TableCell sx={{ fontSize: '0.8125rem' }}>{node.os}<br /><span style={{ opacity: 0.7 }}>{node.kubelet_version}</span></TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatDate(node.age)}</TableCell>
                                </TableRow>
                            ))}
                            {nodes.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: tokens.text.muted }}>No nodes found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 1 && (
                <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {namespaces.map(ns => (
                                <TableRow key={ns.name} hover sx={{ cursor: 'pointer' }} onClick={() => onSelectNamespace(ns.name)}>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 500, color: tokens.accent.blue, '&:hover': { textDecoration: 'underline' } }}>{ns.name}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: ns.status === 'Active' ? tokens.accent.green : tokens.accent.red, fontWeight: 600 }}>{ns.status}</TableCell>
                                    <TableCell align="right">
                                        <Button 
                                            size="small" 
                                            color="error"
                                            variant="contained"
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setDeleteNsDialog({ open: true, name: ns.name }); 
                                            }}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {namespaces.length === 0 && <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: tokens.text.muted }}>No namespaces found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialogs */}
            <Dialog open={createNsDialog.open} onClose={() => setCreateNsDialog({ ...createNsDialog, open: false })}>
                <DialogTitle>Create New Namespace</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>Enter a name for the new Kubernetes namespace.</DialogContentText>
                    <TextField autoFocus margin="dense" label="Namespace Name" fullWidth variant="outlined" value={createNsDialog.name} onChange={(e) => setCreateNsDialog({ ...createNsDialog, name: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateNsDialog({ ...createNsDialog, open: false })} color="inherit">Cancel</Button>
                    <Button onClick={handleCreateNs} color="primary" variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteNsDialog.open} onClose={() => setDeleteNsDialog({ ...deleteNsDialog, open: false })}>
                <DialogTitle>Delete Namespace</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to delete namespace <strong>{deleteNsDialog.name}</strong>? This will delete all resources within it.</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteNsDialog({ ...deleteNsDialog, open: false })} color="inherit">Cancel</Button>
                    <Button onClick={handleDeleteNs} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ClusterOverview;
