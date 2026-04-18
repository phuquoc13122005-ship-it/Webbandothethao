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

- **Ngày/Giờ:** 2026-04-10 15:20:43
- **Tính năng:** Khôi phục mục Quản lý tồn kho trong menu Sản phẩm
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để thêm lại mục `Quản lý tồn kho` (`inventory`) trong `productMenuItems` của sidebar Sản phẩm; giữ nguyên các mục kho khác đã xoá trước đó.

- **Ngày/Giờ:** 2026-04-10 15:23:11
- **Tính năng:** Hiển thị ảnh nhỏ sản phẩm trong mục Quản lý tồn kho
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` tại tab `inventory` để hiển thị thumbnail ảnh sản phẩm kích thước nhỏ (`w-14 h-14`) bên cạnh tên/SKU; thêm fallback `Không ảnh` khi sản phẩm chưa có ảnh để dễ nhận biết từng sản phẩm.

- **Ngày/Giờ:** 2026-04-10 15:26:14
- **Tính năng:** Hiển thị ảnh nhỏ sản phẩm trong danh sách sản phẩm admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` tại tab `products_list` để hiển thị thumbnail ảnh nhỏ (`w-14 h-14`) cạnh tên/giá sản phẩm; bổ sung fallback `Không ảnh` cho sản phẩm chưa có ảnh, giúp nhận diện nhanh trong danh sách.

- **Ngày/Giờ:** 2026-04-10 15:31:44
- **Tính năng:** Thêm thống kê tổng số sản phẩm trên Admin Dashboard
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` tại khối overview để thêm card `Tổng sản phẩm` lấy trực tiếp từ dữ liệu `products` đã load từ DB (`products.length`), hiển thị cùng kiểu giao diện thống kê với card `Tổng doanh thu`.

- **Ngày/Giờ:** 2026-04-10 15:35:54
- **Tính năng:** Gợi ý danh mục khi focus ô tìm kiếm trên header
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/components/layout/Header.tsx` để khi người dùng bấm vào ô tìm kiếm desktop sẽ hiện dropdown `Tìm kiếm nhiều nhất` lấy từ danh mục trong DB (`categories`) dưới dạng nút gợi ý; bấm nút sẽ chuyển thẳng đến trang danh mục tương ứng, đồng thời vẫn giữ nguyên khả năng nhập tay và submit tìm kiếm theo từ khóa.

