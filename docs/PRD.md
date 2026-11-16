# PRD — C12 / P4 - T1 Internal App

Bản thay đổi ngày 16/11/2026. Các quyết định phỏng vấn nằm trong CHANGE_REQUIREMENTS.md; chi tiết hành vi ở SPEC.md và quyền ở PERMISSIONS.md. Kết quả QA ngày 15/11 chỉ áp dụng prototype v4.

## Mục tiêu và phạm vi
Xây dựng không gian làm việc theo phong cách Cloud Console để giao việc theo nhóm, quản lý công văn/văn bản và theo dõi tài nguyên có nguồn từ task. Người dùng xem việc cá nhân, việc được giao và việc trong nhóm theo quyền. Admin quản lý toàn bộ công việc, nhóm và cấu trúc tổ.

Tiếp tục dùng HTML, Tailwind và JavaScript thuần cho prototype cục bộ. Giữ đăng nhập/đăng ký mô phỏng, duyệt tài khoản, hồ sơ nhân sự độc lập với tài khoản và Kiến thức tổ. Thay bộ chọn bốn phong cách bằng Cloud Console duy nhất cùng chủ đề màu/nền cá nhân. Backend và xác thực thật thuộc giai đoạn MVP.

## Tiêu chí nghiệm thu bản mới
| Mã | Kết quả cần đạt |
|---|---|
| C01 | Chỉ có phong cách Cloud Console. Header có icon chọn bảng màu, gradient và ảnh nền; chế độ sáng/tối vẫn dễ đọc. |
| C02 | Cả hai loại task yêu cầu tiêu đề, ngày bắt đầu và hạn hoàn thành có giờ/phút. Task theo công văn cần ít nhất một công văn đủ số, ngày phát hành và trích yếu; tệp không bắt buộc. |
| C03 | Admin lọc người theo nhiều nhóm rồi chọn từng người nhận. Chọn nhóm không tự giao việc. User chỉ tự giao cho mình. |
| C04 | Task có một trạng thái chung; mọi người được giao đều có thể cập nhật trạng thái đó. |
| C05 | Task hoàn thành luôn vào thẻ Đã hoàn thành. Tại đúng hạn chưa chậm; quá hạn 1 phút tính 1 ngày, quá 24 giờ tính 2 ngày. Task có ngày bắt đầu trong tương lai vẫn vào thẻ Đang xử lý. |
| C06 | Admin đổi hạn của mọi task; user chỉ đổi hạn task mình tạo. Thay đổi hạn có lịch sử cũ/mới và tính lại tổng hợp. |
| C07 | User xem task nếu thuộc nhóm quản lý hoặc nhóm của một người nhận. Quyền chỉ xem nhóm không cấp quyền cập nhật task. |
| C08 | Cây sơ đồ là graph có nhóm và thành viên theo thứ bậc; admin CRUD và kéo thả chuyển nhóm, có cách thao tác bằng bàn phím. Mỗi người chỉ thuộc một nhóm. |
| C09 | Chuyển nhóm người nhận duy nhất của task theo công văn làm đổi nhóm quản lý và mã hiển thị, giữ ID nội bộ. Task nhiều người giữ mã, task thường giữ mã DAILY. Có lịch sử chuyển nhóm. |
| C10 | Công văn và Văn bản là hai danh mục CRUD riêng. Lưu mục mới trong phiếu task bổ sung ngay vào danh mục, không chờ lưu task. |
| C11 | Đơn vị và Cơ quan quản lý là thông tin chung của task; mỗi dòng phụ lục có Hệ thống riêng. Mỗi dòng tạo một dòng tài nguyên; trùng Đơn vị + Cơ quan + Hệ thống thì gộp qua các task, không cộng tổng. |
| C12 | Lọc 952 giữ dòng đăng ký 952 và 4651 với cả hai nhóm, loại dòng chỉ có 4267. Bộ lọc cá nhân không làm tăng quyền xem hoặc sửa. |
| C13 | Sửa ô tài nguyên cập nhật đúng dòng phụ lục của task nguồn và tạo revision. User chỉ sửa nguồn đang giao cho mình, admin sửa mọi nguồn. Giá trị hiện tại lấy lần lưu mới nhất. |
| C14 | Sidebar gồm Hệ thống, Phân loại công văn, Lịch sử cập nhật task và Chi tiết. Phần công văn phía trên giữ nguyên khi chuyển task; phần bổ sung thay theo task/revision. Bản cũ chỉ đọc. |
| C15 | Tạo task gửi thông báo cho admin, người được giao và người thao tác; loại trùng người nhận. Thêm người nhận gửi thông báo ngay cho người mới. Có Tất cả/Chưa đọc và mở task. |
| C16 | Chỉ upload tài nguyên trong phiếu task; không có upload trực tiếp tại Quản lý tài nguyên. |
| C17 | Phụ lục tài nguyên cho thêm dòng/cột/tệp; trường tùy chỉnh của task độc lập với cột tùy chỉnh trên bảng chính. |
| C18 | Nâng phiên bản giữ dữ liệu và bản sao v4; không tự xóa localStorage hoặc bịa task/lịch sử cho dữ liệu cũ. |
| C19 | Prototype thông báo giữa các tab cùng trình duyệt/origin, danh tính độc lập theo tab. Tài liệu nói rõ đây không phải realtime đa thiết bị. |
| C20 | Trang task của user có Nhiệm vụ cá nhân và Được giao cho tôi; admin có bộ lọc, ba thẻ tổng hợp và thêm việc. Có lối truy cập các task nhóm được phép xem. |
| C21 | CRUD danh mục, nhóm, nhân sự và task không làm đứt liên kết hoặc mất lịch sử; chính sách lưu trữ thay xóa vĩnh viễn được ghi là đề xuất. |
| C22 | Giao diện có nhãn form, lỗi rõ ràng, focus bàn phím, đóng bằng Esc, responsive và tương phản đủ ở các theme. |

Các tiêu chí trên là mục tiêu nghiệm thu, chưa phải kết quả kiểm thử.

## Không tự mở rộng
Không thêm tiến độ riêng từng người, không tự giao cho cả nhóm, không thêm role theo chức danh. Không tự OCR/AI mọi tài liệu hoặc cộng tổng phụ lục. Không tuyên bố đồng bộ đa thiết bị khi chỉ dùng kho trình duyệt.

## Quyết định còn mở
OPEN_QUESTIONS.md ghi các đề xuất còn cần xác nhận, nhất là xử lý dữ liệu v4 chưa có task nguồn và chính sách vòng đời dữ liệu. Mapping mỗi dòng phụ lục thành hệ thống đã được chốt, không còn là câu hỏi mở.

