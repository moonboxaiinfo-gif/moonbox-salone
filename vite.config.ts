import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { handler as cloudinarySignHandler } from './netlify/functions/cloudinary-sign.ts';
import { handler as sendEmailHandler } from './netlify/functions/send-email.ts';
import { handler as supabaseAdminHandler } from './netlify/functions/supabase-admin.ts';

function netlifyDevFunctionsPlugin(): Plugin {
  return {
    name: 'netlify-dev-functions',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        let functionName = '';

        if (url.startsWith('/.netlify/functions/')) {
          functionName = url.replace('/.netlify/functions/', '').split('?')[0];
        } else if (url.startsWith('/api/')) {
          functionName = url.replace('/api/', '').split('?')[0];
        }

        if (!functionName) {
          return next();
        }

        let selectedHandler: any = null;
        if (functionName === 'cloudinary-sign') selectedHandler = cloudinarySignHandler;
        else if (functionName === 'send-email') selectedHandler = sendEmailHandler;
        else if (functionName === 'supabase-admin') selectedHandler = supabaseAdminHandler;

        if (!selectedHandler) {
          return next();
        }

        // Read request body
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk)));
        req.on('end', async () => {
          try {
            const rawBody = Buffer.concat(chunks).toString('utf-8');
            const headersObj: Record<string, string> = {};
            for (const [k, v] of Object.entries(req.headers)) {
              if (v) headersObj[k] = Array.isArray(v) ? v.join(', ') : v;
            }

            const event = {
              httpMethod: req.method || 'GET',
              body: rawBody || null,
              headers: headersObj
            };

            const result = await selectedHandler(event);
            res.statusCode = result.statusCode || 200;
            if (result.headers) {
              for (const [hKey, hVal] of Object.entries(result.headers)) {
                res.setHeader(hKey, hVal as string);
              }
            }
            res.end(result.body || '');
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Function execution error' }));
          }
        });
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), netlifyDevFunctionsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      allowedHosts: [
        '3000-iqaf59038q7j2dx0xl2nm-72785738.us3.manus.computer',
        '3000-i1ydhno7slmbcfin2x23b-dc9104cc.us5.manus.computer',
        '3000-iafihyce9tib6fq3t7vvb-3e589781.us3.manus.computer',
        '3000-if4cswbe9gl90bzg0cknp-c3d46d54.us4.manus.computer',
      ],
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