- **Ngày/Giờ:** 2026-04-10 15:39:27
- **Tính năng:** Gợi ý sản phẩm theo từ khóa gõ trong ô tìm kiếm header
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/components/layout/Header.tsx` để khi người dùng gõ từ khóa (ví dụ `vợt`) sẽ debounce truy vấn DB bảng `products` theo `name` và hiện danh sách đề xuất ngay dưới block danh mục; mỗi đề xuất hiển thị ảnh nhỏ, tên, giá và có thể bấm trực tiếp để mở trang chi tiết sản phẩm, đồng thời vẫn giữ tìm kiếm nhập tay như cũ.

- **Ngày/Giờ:** 2026-04-10 15:54:36
- **Tính năng:** Soạn tài liệu hướng dẫn test Postman cho user/admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Tạo mới `postman.md` ở thư mục gốc, tổng hợp đầy đủ quy trình test API backend bằng Postman cho luồng user và admin (thứ tự chạy, body mẫu, checklist kỳ vọng), đồng thời ghi rõ lưu ý quan trọng về key filter `op` thay vì `operator` để tránh lỗi query/update.

- **Ngày/Giờ:** 2026-04-10 16:01:29
- **Tính năng:** Tạo bộ test full API Postman và README chạy chi tiết
- **Trạng thái:** Làm mới hoàn toàn
- **Mô tả ngắn gọn:** Tạo mới `postman-full-api.collection.json` chứa kịch bản test full API (public, auth user/admin, promotions, reviews, db crud, rpc checkout) có sẵn biến và script lưu ID tự động để chạy liên hoàn; tạo mới `README_POSTMAN.md` hướng dẫn chi tiết cách import, cấu hình biến, thứ tự chạy, checklist báo cáo, lưu ý session/quyền và các lỗi thường gặp.

- **Ngày/Giờ:** 2026-04-10 16:12:52
- **Tính năng:** Tách collection Postman theo vai trò User/Admin và cập nhật hướng dẫn
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Tạo mới `postman-user-api.collection.json` và `postman-admin-api.collection.json` để test tách riêng theo role giúp dễ kiểm tra quyền/session và thuận tiện báo cáo; cập nhật lại `README_POSTMAN.md` hướng dẫn chi tiết cách import 2 collection mới, cấu hình variables cho từng role, thứ tự chạy, cách lấy evidence báo cáo và troubleshooting.

- **Ngày/Giờ:** 2026-04-10 16:35:30
- **Tính năng:** Bổ sung trường mật khẩu khi tạo tài khoản khách hàng/nhân viên
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm ô nhập `Mật khẩu` trong form tạo tài khoản và validate tối thiểu 6 ký tự; cập nhật `WebDoTheThao/project/src/lib/db.ts` để gửi `password` qua API; cập nhật `auth-server.js` endpoint `POST /api/auth/admin/create-account` nhận `password` do admin nhập (nếu không gửi thì vẫn sinh mật khẩu tạm như cũ để tương thích), đồng thời trả lỗi `INVALID_PASSWORD` khi mật khẩu không đạt chuẩn.

- **Ngày/Giờ:** 2026-04-10 16:39:20
- **Tính năng:** Thêm nút ẩn/hiện mật khẩu cho form tạo tài khoản admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để ô `Mật khẩu` trong form `Tạo tài khoản` có biểu tượng con mắt (`Eye/EyeOff`) cho phép bật/tắt hiển thị mật khẩu khi nhập, đồng thời tự reset về trạng thái ẩn sau khi tạo tài khoản thành công.

- **Ngày/Giờ:** 2026-04-10 16:41:32
- **Tính năng:** Cho phép admin đổi mật khẩu tài khoản khách hàng/nhân viên trong mục chỉnh sửa
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` thêm API `POST /api/auth/admin/reset-account-password` (chỉ admin, hash mật khẩu mới, validate tối thiểu 6 ký tự); cập nhật `WebDoTheThao/project/src/lib/db.ts` thêm hàm `db.auth.adminResetAccountPassword`; cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm ô `Mật khẩu mới (để trống nếu không đổi)` kèm icon mắt trong form chỉnh sửa tài khoản và lưu mật khẩu mới cùng lúc với thông tin profile.

- **Ngày/Giờ:** 2026-04-10 16:47:06
- **Tính năng:** Mở rộng chỉnh sửa đầy đủ thông tin tài khoản khách hàng/nhân viên cho admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để form chỉnh sửa tài khoản cho phép sửa đầy đủ `họ tên, email, SĐT, địa chỉ, vai trò, mật khẩu mới`; đồng bộ lưu `profiles` và `users.email`, validate email hợp lệ, giữ trường chưa có dữ liệu ở trạng thái trống theo dữ liệu thực tế, và thêm `autocomplete` phù hợp để hạn chế tự động điền sai.

- **Ngày/Giờ:** 2026-04-10 16:54:37
- **Tính năng:** Căn lại bố cục trường địa chỉ cùng hàng với SĐT trong form chỉnh sửa tài khoản
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` tại form edit tài khoản để trường `Địa chỉ` không còn chiếm toàn dòng (`md:col-span-2`), nhờ đó hiển thị cùng hàng với trường `Số điện thoại` theo bố cục 2 cột.

- **Ngày/Giờ:** 2026-04-10 19:33:20
- **Tính năng:** Hiển thị “Đang có hàng tại” theo chi nhánh admin đã set
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/ProductDetailPage.tsx` để bỏ text chi nhánh hardcode, đọc trực tiếp từ `product.branch_name` (admin chọn khi tạo/sửa sản phẩm), hỗ trợ tách nhiều chi nhánh bằng dấu phẩy/chấm phẩy và fallback `Chưa cập nhật chi nhánh` khi chưa set.

