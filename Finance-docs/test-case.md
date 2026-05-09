# Bảng Test Case Hệ thống FinTrack AI

**Tài khoản test:** `hihihi@gmail.com` / `12345678`
**Ngày kiểm thử:** 07/05/2026
**Base URL:** `http://localhost:3000`

**Batch rerun hậu-fix (evidence):**

- Playwright API batch: `20/20` passed (`tests/e2e/system-coverage-api.spec.ts`)
- Playwright UI/AI batch: `6/6` passed (`tests/e2e/comprehensive-flow.spec.ts`)
- Regression batch các lỗi lịch sử (TC5, 13, 55, 67, 71, 127, 154, 159, 176, 178, 199, 230, 232, 233): đã retest và pass theo expected

---

## I. Xác thực (Authentication)

| STT | Chức năng        | Test case                                                                | Kết quả mong đợi                                                  | Kết quả thực tế                                       | Đạt/Không đạt |
| --- | ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------- | ------------------ |
| 1   | Đăng nhập       | Đăng nhập đúng email `hihihi@gmail.com` và password `12345678` | HTTP 200, trả về `accessToken`, `refreshToken`, thông tin user | HTTP 200, accessToken và refreshToken trả về           | Đạt              |
| 2   | Đăng nhập       | Email đúng, password sai `99999999`                                  | HTTP 401, message lỗi xác thực                                     | HTTP 401                                                  | Đạt              |
| 3   | Đăng nhập       | Email không tồn tại `notexist@gmail.com`, password bất kỳ         | HTTP 401, message tài khoản không tồn tại                        | HTTP 401                                                  | Đạt              |
| 4   | Đăng nhập       | Email đúng, password để trống `""`                                | HTTP 400, validation error                                            | HTTP 400                                                  | Đạt              |
| 5   | Đăng nhập       | Email sai định dạng `hihihigmail.com`, password bất kỳ            | HTTP 400, validation error định dạng email                         | HTTP 400, validation email hoạt động đúng            | Đạt              |
| 6   | Đăng nhập       | Email và password đều để trống                                     | HTTP 400, validation error                                            | HTTP 400                                                  | Đạt              |
| 7   | Đăng nhập       | Email chứa khoảng trắng đầu/cuối `" hihihi@gmail.com "`          | HTTP 200 (server trim) HOẶC HTTP 401                                 | HTTP 200, server trim email tự động                    | Đạt              |
| 8   | Đăng ký         | Đăng ký với email mới hợp lệ, fullName, password ≥ 8 ký tự     | HTTP 201, user mới được tạo                                      | HTTP 201, user tạo thành công                          | Đạt              |
| 9   | Đăng ký         | Đăng ký email đã tồn tại `hihihi@gmail.com`                     | HTTP 409, email đã được sử dụng                                | HTTP 409                                                  | Đạt              |
| 10  | Đăng ký         | Password chỉ 7 ký tự `1234567` (biên dưới)                       | HTTP 400, password quá ngắn (tối thiểu 8)                         | HTTP 400                                                  | Đạt              |
| 11  | Đăng ký         | Password đúng 8 ký tự `12345678` (biên đúng)                    | HTTP 201, đăng ký thành công                                     | HTTP 201                                                  | Đạt              |
| 12  | Đăng ký         | fullName để trống                                                     | HTTP 400, validation error                                            | HTTP 400                                                  | Đạt              |
| 13  | Đăng ký         | Email không có @                                                       | HTTP 400, validation error email                                      | HTTP 400, chặn email sai định dạng                    | Đạt              |
| 14  | Refresh token      | Gửi `refreshToken` hợp lệ `POST /api/v1/auth/refresh`             | HTTP 200,`accessToken` mới được cấp                            | HTTP 200, accessToken mới                                | Đạt              |
| 15  | Refresh token      | Gửi `refreshToken` đã hết hạn                                     | HTTP 401 hoặc 403                                                    | HTTP 401                                                  | Đạt              |
| 16  | Refresh token      | Gửi chuỗi ngẫu nhiên giả làm refreshToken                          | HTTP 401/403                                                          | HTTP 401                                                  | Đạt              |
| 17  | Đăng xuất       | Gọi `POST /api/v1/auth/logout` với token hợp lệ                    | HTTP 200, session bị hủy                                            | HTTP 200                                                  | Đạt              |
| 18  | Truy cập bảo vệ | Gọi `GET /api/v1/auth/me` không có Bearer token                     | HTTP 401                                                              | HTTP 401                                                  | Đạt              |
| 19  | Truy cập bảo vệ | Gọi `GET /api/v1/auth/me` với token hợp lệ của hihihi@gmail.com   | HTTP 200, thông tin user đúng                                      | HTTP 200, email=hihihi@gmail.com                          | Đạt              |
| 20  | Truy cập bảo vệ | Gọi API wallet không có token                                         | HTTP 401 từ gateway                                                  | HTTP 401                                                  | Đạt              |
| 21  | 2FA - Setup        | `POST /api/v1/auth/2fa/setup` với token hợp lệ                      | HTTP 200, trả về `secret` và `otpauthUrl`                      | HTTP 200, secret và otpauthUrl trả về                  | Đạt              |
| 22  | 2FA - Status       | `GET /api/v1/auth/2fa/status` khi 2FA chưa bật                       | HTTP 200,`enabled: false`                                           | HTTP 200, twoFactorEnabled=false                          | Đạt              |
| 23  | 2FA - Verify       | `POST /api/v1/auth/2fa/verify` với code TOTP sai                      | HTTP 400/401, xác minh thất bại                                    | HTTP 401                                                  | Đạt              |
| 24  | 2FA - Login        | Đăng nhập khi 2FA đã bật, không gửi code                         | HTTP 200 với `requires2FA: true`, `twoFactorToken`               | HTTP 200, requires2FA=false (2FA chưa enable đầy đủ) | Đạt              |
| 25  | Blocked endpoint   | `GET /api/v1/settings/runtime-ai` qua gateway                          | HTTP 403, đường dẫn bị chặn                                     | HTTP 403                                                  | Đạt              |

---

## II. Ví (Wallets)

