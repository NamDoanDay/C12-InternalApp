# PRD — C12 / P4 - T1 Internal App

Cập nhật 27/11/2026. Đây là tóm tắt mục tiêu sản phẩm. Nghiệp vụ chi tiết tại [SPEC.md](SPEC.md), quy tắc role giao diện tại [PERMISSIONS.md](PERMISSIONS.md), runtime tại [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md), quy tắc UI tại [FRONTEND_RULES.md](FRONTEND_RULES.md).

## Mục tiêu

Workspace nội bộ tiếng Việt để theo dõi công việc, danh mục văn bản, dữ liệu tài nguyên, kiến thức chuyên môn và nhân sự tổ. Runtime hiện là SPA tĩnh với lưu trữ localStorage; không có backend/database.

## Phân hệ

- **Trang chính:** thông tin nội bộ tổ, quân số/nhóm, quick access, văn bản gần đây và công việc cần theo dõi.
- **Quản lý công việc:** task Xử lý văn bản, Quản lý tài nguyên và Task thường; workflow, phân công, lịch, tìm kiếm/lọc; bốn tab aggregate; Kanban ba cột hoặc Table; donut theo phạm vi lọc.
- **Quản lý tài nguyên:** Resource độc lập, có thể liên kết nhiều task; task Quản lý tài nguyên gắn đúng một resource. Form resource hỗ trợ tạo task kèm trong cùng lần lưu. Resource và task dùng chung attachments/custom fields; bảng tổng hợp nhóm theo đơn vị/cơ quan/hệ thống và nhóm appendix theo Công văn đăng ký.
- **Danh mục văn bản:** một catalog duy nhất gồm Công văn, Thông tư, Nghị định, Quyết định, Luật, Nghị quyết, Báo cáo, Văn bản cấp tài nguyên, Các loại văn bản khác. Task xử lý văn bản liên kết văn bản chính bằng ID; Resource liên kết riêng Công văn đăng ký và Văn bản cấp tài nguyên bằng ID.
- **Kiến thức tổ:** bài viết/tài liệu có metadata cấp ban hành, cơ quan, loại văn bản và bộ lọc.
- **Cây sơ đồ tổ:** graph theo nhánh nhóm; kéo thả thành viên cập nhật nhóm hiện tại.
- **Quản lý nhân sự:** Person, liên kết User, tài khoản và duyệt đăng ký.
- **Thống kê:** tổng hợp task theo phạm vi người dùng; một số widget hoạt động/lịch là fixture, không phải dữ liệu trực tiếp.
- **Đăng nhập demo/tài khoản:** lần đầu có thể tự đăng nhập User demo; đăng ký tạo yêu cầu pending để admin duyệt, quản lý profile và chuyển role là mô phỏng cục bộ, chưa xác minh mật khẩu.
- **Tìm kiếm/thông báo:** tìm kiếm toàn cục hiện chỉ tìm task theo title/mã/mô tả/aliases; các màn hình khác có filter/search riêng. Notification được sinh chủ yếu khi tạo task hoặc thêm assignee, có trạng thái đã đọc/chưa đọc và mở task liên quan.
- **Chủ đề cá nhân:** đổi LIGHT/DARK, preset/màu chữ, accent, gradient/ảnh nền; tùy chọn lưu cục bộ theo trình duyệt và user demo.
- **Nhập phụ lục task:** DOCX/XLSX có bước trích xuất, preview/chỉnh sửa và xác nhận; kết quả chỉ được ghi khi lưu task. Resource V7 không dùng luồng import cũ làm thao tác nhập resource độc lập.

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

Workspace lưu cục bộ trong trình duyệt; không đồng bộ nhiều user hoặc nhiều thiết bị. Vai trò demo phía client không phải cơ chế bảo mật. XLSX/Mammoth và một số font/CDN phụ thuộc môi trường tải. Resource export hiện dựng file XLSX từ tập dữ liệu đang lọc, gồm header nhóm/cột con, merge ô định danh và các dòng phụ lục chung/riêng; việc khẳng định khớp hoàn toàn một workbook tham chiếu vẫn cần đối chiếu trực quan.

Đăng nhập hiện không kiểm tra mật khẩu, đăng ký không lưu mật khẩu và checkbox “Ghi nhớ đăng nhập” chưa có tác dụng thực tế. Activity/lịch Thống kê là fixture tĩnh tháng 11/2026, không phải audit feed live. CRUD quyền User thường cho Danh mục văn bản/Kiến thức chưa được chốt thống nhất; xem [PERMISSIONS.md](PERMISSIONS.md) và mục điểm cần xác nhận trong [SPEC.md](SPEC.md).
