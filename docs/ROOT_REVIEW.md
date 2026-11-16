# Kiểm tra đặc tả trước triển khai — 16/11/2026

Root đã đối chiếu CHANGE_REQUIREMENTS, SPEC, PERMISSIONS, PRD và TECH_ARCHITECTURE với các câu trả lời phỏng vấn. Cho phép triển khai prototype sau lần kiểm tra này; đây không phải kết quả nghiệm thu giao diện hoặc backend.

## Nội dung đã kiểm tra

- Hai vai trò đăng nhập độc lập với chức danh trên sơ đồ tổ; nhóm quản lý task khác nhóm lọc người nhận.
- Một trạng thái chung, tổng hợp theo hạn, số ngày muộn làm tròn lên, quyền sửa hạn của admin/người tạo.
- Mã hiển thị có thể đổi khi chuyển người nhận duy nhất; ID nội bộ và các bản lịch sử không đổi.
- Hai danh mục độc lập, lưu mục mới ngay trong phiếu; công văn có đủ số/ngày/trích yếu dù chưa có tệp.
- Task có đơn vị/cơ quan chung và hệ thống riêng trên từng dòng phụ lục; gộp bảng theo bộ ba, không cộng các dòng.
- Mọi ô có task và dòng nguồn; quyền sửa theo nguồn, cập nhật tạo bản lịch sử; bản cũ chỉ đọc.
- Quyền xem được áp dụng trước khi tạo bảng tổng hợp/tìm kiếm/sidebar để không lộ task ngoài phạm vi nhóm.
- Thông báo gồm cả người thao tác, loại trùng người nhận; demo giữa các tab có phiên tài khoản riêng.
- Upload tài nguyên chỉ nằm trong task; không còn bộ chọn bốn phong cách.

## Lựa chọn triển khai prototype, không phải quyết định bổ sung của người dùng

- Giữ dữ liệu v4 dưới dạng dữ liệu cũ chỉ đọc dành cho admin, sao lưu và không xóa khóa gốc. Admin có thể chuyển sang task sau khi bổ sung các trường bắt buộc; không bịa người nhận hoặc thời hạn.
- Task nhiều người nhận giữ nhóm quản lý khi một người chuyển nhóm; quyền xem nhóm tham gia cập nhật theo người nhận hiện tại. Task DAILY giữ mã DAILY.
- Task mới mặc định Đang xử lý; yêu cầu ít nhất một người nhận. User có mục Nhóm của tôi ngoài hai danh sách cá nhân/được giao.
- Xóa mục đang được tham chiếu dùng lưu trữ hoặc chặn thao tác làm mất liên kết. Không thay đổi các bản lịch sử.
- Các lựa chọn này phải ghi trong tài liệu và có thể điều chỉnh khi duyệt prototype.

Frontend phải có kiểm tra mô hình và kiểm thử trình duyệt cho các tình huống trên. Agent tài liệu tiếp tục sửa câu chữ; không thay đổi quyết định nghiệp vụ đã được kiểm tra nếu chưa báo root.
