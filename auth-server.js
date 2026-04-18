const express = require('express');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const { randomUUID, randomInt } = require('crypto');
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
const RESET_CODE_EXPIRES_MS = 24 * 60 * 60 * 1000;
const resetCodeStore = new Map();

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

/** Mã OTP 6 chữ số (100000–999999), dùng crypto thay cho Math.random. */
function generateRandomOtpCode() {
  return String(randomInt(100000, 1000000));
}

/** Mã xác nhận 10 ký tự in hoa (A-Z, 0-9). */
function generateRandomResetCode(length = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += alphabet[randomInt(0, alphabet.length)];
  }
  return result;
}

function generateTemporaryPassword(length = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += alphabet[randomInt(0, alphabet.length)];
  }
  return result;
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
  await ensureColumn('products', 'branch_name', 'varchar(255) null');
  await ensureColumn('products', 'target_audience', 'varchar(255) null');
  await ensureColumn('products', 'highlight_tags', 'varchar(255) null');
  await ensureColumn('products', 'shoe_form', 'varchar(255) null');
  await ensureColumn('products', 'play_style', 'varchar(255) null');
  await ensureColumn('products', 'segment', 'varchar(255) null');

  await ensureColumn('categories', 'size_type', "varchar(20) not null default 'none'");
  await ensureColumn('categories', 'size_values', 'varchar(100) null');
  await ensureColumn('categories', 'product_group', "varchar(30) not null default 'badminton'");
}

async function ensureBannersTable() {
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

  await runQuery(`
    create table if not exists banners (
      id varchar(64) not null primary key,
      title varchar(255) null,
      image_url text not null,
      sort_order int not null default 0,
      is_active tinyint(1) not null default 1,
      created_at timestamp default current_timestamp,
      updated_at timestamp default current_timestamp on update current_timestamp
    )
  `);

  await ensureColumn('banners', 'target_type', "varchar(20) not null default 'none'");
  await ensureColumn('banners', 'target_product_id', 'varchar(64) null');
  await ensureColumn('banners', 'target_product_slug', 'varchar(255) null');
  await ensureColumn('banners', 'target_category_id', 'varchar(64) null');
  await ensureColumn('banners', 'target_category_slug', 'varchar(255) null');
}

async function ensureBranchesTable() {
  await runQuery(`
    create table if not exists branches (
      id varchar(64) not null primary key,
      name varchar(255) not null unique,
      slug varchar(255) not null unique,
      is_active tinyint(1) not null default 1,
      created_at timestamp default current_timestamp,
      updated_at timestamp default current_timestamp on update current_timestamp
    )
  `);

  const branchSeeds = [
    ['Quận 1', 'quan-1'],
    ['Quận 2', 'quan-2'],
    ['Quận 3', 'quan-3'],
    ['Quận 4', 'quan-4'],
    ['Quận 5', 'quan-5'],
    ['Quận 8', 'quan-8'],
  ];

  for (const [name, slug] of branchSeeds) {
    await runQuery(
      `insert into branches (id, name, slug, is_active)
       values (?, ?, ?, 1)
       on duplicate key update name = values(name), slug = values(slug), is_active = 1`,
      [randomUUID(), name, slug],
    );
  }
}

async function ensureHomeCategorySectionsTable() {
  await runQuery(`
    create table if not exists home_category_sections (
      id varchar(64) not null primary key,
      title varchar(255) not null,
      product_group varchar(30) not null default 'badminton',
      categories_json text null,
      is_active tinyint(1) not null default 1,
      sort_order int not null default 0,
      created_at timestamp default current_timestamp,
      updated_at timestamp default current_timestamp on update current_timestamp
    )
  `);
}

async function ensureSiteContentsTable() {
  await runQuery(`
    create table if not exists site_contents (
      id varchar(64) not null primary key,
      content_key varchar(64) not null unique,
      content_title varchar(255) null,
      content_value longtext null,
      updated_by varchar(64) null,
      created_at timestamp default current_timestamp,
      updated_at timestamp default current_timestamp on update current_timestamp
    )
  `);

  await runQuery(
    `insert into site_contents (id, content_key, content_title, content_value)
     values (?, 'about_page', ?, ?)
     on duplicate key update content_title = values(content_title)`,
    [
      randomUUID(),
      'Giới thiệu',
      'Shop thể thao của chúng tôi được xây dựng với mục tiêu mang sản phẩm chính hãng đến gần hơn với người dùng Việt Nam.\n\nĐội ngũ luôn kiểm soát chất lượng, tư vấn đúng nhu cầu và duy trì dịch vụ hậu mãi rõ ràng để khách hàng yên tâm mua sắm.\n\nChúng tôi không ngừng mở rộng danh mục, cập nhật mẫu mới và tối ưu trải nghiệm để phục vụ cộng đồng yêu thể thao tốt hơn mỗi ngày.',
    ],
  );
}

async function ensureCategoryGroupsTable() {
  await runQuery(`
    create table if not exists category_groups (
      id varchar(64) not null primary key,
      group_key varchar(30) not null unique,
      group_label varchar(255) not null,
      created_at timestamp default current_timestamp,
      updated_at timestamp default current_timestamp on update current_timestamp
    )
  `);

  const defaultGroupSeeds = [
    ['badminton', 'Sản phẩm cầu lông'],
    ['tennis', 'Sản phẩm tennis'],
    ['pickleball', 'Sản phẩm pickleball'],
    ['other', 'Nhóm khác'],
  ];

  for (const [groupKey, groupLabel] of defaultGroupSeeds) {
    await runQuery(
      `insert into category_groups (id, group_key, group_label)
       values (?, ?, ?)
       on duplicate key update group_label = values(group_label)`,
      [randomUUID(), groupKey, groupLabel],
    );
  }
}

