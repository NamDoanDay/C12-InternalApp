# Bối cảnh dự án và thuật ngữ

Cập nhật 27/11/2026. Đây là workspace quản trị nội bộ C12/P4-T1 dạng SPA tĩnh. Runtime hiện không có backend, Socket.IO, MySQL hoặc Nginx; dữ liệu nghiệp vụ của bản demo được lưu trong localStorage của trình duyệt.

## Thuật ngữ

| Thuật ngữ | Nghĩa trong dự án |
|---|---|
| User / Person | Tài khoản đăng nhập / hồ sơ nhân sự; có thể liên kết nhưng là hai thực thể |
| Group | Nhóm chuyên môn, ví dụ HT, HTM, DN, MC, HPCAI, QLVB |
| Nhóm quản lý task | Nhóm phân loại/quản lý task và mã; tách khỏi nhóm dùng để lọc assignee |
| Assignee | Thành viên được giao task cụ thể; nhóm không nhận task tự động |
| Workflow status | Giá trị trạng thái do người dùng chọn/cập nhật |
| Aggregate status | Đang xử lý/Đã hoàn thành/Chậm muộn, tính theo workflow + due time |
| Văn bản | Danh mục đơn nhất có loại; Công văn là một loại văn bản |
| Công văn đăng ký / Văn bản cấp tài nguyên | Hai liên kết Resource riêng: Công văn có phụ lục nhóm cột; Văn bản cấp tài nguyên là loại catalog riêng, không tạo nhóm appendix |
| Resource | Bản ghi tài nguyên độc lập trong phân hệ Quản lý tài nguyên hiện tại |
| Surface | Khối UI gom nhóm thành phần cùng chức năng |
| Revision | Bản chụp thay đổi/lịch sử của bản ghi theo mô hình tương ứng |

## Quy tắc đọc mâu thuẫn

`SPEC.md` là chuẩn nghiệp vụ đã xác nhận; code là bằng chứng hiện trạng. Khi lệch nhau, tài liệu nêu cả yêu cầu lẫn trạng thái thực tế. Tài liệu đề xuất không tự trở thành quyết định. Các quyết định cũ bị thay thế được ghi chú ở SPEC, không dùng làm yêu cầu hiện hành.

Các quyết định quan trọng nhất: ba loại task (xử lý văn bản, quản lý tài nguyên, task thường); danh mục văn bản thống nhất; Resource có collection riêng nhưng có thể liên kết với task; graph có nhánh nhóm; phân quyền admin/user; Floating Glassmorphism tối giản. Chi tiết ở [SPEC.md](SPEC.md).

## Giới hạn triển khai hiện tại

- Workspace JSON lưu ở localStorage với khóa `c12-workspace-v7`; bộ seed mới nằm trong `frontend/js/data/demo-workspace.js`.
- `seedTaskDemo()` có thể bổ sung một lần vào workspace cũ theo `demoSeedVersion`; migration Resource V7 cũng có thể chuẩn hóa schema và giảm bộ resource demo theo quy tắc giữ dữ liệu có dấu vết chỉnh sửa. Đây không phải runtime chỉ đọc seed khi kho trống.
- Phiên user/admin là mô phỏng cục bộ, không có mật khẩu máy chủ và không bảo đảm quyền truy cập an toàn.
- Lần chạy đầu có thể tự chọn User demo; form đăng nhập không xác minh password và form đăng ký hiện không lưu password. Đừng hiểu các form này là auth hoàn chỉnh.
- Không có API, đồng bộ nhiều trình duyệt, realtime hoặc database. Dữ liệu khác profile/trình duyệt không được chia sẻ.
- Tìm kiếm header hiện chỉ truy vấn task; các entity như resource/catalog/person/knowledge được tìm qua từng view. Activity và lịch ở Thống kê là fixture tháng 11/2026.
- Các dữ liệu seed/demo và fixture phải được phân biệt với dữ liệu live.
- Không giả định các thư viện CDN luôn sẵn có; luồng phụ thuộc thư viện cần báo lỗi có thể xử lý được.

## Tham chiếu

Ảnh/mockup dùng để định hướng bố cục, không là nguồn dữ liệu nghiệp vụ. Workbook trong `reference/` dùng cho cấu trúc cột tài nguyên; nếu dữ liệu mẫu bất nhất, không suy đoán dữ liệu thật.
