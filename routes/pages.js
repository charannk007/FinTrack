const express = require('express');
const router = express.Router();

// Home
router.get('/', (req, res) => {
  res.render('home');
});

// About
router.get('/about', (req, res) => {
  res.render('about');
});

// Privacy
router.get('/privacy', (req, res) => {
  res.render('privacy');
});

// Signup Page
router.get('/signup', (req, res) => {
  res.render('signup');
});




module.exports = router;