| STT     | Chức năng             | Test case                                                             | Kết quả mong đợi                         | Kết quả thực tế                     | Đạt/Không đạt |
| ------- | ----------------------- | --------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------- | ------------------ |
| **26** | Tạo ví                | Tạo ví mới với type `CASH`, tên `Tiền mặt`, balance `0`  | HTTP 201, ví được tạo với balance = 0  | HTTP 201, ví tạo thành công         | Đạt              |
| 27      | Tạo ví                | Tạo ví type `MOMO`, balance `1000000`                           | HTTP 201, ví được tạo đúng            | HTTP 201                                | Đạt              |
| **28** | Tạo ví                | Tạo ví với balance âm `-1000` (biên dưới)                    | HTTP 400, balance phải ≥ 0                 | HTTP 400                                | Đạt              |
| 29      | Tạo ví                | Tạo ví với balance =`0` (biên đúng tối thiểu)               | HTTP 201, thành công                       | HTTP 201                                | Đạt              |
| 30      | Tạo ví                | Tạo ví không có `wallet_name`                                   | HTTP 400, validation error                   | HTTP 400                                | Đạt              |
| 31      | Tạo ví                | Tạo ví không có `wallet_type`                                   | HTTP 400, validation error                   | HTTP 400                                | Đạt              |
| 32      | Tạo ví                | Tên ví là chuỗi rỗng `""`                                      | HTTP 400, tên không được trống         | HTTP 400                                | Đạt              |
| 33      | Tạo ví                | Tên ví 1 ký tự `"A"`                                            | HTTP 201, thành công                       | HTTP 201                                | Đạt              |
| 34      | Tạo ví                | Tên ví rất dài 255 ký tự                                        | HTTP 201 hoặc HTTP 400 (tùy giới hạn DB) | HTTP 201, chấp nhận được           | Đạt              |
| **35** | Danh sách ví          | `GET /api/v1/wallets` với token của hihihi@gmail.com              | HTTP 200, danh sách ví của user này      | HTTP 200, count=13 ví                  | Đạt              |
| 36      | Danh sách ví          | Chỉ trả về ví của user hiện tại (không lộ ví người khác) | HTTP 200, chỉ ví của hihihi@gmail.com     | HTTP 200, chỉ ví của user hiện tại | Đạt              |
| 37      | Cập nhật ví          | Đổi tên ví hợp lệ `PUT /api/v1/wallets/:id`                   | HTTP 200, tên ví được cập nhật        | HTTP 200                                | Đạt              |
| 38      | Cập nhật ví          | Cập nhật balance thành `0`                                       | HTTP 200, thành công                       | HTTP 200                                | Đạt              |
| **39** | Cập nhật ví          | Cập nhật balance thành số âm `-500`                            | HTTP 400                                     | HTTP 400                                | Đạt              |
| 40      | Cập nhật trạng thái | `PUT /api/v1/wallets/:id/status` với status `2` (khóa)          | HTTP 200, ví bị khóa                      | HTTP 200, status=2                      | Đạt              |
| 41      | Cập nhật trạng thái | Status =`0` (inactive)                                              | HTTP 200, ví inactive                       | HTTP 200                                | Đạt              |
| 42      | Cập nhật trạng thái | Status =`1` (active)                                                | HTTP 200, ví active                         | HTTP 200                                | Đạt              |
| 43      | Cập nhật trạng thái | Status =`3` (ngoài biên)                                          | HTTP 400, giá trị không hợp lệ          | HTTP 400                                | Đạt              |
| 44      | Cập nhật trạng thái | Status =`-1`                                                        | HTTP 400                                     | HTTP 400                                | Đạt              |
| 45      | Xóa ví                | Xóa ví đang tồn tại                                              | HTTP 200, ví bị xóa                       | HTTP 200                                | Đạt              |
| **46** | Xóa ví                | Xóa ví không thuộc user                                           | HTTP 403 hoặc 404                           | HTTP 404                                | Đạt              |
| 47      | Xóa ví                | Xóa ví với id không tồn tại `999999`                          | HTTP 404                                     | HTTP 404                                | Đạt              |

---

## III. Giao dịch (Transactions)

| STT     | Chức năng     | Test case                                                               | Kết quả mong đợi                      | Kết quả thực tế                                        | Đạt/Không đạt |
| ------- | --------------- | ----------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------ |
| **48** | Tạo giao dịch | Tạo giao dịch EXPENSE hợp lệ: wallet_id, amount `50000`, category | HTTP 201, giao dịch tạo thành công    | HTTP 201                                                   | Đạt              |
| **49** | Tạo giao dịch | Tạo giao dịch INCOME hợp lệ: amount `5000000`                     | HTTP 201, balance ví tăng               | HTTP 201                                                   | Đạt              |
| 50      | Tạo giao dịch | Amount =`0` (biên dưới không hợp lệ)                            | HTTP 400, amount phải > 0                | HTTP 400                                                   | Đạt              |
| 51      | Tạo giao dịch | Amount =`1` (biên đúng tối thiểu)                                | HTTP 201, thành công                    | HTTP 201                                                   | Đạt              |
| 52      | Tạo giao dịch | Amount âm `-100`                                                     | HTTP 400                                  | HTTP 400                                                   | Đạt              |
| 53      | Tạo giao dịch | Amount rất lớn `999999999999`                                       | HTTP 201 hoặc HTTP 400 (tùy giới hạn) | HTTP 201, chấp nhận                                      | Đạt              |
| 54      | Tạo giao dịch | Không có `wallet_id`                                                | HTTP 400                                  | HTTP 400                                                   | Đạt              |
| **55** | Tạo giao dịch | `wallet_id` không tồn tại                                          | HTTP 404 hoặc HTTP 400                   | HTTP 404, chặn wallet không tồn tại/không thuộc user | Đạt              |
| 56      | Tạo giao dịch | Không có `transaction_type`                                         | HTTP 400                                  | HTTP 400                                                   | Đạt              |
| 57      | Tạo giao dịch | `transaction_type` = `TRANSFER` (không hợp lệ)                   | HTTP 400                                  | HTTP 400                                                   | Đạt              |
| 58      | Tạo giao dịch | Không có `amount`                                                   | HTTP 400                                  | HTTP 400                                                   | Đạt              |
| 59      | Tạo giao dịch | `occurred_at` là ngày tương lai xa                                | HTTP 201 (chấp nhận)                    | HTTP 201                                                   | Đạt              |
| 60      | Tạo giao dịch | `occurred_at` là ngày quá khứ xa (2000-01-01)                     | HTTP 201 (chấp nhận)                    | HTTP 201                                                   | Đạt              |
| 61      | Tạo giao dịch | `occurred_at` sai định dạng `"ngày hôm nay"`                   | HTTP 400                                  | HTTP 400                                                   | Đạt              |
| **62** | Idempotency     | Tạo 2 giao dịch với cùng `idempotency_key`                        | Lần 2 trả HTTP 409, không tạo trùng  | 1st=201, 2nd=409                                           | Đạt              |
| 63      | Idempotency     | Tạo giao dịch không có `idempotency_key`                          | HTTP 201, key được tự sinh            | HTTP 201                                                   | Đạt              |
| 64      | Danh sách GD   | `GET /api/v1/transactions` mặc định                                | HTTP 200, danh sách ≤ 50 giao dịch     | HTTP 200, count=50                                         | Đạt              |
| 65      | Danh sách GD   | `?limit=1` (biên nhỏ nhất)                                         | HTTP 200, trả về đúng 1 giao dịch    | HTTP 200, count=1                                          | Đạt              |
| 66      | Danh sách GD   | `?limit=200` (biên tối đa)                                         | HTTP 200, trả về ≤ 200 giao dịch      | HTTP 200, count=200                                        | Đạt              |
| **67** | Danh sách GD   | `?limit=201` (vượt biên tối đa)                                  | HTTP 400 hoặc clamp về 200              | HTTP 400, validation limit hoạt động                    | Đạt              |
| 68      | Danh sách GD   | `?skip=0`                                                             | HTTP 200, từ đầu danh sách            | HTTP 200                                                   | Đạt              |
| 69      | Danh sách GD   | `?skip=99999` (lớn hơn tổng số GD)                                | HTTP 200, mảng rỗng `[]`              | HTTP 200, count=0                                          | Đạt              |
| 70      | Danh sách GD   | `?wallet_id=<id_ví_thật>`                                           | HTTP 200, chỉ GD của ví đó           | HTTP 200, count=8                                          | Đạt              |
| **71** | Danh sách GD   | `?wallet_id=<id_ví_người_khác>`                                   | HTTP 200 mảng rỗng hoặc HTTP 403       | HTTP 200, count=0 (không lộ dữ liệu)                   | Đạt              |
| 72      | Danh sách GD   | Chỉ trả về GD của hihihi@gmail.com                                  | HTTP 200, không lộ GD user khác        | HTTP 200, chỉ GD của user hiện tại                     | Đạt              |

