import React from 'react';
import { Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemButton, IconButton, Divider } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import WifiIcon from '@mui/icons-material/Wifi';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const drawerWidth = 240;

interface MainLayoutProps {
    onLogout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { text: 'Overview', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Network', icon: <WifiIcon />, path: '/dashboard/network' },
        { text: 'Containers', icon: <StorageIcon />, path: '/dashboard/containers' },
        { text: 'Settings', icon: <SettingsIcon />, path: '/dashboard/settings' },
    ];

    const handleNavigation = (path: string) => {
        navigate(path);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            {/* App Bar (Header) */}
            <AppBar position="fixed" sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px`, boxShadow: 'none', borderBottom: 1, borderColor: 'divider' }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Metrics Platform
                    </Typography>
                    <IconButton color="inherit" onClick={onLogout} title="Logout">
                        <LogoutIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            {/* Sidebar (Drawer) */}
            <Drawer
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        borderRight: 1,
                        borderColor: 'divider',
                        backgroundColor: 'background.paper'
                    },
                }}
                variant="permanent"
                anchor="left"
            >
                <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" fontWeight="bold" color="primary">Metrics Hub</Typography>
                </Toolbar>
                <Divider />
                <List sx={{ pt: 2 }}>
                    {menuItems.map((item) => {
                        const isSelected = location.pathname === item.path || (location.pathname === '/' && item.path === '/dashboard');
                        return (
                            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                                <ListItemButton
                                    selected={isSelected}
                                    onClick={() => handleNavigation(item.path)}
                                    sx={{
                                        mx: 1,
                                        borderRadius: 1,
                                        '&.Mui-selected': {
                                            backgroundColor: 'rgba(87, 148, 242, 0.1)',
                                            color: 'primary.main',
                                            '& .MuiListItemIcon-root': {
                                                color: 'primary.main',
                                            }
                                        }
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isSelected ? 600 : 400 }} />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Drawer>

            {/* Main Content Area */}
            <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 10, minHeight: '100vh', backgroundColor: 'background.default' }}>
                <Outlet /> {/* Renders the active nested route */}
            </Box>
        </Box>
    );
};

export default MainLayout;
