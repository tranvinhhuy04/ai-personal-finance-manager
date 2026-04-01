const express = require('express');
const requireAuth = require('../../middlewares/requireAuth').default;

const router = express.Router();

router.use(requireAuth);
router.get('/', function (_req, res) {
  return res.status(200).json([]);
});
router.post('/', function (_req, res) {
  return res.status(201).json({ message: 'Create transaction endpoint' });
});

module.exports = router;
