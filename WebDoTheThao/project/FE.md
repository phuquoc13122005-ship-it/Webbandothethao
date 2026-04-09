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

## 4. Chọn màu sắc, kích thước, số lượng trước khi thêm vào giỏ

File chính: **`src/pages/ProductDetailPage.tsx`**, **`src/contexts/CartContext.tsx`**, type **`src/types/index.ts`**.

> **Mẹo:** Trong Cursor/VS Code mở file → `Ctrl+G` → gõ số dòng để nhảy thẳng tới dòng đó.

### 4.0. Bảng tra nhanh theo dòng (để kiểm tra / theo dõi)

#### `ProductDetailPage.tsx`

| Dòng | Nội dung |
|------|----------|
| **14–28** | `parseOptionList` — tách chuỗi màu/size từ DB (`;` `,` hoặc ` / `). |
| **31–47** | `parseImageGallery` — ảnh phụ (JSON + ảnh chính). |
| **57–63** | State: `quantity`, `selectedSize`, `selectedColor`, `adding`, … |
| **64–70** | `sizeOptions` — từ `size_options` hoặc fallback theo `size_type` / danh mục. |
| **71–74** | `colorOptions` — từ `color_options` hoặc `['Mặc định']`. |
| **75–78** | `requiresNumericSize` — toàn bộ size là số (giày) hay không. |
| **79–89** | `sizeStockMap` — parse JSON `size_stock`. |
| **90–101** | `hasSizeStockMap`, `inStockSizeOptions`, `selectedSizeStock`, **`availableStock`**. |
| **107–144** | Load SP: `db.from('products').select('*, categories(*)').eq('slug', …)` + sản phẩm liên quan. |
| **146–150** | Tự chọn màu đầu tiên khi đổi `colorOptions`. |
| **158–171** | Tự chọn size hợp lệ (còn hàng / có trong list). |
| **173–195** | **`handleAddToCart`** — kiểm tra login, size, tồn → `addToCart(product.id, quantity, numericSize)`. |
| **197–201** | **`handleBuyNow`** — gọi `handleAddToCart` rồi `navigate('/cart')`. |
| **289–312** | **UI chọn màu** — radio, `setSelectedColor`. |
| **314–343** | **UI chọn size** — nút size / báo hết size. |
| **345–363** | **UI số lượng** — `-` / `+`, `setQuantity`, giới hạn `availableStock`. |
| **372–387** | **Nút Mua ngay / Thêm vào giỏ** — `onClick={handleBuyNow}` / `handleAddToCart`. |

#### `CartContext.tsx`

| Dòng | Nội dung |
|------|----------|
| **6–16** | Kiểu context: `addToCart(productId, quantity?, shoeSize?)`. |
| **21–25** | Cấu trúc một dòng giỏ local (Google): `product_id`, `shoe_size`, `quantity`. |
| **27–51** | `getLocalCartKey`, `readLocalCart`, `writeLocalCart` — `localStorage` key `cart_google_<id>`. |
| **53–62** | `buildLocalItemId`, `parseLocalItemId` — id ảo cho dòng giỏ Google. |
| **69–118** | **`fetchCart`** — Google: đọc local + join `products`; thường: `cart_items` + `products(*)`. |
| **124–190** | **`addToCart`** — Google: gộp vào localStorage; thường: `insert`/`update` `cart_items`. |
| **165–169** | `insert` MySQL: `{ user_id, product_id, shoe_size, quantity }`. |
| **181–184** | `update` số lượng khi đã có cùng `product_id` + `shoe_size`. |

#### `types/index.ts` (interface)

| Dòng | Nội dung |
|------|----------|
| **12–33** | **`Product`**: `color_options`, `size_options`, `size_stock`, `size_type`, `stock`, … |
| **35–43** | **`CartItem`**: `product_id`, `shoe_size`, `quantity` — **không có trường màu**. |

### 4.1. Luồng người dùng (từng bước + tham chiếu dòng)

1. Vào **`/products/:slug`** → load SP: **`ProductDetailPage.tsx` 116–120** (`db.from('products')…`).
2. **Màu:** UI **289–312**, state khai báo **59**, reset khi đổi SP **112**, mặc định **146–149**.
3. **Size:** danh sách **64–70**, tồn theo size **79–94**, UI **314–343**, auto chọn size **158–171**.
4. **Số lượng:** state **57**, UI **345–363**, tồn tối đa **101**.
5. **Thêm giỏ / Mua ngay:** **372–387** → logic **173–201**.
6. Chưa login → **174–176** chuyển `/login`. Sai điều kiện size/tồn → **179–190** (`alert`).

### 4.2. Dữ liệu sản phẩm (đọc từ DB / API)

Các trường trên interface **`Product`** — file **`src/types/index.ts`**, dòng **27–30** (`color_options`, `size_options`, `size_stock`, `size_type`) và **24** (`stock`).

