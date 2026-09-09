"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const PORT = env_1.ENV.PORT || 5000;
app_1.default.listen(PORT, () => {
    console.log(`🚀 College Fees ERP Backend running on http://localhost:${PORT}`);
    console.log(`⚡ Environment: ${env_1.ENV.NODE_ENV}`);
});
exports.default = app_1.default;
