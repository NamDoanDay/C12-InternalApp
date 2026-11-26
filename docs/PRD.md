# PRD — C12 / P4 - T1 Internal App

Cập nhật 26/11/2026. PRD nêu mục tiêu sản phẩm; chi tiết nghiệp vụ chuẩn trong [SPEC.md](SPEC.md), quyền tại [PERMISSIONS.md](PERMISSIONS.md), kiến trúc hiện tại tại [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md).

## Mục tiêu

Một workspace nội bộ tiếng Việt để quản lý công việc, văn bản, tài nguyên, kiến thức chuyên môn và nhân sự của tổ. Giao diện cần hỗ trợ kiểm soát quyền theo role, nhóm và assignment; lịch sử thay đổi phải có thể truy vết. Thiết kế Floating Glassmorphism tối giản, dễ đọc ở LIGHT/DARK.

## Phạm vi

- Trang chính: tổng quan tổ, quick access, văn bản gần đây và tình hình task.
- Quản lý công việc: task xử lý văn bản / task thường, gán người, workflow, hạn, thông báo, filter, Kanban 3 cột/Table và donut thống kê theo phạm vi.
- Danh mục văn bản: một kho, tabs theo 8 loại văn bản.
- Quản lý tài nguyên: bản ghi độc lập, văn bản liên kết, hardware appendix, custom fields, bảng gộp và xuất XLSX.
- Kiến thức tổ: nội dung/tệp và filter metadata.
- Cây sơ đồ: graph nhóm, thành viên, kéo thả chuyển nhóm.
- Quản lý nhân sự: hồ sơ Person, User account và duyệt đăng ký.
- Thống kê: tổng hợp task theo quyền; cần phân biệt dữ liệu live và fixture.

## Tiêu chí sản phẩm chuẩn

1. Task được gán cho người cụ thể; lọc nhóm không đồng nghĩa giao nhóm.
2. Status tổng hợp duy nhất: hoàn thành ưu tiên; nếu chưa hoàn thành thì quá due time là chậm muộn; còn lại đang xử lý.
3. Task task-list tabs và summary dùng cùng bộ lọc; Kanban giữ ba cột aggregate.
4. Công văn là một loại trong Danh mục văn bản; loại + số dùng để liên kết/tạo mục khi lưu task.
5. Quản lý tài nguyên độc lập với task và có table grouping theo đơn vị/cơ quan/hệ thống cùng nhóm cột văn bản.
6. Phân quyền được kiểm tra ở mọi đường truy cập; prototype hiện chỉ client-side, production cần server-side enforcement.
7. Theme, modal, table và surface tuân theo [FRONTEND_RULES.md](FRONTEND_RULES.md).

## Khoảng cách triển khai đã biết

- Resource “Được giao cho tôi” chưa dựa trên task assignment vì resource records không gắn task; code lọc creator/editor.
- Quyền sửa resource hiện admin/creator/editor, chưa phải admin/assignee của task nguồn.
- Xuất resource XLSX cần kiểm tra trường hợp phụ lục nhiều hàng; code có thể chỉ xuất hàng đầu, không khớp hoàn toàn màn hình.
- Nhóm cột resource hiện tập trung schema 952/4651, chưa là schema động tổng quát cho mọi loại văn bản.
- Trang thống kê có activity/calendar fixture tĩnh.
- Prototype không có backend, bảo mật tài khoản hoặc đồng bộ nhiều thiết bị.

Đây là ghi nhận code hiện tại, không phải thay đổi chuẩn nghiệp vụ. Xem đầy đủ trong SPEC.
