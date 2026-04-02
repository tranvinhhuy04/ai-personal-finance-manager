"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboard = void 0;
const catchAsync_1 = require("../middlewares/catchAsync");
const analytics_service_1 = require("../services/analytics.service");
exports.getDashboard = (0, catchAsync_1.catchAsync)(async (req, res) => {
    const userId = req.userId ?? req.user?.id;
    const result = await analytics_service_1.analyticsService.getDashboard({
        userId,
        month: typeof req.query.month === 'string' ? req.query.month : undefined,
        walletId: typeof req.query.wallet_id === 'string'
            ? req.query.wallet_id
            : typeof req.query.walletId === 'string'
                ? req.query.walletId
                : undefined,
    });
    return res.status(200).json(result);
});
