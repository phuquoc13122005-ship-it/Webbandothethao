- **Ngày/Giờ:** 2026-04-04 16:15:49
- **Tính năng:** Thanh bộ lọc danh mục sản phẩm kiểu VNB
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Nâng cấp `WebDoTheThao/project/src/pages/ProductsPage.tsx` với sidebar lọc mới gồm mức giá, thương hiệu, chi nhánh, size; bổ sung URL params cho lọc đa lựa chọn và hiển thị chip trạng thái bộ lọc đã chọn.

- **Ngày/Giờ:** 2026-04-04 16:19:41
- **Tính năng:** Bổ sung nhóm lọc nâng cao theo mẫu VNB
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/ProductsPage.tsx` để thêm các nhóm lọc Đối tượng, Điểm nổi bật, Form giày, Thể loại chơi, Phân khúc; bổ sung logic lọc tương ứng và chip hiển thị trạng thái đang lọc.

- **Ngày/Giờ:** 2026-04-04 16:24:02
- **Tính năng:** Mở rộng form thêm/sửa sản phẩm admin theo bộ lọc VNB
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx`, `WebDoTheThao/project/src/types/index.ts`, `auth-server.js` để admin nhập thêm chi nhánh, đối tượng, điểm nổi bật, form giày, thể loại chơi, phân khúc và lưu/đọc trực tiếp từ bảng `products`.

- **Ngày/Giờ:** 2026-04-04 16:28:44
- **Tính năng:** Đồng bộ chi nhánh từ DB cho form admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Tạo/seed bảng `branches` với các chi nhánh Quận 1/2/3/4/5/8 trong DB; cập nhật `auth-server.js` cho phép truy vấn `branches`; đổi ô chi nhánh ở `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` sang dropdown lấy dữ liệu trực tiếp từ DB.

- **Ngày/Giờ:** 2026-04-04 16:32:15
- **Tính năng:** Tối giản header và nhãn phụ dashboard admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để xoá dòng mô tả “Tổng quan...readme.md”, xoá ô tìm kiếm header, xoá nhãn “Thiết kế theo luồng thêm sản phẩm của Sapo”, và bỏ footer mô tả có nhắc `readme.md`.

- **Ngày/Giờ:** 2026-04-04 16:35:21
- **Tính năng:** Tự động tăng thứ tự banner khi tạo mới
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Sửa `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để `sort_order` banner mới tự lấy `max + 1` (không có banner thì bắt đầu từ 1), hiển thị trường thứ tự dạng readonly và loại bỏ nhập tay.

- **Ngày/Giờ:** 2026-04-04 16:37:47
- **Tính năng:** Đưa mục Sản phẩm mới lên đầu trang chủ
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để di chuyển section “Sản phẩm mới nhất” lên đầu phần nội dung trang chủ (ngay sau khối tiện ích), giữ nguyên logic dữ liệu và giao diện từng card.

- **Ngày/Giờ:** 2026-04-04 16:41:58
- **Tính năng:** Thanh tab danh mục cho mục Sản phẩm mới
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để thêm tab `Tất cả + danh mục động từ DB` cho section Sản phẩm mới; khi chọn tab chỉ hiển thị sản phẩm mới thuộc danh mục đó, tự động cập nhật khi thêm danh mục mới.

- **Ngày/Giờ:** 2026-04-04 16:43:27
- **Tính năng:** Kéo ngang thanh tab danh mục sản phẩm mới
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để hỗ trợ kéo ngang bằng chuột (drag scroll) cho thanh tab danh mục trong mục Sản phẩm mới, giúp xem thêm danh mục khi vượt chiều rộng màn hình.

- **Ngày/Giờ:** 2026-04-04 16:50:23
- **Tính năng:** Thiết kế lại block danh mục theo style ảnh tham chiếu
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để đổi section danh mục sang layout ô vuông tông cam và nhãn đè chéo như mẫu; giữ click mỗi danh mục chuyển tới trang `/products?category=<slug>` để hiển thị sản phẩm đúng danh mục.

- **Ngày/Giờ:** 2026-04-04 17:04:48
- **Tính năng:** Phân nhóm danh mục theo bộ môn và hiển thị block cầu lông
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật DB + code gồm `auth-server.js`, `WebDoTheThao/project/src/types/index.ts`, `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx`, `WebDoTheThao/project/src/pages/HomePage.tsx` để thêm trường `categories.product_group`, bổ sung ô chọn nhóm (cầu lông/tennis/pickleball/khác) trong form admin danh mục, và section trang chủ hiển thị tiêu đề “Sản phẩm cầu lông” cùng các ô danh mục ảnh theo nhóm đã chọn.

- **Ngày/Giờ:** 2026-04-04 17:14:15
- **Tính năng:** Quản lý tiêu đề section danh mục động cho trang chủ
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Mở rộng DB với bảng `home_category_sections`, cập nhật `auth-server.js` whitelist/read table mới, thêm UI trong `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để tạo/xóa section (chọn nhóm + chọn danh mục), và cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để render các section danh mục theo dữ liệu admin; đã chạy cập nhật DB và seed mặc định section “Sản phẩm cầu lông”.

