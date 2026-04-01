"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const catchAsync_1 = require("../middlewares/catchAsync");
const analytics_service_1 = require("../services/analytics.service");
exports.getDashboard = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId || req.query.user_id;
    const result = await analytics_service_1.analyticsService.getDashboard(userId);
    return res.status(200).json(result);
});