- **Ngày/Giờ:** 2026-04-10 19:37:18
- **Tính năng:** Chọn nhiều chi nhánh bằng checkbox trong form sản phẩm admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để đổi ô `Chi nhánh` từ select 1 giá trị sang checklist nhiều lựa chọn (giống ô `Đối tượng`) ở cả form thêm mới và chỉnh sửa sản phẩm; dữ liệu vẫn lưu vào `branch_name` dạng CSV tương thích luồng cũ. Cập nhật `WebDoTheThao/project/src/pages/ProductsPage.tsx` để filter chi nhánh hỗ trợ sản phẩm có nhiều chi nhánh trong cùng một giá trị CSV.

- **Ngày/Giờ:** 2026-04-11 15:19:45
- **Tính năng:** Bổ sung API test tìm kiếm sản phẩm cho Postman User collection
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `postman-user-api.collection.json` thêm biến `searchKeyword` và request `Search products by name (public)` dùng `POST /api/db/query` với filter `op: ilike` theo cột `name`; cập nhật `README_POSTMAN.md` để hướng dẫn biến/tác vụ mới trong luồng Bootstrap User.

- **Ngày/Giờ:** 2026-04-11 15:26:21
- **Tính năng:** Bổ sung luồng đặt sản phẩm và hủy sản phẩm trong Postman User collection
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `postman-user-api.collection.json` thêm biến `userId/productPrice/orderId/shippingAddress/orderQuantity`, lưu `userId` từ API `Current user`, thêm folder `3. Orders` gồm request tạo đơn qua RPC `create_checkout_order_atomic`, hủy đơn bằng `db/update` (lọc `orderId + userId`) và kiểm tra lại trạng thái đơn; cập nhật `README_POSTMAN.md` về thứ tự chạy và mô tả luồng Orders mới.

