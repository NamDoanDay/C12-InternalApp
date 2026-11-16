# Kiến trúc đề xuất — 16/11/2026

Tiếp tục HTML, Tailwind, JavaScript thuần và một hướng Cloud Console. Mô hình bên dưới là thiết kế triển khai đề xuất, chưa chọn backend cho MVP.

## Mô hình dữ liệu
- User: id, role, personId.
- Person: id, currentGroupId, position, type. Group: id, name, code, active.
- Task: id, displayCode, codeAliases, type, managementGroupId, creatorId, assigneeIds, unitId, agencyId, title, description, startAt, dueAt, workflowStatus, officialDocumentIds, documentIds, customFields, resourceAppendix, createdAt, updatedAt, revisionSeq, deletedAt.
- ResourceItem: id, systemId, name, values, fileRefs; nằm trong phụ lục task, không dùng một systemId chung cho task.
- TaskRevision: id, taskId, seq, savedAt, actorId, snapshot, changes, eventType. Snapshot giữ dữ liệu và liên kết tài liệu ở thời điểm đó.
- Comment: id, taskId, authorId, text, createdAt.
- GroupTransfer: id, actorId, personId, oldGroupId, newGroupId, at, affectedTaskCodeChanges.
- OfficialDocument và Document: hai kho riêng, cùng các trường number, issuedAt, summary, sourceFiles, uploadedAt, confirmedAt, note.
- ResourceCellKey: unitId, agencyId, systemId, officialDocumentId, fieldKey.
- CellSource: taskId, resourceItemId, revisionId, savedAt, seq, value.
- Notification: id, eventId, taskId, recipientId, type, createdAt, readAt.
- UserTheme: palette, mode, gradient, imageUrl, imageBlobRef.

Tên trường là định hướng logic; chưa phải lược đồ DB đã triển khai.

## Luồng ghi dữ liệu
Một hàm commit task dùng chung: kiểm tra quyền → kiểm tra dữ liệu → cấp savedAt/seq → lưu revision bất biến → cập nhật projection → tạo thông báo → lưu kho → phát sự kiện tab.

Inline edit phải tìm task và dòng phụ lục nguồn rồi đi qua cùng luồng; không sửa kho main độc lập. Do đó thao tác form và thao tác bảng có cùng lịch sử và kiểm tra quyền.

Chuyển nhóm là một transaction logic: đổi membership, cập nhật nhóm quản lý/mã các task chỉ có một người nhận, lưu lịch sử, tính lại quyền nhóm các task nhiều người. Link, comment và revision dùng ID task bất biến; mã cũ được lưu alias.

Mục danh mục được save riêng ngay trong phiếu task. Hủy task không xóa mục đã save. Xóa dữ liệu đang được liên kết nên dùng trạng thái lưu trữ/đánh dấu xóa để giữ audit.

## Projection tài nguyên
Mỗi dòng phụ lục cung cấp một dòng main theo Đơn vị + Cơ quan + Hệ thống. Các đóng góp cùng khóa được gộp; không cộng các dòng. Nguồn từng ô có resourceItemId để sửa đúng dòng.

Lọc task được phép xem trước khi xây projection, tìm kiếm, thẻ đếm và drawer. Không để nguồn của task ngoài quyền lộ qua bảng tổng hợp. Chọn giá trị mới nhất theo savedAt và seq trong tập nguồn hợp lệ.

Sửa tên hệ thống chỉ đổi đóng góp của dòng nguồn, không sửa task khác. Đổi đơn vị/cơ quan của task áp dụng mọi dòng của task và cần lịch sử. Cột bổ sung cho phép sửa cũng cần provenance.

Header công văn giữ cây nhiều tầng và field ID ổn định; đổi nhãn không đổi khóa dữ liệu.

## Trạng thái suy ra
Một helper tính aggregate và lateDays dùng ở bảng, thẻ, thống kê và drawer. Hoàn thành ưu tiên; chưa hoàn thành chỉ muộn khi now > dueAt. Cập nhật theo phút và khi trở lại tab vì trạng thái muộn có thể đổi mà không có save.

Mốc cũ giữ snapshot hạn/status tại thời điểm lưu; không ghi đè lịch sử khi đổi hạn hiện tại.

## Đồng bộ prototype và MVP
Danh tính ở sessionStorage riêng từng tab; dữ liệu nghiệp vụ, thông báo và trạng thái đọc dùng kho localStorage chung. Sau commit, BroadcastChannel/storage event báo tab khác đọc lại state, lọc quyền và cập nhật badge. Không đổi danh tính tab khác hoặc âm thầm ghi đè draft đang nhập.

Thông báo loại trùng theo eventId + recipientId. Trạng thái đọc thuộc từng người. Người chỉ có quyền xem nhóm không nhận thông báo giao việc.

Đây chỉ là cập nhật giữa các tab cùng trình duyệt/origin. MVP đa thiết bị cần transaction, hàng đợi/outbox, sự kiện được xác thực và API kiểm tra quyền. Chưa chọn WebSocket/SSE hoặc công nghệ cụ thể.

## Tệp và theme
Prototype có thể dùng IndexedDB cho blob nếu cần tải lại tệp. Nếu chỉ giữ metadata phải ghi rõ và không tạo nút download giả. CDN cần Internet; parser DOCX/XLSX không đồng nghĩa OCR/AI tổng quát.

URL ảnh nền chỉ nhận giao thức hợp lệ, không chèn HTML từ dữ liệu người nhập. Escape nội dung tên cột, mô tả, bình luận và tên tệp. Lớp nền độc lập bề mặt form/bảng để giữ tương phản. Không lưu mật khẩu thật.

## Nâng dữ liệu v4 mà không làm mất thay đổi
1. Đọc c12-prototype-v4 và giữ nguyên khóa gốc. Sao lưu toàn bộ theo timestamp/version trước nâng; có xuất JSON nếu thiếu dung lượng.
2. Kho mới có migrationVersion và ánh xạ ID nguồn để chạy lại không nhân đôi. Không reset user changes.
3. Giữ User/Person IDs, Kiến thức, danh mục, cột bổ sung, dòng, snapshot, metadata tệp và trường riêng. Trường chưa hiểu giữ trong legacyExtras.
4. Snapshot cũ giữ originaluploadedAt/confirmedAt, raw values và file refs. Không bịa task title, ngày, assignee hoặc lịch sử mới để giả rằng dữ liệu đã đủ yêu cầu.
5. **Đề xuất cho dữ liệu thiếu task:** chỉ admin xem ở chế độ chỉ đọc; có hành động chuyển thành task bằng cách nhập nhóm, người nhận, lịch và metadata công văn bắt buộc. Chỉ sau đó nguồn được sửa theo task.
6. Blob còn tồn tại phải giữ tham chiếu; tệp thiếu hiển thị trạng thái rõ.
7. So sánh số dòng, snapshot, trường riêng và stable IDs trước/sau. Chỉ commit kho mới khi kiểm tra đạt; lỗi giữ kho cũ và bản sao, không tự seed.
8. Import Excel nhiều đơn vị/cơ quan cho chọn một cặp cho task hiện tại hoặc tách task là đề xuất; không gộp nhiều cặp vào metadata chung.

Migration này là thiết kế cần kiểm thử, không phải tuyên bố đã triển khai.

## Kiểm chứng
VALIDATION ghi kiểm tra tài liệu. QA15/11 là lịch sử. Sau triển khai cần test mô hình và trình duyệt cho bản mới; không dùng kết quả v4 làm bằng chứng.

