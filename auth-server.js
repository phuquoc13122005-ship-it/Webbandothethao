const express = require('express');
const session = require('express-session');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-env';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const otpStore = new Map();
const OTP_EXPIRES_MS = 10 * 60 * 1000;
const RESET_TOKEN_EXPIRES_MS = 10 * 60 * 1000;

const mailTransporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

function getEmailKey(email) {
  return String(email || '').trim().toLowerCase();
}

function buildOtpMailHtml(code) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5; color: #1f2937;">
    <h2 style="margin: 0 0 12px;">Xác minh đặt lại mật khẩu - NikaShop</h2>
    <p style="margin: 0 0 16px;">Nhập mã bên dưới để xác minh yêu cầu đặt lại mật khẩu.</p>
    <div style="display:inline-block;padding:14px 20px;border:1px solid #e5e7eb;border-radius:10px;font-size:28px;font-weight:700;letter-spacing:8px;">
      ${code}
    </div>
    <p style="margin: 16px 0 0; color: #6b7280;">Mã có hiệu lực trong 10 phút.</p>
  </div>`;
}

async function findUserByEmail(email) {
  if (!supabaseAdmin) return null;
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users) return null;
    const found = data.users.find(user => String(user.email || '').toLowerCase() === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
}

app.use(express.json());
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
      name: data.name || null,
      picture: data.picture || null,
    };

    req.session.tokens = {
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
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

app.post('/auth/password/send-code', async (req, res) => {
  const email = getEmailKey(req.body?.email);
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email không hợp lệ.' });
  }

  if (!mailTransporter) {
    return res.status(500).json({ error: 'SMTP chưa được cấu hình.' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  otpStore.set(email, {
    code,
    expiresAt: Date.now() + OTP_EXPIRES_MS,
    resetToken: null,
    resetTokenExpiresAt: null,
  });

  try {
    await mailTransporter.sendMail({
      from: SMTP_FROM,
      to: email,
      subject: 'Ma xac minh dat lai mat khau NikaShop',
      html: buildOtpMailHtml(code),
    });
    return res.json({ ok: true });
  } catch (error) {
    console.error('Send OTP email error:', error);
    return res.status(500).json({ error: 'Không thể gửi mã xác minh lúc này.' });
  }
});

app.post('/auth/password/verify-code', (req, res) => {
  const email = getEmailKey(req.body?.email);
  const code = String(req.body?.code || '').trim();
  if (!email || !code) {
    return res.status(400).json({ error: 'Thiếu email hoặc mã xác minh.' });
  }

  const record = otpStore.get(email);
  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'Mã xác minh đã hết hạn.' });
  }

  if (record.code !== code) {
    return res.status(400).json({ error: 'Mã xác minh không chính xác.' });
  }

  const resetToken = crypto.randomUUID();
  otpStore.set(email, {
    ...record,
    resetToken,
    resetTokenExpiresAt: Date.now() + RESET_TOKEN_EXPIRES_MS,
  });

  return res.json({ ok: true, resetToken });
});

app.post('/auth/password/reset', async (req, res) => {
  const email = getEmailKey(req.body?.email);
  const newPassword = String(req.body?.newPassword || '');
  const resetToken = String(req.body?.resetToken || '');

  if (!email || !newPassword || !resetToken) {
    return res.status(400).json({ error: 'Thiếu thông tin đặt lại mật khẩu.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase admin chưa được cấu hình.' });
  }

  const record = otpStore.get(email);
  if (
    !record ||
    !record.resetToken ||
    record.resetToken !== resetToken ||
    !record.resetTokenExpiresAt ||
    Date.now() > record.resetTokenExpiresAt
  ) {
    return res.status(400).json({ error: 'Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản tương ứng email.' });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (error) {
      return res.status(500).json({ error: 'Không thể cập nhật mật khẩu.' });
    }

    otpStore.delete(email);
    return res.json({ ok: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Đặt lại mật khẩu thất bại.' });
  }
});

app.listen(PORT, () => {
  console.log(`Google OAuth server running at http://localhost:${PORT}`);
});
