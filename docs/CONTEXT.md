# Bối cảnh và thuật ngữ — 16/11/2026

C12 / P4 - T1 Internal App tiếp tục dùng HTML/Tailwind/JavaScript, prototype trước MVP. Yêu cầu ngày 16/11 chuyển trọng tâm sang task là nguồn nghiệp vụ cho tài nguyên. Bản tài liệu v4 ngày15/11 được lưu trong archive/v4.

## Thuật ngữ
- Admin/User: đúng hai role truy cập.
- Person: hồ sơ nhân sự, có thể chưa có tài khoản User. Chức danh graph không phải role.
- Group: nhóm công tác; mỗi thành viên chỉ một nhóm hiện tại.
- Nhóm quản lý task: cấp mã task theo công văn, độc lập nhóm lọc người nhận.
- Assignment: giao cho từng người, không tự giao cho cả nhóm.
- Task: theo công văn hoặc thường; ID nội bộ bất biến, mã hiển thị có thể đổi.
- Workflow status: Đang xử lý, Đang lấy số, Đang trình ký, Đã hoàn thành.
- Aggregate status: Đã hoàn thành, Đang xử lý, Chậm muộn; suy ra từ workflow và hạn.
- Công văn/Văn bản: hai danh mục riêng.
- Attachment: tệp vật lý, không đồng nghĩa mục danh mục.
- Resource item: một dòng phụ lục với Hệ thống riêng; Đơn vị/Cơ quan chung task.
- Resource row: dòng tổng hợp theo Đơn vị + Cơ quan + Hệ thống, có nguồn từng ô.
- Task revision: bản chụp lịch sử chỉ đọc, không phải task mới.

## Nguồn tham chiếu
Ảnh graph mô tả cấu trúc node/edge, không sao chép tên người mẫu. Ảnh theme mô tả bảng màu, gradient và ảnh nền. Ảnh phiếu task mô tả nội dung trái và metadata/custom fields phải. Ảnh hai bảng task dùng cho cá nhân/được giao; hai danh mục cũng tách riêng theo yêu cầu.

reference/test.xlsx vẫn là nguồn cấu trúc nhóm952/4651 nhiều tầng. Metadata pháp lý trong ví dụ chưa được xác minh. Dòng iCaMau đăng ký4267 nhưng số liệu nằm trong vùng4651 là bất nhất nguồn; giữ raw/cảnh báo, không tự suy thành nhu cầu4267.

## Nguồn quyết định
CHANGE_REQUIREMENTS là ledger phỏng vấn mới. SPEC mô tả luồng; PERMISSIONS mô tả quyền. Đề xuất kỹ thuật không thay câu trả lời người dùng. Những câu hỏi đã được chốt không tiếp tục để pending.

Upload chỉ trong task. Quyền sửa ô user theo assignment của task nguồn. Bốn style và gallery là lịch sử, không là hướng đang triển khai.

## Giới hạn prototype
Kho trình duyệt không phải cơ sở dữ liệu đa người dùng; cập nhật giữa các tab cùng origin không phải realtime đa thiết bị. Danh tính mỗi tab độc lập và không lưu mật khẩu thật. Không deploy trong giai đoạn preview. QA15/11 không phải nghiệm thu bản thay đổi.

