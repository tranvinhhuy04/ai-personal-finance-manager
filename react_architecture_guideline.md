# React Frontend Architecture Guideline

## 1. Mục tiêu

Tài liệu này định nghĩa cách tổ chức mã nguồn Frontend React cho đồ án theo hướng rõ ràng, dễ bảo trì và dễ giải thích khi bảo vệ.

Mục tiêu chính:

- Tách giao diện, logic xử lý, gọi API và quản lý dữ liệu thành các phần riêng.
- Tránh để component quá dài hoặc chứa quá nhiều trách nhiệm.
- Giữ cấu trúc thư mục nhất quán giữa các chức năng.
- Code phải dễ đọc, dễ sửa, dễ kiểm thử và nhóm có thể giải thích được.

---

## 2. Nguyên tắc kiến trúc tổng quát

Luồng xử lý chính của Frontend nên đi theo hướng:

```txt
UI / Page
→ Custom Hook
→ Service Layer
→ API Backend
→ State / Cache
```

Ý nghĩa:

- **UI / Page**: hiển thị giao diện cho người dùng.
- **Custom Hook**: gom logic xử lý, submit form, gọi mutation/query.
- **Service Layer**: chứa hàm gọi API bằng Axios hoặc Fetch.
- **API Backend**: nhận request và trả dữ liệu.
- **State / Cache**: lưu trạng thái giao diện, dữ liệu người dùng hoặc dữ liệu từ API.

Không nên để một component vừa hiển thị giao diện, vừa xử lý nghiệp vụ, vừa gọi API trực tiếp.

---

## 3. Cấu trúc thư mục đề xuất

```txt
src/
├── assets/
├── components/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── store/
├── utils/
├── App.tsx
└── main.tsx
```

Ý nghĩa từng thư mục:

| Thư mục | Vai trò |
|---|---|
| `assets/` | Lưu hình ảnh, icon, font, animation hoặc tài nguyên tĩnh |
| `components/` | Component dùng lại nhiều nơi như Button, Modal, Input, Card |
| `features/` | Chứa logic theo từng chức năng lớn của hệ thống |
| `hooks/` | Custom hook dùng chung |
| `layouts/` | Layout chung như DashboardLayout, AuthLayout |
| `pages/` | Các trang chính tương ứng với route |
| `routes/` | Cấu hình route, protected route, public route |
| `services/` | Hàm gọi API |
| `store/` | Global state như auth store, theme store |
| `utils/` | Hàm tiện ích dùng chung |

---

## 4. Tổ chức theo Feature

Mỗi chức năng lớn nên được gom vào một thư mục riêng trong `features/`.

Ví dụ:

```txt
src/features/transactions/
├── components/
│   ├── TransactionForm.tsx
│   └── TransactionTable.tsx
├── hooks/
│   ├── useTransactions.ts
│   └── useCreateTransaction.ts
├── services/
│   └── transactionService.ts
├── types.ts
└── index.ts
```

Cách tổ chức này giúp:

- Dễ tìm code liên quan đến một chức năng.
- Hạn chế việc phải tìm file ở quá nhiều nơi.
- Khi xóa hoặc sửa một chức năng, phạm vi ảnh hưởng rõ ràng hơn.
- Giảm tình trạng code bị trộn giữa giao diện, API và nghiệp vụ.

---

## 5. Component Architecture

Component nên được chia theo trách nhiệm.

### 5.1. Presentation Component

Chỉ chịu trách nhiệm hiển thị giao diện.

Ví dụ:

```tsx
type TransactionCardProps = {
  title: string;
  amount: number;
  date: string;
};

export function TransactionCard({ title, amount, date }: TransactionCardProps) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{amount}</p>
      <span>{date}</span>
    </div>
  );
}
```

Không nên gọi API trực tiếp trong loại component này.

### 5.2. Container / Page Component

Chịu trách nhiệm lấy dữ liệu, gọi hook và truyền dữ liệu xuống component con.

Ví dụ:

```tsx
export function TransactionsPage() {
  const { transactions, isLoading } = useTransactions();

  if (isLoading) {
    return <p>Đang tải dữ liệu...</p>;
  }

  return <TransactionTable transactions={transactions} />;
}
```

