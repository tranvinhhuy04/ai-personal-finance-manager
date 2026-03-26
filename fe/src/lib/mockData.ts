export const mockTransactions = [
  { id: 'TXN-001', date: '2023-10-25T10:30:00', description: 'Thanh toán hóa đơn điện', amount: -1500000, status: 'Thành công', category: 'Tiện ích' },
  { id: 'TXN-002', date: '2023-10-24T15:45:00', description: 'Nhận lương tháng 10', amount: 25000000, status: 'Thành công', category: 'Thu nhập' },
  { id: 'TXN-003', date: '2023-10-22T09:15:00', description: 'Mua sắm siêu thị', amount: -850000, status: 'Thành công', category: 'Chi tiêu' },
  { id: 'TXN-004', date: '2023-10-20T18:20:00', description: 'Chuyển tiền cho bạn', amount: -500000, status: 'Thất bại', category: 'Chuyển khoản' },
  { id: 'TXN-005', date: '2023-10-18T14:00:00', description: 'Hoàn tiền mua sắm', amount: 120000, status: 'Thành công', category: 'Thu nhập' },
  { id: 'TXN-006', date: '2023-10-15T08:30:00', description: 'Thanh toán Netflix', amount: -260000, status: 'Đang xử lý', category: 'Giải trí' },
  { id: 'TXN-007', date: '2023-10-12T19:00:00', description: 'Ăn tối nhà hàng', amount: -1200000, status: 'Thành công', category: 'Ăn uống' },
  { id: 'TXN-008', date: '2023-10-10T10:00:00', description: 'Lãi tiết kiệm', amount: 450000, status: 'Thành công', category: 'Đầu tư' },
];

export const mockAnalyticsPie = [
  { name: 'Ăn uống', value: 4500000, color: '#10b981' },
  { name: 'Di chuyển', value: 1200000, color: '#3b82f6' },
  { name: 'Mua sắm', value: 3500000, color: '#8b5cf6' },
  { name: 'Hóa đơn', value: 2800000, color: '#f59e0b' },
  { name: 'Khác', value: 1000000, color: '#64748b' },
];

export const mockAnalyticsLine = [
  { month: 'Thg 5', asset: 120000000 },
  { month: 'Thg 6', asset: 125000000 },
  { month: 'Thg 7', asset: 123000000 },
  { month: 'Thg 8', asset: 130000000 },
  { month: 'Thg 9', asset: 135000000 },
  { month: 'Thg 10', asset: 142000000 },
];

export const mockSubscriptions = [
  { id: 'SUB-1', name: 'Netflix Premium', amount: 260000, nextBilling: '2023-11-15', status: 'Đang hoạt động', icon: 'Film', category: 'Giải trí' },
  { id: 'SUB-2', name: 'Spotify Premium', amount: 59000, nextBilling: '2023-11-18', status: 'Đang hoạt động', icon: 'Music', category: 'Giải trí' },
  { id: 'SUB-3', name: 'Tiền điện', amount: 1500000, nextBilling: '2023-11-05', status: 'Chờ thanh toán', icon: 'Zap', category: 'Tiện ích' },
  { id: 'SUB-4', name: 'Tiền nước', amount: 200000, nextBilling: '2023-11-05', status: 'Chờ thanh toán', icon: 'Droplet', category: 'Tiện ích' },
  { id: 'SUB-5', name: 'Internet VNPT', amount: 250000, nextBilling: '2023-11-10', status: 'Đang hoạt động', icon: 'Wifi', category: 'Tiện ích' },
];
