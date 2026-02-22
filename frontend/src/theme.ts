import { createTheme, Theme } from '@mui/material';

export const getTheme = (mode: 'light' | 'dark'): Theme => {
    return createTheme({
        palette: {
            mode,
            ...(mode === 'dark'
                ? {
                    // Softened Dark Mode
                    background: {
                        default: '#1a1d24',
                        paper: '#22262e',
                    },
                    primary: { main: '#5794f2' },
                    secondary: { main: '#f2495c' },
                    success: { main: '#73bf69' },
                    warning: { main: '#ff9830' },
                    info: { main: '#5794f2' },
                    text: {
                        primary: '#e6edf3',
                        secondary: '#8b949e',
                    },
                    divider: '#30363d',
                }
                : {
                    // Light Mode
                    background: {
                        default: '#f6f8fa',
                        paper: '#ffffff',
                    },
                    primary: { main: '#0969da' },
                    secondary: { main: '#cf222e' },
                    success: { main: '#2da44e' },
                    warning: { main: '#bf8700' },
                    info: { main: '#0969da' },
                    text: {
                        primary: '#24292f',
                        secondary: '#57606a',
                    },
                    divider: '#d0d7de',
                }),
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h4: { fontWeight: 600 },
            h6: { fontWeight: 500 },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        transition: 'background-color 0.3s ease, color 0.3s ease',
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        backgroundImage: 'none',
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: 'none',
                    }),
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: ({ theme }) => ({
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        backgroundImage: 'none',
                        boxShadow: 'none',
                    }),
                },
            },
        },
    });
};