- **Ngày/Giờ:** 2026-04-04 17:22:49
- **Tính năng:** Tách bộ lọc theo ngữ cảnh giày và áo/quần/váy
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/ProductsPage.tsx` để chỉ hiện các block filter dành cho giày khi xem danh mục giày; khi xem danh mục áo/quần/váy thì hiện bộ filter riêng `Loại trang phục` và ẩn các block `Form giày/Thể loại chơi/Phân khúc` nhằm khớp hành vi như mẫu.

- **Ngày/Giờ:** 2026-04-04 17:27:30
- **Tính năng:** Chuẩn hóa sidebar lọc về mẫu mức giá/thương hiệu/chi nhánh/size
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/ProductsPage.tsx` để bỏ các block lọc nâng cao (Đối tượng, Điểm nổi bật, Form giày, Thể loại chơi, Phân khúc, Loại trang phục), giữ đúng bộ lọc chính như ảnh tham chiếu gồm Mức giá, Thương hiệu, Chi nhánh, Lọc theo size và chip lọc tương ứng.

- **Ngày/Giờ:** 2026-04-04 17:31:29
- **Tính năng:** Khôi phục lọc nâng cao theo ngữ cảnh và đồng bộ form admin theo loại size
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Khôi phục `WebDoTheThao/project/src/pages/ProductsPage.tsx` về logic cũ gồm filter nâng cao theo ngữ cảnh (giày: form/thể loại chơi/phân khúc; quần áo: loại trang phục) và cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để khi chọn quần áo không hiện ô riêng của giày, đồng thời chỉ lưu `shoe_form/play_style/segment` khi loại size là giày.

- **Ngày/Giờ:** 2026-04-04 17:34:48
- **Tính năng:** Tối giản filter quần áo theo đúng block ảnh tham chiếu
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/ProductsPage.tsx` để khi ở ngữ cảnh quần áo thì ẩn hai block `Đối tượng` và `Điểm nổi bật`, đồng thời tắt logic lọc/chip tương ứng; giữ các block giống ảnh tham chiếu gồm Mức giá, Thương hiệu, Chi nhánh, Size (và Loại trang phục cho quần áo).

- **Ngày/Giờ:** 2026-04-04 17:40:47
- **Tính năng:** Thêm chức năng sửa section danh mục trang chủ
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để thêm nút `Sửa` cho từng mục trong `Tiêu đề section trang chủ`, hỗ trợ chỉnh tiêu đề/nhóm/danh mục, lưu cập nhật vào bảng `home_category_sections` và có nút `Hủy` khi đang chỉnh sửa.

- **Ngày/Giờ:** 2026-04-06 11:20:27
- **Tính năng:** Tạo Postman collection test API BE
- **Trạng thái:** Làm mới hoàn toàn
- **Mô tả ngắn gọn:** Tạo mới file `postman-be-tests.collection.json` ở thư mục gốc để test nhanh các endpoint backend gồm nhóm Auth (`register/login/session/user/send-otp/verify-otp/update-password/logout`) và DB API (`query/insert/update/delete`) theo cấu trúc `auth-server.js`.

- **Ngày/Giờ:** 2026-04-06 11:49:05
- **Tính năng:** Làm lại luồng quên mật khẩu theo mẫu VNB (captcha + link email xác nhận)
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` để thêm các API mới `forgot-password/request|verify|reset` với mã xác nhận random 10 ký tự và link xác nhận qua email; cập nhật `WebDoTheThao/project/src/lib/db.ts` để bọc các API mới; làm lại UI/flow `WebDoTheThao/project/src/pages/ForgotPasswordPage.tsx` thành 2 trạng thái: nhập email + captcha (ảnh 1) và xác nhận từ link mail + đặt mật khẩu mới (ảnh 3).

