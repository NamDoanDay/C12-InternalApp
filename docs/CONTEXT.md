# Bối cảnh dự án và thuật ngữ

Cập nhật 26/11/2026. Đây là prototype quản trị nội bộ C12/P4-T1, hiện chạy hoàn toàn phía trình duyệt. Mục tiêu là duyệt và hoàn thiện luồng công việc; chưa phải hệ thống production.

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
| Resource | Bản ghi tài nguyên độc lập trong phân hệ Quản lý tài nguyên hiện tại |
| Surface | Khối UI gom nhóm thành phần cùng chức năng |
| Revision | Bản chụp thay đổi/lịch sử của bản ghi theo mô hình tương ứng |

## Quy tắc đọc mâu thuẫn

`SPEC.md` là chuẩn nghiệp vụ đã xác nhận; code là bằng chứng hiện trạng. Khi lệch nhau, tài liệu nêu cả yêu cầu lẫn trạng thái thực tế. Tài liệu đề xuất không tự trở thành quyết định. Các quyết định cũ bị thay thế được ghi chú ở SPEC, không dùng làm yêu cầu hiện hành.

Các quyết định quan trọng nhất: task xử lý văn bản và task thường; danh mục văn bản thống nhất; Quản lý tài nguyên độc lập với task; graph có nhánh nhóm; phân quyền admin/user; Floating Glassmorphism tối giản. Chi tiết ở [SPEC.md](SPEC.md).

## Giới hạn prototype

- State chính lưu localStorage, identity demo theo tab lưu sessionStorage.
- BroadcastChannel và `storage` events chỉ chia sẻ thay đổi giữa các tab cùng browser/origin.
- Không có API/backend, đăng nhập bảo mật, authorization phía server, multi-device sync hay lịch sử phía server.
- Các dữ liệu seed/demo và fixture phải được phân biệt với dữ liệu live.
- Không giả định các thư viện CDN luôn sẵn có; luồng phụ thuộc thư viện cần báo lỗi có thể xử lý được.

## Tham chiếu

Ảnh/mockup dùng để định hướng bố cục, không là nguồn dữ liệu nghiệp vụ. Workbook trong `reference/` dùng cho cấu trúc cột tài nguyên; nếu dữ liệu mẫu bất nhất, không suy đoán dữ liệu thật.
