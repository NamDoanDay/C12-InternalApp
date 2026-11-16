# Truy vết yêu cầu

Trạng thái cột cuối là trạng thái yêu cầu/đích triển khai, không phải kết quả kiểm thử. Các AC chi tiết nằm trong PRD.

| Nhóm yêu cầu đã chốt | Nguồn xác nhận | Đặc tả / AC | Đầu ra dự kiến |
| --- | --- | --- | --- |
| Bốn hướng + prototype trước, MVP sau | Phỏng vấn | PRD hai giai đoạn; PLAN | design/index.html; frontend/index.html |
| HTML/Tailwind/vanilla JS, không React, localStorage, không deploy | Phỏng vấn | SPEC triển khai; TECH_ARCHITECTURE | Prototype local |
| Header/sidebar/theme/trang chính | Brief gốc | AC-01..03; SPEC sơ đồ màn hình | Shell frontend |
| Bảng gộp theo đơn vị + cơ quan + hệ thống; nhóm công văn khác schema | Làm rõ cuối + test.xlsx | AC-17/20/32/33; SPEC workbook | Bảng và seed |
| Lịch sử nhập và bản xác nhận mới nhất | Làm rõ cuối | AC-18/22/34/35; mô hình version | Projection bảng + timeline |
| Preview/sửa/bổ sung trước xác nhận; thời gian riêng | Phỏng vấn | AC-09/23..25 | Luồng import |
| Drawer scope cặp đơn vị/cơ quan, ba vùng | Phỏng vấn + ảnh | AC-05/19/21/22 | Drawer |
| Custom fields tách nơi, quyền/scope, vị trí nút, chọn nhóm cột | Phỏng vấn | AC-07/26..31/36 | Bảng và drawer fields |
| Kiến thức CRUD và tệp bởi admin/user | Phỏng vấn | AC-11/37 | Kiến thức tổ |
| Hai role; duyệt đăng ký/liên kết hồ sơ; nhân sự chỉ admin | Phỏng vấn | AC-13..16; SPEC | Auth demo, quản lý nhân sự |
| Danh mục văn bản tìm/thêm/xem | Brief gốc | AC-10; SPEC | Danh mục |
| Thống kê | Brief: bàn sau | PRD ngoài vòng hiện tại | Deferred |
| Quyền CRUD tài nguyên/Danh mục/upload cho admin và user | Phỏng vấn bổ sung | AC-38; SPEC vai trò | Hành động frontend, quyền MVP sau |
| Lọc số công văn chọn dòng khớp và giữ toàn bộ nhóm/thông tin | Lọc 952: dòng 952+4651 giữ cả hai nhóm; dòng 4267-only bị loại | AC-39; SPEC bộ lọc | Bảng tài nguyên |

Lọc tháng dùng uploadedAt đã chốt; phương án match-row và giữ mọi nhóm cho tháng vẫn là đề xuất, không suy thành yêu cầu đã xác nhận từ ví dụ số công văn.

Workbook được root kiểm tra và lưu tại `reference/test.xlsx`; agent docs ghi nhận kết quả cấu trúc, không tự tuyên bố đã chạy parser frontend. Các yêu cầu đổi hướng trước đây về append dòng đã bị thay thế và không còn là tiêu chí nghiệm thu.
