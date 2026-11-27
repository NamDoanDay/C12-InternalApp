# Tài liệu dự án C12 / P4 - T1

Ngày rà soát: 27/11/2026. Đây là điểm vào duy nhất cho AI/IDE. Đọc theo thứ tự:

1. [AGENTS.md](../AGENTS.md) — quy tắc nhanh cho agent và thứ tự nguồn chuẩn.
2. [SPEC.md](SPEC.md) — nghiệp vụ đã chốt, hiện trạng code và khoảng lệch; bao gồm luồng liên kết Task–Resource–Văn bản và sinh nhóm cột Công văn.
3. [PERMISSIONS.md](PERMISSIONS.md) — ma trận quyền theo role/quan hệ task.
4. [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) — cấu trúc, API, state, MySQL, migration, Docker và Nginx.
5. [FRONTEND_RULES.md](FRONTEND_RULES.md) — thiết kế, CSS/theme, layout và tương tác.
6. [CONTEXT.md](CONTEXT.md) — thuật ngữ, phạm vi và cách xử lý mâu thuẫn.
7. [PRD.md](PRD.md) — mục tiêu, phạm vi và các khoảng cách triển khai đã biết.

## Thứ tự ưu tiên

- Quyết định mới nhất của người dùng trong hội thoại/repo áp dụng cho chuẩn nghiệp vụ.
- `SPEC.md` là bản chuẩn tổng hợp; decision log cũ đã được gộp vào đây, không duy trì bản sao riêng.
- Mã nguồn là bằng chứng cho **hành vi hiện tại**, không tự thay đổi yêu cầu đã chốt.
- Khi code và SPEC khác nhau, ghi rõ “lệch/chưa hỗ trợ”; không tuyên bố chức năng đã xong chỉ vì có yêu cầu.
- `PERMISSIONS.md` chi tiết quyền; nếu không thống nhất câu chữ với SPEC thì SPEC là chuẩn cuối.
- Không dùng ảnh/mockup làm căn cứ để phát sinh nghiệp vụ ngoài quyết định được xác nhận.

## Thư mục quan trọng

| Đường dẫn | Vai trò |
|---|---|
| `frontend/index.html` | Entry point SPA, nạp CSS, JavaScript và API adapter |
| `backend/` | Express API, xác thực, Socket.IO và module nghiệp vụ |
| `database/` | MySQL migration và seed nghiệp vụ mới |
| `deploy/` | Docker Compose, Nginx và reverse proxy |
| `frontend/css/` | Tailwind entry, CSS legacy, workspace, glass, auth, V7 overrides |
| `frontend/js/core/` | Foundation/state, model, UI repair |
| `frontend/js/pages/` | App shell/navigation và workspace views |
| `frontend/js/features/` | Form, detail, drawer, import/export, resource V7 |
| `frontend/js/data/local_demand.js` | Bộ dữ liệu cũ còn trong frontend; runtime mới dùng seed MySQL |
| `reference/` | Workbook/nguồn tham khảo được lưu trong repo |
| `tests/` | Script/fixture kiểm tra hiện có; xem nội dung trước khi chạy |
| `design/` | Tài sản/tham chiếu thiết kế |

Chi tiết biến môi trường, cách chạy và luồng MySQL transaction → Socket.IO nằm trong [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md).

## Lưu ý sử dụng

Ứng dụng chạy qua Nginx cùng backend API/MySQL; `npm run build:css` tạo bundle CSS từ Tailwind. Không ghi thông tin bí mật vào docs. Dữ liệu localStorage cũ không được nhập; seed MySQL là dữ liệu khởi tạo mới.
