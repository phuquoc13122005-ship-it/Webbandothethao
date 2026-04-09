# Hướng dẫn sử dụng dự án NikaSports (Web đồ thể thao)

Tài liệu mô tả cách người dùng thao tác trên giao diện (UI) và cách server (backend) hoạt động, đặc biệt phần **xác thực người dùng** và **API liên quan tài khoản**.

---

## 1. Kiến trúc tổng quan

| Thành phần | Vai trò |
|------------|---------|
| **Frontend** | Ứng dụng React (Vite), chạy mặc định tại `http://localhost:5173`. Gọi API qua biến `VITE_AUTH_SERVER_URL` (mặc định `http://localhost:4000`). |
| **Backend** | File `auth-server.js` (Node.js + Express), cổng mặc định `4000`. Kết nối MySQL, quản lý session cookie, auth, CRUD qua API, upload ảnh. |
| **Cơ sở dữ liệu** | MySQL (tên DB mặc định trong `.env`: thường là `nikashop`). |

**Cookie phiên đăng nhập:** Backend đặt cookie tên `sid` (httpOnly, sameSite=lax). Trình duyệt gửi kèm mọi request có `credentials: 'include'` từ frontend.

---

## 2. Chạy dự án trên máy

1. **Cấu hình môi trường:** Sao chép `.env.example` thành `.env` ở thư mục gốc (cùng cấp `auth-server.js`). Điền thông tin MySQL, `SESSION_SECRET`, `FRONTEND_URL`, và nếu dùng Google OAuth / SMTP thì điền thêm biến tương ứng.

2. **Cài dependency backend (thư mục gốc):**
   - `npm install`

3. **Chạy API server:**
   - `npm run dev:auth`  
   - Mặc định: `http://localhost:4000`

4. **Cài dependency và chạy frontend (`WebDoTheThao/project`):**
   - `npm install`
   - `npm run dev`  
   - Mặc định: `http://localhost:5173`

5. **Đồng bộ URL:** Trong `WebDoTheThao/project`, file `.env` hoặc env Vite nên có `VITE_AUTH_SERVER_URL=http://localhost:4000` (hoặc URL server thật khi deploy).

---

## 3. Giao diện người dùng (khách hàng)

Các trang nằm trong layout chung (header, footer, điều hướng).

### 3.1 Trang chủ (`/`)

- Xem danh mục, sản phẩm nổi bật, khuyến mãi, **sản phẩm mới** (theo quy tắc: sản phẩm tạo trong vòng 7 ngày gần nhất).
- Không cần đăng nhập để xem.

### 3.2 Danh sách & chi tiết sản phẩm

- **`/products`:** Lọc/tìm sản phẩm theo danh mục (query `category=...`).
- **`/products/:slug`:** Chi tiết một sản phẩm: chọn màu, size (theo tồn kho), số lượng, thêm giỏ / mua ngay.
- Dữ liệu lấy từ API đọc bảng `products`, `categories` (xem mục Backend).

### 3.3 Giỏ hàng (`/cart`)

- **Đã đăng nhập (tài khoản local/email):** Giỏ lưu trên server (bảng `cart_items`), đồng bộ theo user.
- **Đăng nhập Google:** Giỏ có thể lưu tạm trong `localStorage` theo user id (logic trong `CartContext`).

### 3.4 Thanh toán (`/checkout`)

- Yêu cầu đăng nhập và có sản phẩm trong giỏ.
- Tạo đơn qua RPC `create_checkout_order_atomic` (transaction: tạo `orders`, `order_items`, trừ tồn kho).

### 3.5 Tài khoản & đăng nhập

- **`/register`:** Đăng ký email + mật khẩu (+ họ tên). Sau khi thành công, server tạo bản ghi `users` + `profiles` (role mặc định `customer`) và gắn session.
- **`/login`:** Đăng nhập email/mật khẩu hoặc đăng nhập Google (chuyển hướng sang backend OAuth rồi quay lại frontend).
- **`/forgot-password`:** Một trang gộp: gửi mã OTP → nhập 6 số (tự gọi xác minh) → nhập mật khẩu mới. Frontend gọi đúng các API `/api/auth/*` qua `db.auth` (xem mục **3.5.1**).
- **`/verify-reset-code` → `/reset-password`:** Luồng nhiều bước tùy chọn; sau khi xác minh OTP, user có session rồi đổi mật khẩu bằng `update-password` (cùng backend như trên).
- **`/dashboard`:** Trang tài khoản cá nhân (đơn hàng, thông tin, v.v. tùy triển khai trên `DashboardPage`).

