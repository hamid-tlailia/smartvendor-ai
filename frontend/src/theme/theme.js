import { createTheme } from '@mui/material/styles';

/** Builds the MUI theme for the given direction; Cairo is used for Arabic, Inter for Latin text. */
export function buildTheme(direction = 'rtl') {
  return createTheme({
    direction,
    palette: {
      mode: 'light',
      primary: { main: '#1E6F5C', contrastText: '#ffffff' }, // SmartVendor green
      secondary: { main: '#F2A93B' },
      success: { main: '#2E7D32' },
      warning: { main: '#ED6C02' },
      error: { main: '#D32F2F' },
      background: { default: '#F6F8F7', paper: '#FFFFFF' },
      text: { primary: '#152420', secondary: '#5B6B66' },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: direction === 'rtl' ? '"Cairo", "Inter", sans-serif' : '"Inter", "Cairo", sans-serif',
      h1: { fontWeight: 800 },
      h2: { fontWeight: 800 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { fontWeight: 700, textTransform: 'none' },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, paddingTop: 10, paddingBottom: 10 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { boxShadow: '0 2px 16px rgba(21,36,32,0.06)' },
        },
      },
    },
  });
}
