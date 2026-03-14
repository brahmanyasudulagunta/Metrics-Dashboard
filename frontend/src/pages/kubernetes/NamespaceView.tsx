import React, { useState } from 'react';
import { 
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, 
    TableCell, TableContainer, TableHead, TableRow, Button,
    Dialog, DialogTitle, DialogContent, 
    DialogContentText, DialogActions, TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { Pod, Deployment, Service } from './types';
import { tokens } from '../../theme';
import { useNavigate } from 'react-router-dom';

interface NamespaceViewProps {
    namespace: string;
    pods: Pod[];
    deployments: Deployment[];
    services: Service[];
    formatDate: (iso: string | null) => string;
    getStatusColor: (status: string) => string;
    onDeletePod: (pod: Pod) => Promise<void>;
    onRestartDeployment: (dep: Deployment) => Promise<void>;
    onScaleDeployment: (dep: Deployment, replicas: number) => Promise<void>;
    tab: number;
    setTab: (tab: number) => void;
}

const NamespaceView: React.FC<NamespaceViewProps> = ({ 
    namespace, pods, deployments, services, formatDate, getStatusColor,
    onDeletePod, onRestartDeployment, onScaleDeployment, tab, setTab
}) => {
    const navigate = useNavigate();
    const [deletePodDialog, setDeletePodDialog] = useState<{ open: boolean, pod: Pod | null }>({ open: false, pod: null });
    const [restartDepDialog, setRestartDepDialog] = useState<{ open: boolean, dep: Deployment | null }>({ open: false, dep: null });
    const [scaleDepDialog, setScaleDepDialog] = useState<{ open: boolean, dep: Deployment | null, replicas: string }>({ open: false, dep: null, replicas: '' });

    const handleDeletePod = async () => {
        if (deletePodDialog.pod) {
            await onDeletePod(deletePodDialog.pod);
            setDeletePodDialog({ open: false, pod: null });
        }
    };

    const handleRestartDep = async () => {
        if (restartDepDialog.dep) {
            await onRestartDeployment(restartDepDialog.dep);
            setRestartDepDialog({ open: false, dep: null });
        }
    };

    const handleScaleDep = async () => {
        if (scaleDepDialog.dep) {
            const r = parseInt(scaleDepDialog.replicas, 10);
            if (!isNaN(r)) {
                await onScaleDeployment(scaleDepDialog.dep, r);
                setScaleDepDialog({ open: false, dep: null, replicas: '' });
            }
        }
    };

    return (
        <Box>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Pods" />
                    <Tab label="Deployments" />
                    <Tab label="Services" />
                </Tabs>
            </Box>

            {tab === 0 && (
                <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Restarts</TableCell>
                                <TableCell>Age</TableCell>
                                <TableCell align="left" sx={{ width: 150 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pods.map(pod => (
                                <TableRow key={pod.name} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/kubernetes/${pod.namespace}/${pod.name}`)}>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 500, color: tokens.accent.blue, '&:hover': { textDecoration: 'underline' } }}>{pod.name}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ color: getStatusColor(pod.status), fontWeight: 600 }}>{pod.status}</TableCell>
                                    <TableCell>{pod.restarts}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatDate(pod.age)}</TableCell>
                                    <TableCell align="left" onClick={(e) => e.stopPropagation()}>
                                        <Button size="small" color="error" variant="contained" onClick={() => setDeletePodDialog({ open: true, pod })} sx={{ textTransform: 'none' }}>Delete</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {pods.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: tokens.text.muted }}>No pods found.</TableCell></TableRow>}
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
                                <TableCell>Ready</TableCell>
                                <TableCell>Age</TableCell>
                                <TableCell align="left" sx={{ width: 200 }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {deployments.map(d => (
                                <TableRow key={d.name} hover>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 500, color: tokens.accent.blue }}>{d.name}</Typography>
                                    </TableCell>
                                    <TableCell>{d.ready}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{formatDate(d.age)}</TableCell>
                                    <TableCell align="left">
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Button size="small" variant="contained" color="warning" onClick={() => setRestartDepDialog({ open: true, dep: d })} sx={{ textTransform: 'none', color: '#000', bgcolor: tokens.accent.yellow }}>Restart</Button>
                                            <Button size="small" variant="contained" color="primary" onClick={() => setScaleDepDialog({ open: true, dep: d, replicas: d.ready.split('/')[1] || "0" })} sx={{ textTransform: 'none' }}>Scale</Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {deployments.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: tokens.text.muted }}>No deployments found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 2 && (
                <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Cluster IP</TableCell>
                                <TableCell>Ports</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {services.map(s => (
                                <TableRow key={s.name} hover>
                                    <TableCell>
                                        <Typography sx={{ fontWeight: 500, color: tokens.accent.blue }}>{s.name}</Typography>
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', color: tokens.chart.cpu }}>{s.type}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{s.cluster_ip}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{s.ports}</TableCell>
                                </TableRow>
                            ))}
                             {services.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: tokens.text.muted }}>No services found.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialogs */}
            <Dialog open={deletePodDialog.open} onClose={() => setDeletePodDialog({ ...deletePodDialog, open: false })}>
                <DialogTitle>Delete Pod</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to delete pod <strong>{deletePodDialog.pod?.name}</strong>?</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeletePodDialog({ ...deletePodDialog, open: false })} color="inherit">Cancel</Button>
                    <Button onClick={handleDeletePod} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={restartDepDialog.open} onClose={() => setRestartDepDialog({ ...restartDepDialog, open: false })}>
                <DialogTitle>Restart Deployment</DialogTitle>
                <DialogContent>
                    <DialogContentText>Are you sure you want to restart deployment <strong>{restartDepDialog.dep?.name}</strong>?</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRestartDepDialog({ ...restartDepDialog, open: false })} color="inherit">Cancel</Button>
                    <Button onClick={handleRestartDep} color="warning" variant="contained">Restart</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={scaleDepDialog.open} onClose={() => setScaleDepDialog({ ...scaleDepDialog, open: false })}>
                <DialogTitle>Scale Deployment</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>Enter new replica count for deployment <strong>{scaleDepDialog.dep?.name}</strong>:</DialogContentText>
                    <TextField autoFocus margin="dense" label="Replicas" type="number" fullWidth variant="outlined" value={scaleDepDialog.replicas} onChange={(e) => setScaleDepDialog({ ...scaleDepDialog, replicas: e.target.value })} inputProps={{ min: 0 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setScaleDepDialog({ ...scaleDepDialog, open: false })} color="inherit">Cancel</Button>
                    <Button onClick={handleScaleDep} color="primary" variant="contained">Scale</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default NamespaceView;