### 3.5.1 Quên mật khẩu — luồng và API (quan trọng khi gỡ lỗi)

Backend **không** có các đường dẫn kiểu `/auth/password/send-code`, `verify-code`, `reset`. Toàn bộ quên mật khẩu phải dùng các endpoint sau (cookie `sid` + `credentials: 'include'` sau bước xác minh):

| Bước | API | Body (JSON) gợi ý |
|------|-----|-------------------|
| 1. Gửi mã | `POST /api/auth/send-otp` | `{ "email": "user@domain.com" }` — không dùng `shouldCreateUser` (mặc định `false`) để chỉ gửi cho tài khoản đã tồn tại. |
| 2. Xác minh mã | `POST /api/auth/verify-otp` | `{ "email": "...", "token": "123456" }` — thành công thì server tạo **session** cho user đó. |
| 3. Đổi mật khẩu | `POST /api/auth/update-password` | `{ "password": "..." }` — **bắt buộc đã có session** từ bước 2. |

**Giao diện:** Trang `ForgotPasswordPage.tsx` dùng `db.auth.signInWithOtp` (gửi OTP), `db.auth.verifyOtp`, `db.auth.updateUser` / `signOut` — khớp với bảng trên.

**Điều kiện gửi mã:** Email phải có dạng hợp lệ (có ký tự `@`) và đã đăng ký trong bảng `users`; nếu không, server trả lỗi (ví dụ `USER_NOT_FOUND`, `EMAIL_INVALID`).

**Email thật:** Cấu hình SMTP trong `.env` gốc (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). Nếu **chưa cấu hình SMTP**, server vẫn tạo mã OTP nhưng chỉ **in ra console** terminal đang chạy `auth-server.js` (dòng dạng `[OTP] email: mã`).

**Lỗi thường gặp:** Frontend chỉ chạy `npm run dev` mà **không** chạy `npm run dev:auth`, hoặc `VITE_AUTH_SERVER_URL` trỏ sai → không gửi được mã / báo lỗi kết nối. Đảm bảo API chạy (mặc định `http://localhost:4000`) và biến Vite trùng URL đó.

### 3.6 Đăng nhập nhân viên / admin (UI riêng)

- **`/login/staff`**, **`/login/admin`:** Form đăng nhập dành cho vai trò quản trị (cùng component `StaffAdminLoginPage`, có thể phân biệt theo route).
- **`/staff-dashboard`:** Dashboard nhân viên.
- **`/admin-dashboard`:** Dashboard quản trị viên (cùng `StaffDashboardPage`, kiểm tra `role` trong `profiles`).

---

## 4. Giao diện quản trị (Admin / Staff)

Trong sidebar:

- **Dashboard:** Tổng quan doanh thu, biểu đồ, v.v.
- **Sản phẩm:** Danh sách, thêm/sửa sản phẩm (giá gốc, % giảm giá, ảnh, gallery, size/màu, v.v.), **sản phẩm mới** (lọc 7 ngày), **sản phẩm nổi bật** (theo cờ `featured` — bật/tắt chủ yếu trong form **Sửa** sản phẩm), quản lý kho theo size, các mục kho khác (placeholder).
- **Danh mục, Đơn hàng, Khách hàng, Khuyến mãi, Đánh giá, Hỗ trợ:** Theo tab tương ứng.

Mọi thao tác lưu dữ liệu đều gọi API backend kèm session (phải đã đăng nhập user có quyền).

---

## 5. Backend (BE) — phần người dùng & phiên làm việc

File chính: **`auth-server.js`** (Express).

### 5.1 Session

- Dùng `express-session`, cookie `sid`.
- Sau khi **đăng ký / đăng nhập / OAuth Google / xác minh OTP**, server ghi `req.session.user` gồm ít nhất: `id`, `email`, `provider`, `full_name`, `avatar_url`.
- Các route cần đăng nhập dùng middleware `requireSession`: nếu không có `req.session.user.id` → trả `401 UNAUTHENTICATED`.

### 5.2 API xác thực người dùng (user-facing)

