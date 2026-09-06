import type { MetadataRoute } from 'next';

const Manifest = (): MetadataRoute.Manifest => ({
  name: 'Lontu',
  short_name: 'Lontu',
  description: 'Track expenses in three taps.',
  id: '/app',
  start_url: '/app',
  scope: '/app',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#ffffff',
  theme_color: '#0c0a08',
  icons: [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
});

export default Manifest;
