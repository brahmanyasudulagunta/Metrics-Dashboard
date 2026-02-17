import { createTheme } from '@mui/material';

// Grafana-inspired dark theme
const theme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#111217', // Deep blue-gray background
            paper: '#181b1f',   // Slightly lighter panels
        },
        primary: {
            main: '#5794f2', // Vibrant blue
        },
        secondary: {
            main: '#f2495c', // Vibrant red
        },
        success: {
            main: '#73bf69', // Vibrant green
        },
        warning: {
            main: '#ff9830', // Vibrant orange
        },
        info: {
            main: '#5794f2',
        },
        text: {
            primary: '#ccccdc', // High readability light gray
            secondary: '#9fa5b5', // Muted gray
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: {
            fontWeight: 600,
            color: '#e5e5eb',
        },
        h6: {
            fontWeight: 500,
            color: '#ccccdc',
        },
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#111217',
                    color: '#ccccdc',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: '#181b1f',
                    backgroundImage: 'none',
                    border: '1px solid #2c3235',
                    boxShadow: 'none',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: '#181b1f',
                    backgroundImage: 'none',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#181b1f',
                    borderBottom: '1px solid #2c3235',
                    backgroundImage: 'none',
                },
            },
        },
    },
});

export default theme;
