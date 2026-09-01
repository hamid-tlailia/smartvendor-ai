import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';

/**
 * Two Emotion caches, one per text direction. The app switches between them
 * based on the active locale (Arabic -> RTL, everything else -> LTR) so MUI
 * components mirror correctly without a page reload.
 */
export const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

export const cacheLtr = createCache({
  key: 'muiltr',
});
