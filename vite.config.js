import { defineConfig } from 'vite';

// The game server the page talks to while it is being developed: the live
// one, unless SHMURKYNAS_SERVER names another - ws://localhost:8088 for a
// server started on this computer with `npm run start:server`.
const gameServer = process.env.SHMURKYNAS_SERVER || 'wss://shmurkynas.qgis.lt';

export default defineConfig({
  server: {
    proxy: {
      '/smurkynas': {
        target: gameServer,
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
