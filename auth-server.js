const express = require('express');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const { randomUUID } = require('crypto');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-env';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'nikashop';
const MAX_IMAGE_UPLOAD_BYTES = 3 * 1024 * 1024;

const OTP_EXPIRES_MS = 10 * 60 * 1000;
const otpStore = new Map();

const mailTransporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

function getEmailKey(email) {
  return String(email || '').trim().toLowerCase();
}

function getOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isSafeIdentifier(name) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

function toAuthUser(user) {
  return {
    id: user.id,
    email: user.email || null,
    provider: user.provider || 'local',
    user_metadata: {
      full_name: user.full_name || '',
      avatar_url: user.avatar_url || '',
    },
  };
}

async function runQuery(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function ensureImageStorageTable() {
  await runQuery(`
    create table if not exists uploaded_images (
      id varchar(64) not null primary key,
      mime_type varchar(128) not null,
      file_name varchar(255) null,
      file_size int not null,
      data longblob not null,
      created_at timestamp default current_timestamp
    )
  `);
}

async function ensureProductAndCategoryOptionColumns() {
  const ensureColumn = async (tableName, columnName, definitionSql) => {
    const rows = await runQuery(
      `select count(*) as count_value
       from information_schema.columns
       where table_schema = database()
         and table_name = ?
         and column_name = ?`,
      [tableName, columnName],
    );
    const countValue = Number(rows?.[0]?.count_value || 0);
    if (countValue > 0) return;
    await runQuery(`alter table ${tableName} add column ${columnName} ${definitionSql}`);
  };

  await ensureColumn('products', 'color_options', 'text null');
  await ensureColumn('products', 'size_options', 'varchar(100) null');
  await ensureColumn('products', 'size_type', "varchar(20) not null default 'none'");
  await ensureColumn('products', 'size_stock', 'text null');
  await ensureColumn('products', 'image_gallery', 'text null');

  await ensureColumn('categories', 'size_type', "varchar(20) not null default 'none'");
  await ensureColumn('categories', 'size_values', 'varchar(100) null');
}

function buildWhereClause(filters = []) {
  const clauses = [];
  const values = [];
  for (const filter of filters) {
    const { column, op, value } = filter;
    if (!isSafeIdentifier(column)) continue;
    if (op === 'eq') {
      clauses.push(`${column} = ?`);
      values.push(value);
    } else if (op === 'in' && Array.isArray(value) && value.length > 0) {
      clauses.push(`${column} in (${value.map(() => '?').join(',')})`);
      values.push(...value);
    } else if (op === 'ilike') {
      const needle = String(value || '').replace(/%/g, '').trim();
      clauses.push(`lower(${column}) like lower(?)`);
      values.push(`%${needle}%`);
    }
  }
  return {
    whereSql: clauses.length ? ` where ${clauses.join(' and ')}` : '',
    values,
  };
}

async function decorateRows(table, selectText, rows) {
  if (!rows || rows.length === 0) return rows;

  if (table === 'products' && selectText.includes('categories(')) {
    const categoryIds = [...new Set(rows.map(item => item.category_id).filter(Boolean))];
    if (!categoryIds.length) return rows.map(item => ({ ...item, categories: null }));
    const categoryRows = await runQuery(
      `select * from categories where id in (${categoryIds.map(() => '?').join(',')})`,
      categoryIds,
    );
    const categoryMap = new Map(categoryRows.map(item => [item.id, item]));
    return rows.map(item => ({ ...item, categories: categoryMap.get(item.category_id) || null }));
  }

  if (table === 'cart_items' && selectText.includes('products(')) {
    const productIds = [...new Set(rows.map(item => item.product_id).filter(Boolean))];
    if (!productIds.length) return rows.map(item => ({ ...item, products: null }));
    const productRows = await runQuery(
      `select * from products where id in (${productIds.map(() => '?').join(',')})`,
      productIds,
    );
    const productMap = new Map(productRows.map(item => [item.id, item]));
    return rows.map(item => ({ ...item, products: productMap.get(item.product_id) || null }));
  }

  if (table === 'orders' && selectText.includes('order_items(')) {
    const orderIds = rows.map(item => item.id);
    const orderItems = await runQuery(
      `select * from order_items where order_id in (${orderIds.map(() => '?').join(',')})`,
      orderIds,
    );
    const productIds = [...new Set(orderItems.map(item => item.product_id))];
    const products = productIds.length
      ? await runQuery(`select * from products where id in (${productIds.map(() => '?').join(',')})`, productIds)
      : [];
    const productMap = new Map(products.map(item => [item.id, item]));
    const itemMap = new Map();
    orderItems.forEach(item => {
      const list = itemMap.get(item.order_id) || [];
      list.push({ ...item, products: productMap.get(item.product_id) || null });
      itemMap.set(item.order_id, list);
    });
    return rows.map(item => ({ ...item, order_items: itemMap.get(item.id) || [] }));
  }

  return rows;
}

function requireSession(req, res, next) {
  if (!req.session.user?.id) {
    return res.status(401).json({ error: { message: 'UNAUTHENTICATED' } });
  }
  return next();
}

app.use(express.json({ limit: '2mb' }));
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(
  session({
    name: 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.get('/api/images/:id', async (req, res) => {
  try {
    const imageId = String(req.params.id || '').trim();
    if (!imageId) {
      return res.status(400).json({ error: { message: 'IMAGE_ID_REQUIRED' } });
    }
    const rows = await runQuery(
      'select mime_type, file_size, data from uploaded_images where id = ? limit 1',
      [imageId],
    );
    if (!rows.length) {
      return res.status(404).json({ error: { message: 'IMAGE_NOT_FOUND' } });
    }
    const image = rows[0];
    res.setHeader('Content-Type', image.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', String(image.file_size || 0));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(image.data);
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/images/upload', requireSession, express.raw({ type: 'image/*', limit: '4mb' }), async (req, res) => {
  try {
    const mimeType = String(req.headers['content-type'] || '').toLowerCase();
    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ error: { message: 'INVALID_IMAGE_TYPE' } });
    }

    const fileBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    if (!fileBuffer.length) {
      return res.status(400).json({ error: { message: 'IMAGE_EMPTY' } });
    }
    if (fileBuffer.length > MAX_IMAGE_UPLOAD_BYTES) {
      return res.status(400).json({ error: { message: 'IMAGE_TOO_LARGE' } });
    }

    const imageId = randomUUID();
    const fileName = decodeURIComponent(String(req.headers['x-file-name'] || 'image'));
    await runQuery(
      'insert into uploaded_images (id, mime_type, file_name, file_size, data) values (?, ?, ?, ?, ?)',
      [imageId, mimeType, fileName, fileBuffer.length, fileBuffer],
    );

    const imageUrl = `${req.protocol}://${req.get('host')}/api/images/${imageId}`;
    return res.json({
      data: {
        id: imageId,
        url: imageUrl,
        mime_type: mimeType,
        size: fileBuffer.length,
      },
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message || 'IMAGE_UPLOAD_FAILED' } });
  }
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['openid', 'email', 'profile'];

app.get('/auth/google', (req, res) => {
  const state = Math.random().toString(36).slice(2);
  req.session.oauthState = state;

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });

  return res.redirect(authUrl);
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${FRONTEND_URL}/login?error=missing_oauth_code`);
    }
    if (!state || state !== req.session.oauthState) {
      return res.redirect(`${FRONTEND_URL}/login?error=invalid_oauth_state`);
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    req.session.user = {
      provider: 'google',
      id: data.id || '',
      email: data.email || null,
      full_name: data.name || '',
      avatar_url: data.picture || '',
    };

    return res.redirect(`${FRONTEND_URL}/`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${FRONTEND_URL}/login?error=google_oauth_failed`);
  }
});

app.get('/auth/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ authenticated: false });
  }
  return res.json({ authenticated: true, user: req.session.user });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ ok: true });
  });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, full_name: fullName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'EMAIL_PASSWORD_REQUIRED' } });
    }
    const existing = await runQuery('select id from users where email = ? limit 1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: { message: 'Email đã tồn tại' } });
    }

    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    await runQuery(
      'insert into users (id, email, password_hash, provider) values (?, ?, ?, ?)',
      [id, email, passwordHash, 'local'],
    );
    await runQuery(
      'insert into profiles (id, full_name, phone, address, avatar_url, role) values (?, ?, ?, ?, ?, ?)',
      [id, fullName || '', '', '', '', 'customer'],
    );

    req.session.user = {
      id,
      email,
      provider: 'local',
      full_name: fullName || '',
      avatar_url: '',
    };

    return res.json({ data: { user: toAuthUser(req.session.user) }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const rows = await runQuery(
      'select u.id, u.email, u.password_hash, u.provider, p.full_name, p.avatar_url from users u left join profiles p on p.id = u.id where u.email = ? limit 1',
      [email],
    );
    if (!rows.length) {
      return res.status(401).json({ error: { message: 'Invalid login credentials' } });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(String(password || ''), user.password_hash || '');
    if (!ok) {
      return res.status(401).json({ error: { message: 'Invalid login credentials' } });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      provider: user.provider || 'local',
      full_name: user.full_name || '',
      avatar_url: user.avatar_url || '',
    };
    return res.json({ data: { user: toAuthUser(req.session.user) }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ data: { ok: true }, error: null });
  });
});

app.get('/api/auth/session', (req, res) => {
  if (!req.session.user) {
    return res.json({ data: { session: null }, error: null });
  }
  return res.json({ data: { session: { user: toAuthUser(req.session.user) } }, error: null });
});

app.get('/api/auth/user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ data: { user: null }, error: { message: 'UNAUTHENTICATED' } });
  }
  return res.json({ data: { user: toAuthUser(req.session.user) }, error: null });
});

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const email = getEmailKey(req.body?.email);
    const shouldCreateUser = Boolean(req.body?.shouldCreateUser);
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: { message: 'EMAIL_INVALID' } });
    }

    const users = await runQuery('select id from users where email = ? limit 1', [email]);
    if (!shouldCreateUser && users.length === 0) {
      return res.status(404).json({ error: { message: 'USER_NOT_FOUND' } });
    }

    const code = getOtpCode();
    otpStore.set(email, { code, expiresAt: Date.now() + OTP_EXPIRES_MS });

    if (mailTransporter && SMTP_FROM) {
      await mailTransporter.sendMail({
        from: SMTP_FROM,
        to: email,
        subject: 'Ma xac minh dat lai mat khau NikaShop',
        text: `Ma xac minh cua ban la: ${code}`,
      });
    } else {
      console.log(`[OTP] ${email}: ${code}`);
    }

    return res.json({ data: { sent: true }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const email = getEmailKey(req.body?.email);
    const token = String(req.body?.token || '').trim();
    const record = otpStore.get(email);
    if (!record || record.code !== token || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: { message: 'INVALID_OTP' } });
    }

    const users = await runQuery(
      'select u.id, u.email, u.provider, p.full_name, p.avatar_url from users u left join profiles p on p.id = u.id where u.email = ? limit 1',
      [email],
    );
    if (!users.length) {
      return res.status(404).json({ error: { message: 'USER_NOT_FOUND' } });
    }
    const user = users[0];
    req.session.user = {
      id: user.id,
      email: user.email,
      provider: user.provider || 'local',
      full_name: user.full_name || '',
      avatar_url: user.avatar_url || '',
    };
    otpStore.delete(email);
    return res.json({ data: { user: toAuthUser(req.session.user) }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/update-password', requireSession, async (req, res) => {
  try {
    const password = String(req.body?.password || '');
    if (password.length < 6) {
      return res.status(400).json({ error: { message: 'INVALID_PASSWORD' } });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await runQuery('update users set password_hash = ? where id = ?', [passwordHash, req.session.user.id]);
    return res.json({ data: { updated: true }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

const READABLE_WITHOUT_AUTH = new Set(['products', 'categories']);
const TABLE_WHITELIST = new Set([
  'profiles',
  'categories',
  'products',
  'cart_items',
  'orders',
  'order_items',
  'support_requests',
  'promotions',
  'reviews',
]);

app.post('/api/db/query', async (req, res) => {
  try {
    const { table, select = '*', filters = [], order = null, limit = null } = req.body || {};
    if (!TABLE_WHITELIST.has(table)) {
      return res.status(400).json({ error: { message: 'TABLE_NOT_ALLOWED' } });
    }
    if (!req.session.user?.id && !READABLE_WITHOUT_AUTH.has(table)) {
      return res.status(401).json({ error: { message: 'UNAUTHENTICATED' } });
    }
    const { whereSql, values } = buildWhereClause(filters);
    let sql = `select * from ${table}${whereSql}`;
    if (order?.column && isSafeIdentifier(order.column)) {
      sql += ` order by ${order.column} ${order.ascending ? 'asc' : 'desc'}`;
    }
    if (Number.isFinite(limit) && Number(limit) > 0) {
      // Some MySQL setups reject bound parameters for LIMIT in prepared statements.
      // We interpolate only after strict numeric validation to keep it safe.
      sql += ` limit ${Math.floor(Number(limit))}`;
    }
    const rows = await runQuery(sql, values);
    const decorated = await decorateRows(table, String(select || '*'), rows);
    return res.json({ data: decorated, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/db/insert', requireSession, async (req, res) => {
  try {
    const { table, values, select = '*' } = req.body || {};
    if (!TABLE_WHITELIST.has(table)) {
      return res.status(400).json({ error: { message: 'TABLE_NOT_ALLOWED' } });
    }
    const list = Array.isArray(values) ? values : [values];
    const inserted = [];
    for (const value of list) {
      const row = { ...(value || {}) };
      if (!row.id) row.id = randomUUID();
      const keys = Object.keys(row).filter(isSafeIdentifier);
      if (!keys.length) continue;
      const sql = `insert into ${table} (${keys.join(',')}) values (${keys.map(() => '?').join(',')})`;
      await runQuery(sql, keys.map(key => row[key]));
      const fetched = await runQuery(`select * from ${table} where id = ? limit 1`, [row.id]);
      if (fetched[0]) inserted.push(fetched[0]);
    }
    const decorated = await decorateRows(table, String(select || '*'), inserted);
    return res.json({ data: decorated, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/db/update', requireSession, async (req, res) => {
  try {
    const { table, values = {}, filters = [], select = '*' } = req.body || {};
    if (!TABLE_WHITELIST.has(table)) {
      return res.status(400).json({ error: { message: 'TABLE_NOT_ALLOWED' } });
    }
    const keys = Object.keys(values).filter(isSafeIdentifier);
    if (!keys.length) return res.json({ data: [], error: null });
    const setSql = keys.map(key => `${key} = ?`).join(', ');
    const setValues = keys.map(key => values[key]);
    const { whereSql, values: whereValues } = buildWhereClause(filters);
    await runQuery(`update ${table} set ${setSql}${whereSql}`, [...setValues, ...whereValues]);
    const rows = await runQuery(`select * from ${table}${whereSql}`, whereValues);
    const decorated = await decorateRows(table, String(select || '*'), rows);
    return res.json({ data: decorated, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/db/delete', requireSession, async (req, res) => {
  try {
    const { table, filters = [] } = req.body || {};
    if (!TABLE_WHITELIST.has(table)) {
      return res.status(400).json({ error: { message: 'TABLE_NOT_ALLOWED' } });
    }
    const { whereSql, values } = buildWhereClause(filters);
    await runQuery(`delete from ${table}${whereSql}`, values);
    return res.json({ data: null, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/db/rpc', requireSession, async (req, res) => {
  const { fn, args } = req.body || {};
  if (fn !== 'create_checkout_order_atomic') {
    return res.status(400).json({ error: { message: 'RPC_NOT_SUPPORTED' } });
  }

  const payload = args || {};
  const userId = String(payload.p_user_id || '').trim();
  const total = Number(payload.p_total || 0);
  const shippingAddress = String(payload.p_shipping_address || '').trim();
  const status = String(payload.p_status || 'pending').trim() || 'pending';
  const items = Array.isArray(payload.p_items) ? payload.p_items : [];

  if (!userId || !shippingAddress || !items.length || !Number.isFinite(total) || total < 0) {
    return res.status(400).json({ error: { message: 'INVALID_RPC_PAYLOAD' } });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const orderId = randomUUID();
    await connection.execute(
      'insert into orders (id, user_id, total, shipping_address, status) values (?, ?, ?, ?, ?)',
      [orderId, userId, total, shippingAddress, status],
    );

    for (const item of items) {
      const productId = String(item.product_id || '').trim();
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const shoeSize = item.shoe_size == null ? null : Number(item.shoe_size);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
        throw new Error('INVALID_ORDER_ITEM');
      }

      await connection.execute(
        'insert into order_items (id, order_id, product_id, quantity, price, shoe_size) values (?, ?, ?, ?, ?, ?)',
        [randomUUID(), orderId, productId, Math.floor(quantity), price, shoeSize],
      );

      await connection.execute(
        'update products set stock = greatest(stock - ?, 0) where id = ?',
        [Math.floor(quantity), productId],
      );
    }

    await connection.commit();
    return res.json({ data: orderId, error: null });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ error: { message: error.message || 'RPC_FAILED' } });
  } finally {
    connection.release();
  }
});

Promise.all([
  ensureImageStorageTable(),
  ensureProductAndCategoryOptionColumns(),
])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Auth/API server running at http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  });
