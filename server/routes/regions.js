const express = require('express');
const { COUNTRIES, FORUM_SUBCATEGORIES } = require('../data/regions');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ countries: COUNTRIES, subcategories: FORUM_SUBCATEGORIES });
});

module.exports = router;