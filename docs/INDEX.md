# Tài liệu dự án C12 / P4 - T1

Ngày rà soát: 27/11/2026. Đây là điểm vào duy nhất cho AI/IDE. Đọc theo thứ tự:

1. [AGENTS.md](../AGENTS.md) — quy tắc nhanh cho agent và thứ tự nguồn chuẩn.
2. [SPEC.md](SPEC.md) — nghiệp vụ đã chốt, hiện trạng code và khoảng lệch; bao gồm luồng liên kết Task–Resource–Văn bản và sinh nhóm cột Công văn.
3. [PERMISSIONS.md](PERMISSIONS.md) — ma trận quyền theo role/quan hệ task.
4. [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) — cấu trúc SPA, state localStorage và cách chạy/build.
5. [FRONTEND_RULES.md](FRONTEND_RULES.md) — thiết kế, CSS/theme, layout và tương tác.
6. [CONTEXT.md](CONTEXT.md) — thuật ngữ, phạm vi và cách xử lý mâu thuẫn.
7. [PRD.md](PRD.md) — mục tiêu, phạm vi và các khoảng cách triển khai đã biết.

## Tra cứu theo chức năng

| Nhu cầu | Tài liệu chuẩn |
|---|---|
| Task, workflow, bộ lọc, donut/Kanban/Table, chi tiết/bình luận/nhật ký | [SPEC.md §3](SPEC.md#3-quan-ly-cong-viec) |
| Catalog văn bản và quan hệ với task/resource | [SPEC.md §4–6](SPEC.md#4-danh-muc-van-ban) |
| Resource V7, bảng động, phụ lục theo Công văn, Excel, thêm/xóa hàng/cột, liên kết task | [SPEC.md §5–6](SPEC.md#5-quan-ly-tai-nguyen) |
| Graph nhóm, nhân sự, tài khoản và duyệt đăng ký | [SPEC.md §7, §9](SPEC.md#7-cay-so-do-to) |
| Kiến thức, Trang chính, Thống kê, tìm kiếm, notification | [SPEC.md §8, §10–11](SPEC.md#8-kien-thuc-to) |
| Đăng nhập demo, theme, localStorage, seed/migration và giới hạn runtime | [SPEC.md §1.1, §13](SPEC.md#11-dang-nhap-demo-phien-va-thiet-lap-nguoi-dung), [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) |
| Quy tắc layout, token, typography, responsive, modal và table | [FRONTEND_RULES.md](FRONTEND_RULES.md) |

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
| `frontend/index.html` | Entry point SPA tĩnh |
| `frontend/js/data/demo-workspace.js` | Dữ liệu khởi tạo demo cho chế độ chạy cục bộ |
| `frontend/css/` | Tailwind entry, CSS legacy, workspace, glass, auth, V7 overrides |
| `frontend/js/core/` | Foundation/state, model, UI repair |
| `frontend/js/pages/` | App shell/navigation và workspace views |
| `frontend/js/features/` | Form, detail, drawer, import/export, resource V7 |
| `frontend/js/data/local_demand.js` | Bộ dữ liệu nhu cầu tài nguyên tham khảo dùng trong frontend |
| `reference/` | Workbook/nguồn tham khảo được lưu trong repo |
| `tests/` | Script/fixture kiểm tra hiện có; xem nội dung trước khi chạy |
| `design/` | Tài sản/tham chiếu thiết kế |

Chi tiết cách chạy SPA, lưu state và giới hạn bảo mật nằm trong [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md).

## Lưu ý sử dụng

Ứng dụng được phục vụ như static SPA; `npm run build:css` tạo bundle CSS từ Tailwind. State workspace được lưu trong localStorage `c12-workspace-v7`, còn phiên và một số tùy chọn giao diện dùng key riêng. Không có backend/database; các role demo chỉ mô phỏng phía client. Lưu ý seed version và migration có thể bổ sung/chuẩn hóa dữ liệu demo trên workspace đã tồn tại; xem [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) trước khi thao tác storage.
