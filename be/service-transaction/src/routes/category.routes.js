const express = require('express');
const requireAuth = require('../../middlewares/requireAuth').default;
const categoryController = require('../controllers/category.controller');

const router = express.Router();

router.use(requireAuth);
router.post('/', categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