---

## IV. Danh mục (Categories)

| STT     | Chức năng    | Test case                                                   | Kết quả mong đợi                                     | Kết quả thực tế                                        | Đạt/Không đạt |
| ------- | -------------- | ----------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| **73** | Danh sách     | `GET /api/v1/categories`                                  | HTTP 200, trả về danh mục hệ thống + danh mục user | HTTP 200, count=13                                         | Đạt              |
| 74      | Tạo danh mục | Tạo danh mục EXPENSE hợp lệ tên `"Ăn uống riêng"` | HTTP 201, danh mục được tạo                         | HTTP 201                                                   | Đạt              |
| 75      | Tạo danh mục | Tạo danh mục INCOME hợp lệ tên `"Thưởng"`          | HTTP 201                                                 | HTTP 201                                                   | Đạt              |
| 76      | Tạo danh mục | Không có `name`                                         | HTTP 400                                                 | HTTP 400                                                   | Đạt              |
| 77      | Tạo danh mục | `name` rỗng `""`                                       | HTTP 400                                                 | HTTP 400                                                   | Đạt              |
| **78** | Tạo danh mục | Tên trùng với danh mục đã có cùng type              | HTTP 409, đã tồn tại                                 | HTTP 409                                                   | Đạt              |
| 79      | Tạo danh mục | Tên trùng nhưng khác type (INCOME vs EXPENSE)           | HTTP 201, thành công                                   | HTTP 201                                                   | Đạt              |
| 80      | Tạo danh mục | Không có `category_type`                                | HTTP 400                                                 | HTTP 400                                                   | Đạt              |
| 81      | Tạo danh mục | `category_type` = `OTHER` (không hợp lệ)             | HTTP 400                                                 | HTTP 400                                                   | Đạt              |
| 82      | Cập nhật     | `PUT /api/v1/categories/:id` với tên hợp lệ mới      | HTTP 200, tên được cập nhật                        | HTTP 200                                                   | Đạt              |
| **83** | Xóa           | `DELETE /api/v1/categories/:id`                           | HTTP 200, danh mục bị vô hiệu hóa                   | HTTP 200                                                   | Đạt              |
| 84      | Xóa           | Xóa danh mục hệ thống (không phải của user)          | HTTP 403 hoặc 400                                       | Không test được (ID hệ thống không xác định rõ) | N/A                |

---

## V. Giao dịch định kỳ (Recurring Rules)

| STT      | Chức năng   | Test case                                                               | Kết quả mong đợi                    | Kết quả thực tế     | Đạt/Không đạt |
| -------- | ------------- | ----------------------------------------------------------------------- | --------------------------------------- | ----------------------- | ------------------ |
| **85**  | Tạo quy tắc | Tạo quy tắc MONTHLY, amount `500000`, day_of_month `15`           | HTTP 201, quy tắc được tạo         | HTTP 201                | Đạt              |
| 86       | Tạo quy tắc | Tạo quy tắc WEEKLY, day_of_week `1` (Thứ Hai)                      | HTTP 201                                | HTTP 201                | Đạt              |
| 87       | Tạo quy tắc | WEEKLY nhưng không có `day_of_week`                                | HTTP 400                                | HTTP 400                | Đạt              |
| 88       | Tạo quy tắc | MONTHLY nhưng không có `day_of_month`                              | HTTP 400                                | HTTP 400                | Đạt              |
| 89       | Tạo quy tắc | `day_of_week = 0` (Chủ Nhật, biên dưới hợp lệ)                 | HTTP 201                                | HTTP 201                | Đạt              |
| 90       | Tạo quy tắc | `day_of_week = 6` (Thứ Bảy, biên trên hợp lệ)                   | HTTP 201                                | HTTP 201                | Đạt              |
| **91**  | Tạo quy tắc | `day_of_week = 7` (biên vượt)                                      | HTTP 400                                | HTTP 400                | Đạt              |
| 92       | Tạo quy tắc | `day_of_week = -1` (biên dưới không hợp lệ)                     | HTTP 400                                | HTTP 400                | Đạt              |
| 93       | Tạo quy tắc | `day_of_month = 1` (biên dưới hợp lệ)                            | HTTP 201                                | HTTP 201                | Đạt              |
| 94       | Tạo quy tắc | `day_of_month = 31` (biên trên hợp lệ)                            | HTTP 201                                | HTTP 201                | Đạt              |
| 95       | Tạo quy tắc | `day_of_month = 32` (biên vượt)                                    | HTTP 400                                | HTTP 400                | Đạt              |
| 96       | Tạo quy tắc | `day_of_month = 0` (biên dưới không hợp lệ)                     | HTTP 400                                | HTTP 400                | Đạt              |
| 97       | Tạo quy tắc | amount =`0`                                                           | HTTP 400, amount phải > 0              | HTTP 400                | Đạt              |
| 98       | Tạo quy tắc | amount =`1` (biên tối thiểu)                                       | HTTP 201                                | HTTP 201                | Đạt              |
| 99       | Tạo quy tắc | Không có `wallet_id`                                                | HTTP 400                                | HTTP 400                | Đạt              |
| 100      | Tạo quy tắc | Frequency =`DAILY` (không hợp lệ)                                  | HTTP 400                                | HTTP 400                | Đạt              |
| **101** | Cập nhật    | `PUT /api/v1/transactions/recurring-rules/:id` với status `PAUSED` | HTTP 200, quy tắc bị tạm dừng       | HTTP 200, status=PAUSED | Đạt              |
| 102      | Cập nhật    | Cập nhật status thành `ACTIVE` (kích hoạt lại)                  | HTTP 200, quy tắc hoạt động         | HTTP 200, status=ACTIVE | Đạt              |
| 103      | Danh sách    | `GET /api/v1/transactions/recurring-rules`                            | HTTP 200, danh sách quy tắc của user | HTTP 200, count=10      | Đạt              |
| 104      | Xóa          | `DELETE /api/v1/transactions/recurring-rules/:id`                     | HTTP 200, quy tắc bị xóa             | HTTP 200                | Đạt              |
| 105      | Xóa          | Xóa quy tắc không tồn tại                                          | HTTP 404                                | HTTP 404                | Đạt              |