async function ensureReviewsTable() {
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

  await runQuery(`
    create table if not exists reviews (
      id varchar(64) not null primary key,
      product_id varchar(64) not null,
      user_id varchar(64) null,
      full_name varchar(255) null,
      phone varchar(50) null,
      rating int not null,
      comment text null,
      image_url text null,
      status varchar(20) not null default 'pending',
      is_hidden tinyint(1) not null default 0,
      created_at timestamp default current_timestamp,
      updated_at timestamp default current_timestamp on update current_timestamp,
      index idx_reviews_product (product_id),
      index idx_reviews_status (status),
      index idx_reviews_created (created_at)
    )
  `);

  await ensureColumn('reviews', 'full_name', 'varchar(255) null');
  await ensureColumn('reviews', 'phone', 'varchar(50) null');
  await ensureColumn('reviews', 'image_url', 'text null');
  await ensureColumn('reviews', 'status', "varchar(20) not null default 'pending'");
  await ensureColumn('reviews', 'is_hidden', 'tinyint(1) not null default 0');
}

function normalizeDateTimeInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  const second = String(parsed.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

async function ensurePromotionsTables() {
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

  await runQuery(`
    create table if not exists promotions (
      id varchar(64) not null primary key,
      code varchar(100) not null unique,
      name varchar(255) null,
      discount_percent int not null default 0,
      min_order decimal(12,2) not null default 0,
      max_uses_per_user int not null default 1,
      starts_at datetime null,
      ends_at datetime null,
      status varchar(20) not null default 'inactive',
      is_active tinyint(1) not null default 0,
      created_at timestamp default current_timestamp,
      updated_at timestamp default current_timestamp on update current_timestamp
    )
  `);
  await ensureColumn('promotions', 'code', 'varchar(100) not null');
  await ensureColumn('promotions', 'name', 'varchar(255) null');
  await ensureColumn('promotions', 'discount_percent', 'int not null default 0');
  await ensureColumn('promotions', 'min_order', 'decimal(12,2) not null default 0');
  await ensureColumn('promotions', 'max_uses_per_user', 'int not null default 1');
  await ensureColumn('promotions', 'starts_at', 'datetime null');
  await ensureColumn('promotions', 'ends_at', 'datetime null');
  await ensureColumn('promotions', 'status', "varchar(20) not null default 'inactive'");
  await ensureColumn('promotions', 'is_active', 'tinyint(1) not null default 0');

  await runQuery(`
    create table if not exists promotion_assignments (
      id varchar(64) not null primary key,
      promotion_id varchar(64) not null,
      user_id varchar(64) not null,
      assignment_type varchar(30) not null,
      criteria_json text null,
      is_used tinyint(1) not null default 0,
      used_at datetime null,
      order_id varchar(64) null,
      assigned_at datetime null,
      created_at timestamp default current_timestamp,
      updated_at timestamp default current_timestamp on update current_timestamp,
      unique key uq_promotion_user (promotion_id, user_id),
      index idx_assignment_promotion (promotion_id),
      index idx_assignment_user (user_id)
    )
  `);
}

async function ensureOrdersInventoryColumn() {
  const rows = await runQuery(
    `select count(*) as count_value
     from information_schema.columns
     where table_schema = database()
       and table_name = 'orders'
       and column_name = 'stock_deducted'`,
  );
  const countValue = Number(rows?.[0]?.count_value || 0);
  if (countValue > 0) return;
  await runQuery("alter table orders add column stock_deducted tinyint(1) not null default 0");
}

async function recomputeProductReviewStats(productId) {
  const normalizedProductId = String(productId || '').trim();
  if (!normalizedProductId) return;
  const rows = await runQuery(
    `select
        count(*) as total_reviews,
        coalesce(avg(rating), 0) as avg_rating
     from reviews
     where product_id = ?
       and status = 'approved'
       and coalesce(is_hidden, 0) = 0`,
    [normalizedProductId],
  );
  const totalReviews = Math.max(0, Number(rows?.[0]?.total_reviews || 0));
  const avgRatingRaw = Number(rows?.[0]?.avg_rating || 0);
  const avgRating = Number.isFinite(avgRatingRaw) ? Number(avgRatingRaw.toFixed(1)) : 0;
  await runQuery(
    'update products set rating = ?, reviews_count = ? where id = ?',
    [avgRating, totalReviews, normalizedProductId],
  );
}

function parseSizeStockValue(rawValue) {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(String(rawValue));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

async function applyOrderInventoryDelta(orderId, direction) {
  const normalizedOrderId = String(orderId || '').trim();
  if (!normalizedOrderId) return;
  const multiplier = direction === 'restore' ? 1 : -1;
  const orderItems = await runQuery(
    'select product_id, quantity, shoe_size from order_items where order_id = ?',
    [normalizedOrderId],
  );
  for (const item of orderItems) {
    const productId = String(item?.product_id || '').trim();
    const quantity = Math.max(0, Math.floor(Number(item?.quantity || 0)));
    if (!productId || quantity <= 0) continue;

    if (multiplier < 0) {
      await runQuery('update products set stock = greatest(stock - ?, 0) where id = ?', [quantity, productId]);
    } else {
      await runQuery('update products set stock = stock + ? where id = ?', [quantity, productId]);
    }

    const shoeSizeRaw = item?.shoe_size;
    if (shoeSizeRaw == null || shoeSizeRaw === '') continue;
    const shoeSizeNumber = Number(shoeSizeRaw);
    if (!Number.isFinite(shoeSizeNumber)) continue;
    const shoeSizeKey = String(Math.floor(shoeSizeNumber));

    const productRows = await runQuery('select size_stock from products where id = ? limit 1', [productId]);
    const rawSizeStock = String(productRows?.[0]?.size_stock || '').trim();
    if (!rawSizeStock) continue;

    const sizeStockMap = parseSizeStockValue(rawSizeStock);
    const currentSizeStock = Math.max(0, Math.floor(Number(sizeStockMap[shoeSizeKey] || 0)));
    const nextSizeStock = multiplier < 0
      ? Math.max(0, currentSizeStock - quantity)
      : currentSizeStock + quantity;
    sizeStockMap[shoeSizeKey] = nextSizeStock;
    await runQuery('update products set size_stock = ? where id = ?', [JSON.stringify(sizeStockMap), productId]);
  }
}

async function getRoleByUserId(userId) {
  const id = String(userId || '').trim();
  if (!id) return 'customer';
  const rows = await runQuery('select role from profiles where id = ? limit 1', [id]);
  return String(rows?.[0]?.role || 'customer').toLowerCase();
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
    const googleEmail = getEmailKey(data.email);
    if (!googleEmail) {
      return res.redirect(`${FRONTEND_URL}/login?error=google_email_not_found`);
    }
    const googleName = String(data.name || '').trim();
    const googleAvatar = String(data.picture || '').trim();

    let appUserId = '';
    const existingUsers = await runQuery('select id from users where email = ? limit 1', [googleEmail]);
    if (existingUsers.length > 0) {
      appUserId = String(existingUsers[0].id || '');
    } else {
      appUserId = randomUUID();
      const randomPasswordHash = await bcrypt.hash(randomUUID(), 10);
      await runQuery(
        'insert into users (id, email, password_hash, provider) values (?, ?, ?, ?)',
        [appUserId, googleEmail, randomPasswordHash, 'google'],
      );
      await runQuery(
        'insert into profiles (id, full_name, phone, address, avatar_url, role) values (?, ?, ?, ?, ?, ?)',
        [appUserId, googleName, '', '', googleAvatar, 'customer'],
      );
    }

    if (appUserId) {
      await runQuery(
        'update profiles set full_name = ?, avatar_url = ? where id = ?',
        [googleName, googleAvatar, appUserId],
      );
    }

    req.session.user = {
      provider: 'google',
      id: appUserId || String(data.id || ''),
      email: googleEmail || null,
      full_name: googleName,
      avatar_url: googleAvatar,
    };
    delete req.session.oauthState;

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

app.post('/api/auth/admin/create-account', requireSession, async (req, res) => {
  try {
    const actorId = String(req.session.user?.id || '').trim();
    if (!actorId) {
      return res.status(401).json({ error: { message: 'UNAUTHENTICATED' } });
    }
    const actorRows = await runQuery('select role from profiles where id = ? limit 1', [actorId]);
    const actorRole = String(actorRows?.[0]?.role || 'customer').toLowerCase();
    if (actorRole !== 'admin') {
      return res.status(403).json({ error: { message: 'FORBIDDEN' } });
    }

    const email = getEmailKey(req.body?.email);
    let fullName = String(req.body?.full_name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const address = String(req.body?.address || '').trim();
    const role = String(req.body?.role || 'customer').trim().toLowerCase();
    const providedPassword = String(req.body?.password || '');

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: { message: 'EMAIL_INVALID' } });
    }
    if (!['customer', 'staff'].includes(role)) {
      return res.status(400).json({ error: { message: 'ROLE_INVALID' } });
    }
    if (providedPassword && providedPassword.length < 6) {
      return res.status(400).json({ error: { message: 'INVALID_PASSWORD' } });
    }

    const existing = await runQuery('select id from users where email = ? limit 1', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: { message: 'EMAIL_EXISTS' } });
    }

    const id = randomUUID();
    const passwordForAccount = providedPassword || generateTemporaryPassword(10);
    const passwordHash = await bcrypt.hash(passwordForAccount, 10);
    const createdAtIso = new Date().toISOString();

    await runQuery(
      'insert into users (id, email, password_hash, provider) values (?, ?, ?, ?)',
      [id, email, passwordHash, 'local'],
    );
    await runQuery(
      'insert into profiles (id, full_name, phone, address, avatar_url, role) values (?, ?, ?, ?, ?, ?)',
      [id, fullName, phone, address, '', role],
    );

    return res.json({
      data: {
        account: {
          id,
          email,
          full_name: fullName,
          phone,
          address,
          role,
          provider: 'local',
          created_at: createdAtIso,
        },
        temporary_password: providedPassword ? null : passwordForAccount,
      },
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/promotions/create', requireSession, async (req, res) => {
  try {
    const actorRole = await getRoleByUserId(req.session.user?.id);
    if (actorRole !== 'admin') {
      return res.status(403).json({ error: { message: 'FORBIDDEN' } });
    }

    const code = String(req.body?.code || '').trim().toUpperCase();
    const name = String(req.body?.name || '').trim();
    const discountPercent = Math.min(99, Math.max(0, Math.floor(Number(req.body?.discount_percent || 0))));
    const minOrder = Math.max(0, Number(req.body?.min_order || 0));
    const maxUsesPerUser = Math.max(1, Math.floor(Number(req.body?.max_uses_per_user || 1)));
    const startsAt = normalizeDateTimeInput(req.body?.starts_at);
    const endsAt = normalizeDateTimeInput(req.body?.ends_at);
    const isActive = Boolean(req.body?.is_active);
    const status = isActive ? 'active' : 'inactive';

    if (!code) {
      return res.status(400).json({ error: { message: 'PROMOTION_CODE_REQUIRED' } });
    }

    const existing = await runQuery('select id from promotions where upper(code) = ? limit 1', [code]);
    if (existing.length > 0) {
      return res.status(400).json({ error: { message: 'PROMOTION_CODE_EXISTS' } });
    }

    const id = randomUUID();
    await runQuery(
      `insert into promotions
      (id, code, name, discount_percent, min_order, max_uses_per_user, starts_at, ends_at, status, is_active)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, code, name || null, discountPercent, minOrder, maxUsesPerUser, startsAt, endsAt, status, isActive ? 1 : 0],
    );
    const rows = await runQuery('select * from promotions where id = ? limit 1', [id]);
    return res.json({ data: rows?.[0] || null, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/promotions/assign', requireSession, async (req, res) => {
  try {
    const actorRole = await getRoleByUserId(req.session.user?.id);
    if (actorRole !== 'admin') {
      return res.status(403).json({ error: { message: 'FORBIDDEN' } });
    }

    const promotionId = String(req.body?.promotion_id || '').trim();
    const mode = String(req.body?.mode || 'all_buyers').trim();
    const minOrderAmount = Math.max(0, Number(req.body?.min_order_amount || 0));
    const targetUserId = String(req.body?.target_user_id || '').trim();
    if (!promotionId) {
      return res.status(400).json({ error: { message: 'PROMOTION_ID_REQUIRED' } });
    }
    if (!['all_buyers', 'min_order', 'specific_user'].includes(mode)) {
      return res.status(400).json({ error: { message: 'ASSIGNMENT_MODE_INVALID' } });
    }
    if (mode === 'specific_user' && !targetUserId) {
      return res.status(400).json({ error: { message: 'TARGET_USER_REQUIRED' } });
    }

    const promotionRows = await runQuery('select id from promotions where id = ? limit 1', [promotionId]);
    if (!promotionRows.length) {
      return res.status(404).json({ error: { message: 'PROMOTION_NOT_FOUND' } });
    }

    let eligibleRows = [];
    if (mode === 'specific_user') {
      const targetRows = await runQuery(
        `select id as user_id
         from users
         where id = ?
         limit 1`,
        [targetUserId],
      );
      if (!targetRows.length) {
        return res.status(404).json({ error: { message: 'TARGET_USER_NOT_FOUND' } });
      }
      eligibleRows = targetRows;
    } else if (mode === 'min_order') {
      eligibleRows = await runQuery(
        `select distinct user_id
         from orders
         where user_id is not null
           and status <> 'cancelled'
           and total >= ?`,
        [minOrderAmount],
      );
    } else {
      eligibleRows = await runQuery(
        `select distinct user_id
         from orders
         where user_id is not null
           and status <> 'cancelled'`,
      );
    }
    const eligibleUserIds = [...new Set(
      (eligibleRows || [])
        .map(item => String(item.user_id || '').trim())
        .filter(Boolean),
    )];

    if (eligibleUserIds.length === 0) {
      return res.json({
        data: { assigned_count: 0, skipped_count: 0, total_eligible: 0 },
        error: null,
      });
    }

    const existingRows = await runQuery(
      `select user_id
       from promotion_assignments
       where promotion_id = ?
         and user_id in (${eligibleUserIds.map(() => '?').join(',')})`,
      [promotionId, ...eligibleUserIds],
    );
    const existingSet = new Set(existingRows.map(item => String(item.user_id || '').trim()));
    let assignedCount = 0;
    const assignedAt = normalizeDateTimeInput(new Date().toISOString());
    for (const targetUserId of eligibleUserIds) {
      if (existingSet.has(targetUserId)) continue;
      assignedCount += 1;
      await runQuery(
        `insert into promotion_assignments
        (id, promotion_id, user_id, assignment_type, criteria_json, is_used, assigned_at)
        values (?, ?, ?, ?, ?, 0, ?)`,
        [
          randomUUID(),
          promotionId,
          targetUserId,
          mode,
          JSON.stringify(
            mode === 'min_order'
              ? { min_order_amount: minOrderAmount }
              : mode === 'specific_user'
                ? { target_user_id: targetUserId }
                : {},
          ),
          assignedAt,
        ],
      );
    }

    return res.json({
      data: {
        assigned_count: assignedCount,
        skipped_count: eligibleUserIds.length - assignedCount,
        total_eligible: eligibleUserIds.length,
      },
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.get('/api/promotions/assignments/:promotionId', requireSession, async (req, res) => {
  try {
    const actorRole = await getRoleByUserId(req.session.user?.id);
    if (actorRole !== 'admin') {
      return res.status(403).json({ error: { message: 'FORBIDDEN' } });
    }
    const promotionId = String(req.params.promotionId || '').trim();
    if (!promotionId) {
      return res.status(400).json({ error: { message: 'PROMOTION_ID_REQUIRED' } });
    }
    const rows = await runQuery(
      `select
         pa.id,
         pa.promotion_id,
         pa.user_id,
         pa.assignment_type,
         pa.criteria_json,
         pa.is_used,
         pa.used_at,
         pa.order_id,
         pa.assigned_at,
         pa.created_at,
         u.email,
         p.full_name,
         p.phone,
         p.role
       from promotion_assignments pa
       left join users u on u.id = pa.user_id
       left join profiles p on p.id = pa.user_id
       where pa.promotion_id = ?
       order by pa.created_at desc`,
      [promotionId],
    );
    return res.json({ data: rows, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.get('/api/promotions/my-available', requireSession, async (req, res) => {
  try {
    const userId = String(req.session.user?.id || '').trim();
    const orderSubtotal = Math.max(0, Number(req.query?.order_subtotal || 0));
    if (!userId) {
      return res.status(401).json({ error: { message: 'UNAUTHENTICATED' } });
    }
    if (!Number.isFinite(orderSubtotal) || orderSubtotal < 0) {
      return res.status(400).json({ error: { message: 'ORDER_SUBTOTAL_INVALID' } });
    }

    const rows = await runQuery(
      `select
         pa.id as assignment_id,
         pa.assignment_type,
         pa.assigned_at,
         p.id as promotion_id,
         p.code,
         p.name,
         p.discount_percent,
         p.min_order,
         p.starts_at,
         p.ends_at,
         p.status,
         p.is_active
       from promotion_assignments pa
       inner join promotions p on p.id = pa.promotion_id
       where pa.user_id = ?
         and pa.is_used = 0
       order by pa.assigned_at desc, pa.created_at desc
       limit 100`,
      [userId],
    );

    const now = Date.now();
    const data = (rows || []).map((row) => {
      const startsAtMs = row.starts_at ? new Date(row.starts_at).getTime() : null;
      const endsAtMs = row.ends_at ? new Date(row.ends_at).getTime() : null;
      const minOrder = Math.max(0, Number(row.min_order || 0));
      const isActive = Boolean(Number(row.is_active || 0)) && String(row.status || '').toLowerCase() === 'active';
      const notStarted = startsAtMs && Number.isFinite(startsAtMs) && now < startsAtMs;
      const expired = endsAtMs && Number.isFinite(endsAtMs) && now > endsAtMs;
      const minOrderFailed = orderSubtotal < minOrder;
      let disabledReason = '';
      if (!isActive) disabledReason = 'Mã chưa kích hoạt';
      else if (notStarted) disabledReason = 'Mã chưa đến thời gian áp dụng';
      else if (expired) disabledReason = 'Mã đã hết hạn';
      else if (minOrderFailed) disabledReason = `Đơn tối thiểu ${minOrder.toLocaleString('vi-VN')}đ`;
      return {
        assignment_id: row.assignment_id,
        assignment_type: row.assignment_type,
        promotion_id: row.promotion_id,
        code: row.code,
        name: row.name,
        discount_percent: Math.min(99, Math.max(0, Number(row.discount_percent || 0))),
        min_order: minOrder,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        can_apply: isActive && !notStarted && !expired && !minOrderFailed,
        disabled_reason: disabledReason,
      };
    });

    return res.json({ data, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/promotions/apply-preview', requireSession, async (req, res) => {
  try {
    const userId = String(req.session.user?.id || '').trim();
    const code = String(req.body?.code || '').trim().toUpperCase();
    const orderSubtotal = Math.max(0, Number(req.body?.order_subtotal || 0));
    if (!userId) {
      return res.status(401).json({ error: { message: 'UNAUTHENTICATED' } });
    }
    if (!code) {
      return res.status(400).json({ error: { message: 'PROMOTION_CODE_REQUIRED' } });
    }
    if (!Number.isFinite(orderSubtotal) || orderSubtotal < 0) {
      return res.status(400).json({ error: { message: 'ORDER_SUBTOTAL_INVALID' } });
    }

    const rows = await runQuery(
      `select
         p.id as promotion_id,
         p.code,
         p.discount_percent,
         p.min_order,
         p.starts_at,
         p.ends_at,
         p.status,
         p.is_active,
         pa.id as assignment_id,
         pa.is_used
       from promotions p
       left join promotion_assignments pa
         on pa.promotion_id = p.id
        and pa.user_id = ?
       where upper(p.code) = ?
       limit 1`,
      [userId, code],
    );
    if (!rows.length) {
      return res.status(404).json({ error: { message: 'PROMOTION_NOT_FOUND' } });
    }

    const row = rows[0];
    if (!row.assignment_id) {
      return res.status(403).json({ error: { message: 'PROMOTION_NOT_ASSIGNED' } });
    }
    if (Boolean(Number(row.is_used || 0))) {
      return res.status(400).json({ error: { message: 'PROMOTION_ALREADY_USED' } });
    }
    if (!Boolean(Number(row.is_active || 0)) || String(row.status || '').toLowerCase() !== 'active') {
      return res.status(400).json({ error: { message: 'PROMOTION_INACTIVE' } });
    }
    const now = Date.now();
    const startsAtMs = row.starts_at ? new Date(row.starts_at).getTime() : null;
    const endsAtMs = row.ends_at ? new Date(row.ends_at).getTime() : null;
    if (startsAtMs && Number.isFinite(startsAtMs) && now < startsAtMs) {
      return res.status(400).json({ error: { message: 'PROMOTION_NOT_STARTED' } });
    }
    if (endsAtMs && Number.isFinite(endsAtMs) && now > endsAtMs) {
      return res.status(400).json({ error: { message: 'PROMOTION_EXPIRED' } });
    }
    const minOrder = Math.max(0, Number(row.min_order || 0));
    if (orderSubtotal < minOrder) {
      return res.status(400).json({ error: { message: 'ORDER_BELOW_MINIMUM' } });
    }
    const discountPercent = Math.min(99, Math.max(0, Number(row.discount_percent || 0)));
    const discountAmount = Math.round((orderSubtotal * discountPercent) / 100);
    const finalTotal = Math.max(0, orderSubtotal - discountAmount);
    return res.json({
      data: {
        promotion_id: row.promotion_id,
        assignment_id: row.assignment_id,
        code: row.code,
        discount_percent: discountPercent,
        min_order: minOrder,
        discount_amount: discountAmount,
        final_total: finalTotal,
      },
      error: null,
    });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.get('/api/reviews/by-product/:productId', async (req, res) => {
  try {
    const productId = String(req.params.productId || '').trim();
    if (!productId) {
      return res.status(400).json({ error: { message: 'PRODUCT_ID_REQUIRED' } });
    }
    const rows = await runQuery(
      `select id, product_id, user_id, full_name, phone, rating, comment, image_url, status, is_hidden, created_at
       from reviews
       where product_id = ?
         and status = 'approved'
         and coalesce(is_hidden, 0) = 0
       order by created_at desc`,
      [productId],
    );
    return res.json({ data: rows, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/reviews/submit', requireSession, async (req, res) => {
  try {
    const userId = String(req.session.user?.id || '').trim();
    const productId = String(req.body?.product_id || '').trim();
    const fullName = String(req.body?.full_name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const comment = String(req.body?.comment || '').trim();
    const imageUrl = String(req.body?.image_url || '').trim();
    const ratingValue = Math.floor(Number(req.body?.rating || 0));
    const rating = Math.min(5, Math.max(1, ratingValue));

    if (!userId) {
      return res.status(401).json({ error: { message: 'UNAUTHENTICATED' } });
    }
    if (!productId) {
      return res.status(400).json({ error: { message: 'PRODUCT_ID_REQUIRED' } });
    }
    if (!comment) {
      return res.status(400).json({ error: { message: 'COMMENT_REQUIRED' } });
    }
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ error: { message: 'RATING_INVALID' } });
    }

    const productRows = await runQuery('select id from products where id = ? limit 1', [productId]);
    if (!productRows.length) {
      return res.status(404).json({ error: { message: 'PRODUCT_NOT_FOUND' } });
    }

    const reviewId = randomUUID();
    if (!fullName) {
      const profileRows = await runQuery('select full_name from profiles where id = ? limit 1', [userId]);
      fullName = String(profileRows?.[0]?.full_name || '').trim();
    }

    await runQuery(
      `insert into reviews
      (id, product_id, user_id, full_name, phone, rating, comment, image_url, status, is_hidden)
      values (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [reviewId, productId, userId, fullName, phone, rating, comment, imageUrl || null],
    );
    const inserted = await runQuery('select * from reviews where id = ? limit 1', [reviewId]);
    return res.json({ data: inserted?.[0] || null, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/reviews/moderate', requireSession, async (req, res) => {
  try {
    const actorId = String(req.session.user?.id || '').trim();
    const actorRole = await getRoleByUserId(actorId);
    if (actorRole !== 'admin') {
      return res.status(403).json({ error: { message: 'FORBIDDEN' } });
    }

    const reviewId = String(req.body?.review_id || '').trim();
    const nextStatus = String(req.body?.status || '').trim().toLowerCase();
    if (!reviewId) {
      return res.status(400).json({ error: { message: 'REVIEW_ID_REQUIRED' } });
    }
    if (!['pending', 'approved', 'hidden'].includes(nextStatus)) {
      return res.status(400).json({ error: { message: 'STATUS_INVALID' } });
    }

    const rows = await runQuery('select id, product_id from reviews where id = ? limit 1', [reviewId]);
    if (!rows.length) {
      return res.status(404).json({ error: { message: 'REVIEW_NOT_FOUND' } });
    }
    const review = rows[0];
    await runQuery(
      'update reviews set status = ?, is_hidden = ? where id = ?',
      [nextStatus, nextStatus === 'hidden' ? 1 : 0, reviewId],
    );
    await recomputeProductReviewStats(review.product_id);
    const updatedRows = await runQuery('select * from reviews where id = ? limit 1', [reviewId]);
    return res.json({ data: updatedRows?.[0] || null, error: null });
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

    const code = generateRandomOtpCode();
    otpStore.set(email, { code, expiresAt: Date.now() + OTP_EXPIRES_MS });

    const deliveredViaEmail = Boolean(mailTransporter && SMTP_FROM);
    if (deliveredViaEmail) {
      await mailTransporter.sendMail({
        from: SMTP_FROM,
        to: email,
        subject: 'Ma xac minh dat lai mat khau NikaShop',
        text: `Ma xac minh cua ban la: ${code}`,
      });
    } else {
      console.log(`[OTP] ${email}: ${code} (SMTP chua cau hinh — email khong duoc gui)`);
    }

    return res.json({ data: { sent: true, deliveredViaEmail }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const email = getEmailKey(req.body?.email);
    const token = String(req.body?.token || '').replace(/\D/g, '').trim();
    const record = otpStore.get(email);
    if (!record || token.length !== 6 || record.code !== token || Date.now() > record.expiresAt) {
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

app.post('/api/auth/change-password', requireSession, async (req, res) => {
  try {
    const currentPassword = String(req.body?.current_password || '');
    const newPassword = String(req.body?.new_password || '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: { message: 'PASSWORD_REQUIRED' } });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: { message: 'INVALID_PASSWORD' } });
    }

    let rows = await runQuery(
      'select id, password_hash from users where id = ? limit 1',
      [req.session.user.id],
    );
    if (!rows.length && req.session.user?.email) {
      rows = await runQuery(
        'select id, password_hash from users where email = ? limit 1',
        [String(req.session.user.email)],
      );
    }
    if (!rows.length) {
      return res.status(404).json({ error: { message: 'USER_NOT_FOUND' } });
    }

    const user = rows[0];
    const oldPasswordMatched = await bcrypt.compare(currentPassword, String(user.password_hash || ''));
    if (!oldPasswordMatched) {
      return res.status(400).json({ error: { message: 'INVALID_CURRENT_PASSWORD' } });
    }

    const isReusedPassword = await bcrypt.compare(newPassword, String(user.password_hash || ''));
    if (isReusedPassword) {
      return res.status(400).json({ error: { message: 'PASSWORD_ALREADY_USED' } });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runQuery('update users set password_hash = ? where id = ?', [passwordHash, user.id]);
    return res.json({ data: { updated: true }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/admin/reset-account-password', requireSession, async (req, res) => {
  try {
    const actorId = String(req.session.user?.id || '').trim();
    if (!actorId) {
      return res.status(401).json({ error: { message: 'UNAUTHENTICATED' } });
    }
    const actorRole = await getRoleByUserId(actorId);
    if (actorRole !== 'admin') {
      return res.status(403).json({ error: { message: 'FORBIDDEN' } });
    }

    const targetUserId = String(req.body?.target_user_id || '').trim();
    const newPassword = String(req.body?.new_password || '');
    if (!targetUserId) {
      return res.status(400).json({ error: { message: 'TARGET_USER_REQUIRED' } });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: { message: 'INVALID_PASSWORD' } });
    }

    const rows = await runQuery('select id from users where id = ? limit 1', [targetUserId]);
    if (!rows.length) {
      return res.status(404).json({ error: { message: 'USER_NOT_FOUND' } });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await runQuery('update users set password_hash = ? where id = ?', [passwordHash, targetUserId]);
    return res.json({ data: { updated: true }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/forgot-password/request', async (req, res) => {
  try {
    const email = getEmailKey(req.body?.email);
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: { message: 'EMAIL_INVALID' } });
    }

    const users = await runQuery('select id from users where email = ? limit 1', [email]);
    if (!users.length) {
      return res.status(404).json({ error: { message: 'USER_NOT_FOUND' } });
    }

    const confirmationCode = generateRandomResetCode(10);
    const expiresAt = Date.now() + RESET_CODE_EXPIRES_MS;
    resetCodeStore.set(email, { code: confirmationCode, expiresAt });

    const resetLink =
      `${FRONTEND_URL}/forgot-password?email=${encodeURIComponent(email)}&xac_nhan=1&ma_xac_nhan=${encodeURIComponent(confirmationCode)}`;

    const deliveredViaEmail = Boolean(mailTransporter && SMTP_FROM);
    if (deliveredViaEmail) {
      await mailTransporter.sendMail({
        from: SMTP_FROM,
        to: email,
        subject: 'Khoi phuc mat khau tai NikaShop',
        text: [
          'Ban hoac ai do vua yeu cau khoi phuc mat khau tai NikaShop.',
          `Nhan vao link de xac nhan: ${resetLink}`,
          `Ma xac nhan cua ban: ${confirmationCode}`,
          'Ma chi co hieu luc trong 24h.',
        ].join('\n'),
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
            <h3>Khôi phục mật khẩu</h3>
            <p>Bạn vừa yêu cầu khôi phục mật khẩu tại NikaShop.</p>
            <p>
              Nhấn vào liên kết sau để xác nhận:<br />
              <a href="${resetLink}" target="_blank" rel="noreferrer">${resetLink}</a>
            </p>
            <p><strong>Mã xác nhận của bạn:</strong> ${confirmationCode}</p>
            <p>Lưu ý: Yêu cầu này chỉ có hiệu lực trong <strong>24 giờ</strong>.</p>
          </div>
        `,
      });
    } else {
      console.log(`[RESET] ${email}: code=${confirmationCode}`);
      console.log(`[RESET] ${email}: link=${resetLink}`);
    }

    const data = {
      sent: true,
      deliveredViaEmail,
      expiresInSeconds: Math.floor(RESET_CODE_EXPIRES_MS / 1000),
    };
    if (!deliveredViaEmail) {
      data.preview = {
        resetLink,
        confirmationCode,
      };
    }
    return res.json({ data, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/forgot-password/verify', async (req, res) => {
  try {
    const email = getEmailKey(req.body?.email);
    const code = String(req.body?.code || '').trim().toUpperCase();
    const record = resetCodeStore.get(email);
    if (!record || !code || record.code !== code || Date.now() > Number(record.expiresAt || 0)) {
      return res.status(400).json({ error: { message: 'INVALID_RESET_CODE' } });
    }
    return res.json({ data: { verified: true }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

app.post('/api/auth/forgot-password/reset', async (req, res) => {
  try {
    const email = getEmailKey(req.body?.email);
    const code = String(req.body?.code || '').trim().toUpperCase();
    const password = String(req.body?.password || '');
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: { message: 'EMAIL_INVALID' } });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: { message: 'INVALID_PASSWORD' } });
    }

    const record = resetCodeStore.get(email);
    if (!record || !code || record.code !== code || Date.now() > Number(record.expiresAt || 0)) {
      return res.status(400).json({ error: { message: 'INVALID_RESET_CODE' } });
    }

    const users = await runQuery('select id from users where email = ? limit 1', [email]);
    if (!users.length) {
      return res.status(404).json({ error: { message: 'USER_NOT_FOUND' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await runQuery('update users set password_hash = ? where email = ?', [passwordHash, email]);
    resetCodeStore.delete(email);
    otpStore.delete(email);
    return res.json({ data: { updated: true }, error: null });
  } catch (error) {
    return res.status(500).json({ error: { message: error.message } });
  }
});

const READABLE_WITHOUT_AUTH = new Set(['products', 'categories', 'banners', 'branches', 'home_category_sections', 'site_contents']);
const TABLE_WHITELIST = new Set([
  'users',
  'profiles',
  'categories',
  'category_groups',
  'site_contents',
  'branches',
  'home_category_sections',
  'banners',
  'products',
  'cart_items',
  'orders',
  'order_items',
  'support_requests',
  'promotions',
  'promotion_assignments',
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
      if (table === 'reviews') {
        row.user_id = String(req.session.user?.id || '').trim() || null;
        row.status = 'pending';
        row.is_hidden = 0;
        row.rating = Math.min(5, Math.max(1, Math.floor(Number(row.rating || 0))));
      }
      const keys = Object.keys(row).filter(isSafeIdentifier);
      if (!keys.length) continue;
      const sql = `insert into ${table} (${keys.join(',')}) values (${keys.map(() => '?').join(',')})`;
      await runQuery(sql, keys.map(key => row[key]));
      const fetched = await runQuery(`select * from ${table} where id = ? limit 1`, [row.id]);
      if (fetched[0]) inserted.push(fetched[0]);
      if (table === 'reviews' && row.product_id) {
        await recomputeProductReviewStats(row.product_id);
      }
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
    if (table === 'reviews') {
      const actorRole = await getRoleByUserId(req.session.user?.id);
      if (actorRole !== 'admin') {
        return res.status(403).json({ error: { message: 'FORBIDDEN' } });
      }
    }
    const keys = Object.keys(values).filter(isSafeIdentifier);
    if (!keys.length) return res.json({ data: [], error: null });
    const setSql = keys.map(key => `${key} = ?`).join(', ');
    const setValues = keys.map(key => values[key]);
    const { whereSql, values: whereValues } = buildWhereClause(filters);
    const shouldHandleOrderInventory = table === 'orders' && keys.includes('status');
    const beforeOrderRows = shouldHandleOrderInventory
      ? await runQuery(`select id, status, coalesce(stock_deducted, 0) as stock_deducted from orders${whereSql}`, whereValues)
      : [];
    const beforeRows = table === 'reviews'
      ? await runQuery(`select product_id from ${table}${whereSql}`, whereValues)
      : [];
    await runQuery(`update ${table} set ${setSql}${whereSql}`, [...setValues, ...whereValues]);
    const rows = await runQuery(`select * from ${table}${whereSql}`, whereValues);
    if (shouldHandleOrderInventory) {
      const beforeMap = new Map(
        beforeOrderRows.map(item => [String(item?.id || ''), {
          status: String(item?.status || '').toLowerCase(),
          stockDeducted: Boolean(Number(item?.stock_deducted || 0)),
        }]),
      );
      for (const row of rows) {
        const orderId = String(row?.id || '').trim();
        if (!orderId) continue;
        const prev = beforeMap.get(orderId) || { status: '', stockDeducted: false };
        const nextStatus = String(row?.status || '').toLowerCase();
        if (nextStatus === 'shipping' && !prev.stockDeducted) {
          await applyOrderInventoryDelta(orderId, 'deduct');
          await runQuery('update orders set stock_deducted = 1 where id = ?', [orderId]);
        } else if (nextStatus === 'cancelled' && prev.stockDeducted) {
          await applyOrderInventoryDelta(orderId, 'restore');
          await runQuery('update orders set stock_deducted = 0 where id = ?', [orderId]);
        }
      }
    }
    if (table === 'reviews') {
      const affectedProductIds = [...new Set(
        [...beforeRows, ...rows]
          .map(item => String(item?.product_id || '').trim())
          .filter(Boolean),
      )];
      for (const productId of affectedProductIds) {
        await recomputeProductReviewStats(productId);
      }
    }
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
    if (table === 'reviews') {
      const actorRole = await getRoleByUserId(req.session.user?.id);
      if (actorRole !== 'admin') {
        return res.status(403).json({ error: { message: 'FORBIDDEN' } });
      }
    }
    const { whereSql, values } = buildWhereClause(filters);
    const beforeRows = table === 'reviews'
      ? await runQuery(`select product_id from ${table}${whereSql}`, values)
      : [];
    await runQuery(`delete from ${table}${whereSql}`, values);
    if (table === 'reviews') {
      const affectedProductIds = [...new Set(
        beforeRows
          .map(item => String(item?.product_id || '').trim())
          .filter(Boolean),
      )];
      for (const productId of affectedProductIds) {
        await recomputeProductReviewStats(productId);
      }
    }
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
  const subtotal = Number(payload.p_subtotal || total || 0);
  const promotionAssignmentId = String(payload.p_promotion_assignment_id || '').trim();
  const shippingAddress = String(payload.p_shipping_address || '').trim();
  const status = String(payload.p_status || 'pending').trim() || 'pending';
  const items = Array.isArray(payload.p_items) ? payload.p_items : [];

  if (
    !userId
    || !shippingAddress
    || !items.length
    || !Number.isFinite(total)
    || total < 0
    || !Number.isFinite(subtotal)
    || subtotal < 0
  ) {
    return res.status(400).json({ error: { message: 'INVALID_RPC_PAYLOAD' } });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let computedSubtotal = 0;
    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
        throw new Error('INVALID_ORDER_ITEM');
      }
      computedSubtotal += Math.floor(quantity) * price;
    }
    if (Math.abs(computedSubtotal - subtotal) > 1) {
      throw new Error('SUBTOTAL_MISMATCH');
    }

    let finalTotal = subtotal;
    if (promotionAssignmentId) {
      const [promotionRows] = await connection.execute(
        `select
          p.discount_percent,
          p.min_order,
          p.starts_at,
          p.ends_at,
          p.status,
          p.is_active,
          pa.id as assignment_id,
          pa.is_used
        from promotion_assignments pa
        inner join promotions p on p.id = pa.promotion_id
        where pa.id = ?
          and pa.user_id = ?
        limit 1`,
        [promotionAssignmentId, userId],
      );
      const promotionRow = promotionRows?.[0];
      if (!promotionRow) throw new Error('PROMOTION_ASSIGNMENT_NOT_FOUND');
      if (Boolean(Number(promotionRow.is_used || 0))) throw new Error('PROMOTION_ALREADY_USED');
      if (!Boolean(Number(promotionRow.is_active || 0)) || String(promotionRow.status || '').toLowerCase() !== 'active') {
        throw new Error('PROMOTION_INACTIVE');
      }
      const now = Date.now();
      const startsAtMs = promotionRow.starts_at ? new Date(promotionRow.starts_at).getTime() : null;
      const endsAtMs = promotionRow.ends_at ? new Date(promotionRow.ends_at).getTime() : null;
      if (startsAtMs && Number.isFinite(startsAtMs) && now < startsAtMs) throw new Error('PROMOTION_NOT_STARTED');
      if (endsAtMs && Number.isFinite(endsAtMs) && now > endsAtMs) throw new Error('PROMOTION_EXPIRED');
      const minOrder = Math.max(0, Number(promotionRow.min_order || 0));
      if (subtotal < minOrder) throw new Error('ORDER_BELOW_MINIMUM');
      const discountPercent = Math.min(99, Math.max(0, Number(promotionRow.discount_percent || 0)));
      const discountAmount = Math.round((subtotal * discountPercent) / 100);
      finalTotal = Math.max(0, subtotal - discountAmount);
      if (Math.abs(finalTotal - total) > 1) {
        throw new Error('PROMOTION_TOTAL_MISMATCH');
      }
    } else if (Math.abs(total - subtotal) > 1) {
      throw new Error('TOTAL_MISMATCH');
    }

    const orderId = randomUUID();
    await connection.execute(
      'insert into orders (id, user_id, total, shipping_address, status, stock_deducted) values (?, ?, ?, ?, ?, ?)',
      [orderId, userId, finalTotal, shippingAddress, status, 0],
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

    }

    const normalizedStatus = String(status || '').toLowerCase();
    if (normalizedStatus === 'shipping') {
      await applyOrderInventoryDelta(orderId, 'deduct');
      await connection.execute('update orders set stock_deducted = 1 where id = ?', [orderId]);
    }

    if (promotionAssignmentId) {
      await connection.execute(
        'update promotion_assignments set is_used = 1, used_at = now(), order_id = ? where id = ? and user_id = ?',
        [orderId, promotionAssignmentId, userId],
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
  ensureOrdersInventoryColumn(),
  ensureSiteContentsTable(),
  ensureCategoryGroupsTable(),
  ensureBranchesTable(),
  ensureHomeCategorySectionsTable(),
  ensureBannersTable(),
  ensurePromotionsTables(),
  ensureReviewsTable(),
])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Auth/API server running at http://localhost:${PORT}`);
      if (mailTransporter && SMTP_FROM) {
        console.log('[SMTP] Đã bật — mã OTP sẽ gửi qua email (kiểm tra .env: SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM).');
      } else {
        console.warn(
          '[SMTP] Chưa cấu hình đủ — OTP chỉ in ra console. Thêm vào file .env (cùng thư mục auth-server.js): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM rồi chạy lại server.',
        );
      }
    });
  })
  .catch(error => {
    console.error('Failed to initialize database schema:', error);
    process.exit(1);
  });
