# Câu hỏi còn mở — bản thay đổi 16/11/2026

Mapping tài nguyên đã được chốt: mỗi dòng phụ lục có hệ thống riêng; task giữ đơn vị/cơ quan chung; các dòng cùng khóa được gộp, không cộng. Các lựa chọn trạng thái, hạn, quyền, danh mục và upload đã được trả lời không tiếp tục nằm trong danh sách chờ.

## Đề xuất để prototype có thể hoạt động
1. Dữ liệu v4 chưa có task nguồn: giữ nguyên, chỉ admin xem và chỉ đọc; admin có thể chuyển thành task bằng cách bổ sung nhóm, người nhận, lịch và metadata công văn bắt buộc. Không bịa lịch sử. Cần xác nhận trước khi áp dụng dữ liệu thật.
2. Task nhiều người nhận: khi một người chuyển nhóm, giữ nhóm quản lý cũ và mã task; nhóm tham gia theo người nhận hiện tại. Người dùng đã chốt giữ mã, chưa nói riêng nhóm quản lý trong trường hợp này.
3. Yêu cầu ít nhất một người nhận; user tạo task phải tự giao. Chưa có yêu cầu task vô chủ.
4. Task thường không tự tạo dòng tài nguyên, vì yêu cầu gộp hiện nói về task theo công văn. Nếu muốn tài nguyên từ task thường, cần mở rộng quy tắc rõ ràng.
5. Nhiệm vụ cá nhân chứa task tự tạo; Được giao cho tôi chứa task được giao bởi người khác. Thêm tab Nhóm của tôi để xem việc nhóm, tránh trộn với việc cá nhân.
6. Mặc định trạng thái mới là Đang xử lý; chưa có workflow Nháp riêng.
7. Bộ lọc tháng/cá nhân/văn bản kết hợp theo điều kiện AND. Dòng khớp vẫn giữ các nhóm công văn được phép xem; bộ lọc không cấp thêm quyền.
8. Metadata danh mục sửa ở phần công văn hiện tại; revision cũ giữ thông tin tại thời điểm lưu. Quyền xem revision cũ theo quyền xem task hiện tại.
9. Xóa task, nhóm hoặc mục danh mục đang được liên kết dùng lưu trữ/đánh dấu xóa; không phá audit và liên kết.
10. Người chưa có tài khoản vẫn xuất hiện trên graph nhưng chưa nhận task cho đến khi có tài khoản active.
11. Lãnh đạo phòng/tổ trưởng là node chung phía trên nhóm; quy tắc một nhóm áp dụng thành viên thuộc nhánh nhóm. Cần xác nhận nếu các chức danh chung cũng phải có membership.
12. Đổi tiền tố nhóm trong danh mục chỉ tác động mã task cấp mới; không đổi hàng loạt mã cũ.
13. Excel nhiều cặp đơn vị/cơ quan: chọn một cặp cho task hiện tại hoặc tách thành nhiều task. Không tự thay thông tin chung để nhập tất cả.

## Chưa cần quyết định để duyệt giao diện
Loại tệp ngoài mẫu, dung lượng, thời hạn giữ tệp, sửa/xóa bình luận, mở lại task hoàn thành, chính sách khôi phục dữ liệu, sửa đồng thời và phân quyền lịch sử chi tiết.

## Giai đoạn MVP
Cơ sở dữ liệu, xác thực, API, realtime đa thiết bị, kho tệp, sao lưu và quyền phía máy chủ chưa được chọn. Prototype dùng các tab cùng trình duyệt/origin, không phải giải pháp realtime đa máy. Không coi việc chưa trả lời là đồng ý đề xuất.