| Trường | Ý nghĩa trong FE |
|--------|-------------------|
| `color_options` | Chuỗi màu; parse tại **`parseOptionList` (14–28)** + **`colorOptions` (71–74)**. |
| `size_options` | Chuỗi size; **`sizeOptions` (64–70)**. |
| `size_stock` | JSON tồn theo size; **`sizeStockMap` (79–89)**. |
| `stock` | Tồn chung khi không dùng map; dùng ở **`availableStock` (101)**. |
| `size_type` | Fallback list size; **64–69**. |

### 4.3. Khi bấm “Thêm vào giỏ” — gọi hàm nào, tham số nào?

**`handleAddToCart`** — **`ProductDetailPage.tsx` 173–193**:

- Dòng **187**: `numericSize` = số nếu size là chuỗi toàn chữ số (giày), ngược lại `null` (áo `S`, `M`, …).
- Dòng **193**: `await addToCart(product.id, quantity, numericSize)`.

**Màu:** `selectedColor` **không** được truyền vào `addToCart` — không lưu xuống giỏ/DB. Muốn lưu màu: thêm cột + sửa **193** và **`CartContext` `addToCart` (124)** + **`CartItem` (`types` 35–43)**.

### 4.4. `CartContext` — lưu giỏ và gộp dòng

**Hàm `addToCart`:** **`CartContext.tsx` 124–190**.

| Loại user | Dòng cần xem | Cách lưu |
|-----------|----------------|----------|
| Google | **126–138** | `readLocalCart` / `writeLocalCart`, key **`cart_google_<userId>`** (định nghĩa **27–28**). |
| Thường | **141–189** | Cùng `product_id` + `shoe_size` → cộng `quantity` (**142–149**, **181–184**); dòng mới → **`insert` 165–169**. |

Nạp lại giỏ: **`fetchCart` 69–118**, gọi sau login / sau thêm (**137**, **173**).

### 4.5. File khác liên quan

| Việc | File |
|------|------|
| Hiển thị giỏ, xóa dòng, đổi SL/size, checkout | `src/pages/CartPage.tsx` — chi tiết số dòng ở **mục 5.3** |
| Schema DB `cart_items` | tuỳ project (migration / `auth-server` whitelist bảng `cart_items`) |

### 4.6. Tóm tắt luồng dữ liệu (sơ đồ ý)

```
products (DB)
    → ProductDetailPage (chọn màu* UI 289+, size, qty 345+)
         → handleAddToCart 173 → addToCart 124 (CartContext)
              → cart_items (MySQL) HOẶC localStorage (Google)
                         → CartPage / Checkout
```

\* *Màu: chỉ UI, không vào `addToCart` — xem **4.3**.*

---

## 5. Giỏ hàng: xóa sản phẩm & chọn thuộc tính trước khi thêm vào giỏ

### 5.1. Chọn thuộc tính (màu, kích thước, số lượng) **trước** khi thêm giỏ — cách hoạt động

Luồng này xảy ra **trên trang chi tiết sản phẩm**, **trước** khi gọi `addToCart`. Đã mô tả **đầy đủ + bảng số dòng** ở **mục 4**; dưới đây là **tóm tắt** để đối chiếu với giỏ hàng (mục 5).

| Thuộc tính | Nơi chọn | Lưu xuống giỏ / DB? | Xem chi tiết |
|------------|----------|---------------------|--------------|
| **Màu sắc** | `ProductDetailPage` — UI **289–312**, state `selectedColor` **59** | **Không** — chỉ hiển thị trên trang chi tiết | **Mục 4.3** |
| **Kích thước (size)** | `ProductDetailPage` — UI **314–343** | **Có** — nếu size là số (giày) → `shoe_size` trong `cart_items` / localStorage; size chữ (S, M…) → thường `shoe_size = null` | **Mục 4.3**, **4.4** |
| **Số lượng** | `ProductDetailPage` — UI **345–363**, state `quantity` **57** | **Có** — trường `quantity` khi `addToCart` **193** | **Mục 4.1** |

**Luồng tóm tắt:** đăng nhập → chọn màu (tuỳ chọn UI) → chọn size (bắt buộc nếu SP có size) → chỉnh số lượng trong giới hạn tồn → **Thêm vào giỏ** → `handleAddToCart` **173–193** → `CartContext.addToCart` **124–190**.

---

### 5.2. Xóa sản phẩm có trong giỏ hàng — cách hoạt động

1. User vào **`/cart`** (`CartPage`) — **phải đăng nhập**; chưa login thì **14–28** (gợi ý đăng nhập).
2. Mỗi dòng giỏ là một **`CartItem`** (`item.id` là id bản ghi `cart_items`, hoặc id ảo `local::…` nếu Google).
3. **Xóa** gọi **`removeFromCart(item.id)`** từ `useCart()`:
   - **Nút thùng rác** (góc dòng): **`CartPage.tsx` 95–101** — `onClick={() => removeFromCart(item.id)}`.
   - **Link “Xóa sản phẩm”** (dưới chỉnh SL): **139–145** — cùng gọi `removeFromCart(item.id)`.