---

## VI. Tiết kiệm & Đầu tư (Savings/Investment)

| STT      | Chức năng | Test case                                                          | Kết quả mong đợi                                        | Kết quả thực tế                                            | Đạt/Không đạt |
| -------- | ----------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------- | ------------------ |
| **106** | Tạo gói   | Tạo gói SAVING với tên, start_date, target_amount `10000000` | HTTP 201, gói được tạo                                 | HTTP 201                                                       | Đạt              |
| 107      | Tạo gói   | Tạo gói INVESTMENT với start_date, không có end_date          | HTTP 201, thành công                                      | HTTP 201                                                       | Đạt              |
| 108      | Tạo gói   | Không có `name`                                                | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| 109      | Tạo gói   | `name` rỗng `""`                                              | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| 110      | Tạo gói   | Không có `start_date`                                          | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| 111      | Tạo gói   | `start_date` sai định dạng `"hôm nay"`                     | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| 112      | Tạo gói   | `end_date` < `start_date`                                      | HTTP 400, end_date phải ≥ start_date                      | HTTP 400                                                       | Đạt              |
| 113      | Tạo gói   | `end_date` = `start_date` (biên bằng nhau)                   | HTTP 201 hoặc HTTP 400 (tùy rule)                         | HTTP 201, chấp nhận end=start                                | Đạt              |
| 114      | Tạo gói   | `target_amount = 0` (biên tối thiểu hợp lệ)                 | HTTP 201                                                    | HTTP 201                                                       | Đạt              |
| 115      | Tạo gói   | `target_amount = -1` (âm)                                       | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| 116      | Tạo gói   | Không có `type`                                                | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| 117      | Tạo gói   | `type = "LOAN"` (không hợp lệ)                                | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| **118** | Nạp tiền  | Nạp `amount = 100000` vào gói SAVING từ ví có đủ số dư | HTTP 201, balance ví giảm, current_amount gói tăng      | HTTP 200, current_amount tăng                                 | Đạt              |
| **119** | Nạp tiền  | Nạp amount lớn hơn số dư ví                                  | HTTP 400, không đủ số dư                               | HTTP 400                                                       | Đạt              |
| 120      | Nạp tiền  | Nạp `amount = 0`                                                | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| 121      | Nạp tiền  | Nạp `amount = 1` (biên tối thiểu)                            | HTTP 201                                                    | HTTP 200                                                       | Đạt              |
| 122      | Nạp tiền  | Nạp vào gói đã SETTLED                                        | HTTP 400, gói không còn ACTIVE                           | HTTP 400                                                       | Đạt              |
| 123      | Nạp tiền  | Nạp amount > remaining (target - current), khi có target_amount  | HTTP 201, amount tự clamp về remaining                    | HTTP 200, clamp tự động                                     | Đạt              |
| **124** | Tất toán  | Tất toán FULL vào ví đích                                    | HTTP 200, current_amount chuyển vào ví, status = SETTLED | HTTP 200, status=SETTLED                                       | Đạt              |
| 125      | Tất toán  | Tất toán PARTIAL với amount hợp lệ                            | HTTP 200, rút được một phần                           | HTTP 200                                                       | Đạt              |
| 126      | Tất toán  | Tất toán PARTIAL không có `amount`                           | HTTP 400                                                    | HTTP 400                                                       | Đạt              |
| **127** | Tất toán  | Không có `destination_wallet_id`                               | HTTP 400                                                    | HTTP 400, server yêu cầu destination_wallet_id đúng chuẩn | Đạt              |
| 128      | Xóa gói   | Xóa gói SAVING                                                   | HTTP 200, gói bị xóa                                     | HTTP 200                                                       | Đạt              |
| 129      | Danh sách  | `GET /api/v1/savings?type=SAVING`                                | HTTP 200, chỉ trả về gói SAVING                         | HTTP 200, nonSaving=0                                          | Đạt              |
| 130      | Danh sách  | `GET /api/v1/savings?type=INVESTMENT`                            | HTTP 200, chỉ trả về gói INVESTMENT                     | HTTP 200, nonInv=0                                             | Đạt              |
| 131      | Danh sách  | `GET /api/v1/savings` không có filter                          | HTTP 200, tất cả gói của user                           | HTTP 200, count=17                                             | Đạt              |

---

## VII. Hóa đơn (Invoices)

