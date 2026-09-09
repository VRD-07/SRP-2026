"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const feeStructureController_1 = require("../controllers/feeStructureController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = (0, express_1.Router)();
// Read operations: Admin and Clerk can view fee structures
router.get('/', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), feeStructureController_1.FeeStructureController.getAll);
router.get('/:id', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), feeStructureController_1.FeeStructureController.getById);
// Write operations: Strictly Admin only
router.post('/', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN']), feeStructureController_1.FeeStructureController.create);
router.put('/:id', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN']), feeStructureController_1.FeeStructureController.update);
router.delete('/:id', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN']), feeStructureController_1.FeeStructureController.delete);
exports.default = router;
