# Hướng dẫn cho AI/IDE

Trước khi sửa dự án, đọc [docs/INDEX.md](docs/INDEX.md), sau đó đọc tài liệu theo loại việc: `SPEC.md` (nghiệp vụ), `PERMISSIONS.md` (quy tắc role phía giao diện), `TECH_ARCHITECTURE.md` (runtime/state/lưu trữ cục bộ), `FRONTEND_RULES.md` (UI/CSS). `docs/SPEC.md` là nguồn chuẩn nghiệp vụ.

Luôn phân biệt yêu cầu đã chốt với hành vi hiện tại. Nếu code lệch SPEC, nêu khoảng lệch thay vì âm thầm hợp thức hóa code. Không xóa/reset dữ liệu localStorage, không thêm backend hoặc dependency nếu chưa được yêu cầu. Chỉ chạy test/build khi user yêu cầu. Giữ UI tiếng Việt và phong cách Floating Glassmorphism tối giản.

Khi hoàn tất thay đổi nghiệp vụ hoặc kiến trúc, cập nhật docs liên quan để khớp code; không ghi rằng một yêu cầu đã triển khai nếu chỉ mới đặc tả.

## Kiến trúc hiện hành

- Đây là SPA HTML/CSS/JavaScript thuần, entry tại `frontend/index.html`; có thể phục vụ tĩnh thư mục `frontend/`.
- Dữ liệu demo và state nghiệp vụ chạy trong trình duyệt; workspace lưu tại localStorage `c12-workspace-v7`, session demo tại `c12-local-session`.
- Không có backend, DBMS, API, Socket.IO hay cấu hình Docker/Nginx trong source tree hiện tại. Role là mô phỏng giao diện, không phải ranh giới bảo mật.
- `frontend/js/data/demo-workspace.js` là dữ liệu khởi tạo; không xóa/reset localStorage người dùng.
- Root `index.html` là preview tài liệu, không phải ứng dụng.