| Phương thức & đường dẫn | Mô tả |
|-------------------------|--------|
| `POST /api/auth/register` | Tạo user + profile customer, hash mật khẩu (bcrypt), tự đăng nhập (session). |
| `POST /api/auth/login` | Kiểm tra email/mật khẩu, tạo session. |
| `POST /api/auth/logout` | Hủy session, xóa cookie. |
| `GET /api/auth/session` | Trả session hiện tại (user đã chuẩn hóa) hoặc `null`. |
| `GET /api/auth/user` | Trả user; nếu chưa đăng nhập → 401. |
| `GET /auth/google` | Bắt đầu luồng OAuth Google. |
| `GET /auth/google/callback` | Google trả `code`; server đổi token, lấy thông tin user, ghi session, redirect về `FRONTEND_URL`. |
| `GET /auth/me` | Kiểm tra session Google-style (dùng cho client sau redirect). |
| `POST /auth/logout` | Phiên bản logout tương thích luồng cũ. |
| `POST /api/auth/send-otp` | Gửi mã OTP (email nếu có SMTP; không thì log ra console). |
| `POST /api/auth/verify-otp` | Xác minh OTP, tạo session cho user tương ứng. |
| `POST /api/auth/update-password` | **Cần session.** Cập nhật `password_hash` cho user hiện tại. |

Frontend (`AuthContext`, `db.ts`) thường gọi `getSession` qua `/api/auth/session` và các hàm signIn/signUp/signOut tương ứng.

### 5.3 API đọc/ghi cơ sở dữ liệu (dùng chung cho app)

- **`POST /api/db/query`:** SELECT.  
  - Bảng **`products`**, **`categories`:** cho phép đọc **không cần đăng nhập** (khách xem shop).  
  - Các bảng khác trong whitelist: cần session.
- **`POST /api/db/insert`**, **`update`**, **`delete`:** **Luôn cần đăng nhập.**  
  Whitelist bảng: `profiles`, `categories`, `products`, `cart_items`, `orders`, `order_items`, `support_requests`, `promotions`, `reviews`.

**Lưu ý bảo mật:** Hiện tại sau khi đăng nhập, client có thể gọi insert/update/delete theo whitelist; trong môi trường production nên bổ sung kiểm tra **role** (chỉ admin/staff được sửa sản phẩm, đơn hàng, v.v.).

### 5.4 Ảnh (user đã đăng nhập — thường là admin upload)

- **`GET /api/images/:id`:** Trả file ảnh từ bảng `uploaded_images` (public để hiển thị URL ảnh).
- **`POST /api/images/upload`:** **Cần session.** Nhận body nhị phân image, lưu BLOB, trả URL dạng `/api/images/{id}`.

### 5.5 Đặt hàng (user đã đăng nhập)

- **`POST /api/db/rpc`** với `fn: 'create_checkout_order_atomic'`: tạo đơn + dòng đơn + cập nhật tồn kho trong transaction.

### 5.6 Khởi tạo DB khi server chạy

- Tạo bảng `uploaded_images` nếu chưa có.
- Thêm cột thiếu trên `products` / `categories` (màu, size, gallery, v.v.) qua `information_schema` + `ALTER TABLE` (tương thích MySQL không hỗ trợ `IF NOT EXISTS` trên cột).

---

## 6. Luồng tóm tắt: khách → đăng nhập → mua hàng

1. Khách xem `products` / `categories` không cần login (query public).
2. Thêm giỏ: nếu user local → `cart_items` trên server; nếu Google → có thể dùng localStorage theo thiết kế hiện tại.
3. Checkout: cần session hợp lệ → RPC tạo đơn.
4. Admin đăng nhập (staff/admin) → vào dashboard → insert/update `products`, `categories`, v.v. qua cùng API DB (nên kiểm tra role ở tầng server trong tương lai).

---

## 7. File tham chiếu nhanh

- Backend: `auth-server.js`
- Frontend API client: `WebDoTheThao/project/src/lib/db.ts`
- Phiên đăng nhập UI: `WebDoTheThao/project/src/contexts/AuthContext.tsx`
- Quên mật khẩu (một trang): `WebDoTheThao/project/src/pages/ForgotPasswordPage.tsx`
- Xác minh mã / đổi mật khẩu (luồng nhiều trang): `VerifyResetCodePage.tsx`, `ResetPasswordPage.tsx`
- Định tuyến trang: `WebDoTheThao/project/src/App.tsx`

---

*Tài liệu được tạo theo trạng thái mã nguồn tại thời điểm viết. Nếu thêm route hoặc middleware mới, nên cập nhật lại mục 3 và 5 cho khớp.*
