# PRD — C12 / P4 - T1 Internal App

Cập nhật 27/11/2026. Đây là tóm tắt mục tiêu sản phẩm. Nghiệp vụ chi tiết tại [SPEC.md](SPEC.md), quyền tại [PERMISSIONS.md](PERMISSIONS.md), kiến trúc đang chạy tại [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md), quy tắc UI tại [FRONTEND_RULES.md](FRONTEND_RULES.md).

## Mục tiêu

Workspace nội bộ tiếng Việt để theo dõi công việc, danh mục văn bản, dữ liệu tài nguyên, kiến thức chuyên môn và nhân sự tổ. Runtime hiện gồm SPA, API Node.js, MySQL và Socket.IO; giới hạn còn lại nằm trong `TECH_ARCHITECTURE.md`.

## Phân hệ

- **Trang chính:** thông tin nội bộ tổ, quân số/nhóm, quick access, văn bản gần đây và công việc cần theo dõi.
- **Quản lý công việc:** task Xử lý văn bản, Quản lý tài nguyên và Task thường; workflow, phân công, lịch, tìm kiếm/lọc; bốn tab aggregate; Kanban ba cột hoặc Table; donut theo phạm vi lọc.
- **Quản lý tài nguyên:** Resource độc lập, có thể liên kết nhiều task; task Quản lý tài nguyên gắn đúng một resource. Form resource hỗ trợ tạo task kèm trong cùng lần lưu. Resource và task dùng chung attachments/custom fields; bảng tổng hợp nhóm theo đơn vị/cơ quan/hệ thống và nhóm appendix theo Công văn đăng ký.
- **Danh mục văn bản:** một catalog duy nhất gồm Công văn, Thông tư, Nghị định, Quyết định, Luật, Nghị quyết, Báo cáo, Văn bản cấp tài nguyên, Các loại văn bản khác. Task xử lý văn bản liên kết văn bản chính bằng ID; Resource liên kết riêng Công văn đăng ký và Văn bản cấp tài nguyên bằng ID.
- **Kiến thức tổ:** bài viết/tài liệu có metadata cấp ban hành, cơ quan, loại văn bản và bộ lọc.
- **Cây sơ đồ tổ:** graph theo nhánh nhóm; kéo thả thành viên cập nhật nhóm hiện tại.
- **Quản lý nhân sự:** Person, liên kết User, tài khoản và duyệt đăng ký.
- **Thống kê:** tổng hợp task theo phạm vi người dùng; một số widget hoạt động/lịch là fixture, không phải dữ liệu trực tiếp.

## Nguyên tắc sản phẩm

1. Quyền truy cập task áp dụng trước tìm kiếm, bộ đếm, biểu đồ, bảng và drawer.
2. Aggregate status: Đã hoàn thành ưu tiên; task chưa hoàn thành quá due time là Chậm muộn; còn lại là Đang xử lý.
3. Tab trạng thái và summary card dùng chung bộ lọc; Kanban luôn giữ ba cột aggregate.
4. Công văn là một loại văn bản trong catalog chung. Loại + số dùng để liên kết bản ghi sẵn hoặc tạo văn bản mới theo luồng đã chốt.
5. Resource và Task được liên kết rõ bằng ID; không suy luận dữ liệu resource như bản chiếu từ task.
6. Một Công văn mới trong catalog tạo nhóm cột appendix mặc định trong bảng tài nguyên ở lần render tiếp theo, nhưng không tự tạo resource hay gán Công văn vào resource. “Văn bản cấp tài nguyên” không tạo nhóm appendix Công văn.
7. Floating Glassmorphism tối giản phải cân bằng độ trong, độ tương phản và phân tầng surface trên LIGHT/DARK.
8. Không mô tả yêu cầu chuẩn như tính năng đã triển khai nếu code chưa thể hiện; liệt kê khoảng lệch tại [SPEC.md](SPEC.md).

## Giới hạn hiện tại

Snapshot workspace lưu MySQL; Socket.IO thông báo thay đổi sau transaction commit. State localStorage cũ không được import; theme vẫn lưu cục bộ. API mutation hiện dùng snapshot endpoint nên cần tiếp tục tách theo use-case trước khi tối ưu scale. XLSX/Mammoth và một số font/CDN phụ thuộc môi trường tải. Export tài nguyên cần được rà soát với workbook nếu cần tương đương hoàn toàn về merge cells/appendix nhiều dòng.