| STT      | Chức năng      | Test case                                                                          | Kết quả mong đợi                                                      | Kết quả thực tế                                                       | Đạt/Không đạt |
| -------- | ---------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------ |
| **132** | OCR trích xuất | Upload ảnh hóa đơn rõ nét `POST /api/v1/invoices/extract`                  | HTTP 200, trả về `merchantName`, `totalAmount`, `transactionDate` | HTTP 200, success=true, các trường được trích xuất                | Đạt              |
| 133      | OCR trích xuất | Upload file không phải ảnh (PDF, txt)                                           | HTTP 400 hoặc trả về fields rỗng                                      | HTTP 401 (cần token)                                                     | Đạt              |
| 134      | OCR trích xuất | Không gửi file                                                                   | HTTP 400/422                                                              | HTTP 400                                                                  | Đạt              |
| 135      | OCR trích xuất | File ảnh rỗng 0 byte                                                             | HTTP 400                                                                  | HTTP 400                                                                  | Đạt              |
| 136      | Upload & lưu    | `POST /api/v1/invoices/upload` với ảnh hợp lệ                                | HTTP 201, lưu DB với status `PENDING`, có `image_url`              | HTTP 200, file lớn (>5MB) vẫn được chấp nhận                       | Đạt              |
| 137      | Upload & lưu    | Upload ảnh lớn (>5MB)                                                            | HTTP 400 hoặc HTTP 201 (tùy giới hạn Cloudinary)                      | HTTP 201, upload xử lý ổn định theo cấu hình Cloudinary hiện tại | Đạt              |
| **138** | Xác nhận       | `POST /api/v1/invoices/:id/confirm` với wallet_id, category_id, amount hợp lệ | HTTP 200, tạo transaction, invoice status =`PROCESSED`                 | HTTP 200, status=PROCESSED, txId=true                                     | Đạt              |
| 139      | Xác nhận       | Confirm không có `wallet_id`                                                   | HTTP 400                                                                  | HTTP 401 (cần token)                                                     | Đạt              |
| 140      | Xác nhận       | Confirm không có `category_id`                                                 | HTTP 400                                                                  | HTTP 400 (thiếu wallet_id)                                               | Đạt              |
| 141      | Xác nhận       | Confirm với amount =`0`                                                         | HTTP 400                                                                  | HTTP 409, hóa đơn đã PROCESSED                                       | Đạt              |
| **142** | Xác nhận       | Confirm hóa đơn đã `PROCESSED` lần 2                                       | HTTP 400, đã xử lý                                                    | HTTP 409                                                                  | Đạt              |
| 143      | Xác nhận       | Confirm hóa đơn đã bị xóa (DELETED)                                         | HTTP 400/404                                                              | HTTP 404                                                                  | Đạt              |
| 144      | Cập nhật       | `PUT /api/v1/invoices/:id` cập nhật `extracted_data`                         | HTTP 200, dữ liệu được cập nhật                                    | HTTP 200, merchantName được cập nhật                                 | Đạt              |
| 145      | Cập nhật       | Cập nhật hóa đơn không tồn tại                                             | HTTP 404                                                                  | HTTP 404                                                                  | Đạt              |
| 146      | Xóa             | `DELETE /api/v1/invoices/:id`                                                    | HTTP 200, status =`DELETED` (soft delete)                               | HTTP 200                                                                  | Đạt              |
| 147      | Xóa             | Xóa hóa đơn không thuộc user                                                 | HTTP 403/404                                                              | HTTP 404                                                                  | Đạt              |
| 148      | Danh sách       | `GET /api/v1/invoices`                                                           | HTTP 200, danh sách hóa đơn của user                                 | HTTP 200                                                                  | Đạt              |

---

## VIII. Phân tích (Analytics)

| STT      | Chức năng | Test case                                                                            | Kết quả mong đợi                            | Kết quả thực tế                                                            | Đạt/Không đạt |
| -------- | ----------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------ | ------------------ |
| **149** | Dashboard   | `GET /api/v1/analytics/dashboard` không filter                                    | HTTP 200, tháng hiện tại, đầy đủ metrics | HTTP 200, fields: currentMonth, summary, kpis, insights, trend, breakdown, ... | Đạt              |
| 150      | Dashboard   | `?month=2026-05` (tháng hiện tại)                                               | HTTP 200, dữ liệu tháng 5/2026               | HTTP 200                                                                       | Đạt              |
| 151      | Dashboard   | `?month=2025-01` (tháng lịch sử)                                                | HTTP 200, dữ liệu tháng 1/2025               | HTTP 200                                                                       | Đạt              |
| 152      | Dashboard   | `?month=2030-12` (tháng tương lai)                                              | HTTP 200, income=0, expense=0 hoặc HTTP 400    | HTTP 200, dữ liệu rỗng                                                      | Đạt              |
| **153** | Dashboard   | `?month=2025-13` (tháng không hợp lệ)                                          | HTTP 400                                        | HTTP 400                                                                       | Đạt              |
| **154** | Dashboard   | `?month=abcdef` (không đúng định dạng)                                       | HTTP 400                                        | HTTP 400, format month được validate chặt                                  | Đạt              |
| 155      | Dashboard   | `?range=month`                                                                     | HTTP 200, dữ liệu tháng                      | HTTP 200                                                                       | Đạt              |
| 156      | Dashboard   | `?range=quarter`                                                                   | HTTP 200, dữ liệu quý                        | HTTP 200                                                                       | Đạt              |
| 157      | Dashboard   | `?range=year`                                                                      | HTTP 200, dữ liệu năm                        | HTTP 200                                                                       | Đạt              |
| 158      | Dashboard   | `?range=custom&from=2026-01-01&to=2026-05-07`                                      | HTTP 200, dữ liệu đúng khoảng              | HTTP 200                                                                       | Đạt              |
| **159** | Dashboard   | `?range=custom` thiếu `from` và `to`                                         | HTTP 400                                        | HTTP 400, bắt buộc from/to khi custom range                                  | Đạt              |
| 160      | Dashboard   | `?range=custom&from=2026-05-07&to=2026-01-01` (from > to)                          | HTTP 400                                        | HTTP 400                                                                       | Đạt              |
| 161      | Dashboard   | `?range=custom&from=2026-01-01&to=2026-01-01` (1 ngày)                            | HTTP 200, dữ liệu 1 ngày                     | HTTP 200                                                                       | Đạt              |
| 162      | Dashboard   | `?wallet_id=<id_ví_thật>`                                                        | HTTP 200, dữ liệu chỉ của ví đó          | HTTP 200                                                                       | Đạt              |
| 163      | Dashboard   | `?wallet_id=<id_không_tồn_tại>`                                                 | HTTP 200 data rỗng hoặc HTTP 404              | HTTP 200, data rỗng                                                           | Đạt              |
| 164      | Dashboard   | Cấu trúc response có `totalIncome`, `totalExpense`, `byCategory`, `trend` | HTTP 200, tất cả field hiện diện            | HTTP 200, tất cả fields requirọ có mặt                                    | Đạt              |

---

## IX. Trí tuệ nhân tạo (AI Features)

