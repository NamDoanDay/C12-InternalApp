# Hướng dẫn cho AI/IDE

Trước khi sửa dự án, đọc [docs/INDEX.md](docs/INDEX.md), sau đó đọc tài liệu theo loại việc: `SPEC.md` (nghiệp vụ), `PERMISSIONS.md` (quyền), `TECH_ARCHITECTURE.md` (runtime/state/migration), `FRONTEND_RULES.md` (UI/CSS). `docs/SPEC.md` là nguồn chuẩn nghiệp vụ; decision log cũ đã được gộp vào đó, không duy trì bản sao riêng.

Luôn phân biệt yêu cầu đã chốt với hành vi hiện tại. Nếu code lệch SPEC, nêu khoảng lệch thay vì âm thầm hợp thức hóa code. Không xóa/reset dữ liệu localStorage, không thêm backend hoặc dependency nếu chưa được yêu cầu. Chỉ chạy test/build khi user yêu cầu. Giữ UI tiếng Việt và phong cách Floating Glassmorphism tối giản.

Khi hoàn tất thay đổi nghiệp vụ hoặc kiến trúc, cập nhật docs liên quan để khớp code; không ghi rằng một yêu cầu đã triển khai nếu chỉ mới đặc tả.