- **Ngày/Giờ:** 2026-04-06 12:06:23
- **Tính năng:** Bổ sung cấu hình SMTP trong môi trường local
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật file `.env` tại thư mục gốc để thêm block `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM` phục vụ gửi email khôi phục mật khẩu thật từ `auth-server.js`.

- **Ngày/Giờ:** 2026-04-06 12:27:52
- **Tính năng:** Chuyển cấu hình SMTP từ Gmail sang Brevo
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `.env` và `.env.example` để dùng `smtp-relay.brevo.com` cùng biến `SMTP_USER/SMTP_PASS/SMTP_FROM` theo Brevo, nhằm tránh lỗi xác thực Gmail `535` khi gửi email khôi phục mật khẩu.

- **Ngày/Giờ:** 2026-04-06 13:06:54
- **Tính năng:** Chuyển lại SMTP sang Gmail App Password
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `.env` để dùng lại Gmail SMTP (`smtp.gmail.com`) cho luồng quên mật khẩu và đồng bộ hướng dẫn cấu hình trong `.env.example` theo App Password 16 ký tự.

- **Ngày/Giờ:** 2026-04-06 14:42:44
- **Tính năng:** Làm lại luồng đăng nhập Google ổn định end-to-end
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/contexts/AuthContext.tsx` để map đúng provider `google/local` từ session và đọc đúng trường tên/ảnh; cập nhật `auth-server.js` callback Google để đồng bộ user/profiles vào DB theo email, đảm bảo session Google dùng `id` nội bộ thống nhất cho các chức năng sau đăng nhập.

- **Ngày/Giờ:** 2026-04-06 14:48:43
- **Tính năng:** Ẩn avatar trên trang Dashboard người dùng
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/DashboardPage.tsx` để bỏ hiển thị ảnh avatar (tránh ảnh lỗi/bể layout), thay bằng icon người dùng mặc định ở cả khối thông tin bên trái và khối thông tin cá nhân.

- **Ngày/Giờ:** 2026-04-06 14:55:49
- **Tính năng:** Tách tab chỉnh sửa tài khoản và đổi mật khẩu có kiểm tra mật khẩu cũ
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/DashboardPage.tsx` để nút `Chỉnh sửa` chuyển sang tab riêng `Trang thông tin tài khoản` (giống luồng ảnh tham chiếu), lưu thông tin người dùng về DB; cập nhật `auth-server.js` thêm API `POST /api/auth/change-password` kiểm tra mật khẩu hiện tại, chặn mật khẩu mới trùng mật khẩu cũ; cập nhật `WebDoTheThao/project/src/lib/db.ts` thêm client method `changePassword` và áp dụng các thông báo `Sai mật khẩu hiện tại`, `Mật khẩu đã được sử dụng`, `Mật khẩu chưa trùng khớp`.

- **Ngày/Giờ:** 2026-04-06 14:57:14
- **Tính năng:** Đồng bộ màu nút tab tài khoản theo tông xanh chủ đạo
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/DashboardPage.tsx` để đổi toàn bộ nút/viền focus màu cam trong tab `Trang thông tin tài khoản` sang tông xanh (`teal`) nhằm đồng nhất nhận diện màu của website.

