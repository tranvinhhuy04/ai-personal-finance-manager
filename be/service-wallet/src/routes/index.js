const express = require('express');
const requireAuth = require('../../middlewares/requireAuth').default;

const router = express.Router();

// Placeholder handlers for JS entrypoint parity.
router.use(requireAuth);
router.get('/', function (_req, res) {
  return res.status(200).json([]);
});
router.post('/', function (_req, res) {
  return res.status(201).json({ message: 'Create wallet endpoint' });
});

module.exports = router;