- **Ngày/Giờ:** 2026-04-11 15:50:09
- **Tính năng:** Triển khai JWT access/refresh token song song session
- **Trạng thái:** Làm mới hoàn toàn
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` thêm xác thực JWT gồm sinh `access_token` + `refresh_token` khi login/register/verify OTP, endpoint `POST /api/auth/refresh-token`, hỗ trợ Bearer token trong `requireSession` và các API `session/user`, đồng thời vẫn giữ tương thích session cookie cũ; cập nhật `.env.example` thêm biến cấu hình JWT; cập nhật `postman-user-api.collection.json` và `README_POSTMAN.md` để test luồng token (login lấy access token, refresh token, gọi API với Authorization Bearer).

- **Ngày/Giờ:** 2026-04-11 16:14:55
- **Tính năng:** Mở rộng bộ Postman API full cho User/Admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `postman-user-api.collection.json` bổ sung nhóm `User DB APIs` (query/insert/update/delete giỏ hàng, query đơn hàng), thêm `update-password` legacy và biến `cartItemId`; cập nhật `postman-admin-api.collection.json` bổ sung test `refresh token`, `current user (Bearer)`, `admin reset-account-password`, query `branches/support_requests`, và thêm biến `accessToken/tempAccountPassword`; cập nhật `README_POSTMAN.md` để đồng bộ thứ tự chạy và phạm vi coverage mới cho cả user/admin.

- **Ngày/Giờ:** 2026-04-12 13:20:49
- **Tính năng:** Nhập nhanh danh mục và sản phẩm mẫu theo cấu trúc ShopVNB
- **Trạng thái:** Làm mới hoàn toàn
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm bộ seed danh mục/sản phẩm tham chiếu từ `shopvnb.com` và chức năng `Nhập nhanh ShopVNB` trong tab `Danh sách sản phẩm` và `Danh mục`; chức năng tự tạo danh mục còn thiếu, tự tạo sản phẩm mẫu theo đúng nhóm bộ môn/size type, bỏ qua dữ liệu đã tồn tại theo `slug`, và hiển thị thống kê số lượng nhập thành công/thất bại.

- **Ngày/Giờ:** 2026-04-12 13:24:12
- **Tính năng:** Mở rộng thêm sản phẩm mẫu cho nút nhập nhanh ShopVNB
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để mở rộng danh sách `SHOPVNB_PRODUCT_SEEDS` với thêm nhiều sản phẩm cầu lông/pickleball/tennis (vợt, giày, áo, quần) nhằm tăng độ đầy đủ dữ liệu sau khi bấm `Nhập nhanh ShopVNB`.

- **Ngày/Giờ:** 2026-04-12 13:27:20
- **Tính năng:** Tự động đảm bảo mỗi danh mục ShopVNB có 10 sản phẩm mẫu
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm cơ chế sinh danh sách sản phẩm mở rộng từ seed gốc (`SHOPVNB_PRODUCT_SEEDS_EXPANDED`) để mỗi danh mục mục tiêu có tối đa 10 sản phẩm, tự tạo biến thể tên/slug/giá/ảnh khi thiếu mẫu và chống trùng slug trước khi import.

- **Ngày/Giờ:** 2026-04-12 15:51:49
- **Tính năng:** Bổ sung API thống kê số lượng user cho Admin Postman collection
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `postman-admin-api.collection.json` trong folder `1. Bootstrap admin variables` thêm các request đếm nhanh `tổng users`, `profiles role=customer`, `profiles role=staff`, `profiles role=admin`; cập nhật `README_POSTMAN.md` hướng dẫn vị trí chạy thống kê user theo role.

- **Ngày/Giờ:** 2026-04-12 15:57:07
- **Tính năng:** Bổ sung API thống kê tổng đơn hàng cho Admin Postman collection
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `postman-admin-api.collection.json` thêm request `Query all orders (count total)` trong folder `1. Bootstrap admin variables` để đếm tổng đơn hàng hiện có; cập nhật `README_POSTMAN.md` ghi rõ vị trí request thống kê đơn.

- **Ngày/Giờ:** 2026-04-12 20:11:11
- **Tính năng:** Bổ sung lựa chọn thông số vợt (3U/4U) và màu cho dữ liệu sản phẩm import nhanh
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` mở rộng seed sản phẩm với `size_options` và `color_options` cho nhóm vợt/pickleball/tennis; khi import sẽ lưu luôn tùy chọn thông số (ví dụ `3U, 4U`) để hiển thị lựa chọn trên trang sản phẩm, đồng thời vẫn giữ ảnh sản phẩm theo seed hiện có.

- **Ngày/Giờ:** 2026-04-13 20:39:07
- **Tính năng:** Thêm nút hiện/ẩn thanh công cụ cho trang Admin Dashboard
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` bổ sung state `isSidebarOpen`, thêm nút toggle trong header admin để bật/tắt sidebar công cụ, hỗ trợ đóng tự động trên màn hình nhỏ khi chọn tab và thêm lớp nền overlay để thao tác giống menu trượt.

- **Ngày/Giờ:** 2026-04-13 20:42:29
- **Tính năng:** Sửa lỗi lệch layout sidebar admin sau khi thêm nút công cụ
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật lại `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để bỏ cơ chế sidebar `fixed top-[80px]` gây lệch giao diện, trả về bố cục `flex` ổn định như cũ và bổ sung nút nổi mobile để mở/đóng menu công cụ thuận tiện.

