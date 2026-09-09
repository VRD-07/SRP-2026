"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionController_1 = require("../controllers/transactionController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = (0, express_1.Router)();
// 1. Download PDF receipt - Accessible by Admin, Clerk, and Student (ownership checked in controller)
router.get('/:id/receipt', auth_1.authenticateToken, transactionController_1.TransactionController.downloadReceiptPdf);
// 2. Query transactions - Admin, Clerk, and Student
router.get('/', auth_1.authenticateToken, transactionController_1.TransactionController.getAll);
router.get('/:id', auth_1.authenticateToken, transactionController_1.TransactionController.getById);
// 3. Record payment - Strictly Admin and Clerk only
router.post('/', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), transactionController_1.TransactionController.recordPayment);
// 4. Reverse transaction - Strictly Admin and Clerk only (immutable audit compensating entry)
router.post('/:id/reverse', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), transactionController_1.TransactionController.reverse);
// NOTE: Strictly NO PUT, PATCH, or DELETE routes exist for the Transaction resource.
// Transactions are immutable at the API layer.
exports.default = router;
