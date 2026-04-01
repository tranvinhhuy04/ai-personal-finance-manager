"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = __importDefault(require("../middlewares/requireAuth"));
const notification_controller_1 = require("../controllers/notification.controller");
const router = (0, express_1.Router)();
router.use(requireAuth_1.default);
router.get('/', notification_controller_1.listNotifications);
router.put('/:id/read', notification_controller_1.markNotificationRead);
router.get('/stream', notification_controller_1.subscribeNotifications);
exports.default = router;