4. **Trong `CartContext.tsx` — `removeFromCart` (249–269):**
   - **Google:** đọc `localStorage` → lọc bỏ dòng trùng `product_id` + `shoe_size` → ghi lại → `setItems` bỏ dòng (**251–258**).
   - **User thường:** optimistic `setItems` bỏ dòng (**262**) → **`DELETE` MySQL** `cart_items` theo `id` (**264**) — lỗi thì khôi phục + `fetchCart` (**265–267**).

Sau khi xóa hết dòng → **`CartPage` 39–53** hiện “Giỏ hàng trống”.

---

### 5.3. Bảng tra nhanh theo dòng — giỏ & xóa

#### `CartPage.tsx`

| Dòng | Nội dung |
|------|----------|
| **10** | `useCart`: `updateQuantity`, `updateItemSize`, **`removeFromCart`**. |
| **12** | `shoeSizes` 36–45 — option trong `<select>` size. |
| **14–28** | Chưa login — không xem được giỏ. |
| **39–53** | Giỏ rỗng. |
| **56–64** | **`handleCheckout`** — bắt buộc mọi dòng có `shoe_size` (alert nếu thiếu) → lưu draft → `/checkout`. |
| **74–153** | **`items.map`** — mỗi thẻ một dòng giỏ. |
| **95–101** | **Xóa** — icon thùng rác → `removeFromCart(item.id)`. |
| **107–119** | **Đổi size trong giỏ** — `<select>` → `updateItemSize(item.id, …)` (chỉ list size số 36–45). |
| **121–138** | **Đổi số lượng** — `updateQuantity(item.id, …)`. |
| **139–145** | **Xóa sản phẩm** (chữ) — cùng `removeFromCart(item.id)`. |

#### `CartContext.tsx` (sau khi đã thêm vào giỏ)

| Dòng | Nội dung |
|------|----------|
| **192–213** | **`updateQuantity`** — Google: sửa mảng local; thường: `UPDATE cart_items SET quantity`. |
| **215–247** | **`updateItemSize`** — Google: đổi `shoe_size` + đổi `id` dòng (`buildLocalItemId`); thường: `UPDATE cart_items SET shoe_size`. |
| **249–269** | **`removeFromCart`** — Google: `filter` localStorage; thường: **`DELETE FROM cart_items WHERE id = ?`**. |
| **271–281** | **`clearCart`** — xóa toàn bộ giỏ user (ít dùng trên UI `CartPage` hiện tại). |

---

### 5.4. Sơ đồ luồng (trang chi tiết → giỏ → xóa)

```
ProductDetailPage (chọn màu*, size, SL — mục 4)
       → addToCart
            → cart_items / localStorage
                   → CartPage hiển thị (74+)
                         → removeFromCart (95 hoặc 139)
                               → DELETE cart_items hoặc ghi lại localStorage
```

\* *Màu không đi vào giỏ — xem mục 4.*

---

### 5.5. Lưu ý khi chỉnh code

| Việc | File / vị trí |
|------|----------------|
| Đổi UI nút xóa / thêm xác nhận trước khi xóa | `CartPage.tsx` **95–101**, **139–145** |
| Đổi logic xóa / đồng bộ DB | `CartContext.tsx` **`removeFromCart` 249–269** |
| Giỏ chỉnh size chữ (S, M) giống trang chi tiết | Hiện `CartPage` chỉ có **select số 36–45** (**107–119**) — cần mở rộng nếu muốn đồng bộ với `size_options` SP |

---

## Tóm tắt nhanh

| Muốn… | File chính | Gợi ý |
|--------|------------|--------|
| Đổi tiêu đề / nút "Đăng nhập" (trang login) | `LoginPage.tsx` | 92, 177 |
| Đổi chữ header | `Header.tsx` | 174 |
| Đổi tên Nika toàn site | Nhiều file (bảng mục 2) | Tìm `Nika` bằng search toàn project |
| Form login rộng hơn | `LoginPage.tsx` | `max-w-md` → `max-w-lg` / `max-w-xl` |
| Ô input cao & chữ to | `LoginPage.tsx` | `py-3` → `py-4/5`, `text-sm` → `text-base` |
| Luồng chọn màu / size / SL → giỏ | `ProductDetailPage.tsx`, `CartContext.tsx`, `types/index.ts` | Mục **4** — bảng **4.0** (số dòng cụ thể) |
| **Xóa SP trong giỏ**, sửa SL/size trong giỏ, checkout | `CartPage.tsx`, `CartContext.tsx` | Mục **5** — bảng **5.3** |
| **Tóm tắt** chọn thuộc tính trước khi thêm giỏ | — | Mục **5.1** (tham chiếu mục **4**) |

Tìm nhanh trong project (từ thư mục `WebDoTheThao/project`):

```bash
# PowerShell — liệt kê file có chữ Đăng nhập
rg "Đăng nhập" src
```

```bash
rg "Nika" src
```
