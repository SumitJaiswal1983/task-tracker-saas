require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const cron = require('node-cron');

const app = express();

// Raw body needed for Razorpay webhook signature verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-saas-secret-2026';
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'sumit@highflow.in';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'highflow@123';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

const PLANS = {
  monthly: { amount: 79900, label: '₹799/month', days: 30 },
  yearly:  { amount: 699900, label: '₹6,999/year', days: 365 },
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ========================
// MIDDLEWARE
// ========================

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Admin only' });
  next();
}

function superAdminOnly(req, res, next) {
  if (req.user.role !== 'superadmin')
    return res.status(403).json({ error: 'Super admin only' });
  next();
}

async function checkTrial(req, res, next) {
  if (req.user.role === 'superadmin') return next();

  const { rows } = await pool.query('SELECT * FROM tt_companies WHERE id=$1', [req.user.company_id]);
  const company = rows[0];
  if (!company) return res.status(403).json({ error: 'Company not found' });

  const now = Date.now();

  // Paid subscription active
  if (company.is_paid && company.paid_until && new Date(company.paid_until) > now) {
    req.company = company;
    return next();
  }

  // Trial check
  const daysSince = Math.floor((now - new Date(company.trial_start_date)) / (1000 * 60 * 60 * 24));
  if (daysSince >= 30) {
    return res.status(402).json({ error: 'Trial expired', trial_expired: true });
  }

  req.company = company;
  next();
}

// ========================
// DB INIT
// ========================

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tt_companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      trial_start_date TIMESTAMP DEFAULT NOW(),
      is_paid BOOLEAN DEFAULT FALSE,
      plan VARCHAR(50) DEFAULT 'trial',
      paid_until TIMESTAMP,
      razorpay_payment_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE tt_companies ADD COLUMN IF NOT EXISTS paid_until TIMESTAMP;

    CREATE TABLE IF NOT EXISTS tt_users (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES tt_companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'viewer',
      whatsapp_number VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tt_tasks (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES tt_companies(id) ON DELETE CASCADE,
      task_description TEXT NOT NULL,
      stakeholder VARCHAR(255),
      section VARCHAR(100),
      create_date DATE,
      initial_target_date DATE,
      revised_date_1 DATE,
      revised_date_2 DATE,
      revised_date_3 DATE,
      revised_date_4 DATE,
      revised_date_5 DATE,
      completion_date DATE,
      remarks TEXT,
      sheet_name VARCHAR(100) DEFAULT 'Sheet 1',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tt_sections (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES tt_companies(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      UNIQUE(company_id, name)
    );

    CREATE TABLE IF NOT EXISTS tt_stakeholders (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES tt_companies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      whatsapp_number VARCHAR(20),
      UNIQUE(company_id, name)
    );

    CREATE TABLE IF NOT EXISTS tt_weekly_scores (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES tt_companies(id) ON DELETE CASCADE,
      week_number VARCHAR(50),
      score_percent DECIMAL(5,2),
      recorded_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(company_id, week_number)
    );
  `);

  // Seed superadmin (no company_id)
  const { rows: saRows } = await pool.query('SELECT id FROM tt_users WHERE email=$1', [SUPERADMIN_EMAIL]);
  if (saRows.length === 0) {
    const hash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO tt_users (company_id, name, email, password, role) VALUES (NULL,$1,$2,$3,'superadmin')`,
      ['Sumit Jaiswal', SUPERADMIN_EMAIL, hash]
    );
    console.log('Superadmin created:', SUPERADMIN_EMAIL);
  }

  console.log('DB initialized');
}

// ========================
// HELPERS
// ========================

