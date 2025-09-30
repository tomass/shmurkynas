import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/smurkynas': {
        target: 'wss://shmurkynas.qgis.lt',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});