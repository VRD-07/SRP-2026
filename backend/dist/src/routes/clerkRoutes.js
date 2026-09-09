"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const clerkController_1 = require("../controllers/clerkController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = (0, express_1.Router)();
// Strictly Admin-only routes
router.use(auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN']));
router.get('/', clerkController_1.ClerkController.getAll);
router.post('/', clerkController_1.ClerkController.create);
router.patch('/:id/toggle', clerkController_1.ClerkController.toggleStatus);
router.post('/:id/reset-password', clerkController_1.ClerkController.resetPassword);
exports.default = router;
