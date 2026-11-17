import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const distDir = path.join(__dirname, 'dist');

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

let pool = null;
let databaseReady = false;

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    const url = new URL(process.env.DATABASE_URL);
    pool = mysql.createPool({
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      waitForConnections: true,
      connectionLimit: 5,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

async function initializeDatabase() {
  const db = await getPool();
  if (!db) return false;
  await db.query(`
    CREATE TABLE IF NOT EXISTS mbx_public_websites (
      slug VARCHAR(160) PRIMARY KEY,
      tenant_id VARCHAR(128) NOT NULL,
      tenant_json LONGTEXT NOT NULL,
      config_json LONGTEXT NOT NULL,
      services_json LONGTEXT NOT NULL,
      categories_json LONGTEXT NOT NULL,
      staff_json LONGTEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'published',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS mbx_public_reviews (
      id VARCHAR(128) PRIMARY KEY,
      slug VARCHAR(160) NOT NULL,
      tenant_id VARCHAR(128) NOT NULL,
      review_json LONGTEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mbx_reviews_slug_status (slug, status)
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS mbx_public_bookings (
      id VARCHAR(128) PRIMARY KEY,
      slug VARCHAR(160) NOT NULL,
      tenant_id VARCHAR(128) NOT NULL,
      booking_json LONGTEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_mbx_bookings_tenant (tenant_id, created_at)
    )
  `);
  databaseReady = true;
  return true;
}

function json(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function cleanSlug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

function sendDbUnavailable(res) {
  return res.status(503).json({ error: 'Public data service is temporarily unavailable.' });
}

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', database: databaseReady });
});

app.get('/api/public/websites/:slug', async (req, res) => {
  const slug = cleanSlug(req.params.slug);
  const db = await getPool();
  if (!db || !databaseReady) return sendDbUnavailable(res);
  try {
    const [rows] = await db.query(
      'SELECT tenant_id, tenant_json, config_json, services_json, categories_json, staff_json FROM mbx_public_websites WHERE slug = ? AND status = \'published\' LIMIT 1',
      [slug],
    );
    if (!rows.length) return res.status(404).json({ error: 'Published website not found.' });
    const row = rows[0];
    const [reviewRows] = await db.query(
      'SELECT review_json FROM mbx_public_reviews WHERE slug = ? AND status = \'approved\' ORDER BY created_at DESC',
      [slug],
    );
    return res.json({
      tenant: json(row.tenant_json, null),
      config: json(row.config_json, null),
      services: json(row.services_json, []),
      categories: json(row.categories_json, []),
      staff: json(row.staff_json, []),
      reviews: reviewRows.map((review) => json(review.review_json, null)).filter(Boolean),
    });
  } catch (error) {
    console.error('public website read failed', error);
    return res.status(500).json({ error: 'Could not load the published website.' });
  }
});

app.post('/api/public/websites/publish', async (req, res) => {
  const body = req.body || {};
  const slug = cleanSlug(body.slug);
  if (!slug || !body.tenant?.id || !body.config) {
    return res.status(400).json({ error: 'A salon slug, tenant and website configuration are required.' });
  }
  const db = await getPool();
  if (!db || !databaseReady) return sendDbUnavailable(res);
  try {
    await db.query(
      `INSERT INTO mbx_public_websites
        (slug, tenant_id, tenant_json, config_json, services_json, categories_json, staff_json, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'published')
       ON DUPLICATE KEY UPDATE
        tenant_id = VALUES(tenant_id), tenant_json = VALUES(tenant_json), config_json = VALUES(config_json),
        services_json = VALUES(services_json), categories_json = VALUES(categories_json), staff_json = VALUES(staff_json),
        status = 'published'`,
      [
        slug,
        String(body.tenant.id),
        JSON.stringify(body.tenant),
        JSON.stringify(body.config),
        JSON.stringify(Array.isArray(body.services) ? body.services : []),
        JSON.stringify(Array.isArray(body.categories) ? body.categories : []),
        JSON.stringify(Array.isArray(body.staff) ? body.staff : []),
      ],
    );
    return res.status(201).json({ success: true, slug });
  } catch (error) {
    console.error('public website publish failed', error);
    return res.status(500).json({ error: 'Could not publish the website.' });
  }
});

app.post('/api/public/websites/:slug/unpublish', async (req, res) => {
  const db = await getPool();
  if (!db || !databaseReady) return sendDbUnavailable(res);
  try {
    await db.query('UPDATE mbx_public_websites SET status = \'unpublished\' WHERE slug = ?', [cleanSlug(req.params.slug)]);
    return res.json({ success: true });
  } catch (error) {
    console.error('public website unpublish failed', error);
    return res.status(500).json({ error: 'Could not unpublish the website.' });
  }
});

app.post('/api/public/websites/:slug/reviews', async (req, res) => {
  const slug = cleanSlug(req.params.slug);
  const body = req.body || {};
  const name = String(body.customerName || '').trim();
  const text = String(body.text || '').trim();
  const rating = Number(body.rating);
  if (name.length < 2 || name.length > 60 || text.length < 10 || text.length > 800 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Please check your name, rating and review text.' });
  }
  const db = await getPool();
  if (!db || !databaseReady) return sendDbUnavailable(res);
  try {
    const [websiteRows] = await db.query('SELECT tenant_id FROM mbx_public_websites WHERE slug = ? AND status = \'published\' LIMIT 1', [slug]);
    if (!websiteRows.length) return res.status(404).json({ error: 'Published website not found.' });
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const review = {
      id,
      tenantId: websiteRows[0].tenant_id,
      customerName: name,
      customerPhone: body.customerPhone ? String(body.customerPhone).trim() : undefined,
      rating,
      text,
      serviceRef: body.serviceRef ? String(body.serviceRef).trim() : undefined,
      status: 'pending',
      isFeatured: false,
      createdAt: new Date().toISOString(),
    };
    await db.query(
      'INSERT INTO mbx_public_reviews (id, slug, tenant_id, review_json, status) VALUES (?, ?, ?, ?, \'pending\')',
      [id, slug, websiteRows[0].tenant_id, JSON.stringify(review)],
    );
    return res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('public review submission failed', error);
    return res.status(500).json({ error: 'Could not submit the review.' });
  }
});

app.post('/api/public/websites/:slug/bookings', async (req, res) => {
  const slug = cleanSlug(req.params.slug);
  const body = req.body || {};
  if (!body.clientName || !body.clientPhone || !body.date || !body.startTime || !body.serviceId) {
    return res.status(400).json({ error: 'Required booking details are missing.' });
  }
  const db = await getPool();
  if (!db || !databaseReady) return sendDbUnavailable(res);
  try {
    const [websiteRows] = await db.query('SELECT tenant_id FROM mbx_public_websites WHERE slug = ? AND status = \'published\' LIMIT 1', [slug]);
    if (!websiteRows.length) return res.status(404).json({ error: 'Published website not found.' });
    const bookingRef = `MBX-${Math.floor(10000 + Math.random() * 90000)}`;
    const id = `apt_online_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const booking = { ...body, id, bookingRef, tenantId: websiteRows[0].tenant_id, status: 'confirmed', createdAt: new Date().toISOString() };
    await db.query(
      'INSERT INTO mbx_public_bookings (id, slug, tenant_id, booking_json) VALUES (?, ?, ?, ?)',
      [id, slug, websiteRows[0].tenant_id, JSON.stringify(booking)],
    );
    return res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('public booking submission failed', error);
    return res.status(500).json({ error: 'Could not complete the booking.' });
  }
});

app.use(express.static(distDir, { index: 'index.html' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(distDir, 'index.html'));
});
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

initializeDatabase().catch((error) => {
  console.error('database initialization failed', error);
  databaseReady = false;
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Moonbox Salon server listening on ${port}`);
});