- **Ngày/Giờ:** 2026-04-06 15:00:49
- **Tính năng:** Tăng ổn định đổi mật khẩu và hiển thị lỗi rõ nghĩa
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` cho API `change-password` fallback tìm user theo email khi session id cũ không khớp (hỗ trợ phiên Google cũ), và cập nhật `WebDoTheThao/project/src/pages/DashboardPage.tsx` để map thêm lỗi cụ thể (`USER_NOT_FOUND`, `UNAUTHENTICATED`, `PASSWORD_REQUIRED`) thay vì chỉ báo chung chung.

- **Ngày/Giờ:** 2026-04-06 15:04:11
- **Tính năng:** Thêm nút hiện/ẩn mật khẩu trong form đổi mật khẩu dashboard
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/DashboardPage.tsx` để thêm icon con mắt cho 3 ô `Mật khẩu hiện tại`, `Mật khẩu mới`, `Nhập lại mật khẩu mới`, cho phép người dùng bật/tắt hiển thị nội dung khi nhập để tránh nhập sai.

- **Ngày/Giờ:** 2026-04-06 15:06:35
- **Tính năng:** Fix lỗi điều hướng bị nhảy xuống cuối trang
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/components/layout/Layout.tsx` để reset vị trí cuộn về đầu trang (`scrollTo top`) mỗi khi đổi route trong SPA, đồng thời bật `history.scrollRestoration = manual` để tránh giữ lại vị trí cuộn cũ gây hiện tượng nhảy xuống cuối trang.

- **Ngày/Giờ:** 2026-04-06 15:11:37
- **Tính năng:** Loại bỏ nút CTA phụ “Xem giày hot” ở hero
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để xoá nút `Xem giày hot` trong khối hero trang chủ, giữ lại duy nhất CTA chính `Mua sắm ngay`.

- **Ngày/Giờ:** 2026-04-06 15:17:54
- **Tính năng:** Banner tự lấy ảnh từ sản phẩm/danh mục và điều hướng đúng trang đích
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` để mở rộng schema bảng `banners` (thêm `target_type`, `target_product_id/slug`, `target_category_id/slug`); cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để admin chọn nguồn banner từ sản phẩm/danh mục, tự lấy ảnh và lưu liên kết đích; cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để banner trên hero có thể click và chuyển tới chi tiết sản phẩm hoặc trang lọc theo danh mục; cập nhật `WebDoTheThao/project/src/types/index.ts` bổ sung kiểu dữ liệu `Banner`.

- **Ngày/Giờ:** 2026-04-06 15:23:04
- **Tính năng:** Ẩn/hiện menu Dashboard theo role tài khoản
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/components/layout/Header.tsx` để đọc `profiles.role` theo `user.id` và chỉ hiển thị một mục tương ứng trong menu: `Dashboard admin` cho role `admin`, `Dashboard nhân viên` cho role `staff`, và `Dashboard` cho user thường.

- **Ngày/Giờ:** 2026-04-06 15:24:40
- **Tính năng:** Ẩn các mục kho nâng cao trong menu Sản phẩm
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để xóa các mục menu con từ `Quản lý kho` đến `Điều chỉnh giá vốn` trong nhóm `Sản phẩm`, giữ lại `Danh sách sản phẩm`, `Sản phẩm mới`, `Sản phẩm nổi bật`.

- **Ngày/Giờ:** 2026-04-06 15:32:01
- **Tính năng:** Đổi menu Khách hàng thành Tài khoản và tách quản lý Khách hàng/Nhân viên
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để đổi menu sidebar thành nhóm `Tài khoản` dạng xổ giống `Sản phẩm` với 2 mục con `Khách hàng` và `Nhân viên`; thêm tab `employees`; hiển thị danh sách theo role (`customer`/`staff`); bổ sung thao tác cho admin: xem, chỉnh sửa (họ tên, SĐT, địa chỉ, role customer/staff) và xóa tài khoản; giữ quyền staff ở chế độ chỉ xem.

- **Ngày/Giờ:** 2026-04-06 15:37:18
- **Tính năng:** Gán thông tin tài khoản theo dữ liệu user thực từ DB
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để lấy và gộp dữ liệu từ `users` + `profiles` (join theo `id`) trước khi render mục `Tài khoản`; bổ sung hiển thị `Email` từ bảng `users` trên thẻ tài khoản; giữ logic chỉnh sửa/xóa cập nhật dữ liệu đúng theo DB.

- **Ngày/Giờ:** 2026-04-06 15:40:19
- **Tính năng:** Khắc phục lỗi không tải được danh sách tài khoản từ DB
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` bổ sung bảng `users` vào `TABLE_WHITELIST` của API DB để cho phép dashboard đọc dữ liệu user khi gộp `users + profiles`; tránh lỗi `TABLE_NOT_ALLOWED` làm danh sách tài khoản trống.

