# Hướng dẫn cho AI/IDE

Đọc [docs/INDEX.md](docs/INDEX.md) trước. Nguồn nghiệp vụ là [SPEC.md](docs/SPEC.md); quyền là [PERMISSIONS.md](docs/PERMISSIONS.md); thiết kế là [FRONTEND_RULES.md](docs/FRONTEND_RULES.md); mục tiêu backend/API là [BACKEND_RULES.md](docs/BACKEND_RULES.md) và [API_CONTRACT.md](docs/API_CONTRACT.md); tiến độ và nghiệm thu theo [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). Đọc `TECH_ARCHITECTURE.md` để phân biệt trạng thái thực tế và kiến trúc đích.

Luôn ghi rõ đâu là hành vi code hiện tại, đâu là mục tiêu đã được chốt. Không mô tả tính năng trong plan như đã triển khai. Sau mỗi phase, cập nhật checklist và bằng chứng trong plan. Giữ UI tiếng Việt và phong cách Floating Glassmorphism tối giản.

Người dùng đã yêu cầu chuyển sang Node.js/Express + MySQL 8.4 + Socket.IO + Docker/Nginx. Phase tài liệu được thực hiện trước; chỉ bắt đầu code theo phase sau khi plan ghi nhận phase đó đủ điều kiện. Trong lần chuyển frontend, không dùng/import `c12-workspace-v7` hoặc `c12-local-session` làm nguồn nghiệp vụ/phiên; giữ tùy chọn giao diện cục bộ đã chốt và không xóa các key ngoài ứng dụng.

Các lệnh/test đã được yêu cầu trong plan full-stack; chỉ chạy test/build thuộc phase đang làm và dùng database/volume test tách biệt. Không chạy reset schema/database trong startup thông thường. Dọn mock data được cho phép duy nhất trong schema `c12_internalapp`, theo thao tác riêng có kiểm tra target; không đụng schema khác. Không tự mở rộng destructive scope.

## Trạng thái source hiện tại

- `frontend/index.html` là entry SPA HTML/CSS/JavaScript thuần. Root `index.html` là preview tài liệu.
- Frontend hiện vẫn lưu workspace/demo state vào localStorage; chưa có API client hoặc business API.
- Backend đã có MySQL migrations/bootstrap, auth/account lifecycle, API CRUD cho task/resource/document/organization/knowledge/files/notifications, XLSX resource export và Socket.IO outbox relay. Integration suite 9/9 trên MySQL test riêng. Swagger coverage chưa đầy đủ; frontend vẫn localStorage/demo; Docker/Nginx đã có cấu hình nhưng cần E2E nghiệm thu. Theo dõi tiến độ trong `docs/IMPLEMENTATION_PLAN.md`.
- Kiến trúc mục tiêu và phase được ghi trong `docs/`; phân biệt skeleton hiện có với chức năng đầy đủ đã nghiệm thu.
- `frontend/js/data/demo-workspace.js` là seed cho phiên bản local hiện tại; khi chuyển API, không seed mock business rows vào database.
