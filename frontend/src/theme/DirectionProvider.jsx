import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { cacheLtr, cacheRtl } from './rtlCache';
import { buildTheme } from './theme';

/**
 * Wraps the app with the correct Emotion cache + MUI theme for the given
 * direction, and mirrors the `dir`/`lang` attributes on <html> so native
 * form controls and scrollbars follow suit too.
 */
export default function DirectionProvider({ direction = 'rtl', children }) {
  const theme = useMemo(() => buildTheme(direction), [direction]);
  const cache = direction === 'rtl' ? cacheRtl : cacheLtr;

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', direction === 'rtl' ? 'ar' : 'en');
  }

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
}

DirectionProvider.propTypes = {
  direction: PropTypes.oneOf(['rtl', 'ltr']),
  children: PropTypes.node,
};