- **Ngày/Giờ:** 2026-04-06 15:49:33
- **Tính năng:** Sửa lỗi cập nhật thông tin tài khoản báo thành công giả và đồng bộ sang admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/DashboardPage.tsx` để kiểm tra `error` khi update profile, hiển thị lỗi đúng nếu cập nhật thất bại và chỉ báo thành công khi đọc lại DB thành công; cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để chuẩn hóa hàm gộp dữ liệu `users + profiles` và tự làm mới danh sách tài khoản theo chu kỳ khi admin/staff đang mở tab `Tài khoản`, giúp trang admin nhận thay đổi mới từ người dùng.

- **Ngày/Giờ:** 2026-04-06 15:51:12
- **Tính năng:** Sửa lỗi định dạng `updated_at` khi cập nhật thông tin tài khoản
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/DashboardPage.tsx` để không gửi thủ công `updated_at` dạng ISO (`...T...Z`) vào MySQL khi update `profiles`; để DB tự cập nhật timestamp theo định dạng hợp lệ, tránh lỗi `Incorrect datetime value`.

- **Ngày/Giờ:** 2026-04-06 15:57:43
- **Tính năng:** Thêm chức năng tạo tài khoản trong mục Tài khoản (admin)
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` thêm API `POST /api/auth/admin/create-account` (chỉ admin) để tạo `users + profiles` với role `customer/staff` và sinh mật khẩu tạm; cập nhật `WebDoTheThao/project/src/lib/db.ts` thêm hàm `db.auth.adminCreateAccount`; cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm form `Tạo tài khoản` (Tên, SĐT, địa chỉ, email, vai trò), hiển thị thông báo/mật khẩu tạm, và đồng bộ vào danh sách để tiếp tục chỉnh sửa/xóa.

- **Ngày/Giờ:** 2026-04-06 19:37:57
- **Tính năng:** Triển khai quy trình đánh giá sản phẩm có phê duyệt admin
- **Trạng thái:** Làm mới hoàn toàn
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/ProductDetailPage.tsx` thêm giao diện đánh giá giống mock (popup `Đánh giá ngay`, chọn sao 1-5, captcha, upload ảnh, gửi nhận xét), gửi đánh giá vào trạng thái chờ duyệt và chỉ hiển thị các đánh giá đã duyệt; cập nhật `auth-server.js` thêm schema bảng `reviews`, API `GET /api/reviews/by-product/:productId`, `POST /api/reviews/submit`, `POST /api/reviews/moderate`, đồng thời tự đồng bộ lại `products.rating` và `products.reviews_count` khi admin duyệt/ẩn/xóa; cập nhật `WebDoTheThao/project/src/lib/db.ts` thêm các hàm gọi API review; cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để admin phê duyệt đánh giá bằng API chuyên dụng và hiển thị thêm thông tin người đánh giá/ảnh đính kèm.

- **Ngày/Giờ:** 2026-04-06 19:45:19
- **Tính năng:** Gia cố nút Lưu trạng thái đánh giá và đồng bộ hiển thị ngoài trang sản phẩm
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để nút `Lưu trạng thái` dùng trạng thái hiện tại làm mặc định an toàn, hiển thị lỗi chi tiết hơn khi duyệt thất bại và cập nhật lại `reviewStatusDrafts` sau khi lưu thành công; cập nhật `WebDoTheThao/project/src/pages/ProductDetailPage.tsx` thêm tự làm mới danh sách đánh giá đã duyệt theo chu kỳ để khi admin chọn `Hiển thị`/`Ẩn đánh giá` thì ngoài trang sản phẩm phản ánh nhanh hơn mà không cần tải lại tay.

