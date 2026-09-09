"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const studentController_1 = require("../controllers/studentController");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const router = (0, express_1.Router)();
// Student self-service route
router.get('/me', auth_1.authenticateToken, (0, rbac_1.requireRole)(['STUDENT']), studentController_1.StudentController.getMyProfile);
// Admin & Clerk student access
router.get('/', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), studentController_1.StudentController.getAll);
router.get('/:id', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN', 'CLERK']), studentController_1.StudentController.getById);
// Admin-only management
router.post('/', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN']), studentController_1.StudentController.create);
router.put('/:id', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN']), studentController_1.StudentController.update);
router.post('/:id/assignments', auth_1.authenticateToken, (0, rbac_1.requireRole)(['ADMIN']), studentController_1.StudentController.assignFeeStructures);
exports.default = router;
