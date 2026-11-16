# Câu hỏi còn mở

Không coi việc chưa trả lời là đồng ý một phương án. Các quyết định đã chốt về latest-confirmed, quyền Kiến thức và vị trí cột mới không còn nằm trong danh sách pending.

| Chủ đề | Câu hỏi cần chốt | Ảnh hưởng |
| --- | --- | --- |
| Ngữ nghĩa xóa nội dung | Cả admin/user đã có CRUD tài nguyên/Danh mục/upload. Xóa dữ liệu có xóa snapshot, tệp và liên kết hay chỉ ẩn? | Toàn vẹn dữ liệu; audit |
| Vòng đời nhân sự | Xóa tài khoản có giữ hồ sơ không; xóa hồ sơ ảnh hưởng cây/tài khoản thế nào? Khóa đối chiếu hồ sơ là gì? | Liên kết và xóa |
| Cây tổ | Theo vị trí hay người; kiêm nhiệm, vị trí trống, lịch sử điều chuyển? | Mô hình cây |
| Kho văn bản | Công văn tài nguyên, danh mục và kiến thức liên kết hay tách? Quy tắc số văn bản trùng ở danh mục? | Quan hệ và tìm kiếm |
| Sau nhập | Sửa snapshot đã xác nhận có tạo mốc mới không? Xóa event/bản nhập được phép thế nào? | Lịch sử, audit |
| Thêm hàng | Nếu tạo thủ công hệ thống đã tồn tại trong cặp đơn vị/cơ quan, nối vào dòng hiện có hay báo trùng? | Form và validation |
| Trường tùy biến | Đổi kiểu/xóa cột có dữ liệu, khôi phục và xung đột sửa đồng thời xử lý thế nào? | Bảo toàn dữ liệu |
| Import ngoài mẫu | Mẫu bổ sung, .doc/.xls, nhiều sheet, mật khẩu/scan, dung lượng, file nguồn và thời hạn giữ? | Parser/storage |
| Preview nháp | Hủy/upload lại, giữ nháp, thử lại lỗi kỹ thuật và một file có nhiều hệ thống được xử lý thế nào? | State machine import |
| Timestamp và đồng thời | Múi giờ hiển thị, xử lý confirmedAt bằng nhau? | Thứ tự version và filter |
| Lọc tháng trên dòng tổng hợp | Số công văn đã chốt match dòng và giữ toàn bộ nhóm. Với tháng, uploadedAt đã chốt; match dòng có upload khớp và giữ mọi nhóm mới là đề xuất, cần xác nhận riêng. | Projection sau filter |
| Tìm kiếm | Search toàn cục tìm những loại gì; số công văn khớp chính xác hay gần đúng? Cấp quản lý thuộc đơn vị hay văn bản? | Truy vấn và UX |
| MVP | Hạ tầng/mạng, SSO, DB, số user, quy mô tệp, đồng bộ, sao lưu, audit? | Kiến trúc giai đoạn 2 |

Các đề xuất kỹ thuật trong TECH_ARCHITECTURE chưa thay thế câu trả lời nghiệp vụ.