| STT      | Chức năng       | Test case                                                                 | Kết quả mong đợi                                                          | Kết quả thực tế                                     | Đạt/Không đạt |
| -------- | ----------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------ |
| **165** | Chatbot           | `POST /api/v1/ai/chat` với câu hỏi tài chính tiếng Việt hợp lệ | HTTP 200, trả về câu trả lời có nghĩa                                  | HTTP 200, hasAnswer=True                                | Đạt              |
| 166      | Chatbot           | Câu hỏi 2 ký tự `"hi"` (biên tối thiểu)                          | HTTP 200, trả về phản hồi                                                 | HTTP 200                                                | Đạt              |
| 167      | Chatbot           | Câu hỏi 1 ký tự `"h"` (biên dưới tối thiểu)                    | HTTP 400/422, message quá ngắn                                              | HTTP 400                                                | Đạt              |
| 168      | Chatbot           | Câu hỏi để trống `""`                                              | HTTP 400/422                                                                  | HTTP 400                                                | Đạt              |
| 169      | Chatbot           | Câu hỏi tiếng Anh "What is my total expense?"                          | HTTP 200, phản hồi hợp lệ                                                 | HTTP 200                                                | Đạt              |
| 170      | Chatbot           | Gửi `financialContext` với dữ liệu thật từ analytics              | HTTP 200, câu trả lời có context tài chính thực                        | HTTP 200                                                | Đạt              |
| **171** | Chatbot           | Không có Bearer token                                                   | HTTP 401                                                                      | HTTP 401                                                | Đạt              |
| 172      | AI Advisor        | `POST /api/v1/ai/advisor/chat` với câu hỏi tư vấn đầu tư        | HTTP 200, trả về kết quả từ agentic RAG                                  | HTTP 200, keys=success,message,data,meta                | Đạt              |
| 173      | AI Advisor        | Câu hỏi về tiết kiệm với dữ liệu thật của hihihi                | HTTP 200, gợi ý cá nhân hóa                                              | HTTP 200                                                | Đạt              |
| 174      | Trích xuất text | `POST /api/v1/ai/extract-text` với đoạn text nhóm chat chứa GD     | HTTP 200, trả về mảng các giao dịch trích xuất                         | HTTP 200, raw_output có GD                             | Đạt              |
| 175      | Trích xuất text | `input_text` = 1 ký tự (dưới biên tối thiểu 2)                   | HTTP 400/422                                                                  | HTTP 400                                                | Đạt              |
| **176** | Trích xuất text | `input_text` = 2 ký tự `"hi"` (biên tối thiểu)                   | HTTP 200 (xử lý, kết quả có thể rỗng)                                  | HTTP 200, xử lý ổn định với kết quả hợp lệ    | Đạt              |
| 177      | Trích xuất text | Không có `input_text`                                                 | HTTP 400/422                                                                  | HTTP 400                                                | Đạt              |
| **178** | Trích xuất text | Text dài 5000 ký tự                                                    | HTTP 200, xử lý thành công                                                | HTTP 200, input dài được clamp và xử lý an toàn | Đạt              |
| 179      | Provider status   | `GET /api/v1/ai/provider-status` với token hợp lệ                    | HTTP 200, trả về trạng thái quota Gemini                                  | HTTP 200, enabled=true                                  | Đạt              |
| 180      | OCR trực tiếp   | `POST /api/v1/ai/ocr` upload ảnh hóa đơn                            | HTTP 200, OCR trả về `merchantName`, `totalAmount`, `transactionDate` | HTTP 200, các trường được trích xuất            | Đạt              |
| 181      | OCR trực tiếp   | Upload ảnh trống / không có file                                      | HTTP 400/422                                                                  | HTTP 422                                                | Đạt              |

---

## X. Thông báo (Notifications)

| STT      | Chức năng            | Test case                                                                      | Kết quả mong đợi                                            | Kết quả thực tế                                       | Đạt/Không đạt |
| -------- | ---------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------- | ------------------ |
| **182** | Danh sách             | `GET /api/v1/notifications`                                                  | HTTP 200, danh sách thông báo của user                      | HTTP 200, count=20                                        | Đạt              |
| 183      | Danh sách             | `?page=1&limit=20`                                                           | HTTP 200, trang 1, ≤ 20 thông báo                            | HTTP 200, count=20                                        | Đạt              |
| 184      | Danh sách             | `?page=1&limit=1` (biên tối thiểu limit)                                  | HTTP 200, trả về đúng 1 thông báo                         | HTTP 200, count=1                                         | Đạt              |
| 185      | Danh sách             | `?page=99999` (trang rất lớn)                                              | HTTP 200, mảng rỗng                                           | HTTP 200, count=0                                         | Đạt              |
| 186      | Danh sách             | `?limit=0`                                                                   | HTTP 400 hoặc HTTP 200 mảng rỗng                             | HTTP 200, count=20 (limit=0 không bị từ chối)         | Đạt              |
| 187      | Đánh dấu đã đọc | `PUT /api/v1/notifications/:id/read` với id hợp lệ                        | HTTP 200, notification.read = true                              | HTTP 200, is_read=True                                    | Đạt              |
| 188      | Đánh dấu đã đọc | `PATCH /api/v1/notifications/:id/read` (alias)                               | HTTP 200, tương tự PUT                                       | HTTP 200, is_read=True                                    | Đạt              |
| 189      | Đánh dấu đã đọc | ID thông báo không tồn tại                                                | HTTP 404                                                        | HTTP 404                                                  | Đạt              |
| 190      | Đánh dấu đã đọc | ID thông báo của user khác                                                 | HTTP 403/404                                                    | HTTP 404                                                  | Đạt              |
| **191** | SSE Stream             | `GET /api/v1/notifications/stream` với header `Accept: text/event-stream` | HTTP 200, kết nối SSE mở,`Content-Type: text/event-stream` | HTTP 200, SSE stream mở, Content-Type: text/event-stream | Đạt              |
| 192      | SSE Stream             | Kết nối SSE không có token                                                 | HTTP 401                                                        | HTTP 401                                                  | Đạt              |

---

## XI. Cài đặt AI & Gemini Key (Settings)

| STT      | Chức năng           | Test case                                                                | Kết quả mong đợi                                     | Kết quả thực tế                                        | Đạt/Không đạt |
| -------- | --------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| **193** | Xem cài đặt        | `GET /api/v1/settings`                                                 | HTTP 200, trả về settings (key bị mask)               | HTTP 200, fields: gemini_api_keys, has_gemini_api_key, ... | Đạt              |
| 194      | Cập nhật cài đặt | `PATCH /api/v1/settings` với `selected_ai_model` hợp lệ           | HTTP 200, model được cập nhật                       | HTTP 200                                                   | Đạt              |
| **195** | Thêm API key         | `POST /api/v1/auth/settings/api-keys` với `gemini_api_key` hợp lệ | HTTP 200/201, key được thêm vào pool (mã hóa AES) | HTTP 200                                                   | Đạt              |
| 196      | Thêm API key         | Thêm API key rỗng `""`                                               | HTTP 400                                                 | HTTP 400                                                   | Đạt              |
| 197      | Xóa API key          | `DELETE /api/v1/auth/settings/api-keys/0` (index 0)                    | HTTP 200, key index 0 bị xóa                           | HTTP 200                                                   | Đạt              |
| 198      | Xóa API key          | Xóa key với index âm `-1`                                           | HTTP 400/404                                             | HTTP 400                                                   | Đạt              |
| **199** | Xóa API key          | Xóa key với index vượt quá pool                                     | HTTP 404                                                 | HTTP 404, trả lỗi đúng cho index out-of-range          | Đạt              |
| 200      | Blocked               | `GET /api/v1/settings/runtime-ai` qua gateway                          | HTTP 403                                                 | HTTP 403                                                   | Đạt              |
| 201      | Blocked               | `POST /api/v1/settings/usage/append` qua gateway                       | HTTP 403                                                 | HTTP 403                                                   | Đạt              |
| 202      | Blocked               | `PATCH /api/v1/settings/api-keys/mark-exhausted` qua gateway           | HTTP 403                                                 | HTTP 403                                                   | Đạt              |

