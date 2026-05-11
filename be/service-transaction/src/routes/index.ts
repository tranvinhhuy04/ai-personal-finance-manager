import { Router } from 'express';
import requireAuth from '../middlewares/requireAuth';
import { createTransaction, listTransactions } from '../features/transaction/transaction.controller';
import { createCategory, deleteCategory, listCategories, updateCategory } from '../features/category/category.controller';
import {
  confirmInvoice,
  deleteInvoice,
  extractInvoice,
  listInvoices,
  updateInvoice,
  uploadInvoice,
} from '../features/invoice/invoice.controller';
import {
  createRecurringRule,
  deleteRecurringRule,
  listRecurringRules,
  updateRecurringRule,
} from '../features/recurring/recurring-rule.controller';
import { createSaving, deleteSaving, depositSaving, listSavings, settleSaving } from '../features/saving/saving.controller';
import { uploadInvoiceImage } from '../middlewares/upload.middleware';

const router = Router();

router.use(requireAuth);

router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/transactions/categories', listCategories);
router.post('/transactions/categories', createCategory);
router.put('/transactions/categories/:id', updateCategory);
router.delete('/transactions/categories/:id', deleteCategory);

router.get('/transactions/recurring-rules', listRecurringRules);
router.post('/transactions/recurring-rules', createRecurringRule);
router.put('/transactions/recurring-rules/:id', updateRecurringRule);
router.delete('/transactions/recurring-rules/:id', deleteRecurringRule);

router.post('/transactions', createTransaction);
router.get('/transactions', listTransactions);

router.get('/savings', listSavings);
router.post('/savings', createSaving);
router.post('/savings/:id/deposit', depositSaving);
router.post('/savings/:id/settle', settleSaving);
router.delete('/savings/:id', deleteSaving);

router.post('/invoices/extract', uploadInvoiceImage, extractInvoice);
router.post('/invoices/upload',  uploadInvoiceImage, uploadInvoice);
router.get('/invoices', listInvoices);
router.put('/invoices/:id', updateInvoice);
router.delete('/invoices/:id', deleteInvoice);
router.post('/invoices/:id/confirm', confirmInvoice);

export default router;