function calcTask(task) {
  const revisions = [
    task.revised_date_1, task.revised_date_2, task.revised_date_3,
    task.revised_date_4, task.revised_date_5,
  ].filter(Boolean);
  const no_of_deviations = revisions.length;
  const achievement_status = task.completion_date ? 'Completed' : 'Pending';
  const score = task.initial_target_date
    ? task.completion_date ? Math.max(0, 5 - no_of_deviations) : null
    : null;
  const effective_target = revisions[revisions.length - 1] || task.initial_target_date;
  const is_overdue = achievement_status === 'Pending' && effective_target && new Date(effective_target) < new Date();
  return { ...task, no_of_deviations, achievement_status, score, is_overdue };
}

function trialInfo(company) {
  if (!company) return null;
  const now = Date.now();
  const daysSince = Math.floor((now - new Date(company.trial_start_date)) / (1000 * 60 * 60 * 24));

  const subscriptionActive = company.is_paid && company.paid_until && new Date(company.paid_until) > now;
  const days_remaining = subscriptionActive
    ? Math.ceil((new Date(company.paid_until) - now) / (1000 * 60 * 60 * 24))
    : Math.max(0, 30 - daysSince);
  const is_expired = !subscriptionActive && daysSince >= 30;

  return {
    company_name: company.name,
    is_paid: company.is_paid,
    subscription_active: subscriptionActive,
    plan: company.plan,
    trial_start_date: company.trial_start_date,
    paid_until: company.paid_until,
    days_remaining,
    is_expired,
  };
}

const DEFAULT_SECTIONS = [
  'Assembly', 'Accounts', 'HR', 'IT', 'Maintenance',
  'Operations', 'Production', 'Purchase', 'Quality', 'Sales'
];