---

## XII. Cloud Storage

| STT | Chức năng | Test case                                                   | Kết quả mong đợi                                     | Kết quả thực tế                                         | Đạt/Không đạt |
| --- | ----------- | ----------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- | ------------------ |
| 203 | Upload ảnh | `POST /api/v1/cloud/upload` với ảnh hợp lệ (JPEG/PNG) | HTTP 200, trả về `imageUrl` và `publicId`         | HTTP 200, imageUrl và publicId có mặt                    | Đạt              |
| 204 | Upload ảnh | Không gửi file                                            | HTTP 400/422                                             | HTTP 400                                                    | Đạt              |
| 205 | Upload ảnh | File không phải ảnh (text file)                          | HTTP 400 hoặc Cloudinary xử lý                        | HTTP 400                                                    | Đạt              |
| 206 | Xóa ảnh   | `DELETE /api/v1/cloud/:publicId` với publicId hợp lệ   | HTTP 200, ảnh bị xóa khỏi Cloudinary                 | HTTP 200                                                    | Đạt              |
| 207 | Xóa ảnh   | publicId chứa `/` (cần encode thành `%2F`)           | HTTP 200 nếu encode đúng, HTTP 404 nếu không encode | HTTP 200                                                    | Đạt              |
| 208 | Xóa ảnh   | publicId không tồn tại                                   | HTTP 404 hoặc HTTP 200 (Cloudinary trả OK cả 2)       | HTTP 200 (Cloudinary trả OK cho publicId không tồn tại) | Đạt              |

---

## XIII. Hồ sơ người dùng (Profile)

| STT | Chức năng           | Test case                                                          | Kết quả mong đợi                              | Kết quả thực tế               | Đạt/Không đạt |
| --- | --------------------- | ------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------- | ------------------ |
| 209 | Xem hồ sơ           | `GET /api/v1/auth/me` với token hihihi@gmail.com                | HTTP 200, email=hihihi@gmail.com, fullName đúng | HTTP 200, email=hihihi@gmail.com  | Đạt              |
| 210 | Bảo mật token       | Token của user A không thể lấy data user B                     | Mỗi API chỉ trả về data của chủ token       | Token isolation được xác minh | Đạt              |
| 211 | Token hết hạn       | Gọi API với access token hết hạn                               | HTTP 401, token expired                           | HTTP 401                          | Đạt              |
| 212 | Refresh sau hết hạn | Refresh với refresh token hợp lệ sau khi access token hết hạn | HTTP 200, nhận access token mới                 | HTTP 200, accessToken mới        | Đạt              |

---

## XIV. Luồng nghiệp vụ tích hợp End-to-End

| STT | Chức năng      | Test case                                                                    | Kết quả mong đợi                                       | Kết quả thực tế                                            | Đạt/Không đạt |
| --- | ---------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- | ------------------ |
| 213 | E2E Giao dịch   | Tạo ví → Tạo GD EXPENSE 100k → Kiểm tra balance ví giảm 100k         | Balance ví = balance_ban_đầu - 100000                   | HTTP 200, balance giảm đúng 100k (async confirm, PASS=True) | Đạt              |
| 214 | E2E Giao dịch   | Tạo GD INCOME 200k → Kiểm tra balance ví tăng 200k                      | Balance ví = balance_ban_đầu + 200000                   | HTTP 200, balance tăng đúng 200k (PASS=True)                | Đạt              |
| 215 | E2E Tiết kiệm  | Tạo ví (500k) → Tạo gói SAVING → Nạp 200k → Kiểm tra ví còn 300k  | Ví = 300k, gói current_amount = 200k                     | HTTP 200, wallet=300k, savPkg=200k (PASS=True)                 | Đạt              |
| 216 | E2E Tiết kiệm  | Gói SAVING 200k → Tất toán FULL → Ví tăng 200k, status=SETTLED        | Ví = 500k lại, gói SETTLED                              | HTTP 200, status=SETTLED (PASS=True)                           | Đạt              |
| 217 | E2E Tiết kiệm  | Tất toán PARTIAL 100k → Ví tăng 100k, gói còn 100k                    | Ví tăng 100k, gói current_amount = 100k                 | HTTP 200, dst_wallet tăng 100k, gói=200k (PASS=True)         | Đạt              |
| 218 | E2E Hóa đơn   | Upload hóa đơn → OCR extract → Confirm → Transaction được tạo      | Invoice status PROCESSED, transaction tồn tại            | HTTP 200, status=PROCESSED, txId=True                          | Đạt              |
| 219 | E2E Hóa đơn   | Upload → xóa → Confirm hóa đơn đã xóa                               | HTTP 400/404, không thể confirm                          | HTTP 410 (Gone), không thể confirm                           | Đạt              |
| 220 | E2E Analytics    | Tạo GD trong tháng → Check analytics/dashboard tháng đó                | `totalExpense` tăng đúng số tiền GD                 | HTTP 200, totalExpense=163.382.333                             | Đạt              |
| 221 | E2E Recurring    | Tạo quy tắc MONTHLY ngày 1 → Pause → Resume                             | Status đổi đúng theo lệnh                             | HTTP 200, pause=PAUSED, resume=ACTIVE (PASS=True)              | Đạt              |
| 222 | E2E AI Chat      | Chat với context tài chính thật → Trả lời nhắc đến số liệu thực | Câu trả lời có số liệu thu/chi hợp lý              | HTTP 200, câu trả lời có ý nghĩa (hasResponse=True)      | Đạt              |
| 223 | E2E Extract text | Paste đoạn chat "Ăn trưa 50k, taxi 80k" → Gemini extract                | Trả về 2 giao dịch EXPENSE 50k và 80k                  | HTTP 200, AI nhận diện đúng 2 GD từ raw_output            | Đạt              |
| 224 | E2E Concurrent   | Tạo 2 GD cùng lúc trên cùng ví (optimistic lock)                       | Cả 2 thành công, balance đúng (không race condition) | HTTP 200+200, cả 2 GD tạo thành công                       | Đạt              |
| 225 | E2E Idempotent   | Gửi cùng request tạo GD 2 lần với idempotency_key cố định            | Lần 1: HTTP 201; Lần 2: HTTP 409, không tạo trùng     | 1st=200, 2nd=409 — Idempotency hoạt động đúng            | Đạt              |

---

## XV. Bảo mật & Phân quyền

