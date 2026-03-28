# 🏀 Web Bán Đồ Thể Thao Online

> 🚀 Dự án xây dựng website thương mại điện tử bán đồ thể thao (Shopee mini)

---

## 📌 Giới thiệu

Website cho phép người dùng:

- Mua sắm sản phẩm thể thao (giày, quần áo, dụng cụ)
- Quản lý đơn hàng
- Đánh giá sản phẩm
- Quản trị hệ thống

### 🎯 Vai trò hệ thống

- 👤 User (Khách hàng)
- 🧑‍💼 Staff (Nhân viên)
- 👑 Admin

---

## 🧱 Công nghệ sử dụng

| Layer    | Tech                             |
| -------- | -------------------------------- |
| Backend  | PHP (MVC)                        |
| Frontend | HTML, CSS, Bootstrap, JavaScript |
| Database | MySQL / SQLite                   |
| Server   | Apache / Nginx                   |

---

## 📂 Cấu trúc project

/app
/controllers
/models
/views
/config
/public
/routes
/storage

---

# ⚙️ SETUP PROJECT

## 1️⃣ Clone project

```bash
git clone https://github.com/phuquoc13122005-ship-it/Webbandothethao.git
cd Webbandothethao
2️⃣ Tạo database
CREATE DATABASE webbandothethao;
3️⃣ Cấu hình DB

📁 File:

/config/database.php

✏️ Sửa:

$host = 'localhost';
$dbname = 'webbandothethao';
$username = 'root';
$password = '';
4️⃣ Import dữ liệu

Mở phpMyAdmin

Import file .sql (nếu có)

5️⃣ Run project
✔️ Local (XAMPP / Laragon)
http://localhost/Webbandothethao
✔️ PHP server
php -S localhost:8000 -t public
🔐 TÀI KHOẢN TEST
Role	Email	Password
Admin	admin@gmail.com
	123456
Staff	staff@gmail.com
	123456
User	user@gmail.com
	123456
🚀 CHỨC NĂNG HỆ THỐNG
👤 USER
✅ Đã có

Đăng ký / đăng nhập

Xem sản phẩm

Thêm giỏ hàng

Đặt hàng

❌ Cần phát triển

 Đổi mật khẩu

 Upload avatar

 Wishlist (yêu thích)

 Đánh giá sản phẩm ⭐

 Quản lý địa chỉ

 Áp dụng mã giảm giá

 Theo dõi trạng thái đơn hàng

 Chatbot tư vấn sản phẩm

🧑‍💼 STAFF

 Xem danh sách đơn hàng

 Xác nhận đơn hàng

 Cập nhật trạng thái đơn hàng

 Quản lý sản phẩm

 Quản lý danh mục

 Duyệt đánh giá

 Ẩn đánh giá không phù hợp

 Tạo mã giảm giá

👑 ADMIN
✅ Đã có

CRUD sản phẩm

Quản lý user

❌ Cần phát triển

 Dashboard thống kê

 Thống kê doanh thu

 Quản lý tồn kho

 Quản lý khuyến mãi

 Top sản phẩm bán chạy

 Quản lý đánh giá

🧠 ROADMAP PHÁT TRIỂN
🔥 PHASE 1 – Hoàn thiện backend

Chuẩn hóa database

Viết API:

/api/products

/api/orders

/api/users

🔥 PHASE 2 – Chức năng nâng cao

Wishlist system

Review system

Address system

Coupon system

Order tracking

🔥 PHASE 3 – Admin Dashboard

Chart doanh thu (Chart.js)

Thống kê:

Users

Orders

Revenue

CRUD toàn bộ hệ thống

🔥 PHASE 4 – UX/UI

Search realtime

Filter sản phẩm

Pagination

Lazy loading

🗄️ DATABASE ĐỀ XUẤT
users
id, name, email, password, role, avatar
products
id, name, price, stock, category_id, image
orders
id, user_id, total, status
order_items
id, order_id, product_id, quantity
reviews
id, user_id, product_id, rating, comment
wishlist
id, user_id, product_id
🌐 DEPLOY PRODUCTION
1️⃣ Chuẩn bị VPS
sudo apt update
sudo apt install apache2 php mysql-server
2️⃣ Deploy code
git clone <repo>
cd Webbandothethao
3️⃣ Config Apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /var/www/html/public
</VirtualHost>
4️⃣ Database
mysql -u root -p
CREATE DATABASE webbandothethao;
5️⃣ Fix lỗi thường gặp
❌ Không login được trên server

→ Chưa import database

❌ Không load ảnh
chmod -R 755 public/
⚡ TỐI ƯU

Dùng CDN (Cloudflare)

Cache dữ liệu

Lazy load ảnh

Nén gzip

🤖 HƯỚNG NÂNG CẤP

AI chatbot tư vấn

Recommendation system

Short video (TikTok style)

Thanh toán online (VNPay, Momo)

🧪 PROMPT DEV (DÙNG CHO AI BUILD)
🎯 USER FEATURE
Upgrade user module:
- Add change password
- Add avatar upload
- Add wishlist
- Add review system
- Add address CRUD
- Add coupon logic
- Add order tracking
Keep MVC unchanged
🎯 ADMIN DASHBOARD
Build admin dashboard:
- Revenue chart
- Total users/products/orders
- Order status stats
- Best selling products
No UI redesign
🎯 AUTO DEPLOY
Auto deploy project:
- Pull from GitHub
- Setup Apache
- Setup MySQL
- Configure DB
- Restart server
👨‍💻 AUTHOR
```
