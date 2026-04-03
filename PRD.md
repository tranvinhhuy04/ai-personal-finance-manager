# Tài liệu Yêu cầu Sản phẩm (PRD) - Fintech

## 1. Tổng quan

### 1.1 Tên dự án

**Fintech **- Nền tảng quản lý tài chính cá nhân đa ví, tích hợp AI.

### 1.2 Tầm nhìn sản phẩm

Trở thành trợ lý tài chính cá nhân thông minh cho người dùng Việt Nam, giúp người dùng kiểm soát dòng tiền, hiểu thói quen chi tiêu và ra quyết định tài chính tự tin hơn.

### 1.3 Mục tiêu sản phẩm

Fintech được xây dựng để giải quyết các vấn đề cốt lõi sau:

- Dữ liệu tài chính phân tán trên nhiều nguồn (thẻ, ví điện tử, tiền mặt), khó tổng hợp.
- Người dùng thiếu góc nhìn rõ ràng về thu/chi theo thời gian và theo danh mục.
- Quy trình nhập liệu thủ công tốn thời gian, dễ sai sót.
- Thiếu công cụ hỗ trợ truy vấn tài chính nhanh bằng ngôn ngữ tự nhiên.

## 2. Chân dung người dùng (User Personas)

### Persona 1: Nhân viên văn phòng trẻ (Early Career Professional)

- **Độ tuổi:** 22-30
- **Hành vi tài chính:** Chi tiêu hàng ngày qua thẻ và ví điện tử; có một phần tiền mặt dự phòng.
- **Nhu cầu chính:**
  - Quản lý chi tiêu hàng tháng theo danh mục.
  - Nhập giao dịch nhanh, thao tác tối giản.
  - Nhận thông báo khi số dư ví biến động đáng chú ý.
- **Nỗi đau (Pain Points):**
  - Không biết chính xác mình đã chi bao nhiêu trong từng nhóm nhu cầu.
  - Dữ liệu rời rạc, khó đối soát cuối tháng.

### Persona 2: Freelancer/Người kinh doanh cá nhân

- **Độ tuổi:** 26-40
- **Hành vi tài chính:** Dòng tiền không đều, nhiều nguồn thu nhập và khoản chi công việc/cá nhân đan xen.
- **Nhu cầu chính:**
  - Theo dõi dòng tiền theo ngày/tuần/tháng.
  - Tách bạch ví cá nhân và ví phục vụ công việc.
  - Có trợ lý hỗ trợ phân tích nhanh tình hình tài chính.
- **Nỗi đau (Pain Points):**
  - Khó dự báo dòng tiền do biến động lớn.
  - Mất nhiều thời gian nhập hóa đơn, ghi chép giao dịch thủ công.

## 3. Phạm vi tính năng cốt lõi

### 3.1 Quản lý đa ví

Hệ thống phải hỗ trợ tạo và quản lý các loại ví:

- Thẻ (ngân hàng/tín dụng)
- MoMo
- ZaloPay
- Tiền mặt

Khả năng chính:

- Tạo/sửa/đóng băng ví.
- Gán nhãn ví theo mục đích (Cá nhân, Gia đình, Công việc).
- Theo dõi số dư và trạng thái ví theo thời gian thực.

### 3.2 Theo dõi dòng tiền (Thu/Chi)

- Tạo giao dịch thu/chi theo ví cụ thể.
- Phân loại giao dịch bằng danh mục (ăn uống, đi lại, học tập, giải trí, ...).
- Lọc lịch sử giao dịch theo thời gian, ví, danh mục, trạng thái.
- Tự động cập nhật số dư ví sau khi giao dịch được xác nhận thành công.

### 3.3 Trợ lý AI

- **OCR hóa đơn:** Trích xuất dữ liệu từ ảnh hóa đơn (ngày, tổng tiền, nhà cung cấp, gợi ý danh mục).
- **Hỏi đáp tài chính NLP:** Người dùng đặt câu hỏi tự nhiên, ví dụ: "Tháng này tôi chi cho ăn uống bao nhiêu?" và nhận câu trả lời theo dữ liệu cá nhân hóa.

## 4. Yêu cầu phi chức năng

### 4.1 Hiệu năng

- Thời gian phản hồi trung bình cho các API nghiệp vụ chính: **< 300ms**.
- P95 cho các truy vấn đọc dữ liệu không vượt ngưỡng **500ms**.

### 4.2 Bảo mật

- Xác thực và phân quyền bằng **JWT**.
- Hỗ trợ **2FA** cho đăng nhập và tác vụ nhạy cảm.
- Dữ liệu nhạy cảm được mã hóa khi truyền tải và lưu trữ.

### 4.3 Khả năng mở rộng

- Kiến trúc **Microservices** cho phép mở rộng độc lập theo từng dịch vụ.
- **Containerization (Docker)** đảm bảo tính nhất quán môi trường triển khai.
- Sẵn sàng tích hợp thêm dịch vụ mới (AI, Notification, Analytics) mà không ảnh hưởng luồng nghiệp vụ lõi.

## 5. User Stories cốt lõi

1. Là một người dùng mới, tôi muốn đăng ký tài khoản và bật 2FA để bảo vệ tài khoản tốt hơn.
2. Là một người dùng, tôi muốn tạo nhiều ví thuộc các loại khác nhau để theo dõi tiền trên mọi kênh thanh toán.
3. Là một người dùng, tôi muốn ghi nhận giao dịch thu/chi nhanh để số dư ví luôn cập nhật chính xác.
4. Là một người dùng, tôi muốn xem báo cáo thu/chi theo tháng để hiểu xu hướng tài chính của bản thân.
5. Là một người dùng, tôi muốn chụp hóa đơn và để AI tự động trích xuất dữ liệu giao dịch để giảm nhập liệu thủ công.
6. Là một người dùng, tôi muốn hỏi trợ lý AI bằng ngôn ngữ tự nhiên để tra cứu số liệu tài chính nhanh chóng.
7. Là một người dùng, tôi muốn nhận thông báo khi ví có biến động quan trọng để chủ động kiểm soát tài chính.

## 6. Tiêu chí thành công (KPIs)

1. **MAU Growth:** Tăng trưởng người dùng hoạt động hàng tháng tối thiểu 15% theo quý trong 2 quý đầu sau phát hành.
2. **Frictionless Transaction Logging:** Tối thiểu 85% giao dịch được ghi nhận thành công trong không quá 3 thao tác trên giao diện.
3. **OCR Accuracy:** Độ chính xác nhận diện trường số tiền và ngày hóa đơn đạt tối thiểu 92% trên tập dữ liệu mục tiêu.

## 7. Giả định và phạm vi ngoài (Assumptions & Out of Scope)

### 7.1 Giả định

- Người dùng có kết nối internet ổn định khi sử dụng nền tảng.
- Dữ liệu giao dịch được nhập chủ động bởi người dùng (giai đoạn đầu chưa tự đồng bộ ngân hàng sâu).

### 7.2 Ngoài phạm vi của phiên bản đầu

- Tư vấn đầu tư chứng khoán/chứng chỉ quỹ chuyên sâu.
- Tự động kết nối tất cả ngân hàng theo chuẩn Open Banking.
- Hỗ trợ đa quốc gia và đa múi giờ nâng cao.