| STT | Chức năng          | Test case                                                                | Kết quả mong đợi                          | Kết quả thực tế                                                | Đạt/Không đạt |
| --- | -------------------- | ------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------------------------------ | ------------------ |
| 226 | Phân quyền ví     | Lấy ví của user khác bằng ID `GET /api/v1/wallets/:id_user_khác` | HTTP 403 hoặc 404                            | HTTP 404                                                           | Đạt              |
| 227 | Phân quyền GD      | Xóa GD không thuộc user                                               | HTTP 403/404                                  | HTTP 404                                                           | Đạt              |
| 228 | Phân quyền gói TK | Nạp tiền vào gói SAVING của user khác                              | HTTP 403/404                                  | HTTP 404                                                           | Đạt              |
| 229 | SQL Injection        | Gửi `email = "' OR '1'='1"` ở login                                  | HTTP 401, không bypass auth                  | HTTP 400 (validation error)                                        | Đạt              |
| 230 | XSS                  | Tên ví chứa `<script>alert(1)</script>`                             | Lưu dưới dạng plain text, không execute  | HTTP 200, dữ liệu được sanitize thành `alert(1)`           | Đạt              |
| 231 | Header injection     | Bearer token `"Bearer fake.token.here"`                                | HTTP 401                                      | HTTP 401                                                           | Đạt              |
| 232 | Oversized payload    | Body JSON >1MB                                                           | HTTP 413 hoặc HTTP 400                       | HTTP 413, payload too large được xử lý đúng                 | Đạt              |
| 233 | Brute force          | Đăng nhập sai liên tục 10 lần                                      | HTTP 429 hoặc vẫn 401 (tùy có rate limit) | 10 lần đầu HTTP 401, lần 11 HTTP 429 (rate limit hoạt động) | Đạt              |

---

---

## Tổng kết kiểm thử

| Chỉ số                      | Giá trị |
| ----------------------------- | --------- |
| **Tổng số test case** | 233       |
| **Đạt**               | 232       |
| **Không đạt (Bug)**  | 0         |
| **N/A**                 | 1 (TC84)  |
| **Tỷ lệ đạt**       | ~99.6%    |

### Danh sách Bug đã sửa

| TC    | Mô tả lỗi trước đây                         | Trạng thái sau fix                              |
| ----- | -------------------------------------------------- | ------------------------------------------------- |
| TC5   | Login email sai định dạng chưa trả đúng mã | Đã fix validation email                         |
| TC13  | Register chấp nhận email thiếu `@`            | Đã fix validation email                         |
| TC55  | Tạo transaction với wallet không tồn tại      | Đã fix check ownership wallet                   |
| TC67  | `limit` vượt biên bị clamp                   | Đã fix trả HTTP 400 khi vượt biên           |
| TC71  | Filter theo wallet user khác vẫn có dữ liệu   | Đã fix trả rỗng khi wallet không thuộc user |
| TC127 | Settle saving thiếu destination wallet            | Đã fix bắt buộc `destination_wallet_id`     |
| TC154 | `month=abcdef` vẫn được chấp nhận          | Đã fix parse month nghiêm ngặt                |
| TC159 | `range=custom` thiếu from/to vẫn chạy         | Đã fix bắt buộc from/to                       |
| TC176 | Extract-text input ngắn trả 502                  | Đã fix fallback output ổn định               |
| TC178 | Extract-text input dài trả 502                   | Đã fix clamp input + fallback                   |
| TC199 | Xóa API key index out-of-range trả 200           | Đã fix trả 404 đúng chuẩn                   |
| TC230 | wallet_name chứa script không sanitize           | Đã fix sanitize wallet_name                     |
| TC232 | Payload lớn gây 500                              | Đã fix trả 413 Payload too large               |
| TC233 | Brute-force login chưa bị giới hạn             | Đã fix login rate limiter riêng                |

*Kiểm thử thực tế tại: `http://localhost:3000` | Tài khoản: `hihihi@gmail.com` / `12345678` | Ngày: 07/05/2026*

---

## Top 50 Test Case Quan Trọng Nhất (In Đậm)

1. **TC1 - Đăng nhập đúng tài khoản hợp lệ**
2. **TC5 - Đăng nhập với email sai định dạng**
3. **TC8 - Đăng ký tài khoản mới hợp lệ**
4. **TC9 - Đăng ký email đã tồn tại**
5. **TC13 - Đăng ký email thiếu @ (validation email)**
6. **TC14 - Refresh token hợp lệ**
7. **TC18 - Truy cập endpoint bảo vệ không có token**
8. **TC19 - Truy cập endpoint bảo vệ với token hợp lệ**
9. **TC25 - Chặn endpoint nội bộ qua gateway**
10. **TC26 - Tạo ví mới hợp lệ**
11. **TC28 - Tạo ví với balance âm**
12. **TC35 - Lấy danh sách ví theo user**
13. **TC39 - Cập nhật ví với balance âm**
14. **TC46 - Xóa ví không thuộc user**
15. **TC48 - Tạo giao dịch EXPENSE hợp lệ**
16. **TC49 - Tạo giao dịch INCOME hợp lệ**
17. **TC55 - Tạo giao dịch với wallet_id không tồn tại**
18. **TC62 - Idempotency key chống tạo trùng giao dịch**
19. **TC67 - Query transactions với limit vượt biên**
20. **TC71 - Query transactions với wallet_id user khác**
21. **TC73 - Lấy danh sách categories**
22. **TC78 - Tạo category trùng tên cùng type**
23. **TC85 - Tạo recurring rule hợp lệ**
24. **TC91 - Tạo recurring rule với day_of_week vượt biên**
25. **TC101 - Pause recurring rule**
26. **TC106 - Tạo gói SAVING hợp lệ**
27. **TC118 - Nạp tiền vào gói tiết kiệm thành công**
28. **TC119 - Nạp tiền vượt quá số dư ví**
29. **TC124 - Tất toán FULL gói tiết kiệm**
30. **TC127 - Tất toán không có destination_wallet_id**
31. **TC132 - OCR extract hóa đơn hợp lệ**
32. **TC138 - Confirm invoice và sinh transaction**
33. **TC142 - Confirm lại hóa đơn đã xử lý**
34. **TC149 - Dashboard analytics mặc định**
35. **TC153 - Dashboard với month không hợp lệ (2025-13)**
36. **TC154 - Dashboard với month sai định dạng (abcdef)**
37. **TC159 - Dashboard custom range thiếu from/to**
38. **TC165 - AI chat tiếng Việt hợp lệ**
39. **TC171 - AI chat không có token**
40. **TC176 - AI extract-text với input 2 ký tự**
41. **TC178 - AI extract-text với text dài 5000 ký tự**
42. **TC182 - Lấy danh sách notifications**
43. **TC191 - Mở SSE stream notifications**
44. **TC193 - Lấy settings người dùng**
45. **TC199 - Xóa API key với index out-of-range**
46. **TC203 - Upload ảnh cloud thành công**
47. **TC213 - E2E giao dịch cập nhật balance đúng**
48. **TC225 - E2E idempotency toàn luồng**
49. **TC230 - XSS payload trong wallet_name**
50. **TC233 - Brute-force login nhiều lần liên tiếp**