- **Ngày/Giờ:** 2026-04-13 20:44:01
- **Tính năng:** Dời nút điều khiển menu admin xuống dưới dòng Admin panel
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để bỏ nút toggle ở header nội dung, thêm nút nhỏ `Ẩn công cụ` ngay dưới khu vực logo + dòng `Admin panel` trong sidebar; khi sidebar đang ẩn thì hiển thị nút nổi nhỏ bên trái để mở lại.

- **Ngày/Giờ:** 2026-04-13 20:45:15
- **Tính năng:** Dời nút điều khiển công cụ xuống dưới tiêu đề Admin Dashboard
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để chuyển nút hiện/ẩn sidebar từ khu vực sidebar sang ngay dưới tiêu đề trang (`Admin Dashboard`) trong khung nội dung, đồng thời bỏ nút nổi cố định bên trái để tránh gây nhiễu giao diện.

- **Ngày/Giờ:** 2026-04-13 20:48:14
- **Tính năng:** Thu gọn sidebar admin về dạng chỉ icon thay vì ẩn hoàn toàn
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để khi bấm nút dưới tiêu đề `Admin Dashboard`, sidebar không bị ẩn mà chuyển sang bản thu gọn chiều rộng nhỏ chỉ hiển thị icon; trạng thái active vẫn giữ, menu con chỉ hiển thị khi sidebar mở rộng, và có tooltip qua `title` cho các icon.

- **Ngày/Giờ:** 2026-04-13 20:52:41
- **Tính năng:** Thay icon nút thu gọn/mở rộng sidebar theo mẫu sidebar-expand
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thay icon `X/Menu` của nút dưới `Admin Dashboard` bằng icon SVG dạng khung sidebar + mũi tên giống mẫu bạn gửi (`sidebar-left-expand`), đồng thời giữ nguyên logic thu gọn sidebar về cột icon.

- **Ngày/Giờ:** 2026-04-13 20:54:03
- **Tính năng:** Tối giản nút thu gọn sidebar chỉ còn icon
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để bỏ text `Ẩn công cụ/Hiện công cụ`, giữ lại nút toggle dạng icon-only với kích thước vuông nhỏ gọn và vẫn giữ `aria-label` cho truy cập.

- **Ngày/Giờ:** 2026-04-13 20:59:51
- **Tính năng:** Thêm nút xóa sản phẩm cạnh nút sửa trong danh sách sản phẩm admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm hàm `handleDeleteProduct` (chỉ admin, có hộp xác nhận, xử lý lỗi), thêm nút `Xóa` cạnh `Sửa` ở danh sách sản phẩm, và đồng bộ dọn state liên quan tồn kho/size sau khi xóa thành công.

- **Ngày/Giờ:** 2026-04-13 21:07:07
- **Tính năng:** Bổ sung tìm kiếm sản phẩm trong mục Quản lý kho
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm ô nhập từ khóa trong tab `Quản lý kho`, bổ sung lọc danh sách tồn kho theo tên/SKU/thương hiệu (không phân biệt hoa thường và dấu tiếng Việt), giới hạn theo `MAX_RENDER_ITEMS`, và hiển thị thông báo khi không có kết quả.

- **Ngày/Giờ:** 2026-04-15 20:40:10
- **Tính năng:** Siết phân quyền trang Staff theo vai trò Admin/Staff
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để giới hạn tab của staff (không vào `overview` và `employees`, tự điều hướng về `products_list`), chỉ hiển thị mục khách hàng trong nhóm tài khoản đối với staff, đồng thời thêm chặn quyền ở mức handler cho các thao tác xóa dữ liệu (`categories`, `home_category_sections`, `banners`, `delete all banners`) chỉ cho admin.

- **Ngày/Giờ:** 2026-04-15 20:47:24
- **Tính năng:** Chuyển quản lý tồn kho sang popup chỉnh sửa khi bấm vào sản phẩm
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để tab `Quản lý kho` chỉ hiển thị danh sách sản phẩm (không còn các nút chỉnh trực tiếp), khi bấm vào sản phẩm sẽ mở popup cho phép chọn size và chỉnh số lượng tồn kho rồi lưu; bổ sung state popup và tái sử dụng luồng cập nhật tồn kho hiện có.

