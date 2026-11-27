# Ma trận quyền

Cập nhật 27/11/2026. Chuẩn nghiệp vụ tại [SPEC.md](SPEC.md). App demo có hai role UI: `admin` và `user`; chức danh Person không tạo thêm role. Bảng dưới mô tả hành vi/ý định giao diện, không phải kiểm soát bảo mật.

| Hành động | Admin | User tạo task | User được giao (không tạo) | User chỉ xem qua nhóm |
|---|---|---|---|---|
| Xem task | Tất cả | Có | Có | Có nếu thuộc nhóm quản lý hoặc nhóm của assignee |
| Xem Resource | Toàn bộ | Toàn bộ trong view hiện tại | Toàn bộ trong view hiện tại | Toàn bộ trong view hiện tại |
| Tạo task | Giao cho người phù hợp | Chỉ tự giao mình | Task mới chỉ tự giao mình | Task mới chỉ tự giao mình |
| Chọn nhiều assignee/nhóm | Có; nhóm chỉ lọc người | Không | Không | Không |
| Sửa title/mô tả/start/nhóm/assignee của task người khác | Có | Task tự tạo theo rule | Không | Không |
| Sửa due date | Tất cả task | Task tự tạo | Không | Không |
| Cập nhật workflow status/bình luận | Có | Có | Có | Không |
| Sửa tài liệu/phụ lục/custom field trong task được phép | Có | Có | Có | Không |
| Xóa task | Có | Task mình tạo | Không | Không |
| Sửa Resource | Toàn bộ | Nếu là người tạo Resource, hoặc người tạo/assignee của ít nhất một task liên kết | Nếu là người tạo Resource, hoặc người tạo/assignee của ít nhất một task liên kết | Không chỉ từ quyền xem task theo nhóm |
| Quản lý nhóm, nhân sự, tài khoản/duyệt | Có | Không | Không | Không |
| Đọc/đánh dấu notification | Notification của chính mình | Notification của chính mình | Notification của chính mình | Notification của chính mình |

### Danh mục văn bản và Kiến thức tổ

| Hành động | Hiện trạng UI |
|---|---|
| Xem/tìm văn bản và kiến thức | Không có kiểm tra role nhất quán tại mọi view; dữ liệu được đọc từ state client |
| Thêm/sửa/xóa văn bản hoặc kiến thức | Một số handler không kiểm tra `admin()`; user thường có thể thao tác nếu đi tới điều khiển tương ứng |

Đây là mô tả hành vi code, chưa phải quyết định phân quyền đã xác nhận. Không tự coi CRUD các phân hệ này là chỉ dành cho admin, cũng không mở rộng quy tắc quyền task sang catalog/knowledge. Cần chốt riêng nếu muốn ma trận nghiệp vụ chính thức.

Resource hiện được hiển thị trong bảng/chi tiết cho mọi role UI; filter “Được giao cho tôi” chỉ giới hạn bản ghi có task liên kết đang assign cho session. Nút sửa/xóa Resource, edit ô, quản lý liên kết và thao tác schema được kiểm tra riêng bằng `canEditResourceV7()`; admin luôn được sửa, user cần là creator resource hoặc creator/assignee của task liên kết. Đây vẫn chỉ là kiểm tra phía client.

Quyền xem task theo chuẩn: admin OR creator OR assignee OR user thuộc nhóm quản lý task OR user thuộc nhóm hiện tại của một assignee. Chỉ xem qua nhóm không cấp quyền sửa. Mọi search, count, export, notification và drawer phải áp dụng cùng phạm vi xem.

## Phân hệ danh mục và kiến thức

Yêu cầu trước đây cho phép CRUD danh mục và kiến thức; trong code thao tác CRUD hiện không nhất thiết phân biệt admin/user. Nếu cần thay đổi quyền này, yêu cầu cần được chốt lại; không tự nâng quyền dựa vào chức vụ graph.

## Hiện trạng triển khai

- Không có API hoặc backend. Việc đăng nhập User demo/Admin demo chỉ đổi role trong trình duyệt.
- Lần chạy đầu có thể tự tạo session User demo. Form đăng nhập không xác minh mật khẩu; form đăng ký không lưu password; checkbox ghi nhớ đăng nhập chưa điều khiển session.
- Kiểm tra quyền trong UI có thể bị vượt qua bằng cách sửa state/client; không dùng để bảo vệ thông tin thật.
- Không có kiểm soát truy cập database hoặc đồng bộ phiên giữa các thiết bị.
