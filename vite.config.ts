import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const azureClientId = env.AZURE_CLIENT_ID || process.env.AZURE_CLIENT_ID || '';

  return {
    plugins: [
      react(),
      electron([
        {
          entry: 'src/main/index.ts',
          onstart(options) {
            options.startup();
          },
          vite: {
            define: {
              'process.env.AZURE_CLIENT_ID': JSON.stringify(azureClientId)
            },
            build: {
              outDir: 'dist-electron/main',
              rollupOptions: {
                external: [
                  'electron',
                  '@xmcl/client',
                  '@xmcl/core',
                  '@xmcl/installer',
                  '@xmcl/server-info',
                  '@xmcl/user',
                  'adm-zip'
                ]
              }
            }
          }
        },
        {
          entry: 'src/preload/index.ts',
          onstart(options) {
            options.reload();
          },
          vite: {
            build: {
              outDir: 'dist-electron/preload'
            }
          }
        }
      ]),
      renderer()
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared')
      }
    },
    server: {
      port: 5173
    }
  };
});