- **Ngày/Giờ:** 2026-04-15 20:49:50
- **Tính năng:** Chuyển danh sách sản phẩm sang popup chỉnh sửa khi bấm item
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để tab `Danh sách sản phẩm` bỏ nút `Sửa/Xóa` ngoài list, thay bằng tương tác bấm vào sản phẩm để mở popup chỉnh sửa đầy đủ thông tin; giữ các nút `Lưu/Hủy` trong popup và đưa `Xóa` vào popup (chỉ admin) để tránh thao tác trực tiếp trên danh sách.

- **Ngày/Giờ:** 2026-04-18 14:48:33
- **Tính năng:** Loại bỏ tiêu đề trùng lặp trong các tab sản phẩm
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để bỏ các tiêu đề phụ bị nhân bản ở phần nội dung của các tab `Danh sách sản phẩm`, `Quản lý kho`, `Sản phẩm mới`, `Sản phẩm nổi bật`; giữ lại tiêu đề chính trên header trang để giao diện không lặp chữ.

- **Ngày/Giờ:** 2026-04-18 14:59:12
- **Tính năng:** Bổ sung tồn kho hiện tại theo size trong popup và đồng bộ trừ/cộng kho theo trạng thái đơn hàng
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để hiển thị thêm ô `Tồn kho hiện tại` ở giữa `Size` và `Số lượng tồn kho` trong popup quản lý kho, giá trị đọc theo đúng size đang chọn từ `size_stock` trong DB. Cập nhật `auth-server.js` để chuyển logic trừ kho sang thời điểm đơn được cập nhật `shipping`, cộng lại khi đơn chuyển `cancelled`, thêm cờ `orders.stock_deducted` để tránh trừ/cộng lặp khi trạng thái thay đổi nhiều lần.

- **Ngày/Giờ:** 2026-04-18 15:02:20
- **Tính năng:** Tối ưu khoảng trắng dư ở phần đầu giao diện dashboard
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để thu gọn header card phía trên: đưa nút toggle sidebar lên cùng hàng với tiêu đề tab và giảm padding dọc, giúp loại bỏ cảm giác dư khoảng trắng ở đầu trang.

- **Ngày/Giờ:** 2026-04-18 15:05:14
- **Tính năng:** Loại bỏ khoảng trắng mỏng ở mép trên toàn trang
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/index.css` thêm reset rõ ràng `m-0 p-0` cho `body` để loại bỏ khoảng trắng mỏng còn sót ở mép trên giao diện khi hiển thị dashboard.

- **Ngày/Giờ:** 2026-04-18 15:15:12
- **Tính năng:** Thiết kế lại bố cục form Thêm sản phẩm mới theo layout 3 cột
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để đổi form `Thêm sản phẩm mới` sang bố cục gần giống ảnh tham chiếu: cột trái `Thông tin cơ bản`, cột giữa `Ảnh & mô tả`, cột phải `Thuộc tính`; giữ nguyên toàn bộ logic nhập liệu/validation/upload và chỉ thay đổi tổ chức giao diện.

- **Ngày/Giờ:** 2026-04-18 15:22:02
- **Tính năng:** Điều chỉnh hiển thị ô giá bán sau giảm theo placeholder trong input
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để ô `Giá bán sau giảm` hiển thị chữ ngay trong ô dưới dạng placeholder (giống ô `Giảm giá`), và chỉ hiện số khi đã có `Giá gốc`.

- **Ngày/Giờ:** 2026-04-18 15:28:04
- **Tính năng:** Sửa luồng nút Sửa nhanh trong tab Sản phẩm mới/Nổi bật
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm hàm `handleQuickEditProduct` để đưa sản phẩm được chọn lên đầu danh sách rồi mở form chỉnh sửa đúng sản phẩm ngay khi bấm `Sửa nhanh`, tránh tình trạng mở lệch hoặc không hiển thị form mong muốn.

- **Ngày/Giờ:** 2026-04-18 15:35:10
- **Tính năng:** Sửa lỗi xóa ảnh phụ trong popup chỉnh sửa sản phẩm không lưu
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` tại hàm `removeGalleryImage` để khi xóa ảnh khỏi gallery sẽ cập nhật đúng state và không tự thêm lại lúc bấm `Lưu`; nếu ảnh bị xóa đang là ảnh chính thì tự chuyển sang ảnh còn lại đầu tiên (hoặc rỗng nếu hết ảnh), đồng bộ cho cả form thêm mới và chỉnh sửa.