### 5.3. Reusable Component

Là component dùng lại nhiều nơi như:

- Button
- Input
- Modal
- Select
- Card
- Table
- Dialog

Các component này nên đặt trong `components/` hoặc `shared/ui/` nếu project đang dùng cấu trúc shared.

---

## 6. State Management

Không phải dữ liệu nào cũng cần đưa vào global state.

### 6.1. Local State

Dùng cho trạng thái nhỏ trong một component:

- Giá trị input
- Mở hoặc đóng modal
- Tab đang được chọn
- Loading cục bộ

Ví dụ:

```tsx
const [isOpen, setIsOpen] = useState(false);
```

### 6.2. Global State

Chỉ dùng khi nhiều màn hình hoặc nhiều component cùng cần dữ liệu đó.

Ví dụ:

- Thông tin đăng nhập
- Access token
- Theme
- Thông tin user hiện tại

Có thể dùng:

- React Context
- Zustand
- Redux Toolkit

### 6.3. Server State

Dữ liệu đến từ API không nên lưu thủ công quá nhiều trong global store.

Nên dùng TanStack Query / React Query để quản lý:

- Cache dữ liệu
- Loading state
- Error state
- Refetch dữ liệu
- Mutation create/update/delete

Ví dụ:

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["transactions"],
  queryFn: getTransactions,
});
```

---

## 7. Service Layer

Không gọi API trực tiếp trong component.

Nên tạo service riêng:

```tsx
// services/transactionService.ts
import { apiClient } from "@/utils/apiClient";

export async function getTransactions() {
  const response = await apiClient.get("/transactions");
  return response.data;
}

