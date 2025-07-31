const express = require('express');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./config/db');
const pageRoutes = require('./routes/pages'); // <<--- Imported your page routes

const app = express();
const PORT = 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(fileUpload());

// Session
app.use(session({
  secret: 'fintrack_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 60 * 60 * 1000
  }
}));

// Flash message helper
app.use((req, res, next) => {
  res.locals.message = req.session.message || null;
  delete req.session.message;
  next();
});

// No cache after logout
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

// Mount page routes (home, about, privacy)
app.use('/', pageRoutes); // <<--- This handles '/', '/about', '/privacy'

// Register
app.get('/register', (req, res) => res.render('register'));
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  pool.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hash],
    (err) => {
      if (err) {
        console.error(err);
        return res.send('Registration failed.');
      }
      res.redirect('/login');
    }
  );
});

// Login
app.get('/login', (req, res) => res.render('login'));
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  pool.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) return res.send('Invalid email or password.');

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send('Invalid email or password.');

    req.session.regenerate(() => {
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email
      };
      res.redirect('/dashboard');
    });
  });
});

// Dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  pool.query('SELECT profile_picture FROM users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).send('Database error.');

    const hasPhoto = results.length > 0 && results[0].profile_picture !== null;

    res.render('dashboard', {
      user: req.session.user,
      hasPhoto
    });
  });
});

// Profile View
app.get('/profile', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  pool.query('SELECT name, email, profile_picture FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0) return res.status(500).send('User not found');

    const user = results[0];
    req.session.user.name = user.name;
    res.render('profile', {
      user: req.session.user,
      hasPhoto: !!user.profile_picture
    });
  });
});

// Profile Update
app.post('/profile', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;
  const { name, newPassword } = req.body;
  const photo = req.files?.profile_picture;
  const updates = [];
  const values = [];

  updates.push('name = ?');
  values.push(name);
  req.session.user.name = name;

  if (newPassword && newPassword.trim() !== '') {
    const hashed = await bcrypt.hash(newPassword, 10);
    updates.push('password = ?');
    values.push(hashed);
  }

  if (photo) {
    updates.push('profile_picture = ?');
    values.push(photo.data);
  }

  values.push(userId);

  const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
  pool.query(query, values, (err) => {
    if (err) {
      console.error('Update error:', err);
      return res.send('Update failed.');
    }

    req.session.message = 'Profile updated successfully!';
    res.redirect('/profile');
  });
});

// Remove Profile Picture
app.post('/profile/remove-photo', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;

  pool.query('UPDATE users SET profile_picture = NULL WHERE id = ?', [userId], (err) => {
    if (err) {
      console.error('Error removing photo:', err);
      return res.status(500).send('Error removing photo.');
    }

    req.session.message = 'Profile photo removed.';
    res.redirect('/profile');
  });
});

// Serve profile picture
app.get('/profile-picture/:id', (req, res) => {
  const userId = req.params.id;

  pool.query('SELECT profile_picture FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || results.length === 0 || !results[0].profile_picture) {
      return res.redirect('https://via.placeholder.com/35?text=U');
    }

    res.set('Content-Type', 'image/png');
    res.send(results[0].profile_picture);
  });
});

// Income GET
// Income GET - Replace your existing income route with this
app.get('/income', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  const { field, query, dateFrom, dateTo } = req.query;

  let sql = 'SELECT * FROM income WHERE user_id = ?';
  const values = [userId];

  if (field === 'amount' && query) {
    sql += ' AND amount = ?';
    values.push(query);
  } else if (field === 'date') {
    if (dateFrom && dateTo) {
      sql += ' AND date BETWEEN ? AND ?';
      values.push(dateFrom, dateTo);
    } else if (dateFrom) {
      sql += ' AND date >= ?';
      values.push(dateFrom);
    } else if (dateTo) {
      sql += ' AND date <= ?';
      values.push(dateTo);
    }
  }

  sql += ' ORDER BY date DESC';

  pool.query(sql, values, (err, results) => {
    if (err) {
      console.error('Error fetching income:', err);
      return res.status(500).send('Server Error');
    }

    // Check for profile picture - THIS WAS MISSING
    pool.query('SELECT profile_picture FROM users WHERE id = ?', [userId], (err2, userResults) => {
      if (err2) {
        console.error('Error fetching user profile:', err2);
        return res.status(500).send('Server Error');
      }

      const hasPhoto = userResults.length > 0 && userResults[0].profile_picture !== null;

      res.render('income', {
        incomeRecords: results,
        field,
        query,
        dateFrom,
        dateTo,
        message: results.length === 0 ? 'No data found' : null,
        user: req.session.user,
        hasPhoto  // ADD THIS
      });
    });
  });
});

// Income POST
app.post('/income', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  const { amount, source, category, date, notes } = req.body;

  const sql = `INSERT INTO income (user_id, amount, source, category, date, notes) 
               VALUES (?, ?, ?, ?, ?, ?)`;

  pool.query(sql, [userId, amount, source, category, date, notes], (err) => {
    if (err) {
      console.error('Insert income error:', err);
      return res.status(500).send('Server error');
    }
    res.redirect('/income');
  });
});

// Delete income
app.post('/income/delete/:id', isAuthenticated, (req, res) => {
  const id = req.params.id;

  pool.query('DELETE FROM income WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error deleting income:', err);
      return res.status(500).send('Database error');
    }
    req.session.message = 'Income entry deleted successfully!';
    res.redirect('/income');
  });
});

app.get('/expense', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  const { from, to } = req.query;

  const userSql = 'SELECT profile_picture FROM users WHERE id = ?';
  pool.query(userSql, [userId], (err, userResults) => {
    if (err) {
      console.error('Error fetching user photo:', err);
      return res.status(500).send('Server Error');
    }

    const user = {
      ...req.session.user,
      profile_picture: userResults.length && userResults[0].profile_picture
    };
    const hasPhoto = !!user.profile_picture;

    let sql = 'SELECT * FROM expense WHERE user_id = ?';
    const params = [userId];

    if (from && to) {
      sql += ' AND date BETWEEN ? AND ?';
      params.push(from, to);
    }

    sql += ' ORDER BY date DESC';

    pool.query(sql, params, (err, expenses) => {
      if (err) {
        console.error('Error fetching expenses:', err);
        return res.status(500).send('Server Error');
      }

      const totalExpense = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      res.render('expense', {
        expenses,
        user,
        hasPhoto,
        totalExpense,
        fromDate: from,
        toDate: to
      });
    });
  });
});











// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// 404
app.use((req, res) => res.status(404).send('Page not found'));

// Server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
