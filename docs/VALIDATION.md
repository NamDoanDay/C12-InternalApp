# Kiểm tra tài liệu trước triển khai — 16/11/2026

Đây là kiểm tra tính nhất quán của tài liệu do agent thực hiện. Root xác nhận cổng triển khai trước khi frontend thay đổi. Nội dung này không phải QA trình duyệt hoặc nghiệm thu MVP.

| Nội dung kiểm tra | Kết quả |
|---|---|
| Quyết định mới và bản cũ | CHANGE_REQUIREMENTS là nguồn mới; bản v4 giữ trong archive/v4. |
| Role và chức danh | Đúng hai role; chức danh graph không tự cấp quyền. |
| Nhóm quản lý và nhóm lọc người | Hai khái niệm tách biệt, dùng nhất quán. |
| Trạng thái xử lý và tổng hợp | Bốn trạng thái nghiệp vụ; ba trạng thái tổng hợp. Chậm muộn không phải workflow mới. |
| Hạn hoàn thành | Có giờ/phút; hoàn thành ưu tiên; quá hạn dùng làm tròn lên 24 giờ. |
| Quyền đổi hạn | Chỉ admin hoặc người tạo task; có lịch sử. |
| Mã task và ID | ID nội bộ bất biến, mã có thể đổi, giữ mã cũ để truy vết. |
| Chuyển nhóm | Một người nhận: chuyển nhóm quản lý/mã. Nhiều người: giữ mã và cập nhật nhóm tham gia. |
| Danh mục | Hai danh mục độc lập, lưu mục mới ngay từ phiếu task. |
| Upload | Chỉ trong task; không còn luồng upload trực tiếp ở tài nguyên. |
| Mapping phụ lục | Đã chốt: thông tin đơn vị/cơ quan chung, hệ thống riêng từng dòng; trùng khóa gộp, không cộng. |
| Sửa ô | Có task nguồn và mã dòng phụ lục; user chỉ sửa nguồn được giao, admin sửa mọi nguồn. |
| Lịch sử | Revision cũ chỉ đọc; phần công văn cố định, phần task thay theo revision. |
| Phạm vi hiển thị | Lọc task theo quyền trước khi tính projection, không để giá trị nguồn ngoài quyền lộ ra. |
| Thông báo | Có cả người thao tác, loại trùng người nhận, không gửi cho người chỉ xem nhóm. |
| Phiên demo | sessionStorage riêng từng tab; dữ liệu chung và sự kiện dùng kho cùng origin. |
| Nâng phiên bản | Có sao lưu, không reset v4, không bịa task/lịch sử cho nguồn cũ. |
| Giới hạn kiểm chứng | QA15/11 là lịch sử; bản mới cần kết quả kiểm thử riêng. |

## Các đề xuất được giữ rõ ràng
- Dữ liệu cũ thiếu task nguồn: chỉ admin xem ở chế độ chỉ đọc, có luồng chuyển thành task hợp lệ trước khi sửa.
- Task nhiều người nhận giữ nhóm quản lý ban đầu khi một người chuyển nhóm.
- Xóa dữ liệu đang được tham chiếu dùng lưu trữ/đánh dấu xóa để giữ lịch sử.
- Import nhiều cặp đơn vị/cơ quan cho chọn một cặp hoặc tách task, không âm thầm gộp.

Các mục này là đề xuất triển khai, không được ghi thành câu trả lời của người dùng. Sau khi root xác nhận tính nhất quán, frontend có thể triển khai theo spec và ghi các giả định trên trong ghi chú bàn giao.