- **Ngày/Giờ:** 2026-04-18 15:55:33
- **Tính năng:** Thêm popup tạo nhóm danh mục động trong trang quản trị
- **Trạng thái:** Làm mới hoàn toàn
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` để thêm nút `Thêm nhóm` mở popup nhỏ (tên nhóm + lưu), lưu nhóm vào DB và tự cập nhật dropdown nhóm tại `Danh mục`/`Section trang chủ`; cập nhật `WebDoTheThao/project/src/types/index.ts` để `CategoryProductGroup` hỗ trợ nhóm tùy biến; cập nhật `auth-server.js` thêm migration `category_groups` + seed nhóm mặc định để lưu bền vững.

- **Ngày/Giờ:** 2026-04-18 15:56:49
- **Tính năng:** Khắc phục lỗi TABLE_NOT_ALLOWED khi lưu nhóm danh mục mới
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `auth-server.js` bổ sung bảng `category_groups` vào `TABLE_WHITELIST` của API DB (`/api/db/query|insert|update|delete`) để popup `Thêm nhóm` có thể lưu dữ liệu thành công thay vì bị chặn `TABLE_NOT_ALLOWED`.

- **Ngày/Giờ:** 2026-04-18 16:04:02
- **Tính năng:** Đưa block khuyến mãi vào giữa khu vực danh mục trang chủ
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để chuyển section `Khuyến mãi đặc biệt` từ cuối trang lên ngay trước phần danh mục (`Sản phẩm cầu lông...`) và canh giữa bằng khung `max-w-5xl mx-auto`, giúp block ảnh 1 nằm giữa khu vực ảnh 2 theo bố cục mới.

- **Ngày/Giờ:** 2026-04-18 16:13:45
- **Tính năng:** Thêm quản trị nội dung trang Giới thiệu và hiển thị text-only ngoài frontend
- **Trạng thái:** Làm mới hoàn toàn
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm tab `Giới thiệu` (chỉ admin) để chỉnh sửa nội dung văn bản; cập nhật `WebDoTheThao/project/src/pages/AboutPage.tsx` và `WebDoTheThao/project/src/App.tsx` để tạo route `/gioi-thieu` hiển thị nội dung text-only; cập nhật `WebDoTheThao/project/src/components/layout/Header.tsx` để nút `Giới thiệu` trỏ đúng trang mới; cập nhật `auth-server.js` thêm bảng `site_contents` + whitelist/public-read cho nội dung giới thiệu.

- **Ngày/Giờ:** 2026-04-18 16:17:23
- **Tính năng:** Bổ sung nút Xem trước cho nội dung Giới thiệu trong admin
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` thêm nút `Xem trước/Ẩn xem trước` trong tab `Giới thiệu`; khi bật sẽ render khối preview text-only theo đúng định dạng trang `/gioi-thieu` ngay dưới form để admin kiểm tra trước khi lưu.

