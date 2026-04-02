import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
// Đảm bảo đường dẫn này trỏ đúng đến file chứa CategoryModel của bạn
import { CategoryModel } from './src/models/category.model'; 

dotenv.config();

const defaultCategories = [
  // THU NHẬP (INCOME)
  { name: "Lương", type: "income" },
  { name: "Làm thêm", type: "income" },
  { name: "Thưởng", type: "income" },
  { name: "Đầu tư", type: "income" },
  { name: "Thu nhập khác", type: "income" },

  // CHI TIÊU (EXPENSE)
  { name: "Ăn uống", type: "expense" },
  { name: "Nhà ở", type: "expense" },
  { name: "Đi lại", type: "expense" },
  { name: "Mua sắm", type: "expense" },
  { name: "Giải trí", type: "expense" }
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI_TRANSACTION;
    if (!mongoUri) {
      throw new Error('Chưa cấu hình biến môi trường MONGO_URI trong file .env');
    }

    console.log('⏳ Đang kết nối tới MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối MongoDB thành công!');

    // 1. Xóa các danh mục hệ thống cũ để làm sạch dữ liệu trước khi nạp mới
    console.log('🗑️ Đang dọn dẹp các danh mục hệ thống cũ...');
    await CategoryModel.deleteMany({ isSystem: true });
    
    // 2. Chuyển đổi dữ liệu mẫu sang đúng định dạng ICategory
    const seedData = defaultCategories.map(cat => ({
      userId: 'SYSTEM', // Gán giá trị SYSTEM vì trường này là bắt buộc (required: true) trong model
      name: cat.name,
      categoryType: cat.type === 'income' ? 'INCOME' : 'EXPENSE',
      parentId: null,
      isSystem: true,
      status: 1
    }));

    // 3. Thực hiện nạp dữ liệu
    console.log('🌱 Đang nạp danh mục mặc định...');
    const result = await CategoryModel.insertMany(seedData);
    
    console.log(`🚀 Thành công! Đã thêm ${result.length} danh mục vào database.`);
  } catch (error) {
    console.error('❌ Lỗi trong quá trình seed dữ liệu:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã đóng kết nối database.');
    process.exit(0);
  }
};

seedDatabase();