import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadHandler from './api/media/upload.js';
import mediaProxyHandler from './api/media/[id].js';
import deleteMediaHandler from './api/media/delete.js';
import createUserHandler from './api/admin/create-user.js';
import sitemapHandler from './api/sitemap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Endpoint upload multipart HARUS dipasang sebelum express.json() agar stream mentah terbaca oleh busboy
  app.post('/api/media/upload', async (req, res) => {
    try {
      await uploadHandler(req as never, res as never);
    } catch (err) {
      console.error('Upload handler error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Terjadi kesalahan saat mengunggah media.' });
      }
    }
  });

  app.get('/api/media/:id', async (req, res) => {
    try {
      // Samakan perilaku Express :id dengan Vercel dynamic route [id] di req.query.id
      req.query.id = req.params.id;
      await mediaProxyHandler(req as never, res as never);
    } catch (err) {
      console.error('Media proxy handler error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Gagal memuat berkas media.' });
      }
    }
  });

  const jsonParser = express.json({ limit: '4mb' });

  app.all('/api/media/delete', jsonParser, async (req, res) => {
    try {
      await deleteMediaHandler(req as never, res as never);
    } catch (err) {
      console.error('Delete media handler error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Gagal menghapus media.' });
      }
    }
  });

  app.post('/api/admin/create-user', jsonParser, async (req, res) => {
    try {
      await createUserHandler(req as never, res as never);
    } catch (err) {
      console.error('Create user handler error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Gagal membuat pengguna baru.' });
      }
    }
  });

  app.get(['/sitemap.xml', '/api/sitemap'], async (req, res) => {
    try {
      await sitemapHandler(req as never, res as never);
    } catch (err) {
      console.error('Sitemap handler error:', err);
      if (!res.headersSent) {
        res.status(500).send('Gagal membuat sitemap.');
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server HKBP Ressort Hutaraja berjalan di http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