// ========================
// AUTH ROUTES (public)
// ========================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { company_name, name, email, password } = req.body;
    if (!company_name || !name || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const { rows: compRows } = await pool.query(
      `INSERT INTO tt_companies (name, email) VALUES ($1, $2) RETURNING *`,
      [company_name.trim(), email.toLowerCase()]
    );
    const company = compRows[0];

    const hash = await bcrypt.hash(password, 10);
    const { rows: userRows } = await pool.query(
      `INSERT INTO tt_users (company_id, name, email, password, role) VALUES ($1,$2,$3,$4,'admin') RETURNING id,name,email,role`,
      [company.id, name.trim(), email.toLowerCase(), hash]
    );
    const user = userRows[0];

    for (const section of DEFAULT_SECTIONS) {
      await pool.query(
        'INSERT INTO tt_sections (company_id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [company.id, section]
      );
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, company_id: company.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user, company: trialInfo(company) });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await pool.query('SELECT * FROM tt_users WHERE email=$1', [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password' });

    let company = null;
    if (user.company_id) {
      const { rows: cRows } = await pool.query('SELECT * FROM tt_companies WHERE id=$1', [user.company_id]);
      company = cRows[0] || null;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, company_id: user.company_id || null },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      company: company ? trialInfo(company) : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id,name,email,role,created_at FROM tt_users WHERE id=$1', [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    let company = null;
    if (req.user.company_id) {
      const { rows: cRows } = await pool.query('SELECT * FROM tt_companies WHERE id=$1', [req.user.company_id]);
      company = cRows[0] ? trialInfo(cRows[0]) : null;
    }

    res.json({ ...user, company });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// SUPER ADMIN ROUTES
// ========================

app.get('/api/admin/companies', auth, superAdminOnly, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, COUNT(u.id) as user_count
      FROM tt_companies c
      LEFT JOIN tt_users u ON u.company_id = c.id
      GROUP BY c.id ORDER BY c.created_at DESC
    `);
    const companies = rows.map(c => ({ ...c, ...trialInfo(c) }));
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/companies/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const { is_paid, plan } = req.body;
    const { rows } = await pool.query(
      `UPDATE tt_companies SET is_paid=$1, plan=$2 WHERE id=$3 RETURNING *`,
      [is_paid, plan || 'monthly', req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Company not found' });
    res.json({ ...rows[0], ...trialInfo(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// USER MANAGEMENT
// ========================

app.get('/api/users', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id,name,email,role,whatsapp_number,created_at FROM tt_users WHERE company_id=$1 ORDER BY created_at ASC',
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    const { name, email, password, role, whatsapp_number } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO tt_users (company_id, name, email, password, role, whatsapp_number) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id,name,email,role,whatsapp_number,created_at`,
      [req.user.company_id, name, email.toLowerCase(), hash, role || 'viewer', whatsapp_number || null]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    const { name, email, role, password, whatsapp_number } = req.body;
    let q, params;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      q = `UPDATE tt_users SET name=$1, email=$2, role=$3, password=$4, whatsapp_number=$5
           WHERE id=$6 AND company_id=$7 RETURNING id,name,email,role,whatsapp_number,created_at`;
      params = [name, email.toLowerCase(), role, hash, whatsapp_number || null, req.params.id, req.user.company_id];
    } else {
      q = `UPDATE tt_users SET name=$1, email=$2, role=$3, whatsapp_number=$4
           WHERE id=$5 AND company_id=$6 RETURNING id,name,email,role,whatsapp_number,created_at`;
      params = [name, email.toLowerCase(), role, whatsapp_number || null, req.params.id, req.user.company_id];
    }
    const { rows } = await pool.query(q, params);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: "Can't delete yourself" });
    await pool.query('DELETE FROM tt_users WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// TASKS
// ========================

app.get('/api/tasks', auth, checkTrial, async (req, res) => {
  try {
    const { sheet_name, section, stakeholder, status } = req.query;
    let q = 'SELECT * FROM tt_tasks WHERE company_id=$1';
    const params = [req.user.company_id];
    if (sheet_name) { params.push(sheet_name); q += ` AND sheet_name=$${params.length}`; }
    if (section) { params.push(section); q += ` AND section=$${params.length}`; }
    if (stakeholder) { params.push(stakeholder); q += ` AND stakeholder=$${params.length}`; }
    q += ' ORDER BY id ASC';
    const result = await pool.query(q, params);
    let tasks = result.rows.map(calcTask);
    if (status) tasks = tasks.filter(t => t.achievement_status === status);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', auth, checkTrial, async (req, res) => {
  try {
    const { task_description, stakeholder, section, create_date, initial_target_date,
      revised_date_1, revised_date_2, revised_date_3, revised_date_4, revised_date_5,
      completion_date, remarks, sheet_name } = req.body;
    const result = await pool.query(
      `INSERT INTO tt_tasks (company_id, task_description, stakeholder, section, create_date, initial_target_date,
         revised_date_1, revised_date_2, revised_date_3, revised_date_4, revised_date_5,
         completion_date, remarks, sheet_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.company_id, task_description, stakeholder || null, section || null,
       create_date || null, initial_target_date || null, revised_date_1 || null,
       revised_date_2 || null, revised_date_3 || null, revised_date_4 || null,
       revised_date_5 || null, completion_date || null, remarks || null, sheet_name || 'Sheet 1']
    );
    if (stakeholder) {
      await pool.query(
        'INSERT INTO tt_stakeholders (company_id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [req.user.company_id, stakeholder]
      );
    }
    res.json(calcTask(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', auth, checkTrial, async (req, res) => {
  try {
    const { task_description, stakeholder, section, create_date, initial_target_date,
      revised_date_1, revised_date_2, revised_date_3, revised_date_4, revised_date_5,
      completion_date, remarks, sheet_name } = req.body;
    const result = await pool.query(
      `UPDATE tt_tasks SET task_description=$1, stakeholder=$2, section=$3, create_date=$4,
         initial_target_date=$5, revised_date_1=$6, revised_date_2=$7, revised_date_3=$8,
         revised_date_4=$9, revised_date_5=$10, completion_date=$11, remarks=$12,
         sheet_name=$13, updated_at=NOW()
       WHERE id=$14 AND company_id=$15 RETURNING *`,
      [task_description, stakeholder || null, section || null, create_date || null,
       initial_target_date || null, revised_date_1 || null, revised_date_2 || null,
       revised_date_3 || null, revised_date_4 || null, revised_date_5 || null,
       completion_date || null, remarks || null, sheet_name || 'Sheet 1',
       req.params.id, req.user.company_id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    if (stakeholder) {
      await pool.query(
        'INSERT INTO tt_stakeholders (company_id, name) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [req.user.company_id, stakeholder]
      );
    }
    res.json(calcTask(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', auth, checkTrial, async (req, res) => {
  try {
    await pool.query('DELETE FROM tt_tasks WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// DASHBOARD & META
// ========================

app.get('/api/dashboard', auth, checkTrial, async (req, res) => {
  try {
    const { sheet_name } = req.query;
    const result = await pool.query(
      sheet_name
        ? 'SELECT * FROM tt_tasks WHERE company_id=$1 AND sheet_name=$2'
        : 'SELECT * FROM tt_tasks WHERE company_id=$1',
      sheet_name ? [req.user.company_id, sheet_name] : [req.user.company_id]
    );
    const tasks = result.rows.map(calcTask);
    const total = tasks.length;
    const completed = tasks.filter(t => t.achievement_status === 'Completed').length;
    const pending = tasks.filter(t => t.achievement_status === 'Pending').length;
    const overdue = tasks.filter(t => t.is_overdue).length;
    const scoredTasks = tasks.filter(t => t.score !== null);
    const avgScore = scoredTasks.length
      ? (scoredTasks.reduce((s, t) => s + t.score, 0) / scoredTasks.length).toFixed(2) : 0;

    const shMap = {};
    tasks.forEach(t => {
      if (!t.stakeholder) return;
      if (!shMap[t.stakeholder]) shMap[t.stakeholder] = { total: 0, completed: 0, scoreSum: 0, scored: 0 };
      shMap[t.stakeholder].total++;
      if (t.achievement_status === 'Completed') shMap[t.stakeholder].completed++;
      if (t.score !== null) { shMap[t.stakeholder].scoreSum += t.score; shMap[t.stakeholder].scored++; }
    });
    const stakeholderStats = Object.entries(shMap).map(([name, d]) => ({
      name, total: d.total, completed: d.completed, pending: d.total - d.completed,
      avgScore: d.scored ? (d.scoreSum / d.scored).toFixed(2) : '-',
    })).sort((a, b) => b.total - a.total);

    const secMap = {};
    tasks.forEach(t => {
      if (!t.section) return;
      if (!secMap[t.section]) secMap[t.section] = { total: 0, completed: 0 };
      secMap[t.section].total++;
      if (t.achievement_status === 'Completed') secMap[t.section].completed++;
    });
    const sectionStats = Object.entries(secMap).map(([name, d]) => ({
      name, total: d.total, completed: d.completed, pending: d.total - d.completed,
    })).sort((a, b) => b.total - a.total);

    res.json({ total, completed, pending, overdue, avgScore, stakeholderStats, sectionStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sections', auth, checkTrial, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name FROM tt_sections WHERE company_id=$1 ORDER BY name',
      [req.user.company_id]
    );
    if (req.query.full === 'true') return res.json(rows);
    res.json(rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sections', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'INSERT INTO tt_sections (company_id, name) VALUES ($1,$2) RETURNING id, name',
      [req.user.company_id, name.trim()]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Section already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sections/:id', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'UPDATE tt_sections SET name=$1 WHERE id=$2 AND company_id=$3 RETURNING id, name',
      [name.trim(), req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Section already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sections/:id', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    await pool.query('DELETE FROM tt_sections WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stakeholders', auth, checkTrial, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, whatsapp_number FROM tt_stakeholders WHERE company_id=$1 ORDER BY name',
      [req.user.company_id]
    );
    if (req.query.full === 'true') return res.json(rows);
    res.json(rows.map(r => r.name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stakeholders', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    const { name, whatsapp_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'INSERT INTO tt_stakeholders (company_id, name, whatsapp_number) VALUES ($1,$2,$3) RETURNING id, name, whatsapp_number',
      [req.user.company_id, name.trim(), whatsapp_number || null]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Person already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/stakeholders/:id', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    const { name, whatsapp_number } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'UPDATE tt_stakeholders SET name=$1, whatsapp_number=$2 WHERE id=$3 AND company_id=$4 RETURNING id, name, whatsapp_number',
      [name.trim(), whatsapp_number || null, req.params.id, req.user.company_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Person already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/stakeholders/:id', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    await pool.query('DELETE FROM tt_stakeholders WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/weekly-scores', auth, checkTrial, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tt_weekly_scores WHERE company_id=$1 ORDER BY id ASC',
      [req.user.company_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/weekly-scores', auth, checkTrial, async (req, res) => {
  try {
    const { week_number, score_percent } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO tt_weekly_scores (company_id, week_number, score_percent) VALUES ($1,$2,$3)
       ON CONFLICT (company_id, week_number) DO UPDATE SET score_percent=$3 RETURNING *`,
      [req.user.company_id, week_number, score_percent]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// PAYMENT ROUTES
// ========================

// Create Razorpay order
app.post('/api/payment/create-order', auth, async (req, res) => {
  try {
    if (req.user.role === 'superadmin') return res.status(400).json({ error: 'Superadmin cannot purchase' });
    const { plan = 'monthly' } = req.body;
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: 'Invalid plan' });

    const order = await razorpay.orders.create({
      amount: planConfig.amount,
      currency: 'INR',
      receipt: `co_${req.user.company_id}_${Date.now()}`,
      notes: { company_id: req.user.company_id, plan },
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      plan_label: planConfig.label,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify payment after checkout
app.post('/api/payment/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan = 'monthly' } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const planConfig = PLANS[plan] || PLANS.monthly;
    const paid_until = new Date(Date.now() + planConfig.days * 24 * 60 * 60 * 1000);

    const { rows } = await pool.query(
      `UPDATE tt_companies SET is_paid=true, plan=$1, paid_until=$2, razorpay_payment_id=$3
       WHERE id=$4 RETURNING *`,
      [plan, paid_until, razorpay_payment_id, req.user.company_id]
    );

    res.json({ success: true, company: trialInfo(rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Razorpay webhook (for auto-renewal tracking)
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) return res.status(400).json({ error: 'Invalid signature' });

    const event = JSON.parse(body);
    if (event.event === 'payment.captured') {
      const notes = event.payload.payment.entity.notes;
      if (notes?.company_id && notes?.plan) {
        const planConfig = PLANS[notes.plan] || PLANS.monthly;
        const paid_until = new Date(Date.now() + planConfig.days * 24 * 60 * 60 * 1000);
        await pool.query(
          'UPDATE tt_companies SET is_paid=true, plan=$1, paid_until=$2 WHERE id=$3',
          [notes.plan, paid_until, notes.company_id]
        );
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// WHATSAPP NOTIFICATIONS
// ========================

// Supports both naming conventions for env vars
const WA_PHONE_ID = () => process.env.WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
const WA_TOKEN = () => process.env.WA_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

async function sendWhatsApp(toNumber, name, taskCount) {
  const phoneId = WA_PHONE_ID();
  const token = WA_TOKEN();
  if (!phoneId || !token) {
    console.error('WhatsApp: WA_PHONE_NUMBER_ID or WA_ACCESS_TOKEN not set');
    return false;
  }
  const number = String(toNumber).replace(/[\s\-\+]/g, '');
  if (number.length < 10) return false;

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: number,
        type: 'template',
        template: {
          name: 'task_reminder',
          language: { code: 'en' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: String(name) },
              { type: 'text', text: String(taskCount) },
            ],
          }],
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) { console.error('WA error:', data?.error?.message || JSON.stringify(data)); return false; }
    return true;
  } catch (err) {
    console.error('WhatsApp fetch error:', err.message);
    return false;
  }
}

async function runOverdueReminders(companyId) {
  if (!WA_PHONE_ID() || !WA_TOKEN()) return 0;

  const companiesResult = companyId
    ? await pool.query('SELECT id, name FROM tt_companies WHERE id=$1', [companyId])
    : await pool.query(`
        SELECT id, name FROM tt_companies WHERE
        (is_paid = true AND paid_until > NOW()) OR
        (trial_start_date > NOW() - INTERVAL '30 days')
      `);

  let totalSent = 0;
  for (const company of companiesResult.rows) {
    const { rows: stakeholders } = await pool.query(
      `SELECT name, whatsapp_number FROM tt_stakeholders
       WHERE company_id=$1 AND whatsapp_number IS NOT NULL AND whatsapp_number != ''`,
      [company.id]
    );

    for (const sh of stakeholders) {
      const { rows: overdueTasks } = await pool.query(`
        SELECT * FROM tt_tasks
        WHERE company_id = $1
          AND LOWER(stakeholder) = LOWER($2)
          AND completion_date IS NULL
          AND COALESCE(revised_date_5, revised_date_4, revised_date_3, revised_date_2, revised_date_1, initial_target_date) < CURRENT_DATE
        ORDER BY id ASC
      `, [company.id, sh.name]);

      if (overdueTasks.length === 0) continue;

      const ok = await sendWhatsApp(sh.whatsapp_number, sh.name, overdueTasks.length);
      if (ok) totalSent++;
    }
  }
  return totalSent;
}

// Notification status for current company
app.get('/api/notifications/status', auth, checkTrial, async (req, res) => {
  try {
    const configured = !!(WA_PHONE_ID() && WA_TOKEN());
    const { rows } = await pool.query(`
      SELECT s.name, COUNT(t.id) as task_count
      FROM tt_stakeholders s
      LEFT JOIN tt_tasks t ON t.company_id = s.company_id AND t.stakeholder = s.name
        AND t.completion_date IS NULL
        AND COALESCE(t.revised_date_5, t.revised_date_4, t.revised_date_3, t.revised_date_2, t.revised_date_1, t.initial_target_date) < CURRENT_DATE
      WHERE s.company_id = $1 AND s.whatsapp_number IS NOT NULL AND s.whatsapp_number != ''
      GROUP BY s.id, s.name
      HAVING COUNT(t.id) > 0
    `, [req.user.company_id]);
    res.json({ configured, overdueCount: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin manually sends overdue reminders
app.post('/api/notifications/send-overdue', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    if (!WA_PHONE_ID() || !WA_TOKEN())
      return res.status(400).json({ error: 'WhatsApp not configured. Add WA_PHONE_NUMBER_ID and WA_ACCESS_TOKEN in Render environment.' });
    const sent = await runOverdueReminders(req.user.company_id);
    res.json({ success: true, sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a test WhatsApp message
app.post('/api/notifications/test', auth, adminOnly, checkTrial, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });
    const { rows } = await pool.query('SELECT name FROM tt_companies WHERE id=$1', [req.user.company_id]);
    const companyName = rows[0]?.name || 'Your Company';
    const ok = await sendWhatsApp(phone, 'Test User', 3);
    if (ok) res.json({ success: true });
    else res.status(500).json({ error: 'Message failed. Check phone number and WhatsApp config.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// External cron endpoint — call from cron-job.org daily
app.post('/api/notifications/daily-cron', async (req, res) => {
  const secret = req.query.secret || req.body?.secret;
  if (!secret || secret !== process.env.CRON_SECRET)
    return res.status(401).json({ error: 'Unauthorized' });
  try {
    const sent = await runOverdueReminders(null);
    res.json({ success: true, sent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================
// SERVE FRONTEND (prod)
// ========================

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

const PORT = process.env.PORT || 5004;
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    // Daily 9:00 AM IST = 3:30 AM UTC
    cron.schedule('30 3 * * *', () => {
      console.log('Running daily overdue reminders...');
      runOverdueReminders(null).then(n => console.log(`Reminders sent: ${n}`)).catch(console.error);
    });
  })
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
