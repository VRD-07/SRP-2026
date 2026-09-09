"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportController_1 = require("../controllers/reportController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = (0, express_1.Router)();
// Overview and trends - Admin and Clerk
router.get('/overview', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), reportController_1.ReportController.getOverviewReport);
// Outstanding dues list - Admin and Clerk
router.get('/dues', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), reportController_1.ReportController.getPendingDues);
// CSV Export - Admin (and Clerk if needed)
router.get('/export-csv', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), reportController_1.ReportController.exportCsv);
exports.default = router;