export async function createTransaction(payload: CreateTransactionPayload) {
  const response = await apiClient.post("/transactions", payload);
  return response.data;
}
```

Lợi ích:

- Dễ sửa endpoint khi Backend thay đổi.
- Dễ test.
- Component không bị phụ thuộc trực tiếp vào Axios.
- Logic gọi API được gom tập trung.

---

## 8. Hooks Architecture

Custom hook dùng để tách logic ra khỏi component.

Ví dụ:

```tsx
export function useTransactions() {
  const query = useQuery({
    queryKey: ["transactions"],
    queryFn: getTransactions,
  });

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
```

Nguyên tắc viết hook:

- Một hook chỉ nên xử lý một nhóm logic rõ ràng.
- Không viết hook quá lớn.
- Không gom tất cả logic vào một hook duy nhất.
- Tên hook phải bắt đầu bằng `use`.

Ví dụ tên tốt:

```txt
useTransactions
useCreateTransaction
useDeleteTransaction
useBudgetSummary
useAuth
```

---

## 9. Routing Architecture

Route nên được tổ chức rõ ràng theo layout.

Ví dụ:

```txt
routes/
├── AppRoutes.tsx
├── ProtectedRoute.tsx
└── PublicRoute.tsx
```

Ví dụ luồng route:

```tsx
<Route path="/" element={<DashboardLayout />}>
  <Route index element={<DashboardPage />} />
  <Route path="transactions" element={<TransactionsPage />} />
  <Route path="categories" element={<CategoriesPage />} />
  <Route path="budgets" element={<BudgetsPage />} />
  <Route path="statistics" element={<StatisticsPage />} />
</Route>
```

Các trang cần đăng nhập nên đi qua `ProtectedRoute`.

---

## 10. Quy ước đặt tên

| Thành phần | Quy ước | Ví dụ |
|---|---|---|
| Component | PascalCase | `TransactionForm.tsx` |
| Hook | useCamelCase | `useTransactions.ts` |
| Function | camelCase | `formatCurrency()` |
| Type / Interface | PascalCase | `Transaction`, `CreateTransactionPayload` |
| Service file | camelCase hoặc featureService | `transactionService.ts` |
| Store | camelCase | `authStore.ts` |
| Constant | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

Nên giữ một kiểu đặt tên thống nhất trong toàn project.

---

## 11. UI / Design System

Các component UI dùng chung nên được gom lại để tránh lặp code.

Ví dụ:

```txt
components/
├── Button.tsx
├── Input.tsx
├── Modal.tsx
├── Select.tsx
└── Card.tsx
```

Hoặc nếu project dùng cấu trúc `shared`:

```txt
shared/
├── ui/
├── hooks/
├── utils/
└── assets/
```

Nguyên tắc:

- Không copy nhiều phiên bản Button khác nhau.
- Không hard-code màu sắc quá nhiều nơi.
- Các style lặp lại nên đưa vào component hoặc class chung.
- Giao diện nên nhất quán giữa các trang.

---

## 12. Error Handling

Lỗi API nên được xử lý tập trung.

Ví dụ:

```tsx
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
```

Trong UI, cần có trạng thái rõ ràng:

- Đang tải dữ liệu
- Không có dữ liệu
- Có lỗi xảy ra
- Thành công

Ví dụ:

```tsx
if (isLoading) return <p>Đang tải...</p>;
if (error) return <p>Không thể tải dữ liệu.</p>;
if (!transactions.length) return <p>Chưa có giao dịch nào.</p>;
```

---

## 13. Performance

Chỉ tối ưu khi thật sự cần, tránh tối ưu quá sớm.

Có thể dùng:

- `React.memo()` cho component render lại nhiều lần.
- `useMemo()` cho dữ liệu tính toán nặng.
- `useCallback()` cho function truyền xuống component con.
- Lazy loading cho page lớn.
- Virtual list nếu danh sách dữ liệu rất dài.

Ví dụ lazy loading:

```tsx
const StatisticsPage = lazy(() => import("@/pages/StatisticsPage"));
```

---

## 14. Testing

Nếu có thời gian, nên ưu tiên test các phần quan trọng:

- Service gọi API
- Hook xử lý dữ liệu
- Component form
- Logic tính toán thống kê
- Validation dữ liệu nhập

Cấu trúc đề xuất:

```txt
__tests__/
├── components/
├── hooks/
├── services/
└── utils/
```

---

## 15. Nguyên tắc viết code theo hướng tự nhiên, dễ bảo vệ

Phần này không nhằm mục đích che giấu hay đánh lừa việc sử dụng công cụ hỗ trợ. Mục tiêu là đảm bảo mã nguồn giống một project được nhóm thật sự hiểu, tự kiểm soát và có thể bảo trì.

### 15.1. Code phải khớp với trình độ và phạm vi đồ án

Không nên đưa vào project những phần quá phức tạp nếu nhóm không giải thích được.

Ví dụ nên tránh:

- Kiến trúc quá nhiều tầng nhưng không cần thiết.
- Module không nằm trong báo cáo.
- Service hoặc hook không được dùng.
- Component sinh ra nhưng không import ở đâu.
- Tính năng thử nghiệm còn sót lại.

### 15.2. Không để code dư

Trước khi nộp source, cần kiểm tra và xóa:

```txt
- Component không dùng
- Hook không dùng
- Service không dùng
- Route không còn truy cập
- Comment TODO không xử lý
- Console.log dùng để debug
- File test hoặc demo không liên quan
- Module cũ đã được thay thế
```

### 15.3. Comment vừa đủ

Không nên comment quá dài cho những đoạn code đơn giản.

Không nên viết kiểu:

```tsx
// This function is responsible for handling the user input and updating the state accordingly
```

Với đoạn đơn giản, tên hàm rõ ràng là đủ:

```tsx
function handleAmountChange(value: string) {
  setAmount(value);
}
```

Chỉ nên comment khi:

- Logic khó hiểu.
- Có công thức tính toán.
- Có ràng buộc nghiệp vụ.
- Có lý do kỹ thuật đặc biệt.

### 15.4. Tên biến phải gần với nghiệp vụ

Nên đặt tên theo chức năng thật:

```tsx
transactions
monthlySummary
selectedCategory
budgetLimit
ocrResult
```

Tránh đặt tên quá chung:

```tsx
data
item
result
temp
value1
value2
```

Tuy nhiên, với các vòng lặp nhỏ thì `item` hoặc `index` vẫn chấp nhận được.

### 15.5. Giữ style code nhất quán

Toàn project nên thống nhất:

- Cách đặt tên file.
- Cách export component.
- Cách gọi API.
- Cách xử lý loading/error.
- Cách format tiền tệ/ngày tháng.
- Cách validate form.

Không nên để mỗi file viết theo một phong cách khác nhau.

### 15.6. Không over-engineering

Với đồ án vừa và nhỏ, ưu tiên code rõ ràng hơn là quá trừu tượng.

Ví dụ không cần tạo quá nhiều lớp nếu chỉ có một chức năng đơn giản.

Nên ưu tiên:

```txt
Dễ đọc
Dễ chạy
Dễ sửa
Dễ giải thích
```

Hơn là:

```txt
Quá nhiều abstraction
Quá nhiều pattern
Quá nhiều generic type
Quá nhiều helper không cần thiết
```

### 15.7. Mỗi file nên có trách nhiệm rõ ràng

Một file không nên làm quá nhiều việc.

Ví dụ:

- `transactionService.ts`: chỉ gọi API giao dịch.
- `useTransactions.ts`: chỉ xử lý query lấy danh sách giao dịch.
- `TransactionForm.tsx`: chỉ hiển thị và xử lý form giao dịch.
- `formatCurrency.ts`: chỉ format tiền tệ.

### 15.8. Code phải chạy được và nhóm phải giải thích được

Trước khi nộp, với mỗi chức năng chính, nhóm cần trả lời được:

```txt
1. File nào là giao diện chính?
2. Khi bấm nút thì hàm nào chạy?
3. API nào được gọi?
4. Dữ liệu trả về có cấu trúc ra sao?
5. Dữ liệu được hiển thị ở component nào?
6. Nếu lỗi thì UI xử lý thế nào?
7. Có phần nào không dùng nữa không?
```

Nếu không giải thích được một đoạn code, nên đọc lại, đơn giản hóa hoặc xóa nếu không cần thiết.

---

## 16. Checklist trước khi nộp source

```txt
[ ] Project chạy được trên máy khác theo README
[ ] Không nộp node_modules
[ ] Không nộp .venv
[ ] Không nộp file .env thật
[ ] Có .env.example
[ ] Có README hướng dẫn chạy
[ ] Không còn console.log debug
[ ] Không còn module dư không dùng
[ ] Không còn route lỗi
[ ] Các chức năng trong báo cáo đều chạy được
[ ] Các chức năng không có trong báo cáo đã được xóa hoặc đưa vào out of scope
[ ] Tên file và tên hàm thống nhất
[ ] Nhóm giải thích được luồng Frontend gọi Backend
```

---

## 17. Cách mô tả trong báo cáo hoặc khi bảo vệ

Có thể trình bày ngắn gọn như sau:

> Phần Frontend được xây dựng bằng ReactJS theo hướng feature-based architecture. Mỗi chức năng chính như giao dịch, danh mục, ngân sách, thống kê và trợ lý AI được tách thành các module riêng. Component giao diện được tách khỏi logic xử lý thông qua custom hook. Các request đến Backend được gom vào service layer để dễ quản lý và bảo trì. Cách tổ chức này giúp mã nguồn rõ ràng, dễ mở rộng và thuận tiện khi kiểm thử hoặc phát triển thêm chức năng mới.

Nếu được hỏi vì sao không gọi API trực tiếp trong component, có thể trả lời:

> Việc tách API ra service layer giúp component chỉ tập trung vào giao diện, còn logic giao tiếp với Backend được quản lý tập trung. Khi endpoint thay đổi, nhóm chỉ cần sửa trong service thay vì sửa ở nhiều component.

Nếu được hỏi vì sao dùng custom hook, có thể trả lời:

> Custom hook giúp tách logic xử lý ra khỏi component, làm component ngắn gọn hơn và có thể tái sử dụng logic ở nhiều nơi.

Nếu được hỏi vì sao dùng feature-based architecture, có thể trả lời:

> Vì đồ án có nhiều chức năng độc lập, tổ chức theo feature giúp mỗi chức năng có component, hook và service riêng. Điều này dễ tìm kiếm, dễ sửa lỗi và hạn chế ảnh hưởng giữa các module.