- **Ngày/Giờ:** 2026-04-18 16:27:57
- **Tính năng:** Đổi thứ tự hiển thị Sản phẩm nổi bật nằm ngay dưới Khuyến mãi đặc biệt
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để dời section `Sản phẩm nổi bật` từ cuối trang lên ngay sau section `Khuyến mãi đặc biệt`, đúng bố cục bạn yêu cầu; giữ nguyên UI/logic của từng section và chỉ thay đổi thứ tự render.

- **Ngày/Giờ:** 2026-04-18 16:32:33
- **Tính năng:** Sửa logic khối Khuyến mãi đặc biệt theo sản phẩm đang giảm giá
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để khối `Khuyến mãi đặc biệt` lấy dữ liệu từ các sản phẩm có `original_price > price` (đang giảm giá), không còn phụ thuộc `featured`; đồng thời hiển thị `% giảm tối đa` động theo dữ liệu thật và thêm fallback thông báo khi chưa có sản phẩm giảm giá.

- **Ngày/Giờ:** 2026-04-18 16:36:31
- **Tính năng:** Khắc phục treo loading trang chủ sau khi đổi logic khuyến mãi
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` thay truy vấn `.gt('original_price', 0)` (không hỗ trợ trong `db.ts`) bằng truy vấn danh sách sản phẩm rồi lọc giảm giá ở client; đồng thời bọc `load()` bằng `try/finally` để luôn `setLoading(false)` tránh kẹt spinner vô hạn khi có lỗi runtime.

- **Ngày/Giờ:** 2026-04-18 16:38:31
- **Tính năng:** Điều hướng nút Mua ngay trong khối Khuyến mãi đặc biệt sang trang Sale off
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` đổi link nút `Mua ngay` trong section `Khuyến mãi đặc biệt` từ `/products` sang `/products?sale=1` để người dùng bấm vào sẽ đi thẳng tới trang lọc sản phẩm giảm giá.

- **Ngày/Giờ:** 2026-04-18 16:43:27
- **Tính năng:** Gỡ mục Tin tức khỏi thanh điều hướng header
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/components/layout/Header.tsx` để xóa link `Tin tức` trong menu điều hướng desktop, giữ nguyên thứ tự và logic các mục còn lại.

- **Ngày/Giờ:** 2026-04-18 16:47:56
- **Tính năng:** Sửa hành vi click banner chỉ điều hướng khi có đích sản phẩm/danh mục
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để `getBannerTargetHref` trả `null` nếu banner không gắn `target_type=product/category` hoặc thiếu slug hợp lệ; chỉ render lớp `Link` phủ banner khi có đích hợp lệ, tránh banner thủ công vẫn điều hướng sai.

- **Ngày/Giờ:** 2026-04-18 16:55:58
- **Tính năng:** Sửa dứt điểm điều hướng banner theo sản phẩm/danh mục và đồng bộ nhãn banner thủ công
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` bổ sung nguồn map `id -> slug` sản phẩm riêng (`bannerProductRefs`) để banner `target_type=product` vẫn điều hướng đúng kể cả khi sản phẩm không nằm trong danh sách sản phẩm mới; cập nhật `WebDoTheThao/project/src/pages/StaffDashboardPage.tsx` đổi nhãn option từ `Ảnh thủ công, mở trang sản phẩm` thành `Ảnh thủ công (không gắn link)` để đúng hành vi mong muốn.

- **Ngày/Giờ:** 2026-04-18 16:59:36
- **Tính năng:** Tăng độ ổn định resolve link banner sản phẩm
- **Trạng thái:** Tiếp tục làm dở dang
- **Mô tả ngắn gọn:** Cập nhật `WebDoTheThao/project/src/pages/HomePage.tsx` để lấy map slug sản phẩm từ toàn bộ bảng `products` (`select id, slug` không giới hạn 500 bản ghi), tránh trường hợp banner `Lấy ảnh từ sản phẩm` có `target_product_id` hợp lệ nhưng không điều hướng do sản phẩm không nằm trong phạm vi query trước đó.
