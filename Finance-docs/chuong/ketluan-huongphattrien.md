# KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## 1. Kết luận

Đề tài đã nghiên cứu, thiết kế và hiện thực hóa hệ thống quản lý tài chính cá nhân **FinTrack AI** — một ứng dụng đa nền tảng (web và di động) được xây dựng trên nền tảng kiến trúc **microservices**, tích hợp **trí tuệ nhân tạo** theo hướng thực dụng, phục vụ người dùng Việt Nam.

Về mặt kỹ thuật, hệ thống được tổ chức thành các dịch vụ độc lập — **api-gateway**, **identity-service**, **transaction-service**, **wallet-service**, **analytics-service**, **notification-service**, **cloud-service** và **ai-service** — giao tiếp qua REST đồng bộ và hàng đợi thông điệp **RabbitMQ** bất đồng bộ. Lớp dữ liệu sử dụng **MongoDB Atlas** theo mô hình *database-per-service* kết hợp **Redis** cho bộ nhớ đệm phân tán và giới hạn tốc độ. Giao diện web được hiện thực bằng **React/TypeScript** với **Vite**, giao diện di động bằng **React Native/Expo**, đảm bảo trải nghiệm nhất quán trên cả hai nền tảng.

Về năng lực AI, hệ thống tích hợp mô hình ngôn ngữ lớn **Gemini** của Google vào ba luồng nghiệp vụ cốt lõi: (1) nhận dạng ký tự quang học (OCR) trích xuất thông tin hóa đơn, (2) phân tích văn bản tự nhiên để tự động phân loại giao dịch từ đoạn hội thoại, và (3) tư vấn tài chính cá nhân hóa thông qua cơ chế **Agentic RAG** với khả năng tra cứu thị trường thời gian thực.

Quá trình kiểm thử hệ thống gồm **233 test case** bao phủ toàn bộ 15 mô-đun nghiệp vụ, áp dụng kết hợp giữa kiểm thử tự động (**Playwright**) và kiểm thử tích hợp API (PowerShell regression batch). Kết quả đạt **232/233 test case** (≈99,6%), trong đó 14 lỗi phát sinh trong quá trình kiểm thử đã được phát hiện và khắc phục hoàn toàn — bao gồm các vấn đề về xác thực đầu vào, kiểm soát quyền truy cập dữ liệu, xử lý tải trọng vượt giới hạn và phòng chống tấn công brute-force.

Nhìn chung, đề tài đã đạt được các mục tiêu đề ra: xây dựng một hệ thống có kiến trúc rõ ràng, có khả năng mở rộng, tích hợp AI có chọn lọc ở các điểm tạo giá trị trực tiếp, và có bằng chứng kiểm thử end-to-end đầy đủ.

---

## 2. Hướng Phát Triển

Mặc dù hệ thống đã đáp ứng phạm vi đề tài, một số hướng phát triển tiếp theo có thể nâng cao giá trị thực tiễn:

**Về tích hợp dữ liệu tài chính:** Kết nối với **Open Banking API** (Napas, các ngân hàng thương mại) để đồng bộ giao dịch tự động, loại bỏ hoàn toàn bước nhập liệu thủ công. Điều này đòi hỏi cơ chế xác thực OAuth 2.0 với bên thứ ba và tuân thủ quy định của Ngân hàng Nhà nước.

**Về năng lực AI:** Bổ sung mô-đun **dự báo dòng tiền** (cashflow forecasting) dựa trên chuỗi thời gian lịch sử, cho phép người dùng nhận cảnh báo sớm về nguy cơ thâm hụt ngân sách. Đồng thời, việc fine-tuning hoặc RAG chuyên biệt cho **ngữ cảnh tài chính Việt Nam** (thuật ngữ, đơn vị tiền tệ, các loại phí đặc thù) sẽ nâng cao độ chính xác của tư vấn AI.

**Về hiệu năng và độ tin cậy:** Triển khai **Kubernetes** thay thế Docker Compose để tự động co giãn tài nguyên (auto-scaling) theo tải thực tế. Bổ sung **distributed tracing** (OpenTelemetry) và **centralized logging** (ELK Stack) để giám sát toàn diện hệ thống microservices trong môi trường production.

**Về bảo mật và tuân thủ:** Hoàn thiện luồng **xác thực hai yếu tố (2FA)** đầy đủ, triển khai mã hóa end-to-end cho dữ liệu nhạy cảm, và xây dựng chính sách kiểm soát truy cập dựa trên vai trò (RBAC) cho trường hợp mở rộng sang quản lý tài chính hộ gia đình hoặc doanh nghiệp nhỏ.

Những hướng phát triển trên đặt nền tảng để FinTrack AI tiến từ sản phẩm học thuật sang một giải pháp thương mại khả thi trong lĩnh vực **Personal Finance Management** tại thị trường Việt Nam.
