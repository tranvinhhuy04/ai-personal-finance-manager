const catchAsync = require('../middlewares/catchAsync');
const categoryService = require('../services/category.service');

const createCategory = catchAsync(async (req, res) => {
  const userId = req.userId;
  const result = await categoryService.createCategory(req.body || {}, userId);
  return res.status(201).json(result);
});

const getCategories = catchAsync(async (req, res) => {
  const userId = req.userId;
  const result = await categoryService.getCategories(req.query || {}, userId);
  return res.status(200).json(result);
});

const updateCategory = catchAsync(async (req, res) => {
  const userId = req.userId;
  const result = await categoryService.updateCategory(req.params.id, req.body || {}, userId);
  return res.status(200).json(result);
});

const deleteCategory = catchAsync(async (req, res) => {
  const userId = req.userId;
  const result = await categoryService.deleteCategory(req.params.id, userId);
  return res.status(200).json(result);
});

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