- **Ngày/Giờ:** 2026-04-06 20:00:16
- **Tính năng:** Triển khai quản lý và phát mã khuyến mãi theo điều kiện mua hàng
- **Trạng thái:** Làm mới hoàn toàn
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` để tự tạo bảng `promotions` và `promotion_assignments`, thêm API admin `POST /api/promotions/create`, `POST /api/promotions/assign`, `GET /api/promotions/assignments/:promotionId` phục vụ tạo mã và phát mã cho người đã mua hoặc theo ngưỡng đơn; cập nhật `WebDoTheThao/project/src/lib/db.ts` thêm các hàm gọi API khuyến mãi mới; cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` (tab `Khuyến mãi`) thêm form tạo mã, khối phát mã theo rule (`tất cả đã mua` / `đơn từ X`), và danh sách user đã được phát mã.

- **Ngày/Giờ:** 2026-04-06 20:07:06
- **Tính năng:** Sửa lỗi nhập liệu trong form khuyến mãi bị “mất chữ”
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để đặt màu chữ rõ ràng (`text-slate-900`) cho toàn bộ ô input/select trong khối `Tạo mã khuyến mãi` và `Phát mã cho người dùng`, tránh hiện tượng chữ nhập vào trùng màu nền nhìn như bị mất.

- **Ngày/Giờ:** 2026-04-06 20:11:36
- **Tính năng:** Chuẩn hóa placeholder cho toàn bộ ô trong form khuyến mãi
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để mọi ô nhập trong khối `Tạo mã khuyến mãi` và `Phát mã cho người dùng` đều có chữ gợi ý rõ ràng; đổi các giá trị mặc định số (`10/0/1`) sang rỗng để placeholder luôn hiển thị giúp admin biết cần nhập gì.

- **Ngày/Giờ:** 2026-04-06 20:14:57
- **Tính năng:** Tối giản giao diện khối phát mã khuyến mãi theo yêu cầu
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để xóa toàn bộ đoạn chữ hướng dẫn bên dưới phần `Phát mã cho người dùng` (từ dòng `Chọn mã...` đến `...bạn nhập`), giữ nguyên chức năng phát mã.

- **Ngày/Giờ:** 2026-04-06 20:20:36
- **Tính năng:** Áp dụng mã khuyến mãi tại trang thanh toán
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/CheckoutPage.tsx` thêm ô nhập mã + nút `Áp dụng`, hiển thị dòng giảm giá và tổng thanh toán sau giảm; cập nhật `WebDoTheThao/project/src/lib/db.ts` thêm API client `applyPromotionPreview`; cập nhật `WebDoTheThao/project/src/lib/checkoutOrder.ts` để gửi `subtotal` và `promotion_assignment_id`; cập nhật `auth-server.js` thêm API `POST /api/promotions/apply-preview` và gia cố RPC `create_checkout_order_atomic` để kiểm tra hợp lệ mã theo user, tính lại tổng tiền an toàn trên server, rồi đánh dấu mã đã dùng khi tạo đơn thành công.

- **Ngày/Giờ:** 2026-04-06 20:28:11
- **Tính năng:** Phát mã khuyến mãi cho người dùng riêng (ưu ái nhân viên)
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` mở rộng API `POST /api/promotions/assign` với mode `specific_user` và tham số `target_user_id` để phát mã cho đúng 1 tài khoản; cập nhật `WebDoTheThao/project/src/lib/db.ts` mở rộng kiểu `assignPromotion`; cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm lựa chọn `Phát cho người dùng riêng`, dropdown chọn tài khoản, validate lỗi tương ứng, và hiển thị nhãn cách phát `Phát riêng từng user` trong danh sách đã phát.

- **Ngày/Giờ:** 2026-04-06 20:33:19
- **Tính năng:** Hiển thị kho mã khuyến mãi ở checkout kiểu Shopee
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` thêm API `GET /api/promotions/my-available` để trả danh sách mã chưa dùng của user hiện tại kèm trạng thái có áp dụng được theo tổng đơn (`can_apply`, `disabled_reason`); cập nhật `WebDoTheThao/project/src/lib/db.ts` thêm hàm `getMyAvailablePromotions`; cập nhật `WebDoTheThao/project/src/pages/CheckoutPage.tsx` thêm block `Voucher của bạn` hiển thị mã được phát, điều kiện đơn tối thiểu, và nút `Áp dụng` một chạm để tự điền/áp mã ngay.
