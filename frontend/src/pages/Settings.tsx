import React from 'react';
import { Typography, Paper, Box, Divider, List, ListItem, ListItemText, Switch, ListItemSecondaryAction, Button } from '@mui/material';

const Settings: React.FC = () => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>Settings</Typography>
            <Typography color="textSecondary" sx={{ mb: 4 }}>
                Manage your dashboard preferences and account configurations.
            </Typography>

            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>Preferences</Typography>
                <Divider sx={{ mb: 2 }} />
                <List disablePadding>
                    <ListItem disableGutters>
                        <ListItemText
                            primary="Auto-Refresh Data"
                            secondary="Automatically fetch new metrics every 15 seconds."
                        />
                        <ListItemSecondaryAction>
                            <Switch edge="end" defaultChecked color="primary" />
                        </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem disableGutters>
                        <ListItemText
                            primary="Strict Dark Mode"
                            secondary="Enforce a deep contrast dark mode across all views."
                        />
                        <ListItemSecondaryAction>
                            <Switch edge="end" defaultChecked disabled color="primary" />
                        </ListItemSecondaryAction>
                    </ListItem>
                </List>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Alerting (Coming Soon)</Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography color="textSecondary" sx={{ mb: 2 }}>
                    Configure threshold alerts and notification channels (Email, Slack, webhook).
                </Typography>
                <Button variant="outlined" disabled>Configure Alerts</Button>
            </Paper>
        </Box>
    );
};

export default Settings;
