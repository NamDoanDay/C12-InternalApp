# Ma trận quyền

Cập nhật 26/11/2026. Chuẩn nghiệp vụ tại [SPEC.md](SPEC.md). App có hai role: `admin` và `user`; chức danh Person không tạo thêm role. Bảng dưới là chuẩn đã chốt, không phải khẳng định backend đã enforce.

| Hành động | Admin | User tạo task | User được giao (không tạo) | User chỉ xem qua nhóm |
|---|---|---|---|---|
| Xem task | Tất cả | Có | Có | Có nếu thuộc nhóm quản lý hoặc nhóm của assignee |
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

Quyền xem task theo chuẩn: admin OR creator OR assignee OR user thuộc nhóm quản lý task OR user thuộc nhóm hiện tại của một assignee. Chỉ xem qua nhóm không cấp quyền sửa. Mọi search, count, export, notification và drawer phải áp dụng cùng phạm vi xem.

## Phân hệ danh mục và kiến thức

Yêu cầu trước đây cho phép CRUD danh mục và kiến thức; trong code thao tác CRUD hiện không nhất thiết phân biệt admin/user. Nếu cần thay đổi quyền này, yêu cầu cần được chốt lại; không tự nâng quyền dựa vào chức vụ graph.

## Khoảng lệch hiện tại

- Prototype kiểm tra quyền bằng JavaScript phía client; không đủ làm ranh giới bảo mật production.
- Resource là collection riêng nhưng có `taskIds` và task có `resourceId`; UI cấp sửa cho admin, người tạo resource, hoặc người tạo/assignee của ít nhất một task liên kết. Quyền chỉ xem task qua nhóm không cấp quyền sửa resource.
- Resource filter “Được giao cho tôi” lọc resource có ít nhất một task liên kết đang giao cho user hiện tại.
- Cây graph và nhóm thay đổi client-side; không có kiểm tra API/server.

Khi triển khai backend, mọi rule trong bảng phải được enforce ở API/query, không dựa trên việc ẩn button.
