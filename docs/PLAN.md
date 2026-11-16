# Kế hoạch triển khai thay đổi

## Cổng 1 — Tài liệu trước giao diện
1. Ghi các quyết định phỏng vấn vào CHANGE_REQUIREMENTS; cập nhật PRD, SPEC, quyền, kiến trúc và truy vết.
2. Root kiểm tra bằng VALIDATION: trạng thái, quyền, mã task khi chuyển nhóm, thời điểm lưu danh mục, revision và nguồn từng ô tài nguyên.
3. Kiểm tra mapping đã chốt: mỗi dòng phụ lục có Hệ thống riêng; task giữ Đơn vị/Cơ quan; trùng khóa thì gộp, không cộng.
4. Chỉ sau root xác nhận, agent frontend bắt đầu sửa giao diện.

## Cổng 2 — Prototype
1. Sao lưu và nâng dữ liệu v4 có kiểm tra; không reset thay đổi của người dùng.
2. Dựng Cloud Console, theme cá nhân, icon thông báo.
3. Danh mục nhóm và graph nhân sự, kéo thả cùng cách chuyển nhóm bằng bàn phím.
4. Hai danh mục Công văn/Văn bản; phiếu task, nhiều người nhận, trạng thái và lịch.
5. Quyền theo vai trò/người tạo/người nhận/nhóm, mã task và lịch sử chuyển nhóm.
6. Trang task admin/user, thẻ tổng hợp và thống kê dùng chung công thức.
7. Revision, bình luận, thông báo và cập nhật giữa các tab; danh tính mỗi tab độc lập.
8. Phụ lục, trường tùy chỉnh, nhập tệp trong task; bảng tài nguyên, sửa ô và sidebar bốn vùng.
9. Bỏ selector bốn phong cách và upload trực tiếp từ màn tài nguyên.
10. Cập nhật ghi chú triển khai, README và preview tài liệu.

## Cổng 3 — Kiểm tra
Mô hình: giới hạn thời gian, làm tròn ngày muộn, loại trùng thông báo, quyền nhóm, chuyển người duy nhất/nhiều người, ID và mã cũ, nguồn ô mới nhất, công văn tại revision, quyền sửa, nâng dữ liệu lặp lại an toàn.

Trình duyệt: form bắt buộc, tạo danh mục trong task, chọn nhiều người qua nhiều nhóm, trạng thái/bình luận, quyền sửa ô, phần công văn cố định, revision cũ chỉ đọc, thông báo Tất cả/Chưa đọc, graph và chuyển nhóm, sáng/tối/nền, desktop/mobile.

Các dữ liệu dùng thử phải khôi phục hoặc dùng kho kiểm thử riêng. Kết quả mới ghi riêng; QA15/11 vẫn giữ là lịch sử.

## Giai đoạn MVP
Chọn backend, xác thực, API, kho tệp, đồng bộ đa thiết bị, xử lý đồng thời và sao lưu. Không coi khả năng frontend demo là kiểm soát truy cập sản xuất.

