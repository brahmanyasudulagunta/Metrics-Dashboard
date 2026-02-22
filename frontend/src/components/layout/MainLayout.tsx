import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, Divider, Tooltip as MuiTooltip } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExploreIcon from '@mui/icons-material/Explore';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import WifiIcon from '@mui/icons-material/Wifi';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

interface MainLayoutProps {
    onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { text: 'Overview', icon: <DashboardIcon sx={{ mr: 1, fontSize: 20 }} />, path: '/dashboard' },
        { text: 'Explore', icon: <ExploreIcon sx={{ mr: 1, fontSize: 20 }} />, path: '/dashboard/explore' },
        { text: 'Network', icon: <WifiIcon sx={{ mr: 1, fontSize: 20 }} />, path: '/dashboard/network' },
        { text: 'Containers', icon: <StorageIcon sx={{ mr: 1, fontSize: 20 }} />, path: '/dashboard/containers' },
    ];

    const handleNavigation = (path: string) => {
        navigate(path);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Top Navigation Bar */}
            <AppBar position="fixed" sx={{
                bgcolor: '#161b22',
                borderBottom: '1px solid #30363d',
                boxShadow: 'none',
                zIndex: (theme) => theme.zIndex.drawer + 1
            }}>
                <Toolbar variant="dense" sx={{ minHeight: 56, px: 2, display: 'flex', justifyContent: 'space-between' }}>

                    {/* Left: Logo and Navigation Links */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1, mr: 4, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                            Metrics Platform
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {menuItems.map((item) => {
                                const isSelected = location.pathname === item.path || (location.pathname === '/' && item.path === '/dashboard');
                                return (
                                    <Button
                                        key={item.text}
                                        onClick={() => handleNavigation(item.path)}
                                        sx={{
                                            color: isSelected ? '#fff' : '#c9d1d9',
                                            bgcolor: isSelected ? '#1f6feb' : 'transparent',
                                            textTransform: 'none',
                                            fontWeight: isSelected ? 'bold' : 'normal',
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 1,
                                            '&:hover': {
                                                bgcolor: isSelected ? '#388bfd' : '#21262d'
                                            }
                                        }}
                                    >
                                        {item.icon}
                                        {item.text}
                                    </Button>
                                );
                            })}
                        </Box>
                    </Box>

                    {/* Right: Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MuiTooltip title="Settings">
                            <IconButton size="small" sx={{ color: '#8b949e' }} onClick={() => navigate('/dashboard/settings')}>
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </MuiTooltip>

                        <MuiTooltip title="Help">
                            <IconButton size="small" sx={{ color: '#8b949e' }}>
                                <HelpOutlineIcon fontSize="small" />
                            </IconButton>
                        </MuiTooltip>

                        <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1.5, borderColor: '#30363d' }} />

                        <MuiTooltip title="Logout">
                            <IconButton size="small" sx={{ color: '#f85149' }} onClick={onLogout}>
                                <LogoutIcon fontSize="small" />
                            </IconButton>
                        </MuiTooltip>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Main Content Area */}
            <Box component="main" sx={{ flexGrow: 1, p: 3, pt: { xs: 8, sm: 9 } }}>
                <Outlet /> {/* Renders the active nested route */}
            </Box>
        </Box>
    );
};

export default MainLayout;
