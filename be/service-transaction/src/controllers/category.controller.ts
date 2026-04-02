import { Request, Response } from 'express';
import { catchAsync } from '../middlewares/catchAsync';
import { categoryService } from '../services/category.service';

export const listCategories = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await categoryService.listCategories(userId, req.query ?? {});
  return res.status(200).json(result);
});

export const createCategory = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await categoryService.createCategory(userId, req.body ?? {});
  return res.status(201).json(result);
});

export const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await categoryService.updateCategory(req.params.id, userId, req.body ?? {});
  return res.status(200).json(result);
});

export const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const userId = String((req as any).userId ?? '');
  const result = await categoryService.deleteCategory(req.params.id, userId);
  return res.status(200).json(result);
});
