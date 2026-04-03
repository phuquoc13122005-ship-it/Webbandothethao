# Hướng dẫn chỉnh giao diện FE (Nika Shop)

Đường dẫn gốc ví dụ: `WebDoTheThao/project/src/…`

> **Lưu ý:** Số dòng (line) có thể lệch 1–2 dòng nếu file đã được sửa. Trong VS Code/Cursor: `Ctrl+G` để nhảy tới dòng, hoặc tìm bằng `Ctrl+F` chuỗi cần đổi.

---

## 1. Đổi chữ "Đăng nhập"

Chữ này xuất hiện ở **nhiều chỗ** — đổi hết nếu muốn thống nhất toàn app.

| Vị trí | File | Dòng (tham khảo) | Ghi chú |
|--------|------|------------------|---------|
| Tiêu đề form | `src/pages/LoginPage.tsx` | **92** | `<h2>…Đăng nhập</h2>` |
| Nút submit form | `src/pages/LoginPage.tsx` | **177** | Text trong `<button type="submit">` |
| Link trên header (desktop) | `src/components/layout/Header.tsx` | **174** | `<span className="hidden sm:inline">Đăng nhập</span>` |
| Nút trong giỏ khi chưa login | `src/pages/CartPage.tsx` | **18, 19, 24** | Tiêu đề / mô tả / nút |
| Đăng nhập staff/admin | `src/pages/StaffAdminLoginPage.tsx` | **34, 171, 179** | Tiêu đề và nút |
| Link từ trang đăng ký | `src/pages/RegisterPage.tsx` | **172** | Link sang `/login` |

**Cách làm:** Mở file → tìm chuỗi `Đăng nhập` (hoặc `đăng nhập` trong câu) → sửa trực tiếp trong JSX.

**Ví dụ** (`LoginPage.tsx` dòng 92):

```tsx
<h2 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập</h2>
```

Đổi thành ví dụ:

```tsx
<h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h2>
```

---

## 2. Đổi chữ "Nika" / tên shop

Tên thường tách 2 phần: phần trước + phần màu (`Shop`, `Sports`…).

| Nội dung | File | Dòng (tham khảo) |
|----------|------|------------------|
| Logo **Nika** + **Sports** (header) | `src/components/layout/Header.tsx` | **75** |
| **Nika** + **Shop** (footer) | `src/components/layout/Footer.tsx` | **15**, **89** (copyright) |
| Panel trái + mobile (trang login) | `src/pages/LoginPage.tsx` | **69**, **89** |
| Đăng ký | `src/pages/RegisterPage.tsx` | **54**, **82** |
| Reset mật khẩu | `src/pages/ResetPasswordPage.tsx` | **69** |
| Xác thực OTP | `src/pages/VerifyResetCodePage.tsx` | **52** |
| Admin sidebar | `src/pages/StaffDashboardPage.tsx` | **1410** (`Nika Admin`) |
| Mặc định thương hiệu sản phẩm | `src/pages/ProductDetailPage.tsx` | **263**, **452** (`NikaSports`) |
| Staff login mô tả | `src/pages/StaffAdminLoginPage.tsx` | **36** |

**Ví dụ** đổi logo header (`Header.tsx` dòng 75):

```tsx
Nika<span className="text-teal-600">Sports</span>
```

→ ví dụ:

```tsx
Sport<span className="text-teal-600">Zone</span>
```

**Gợi ý:** Muốn đổi **một lần cho cả app**, có thể sau này gom thành hằng số hoặc file `src/config/branding.ts` — hiện tại project đang gõ trực tiếp từng chỗ.

**Tiêu đề tab trình duyệt:** `index.html` (thư mục `project/`) — thẻ `<title>` (khoảng dòng **7**).

---

## 3. Làm to ô đăng nhập (form trên `LoginPage`)

File: `src/pages/LoginPage.tsx`

### 3.1. Làm rộng cả khối form (cột phải)

- **Dòng ~82:** `max-w-md` (tối đa ~28rem) — đổi lớn hơn, ví dụ:
  - `max-w-lg` (~32rem)
  - `max-w-xl` (~36rem)
  - `max-w-2xl` (~42rem)

```tsx
<div className="w-full max-w-md">
```

→

```tsx
<div className="w-full max-w-xl">
```

### 3.2. Làm cao / to chữ trong ô Email và Mật khẩu

- **Email input — dòng ~138:** class hiện tại có `px-4 py-3` và `text-sm`.
- **Mật khẩu input — dòng ~151:** tương tự.

Ví dụ chỉnh **dày và chữ to hơn**:

- `px-4 py-3` → `px-5 py-4` (hoặc `py-4`, `py-5`)
- `text-sm` → `text-base` (16px) hoặc `text-lg`

**Ví dụ** (ô email):

```tsx
className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
```

Áp dụng tương tự cho ô mật khẩu (giữ `pr-12` vì có nút con mắt).

### 3.3. Label to hơn (tuỳ chọn)

- **Dòng ~131, ~143:** `text-sm` trên `<label>` → đổi `text-base`.

### 3.4. Nút "Đăng nhập" và Google cao hơn

- **Google button — dòng ~106:** `py-3.5` → `py-4` hoặc `py-5`
- **Submit — dòng ~171:** `py-3.5` → `py-4` hoặc `py-5`

---

## Tóm tắt nhanh

| Muốn… | File chính | Gợi ý |
|--------|------------|--------|
| Đổi tiêu đề / nút "Đăng nhập" (trang login) | `LoginPage.tsx` | 92, 177 |
| Đổi chữ header | `Header.tsx` | 174 |
| Đổi tên Nika toàn site | Nhiều file (bảng mục 2) | Tìm `Nika` bằng search toàn project |
| Form login rộng hơn | `LoginPage.tsx` | `max-w-md` → `max-w-lg` / `max-w-xl` |
| Ô input cao & chữ to | `LoginPage.tsx` | `py-3` → `py-4/5`, `text-sm` → `text-base` |

Tìm nhanh trong project (từ thư mục `WebDoTheThao/project`):

```bash
# PowerShell — liệt kê file có chữ Đăng nhập
rg "Đăng nhập" src
```

```bash
rg "Nika" src
```
