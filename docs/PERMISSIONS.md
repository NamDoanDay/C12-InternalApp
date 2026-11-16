# Ma trận quyền bản thay đổi

Chỉ có admin và user. Chức danh trên graph không tạo thêm role đăng nhập. Hồ sơ Person và tài khoản User vẫn tách biệt, có liên kết.

| Hành động | Admin | User tạo task đó | User được giao, không phải người tạo | User chỉ cùng nhóm |
|---|---|---|---|---|
| Xem task | Mọi task | Có | Có | Có nếu thuộc nhóm quản lý hoặc nhóm của người nhận |
| Tạo task | Giao bất kỳ người nào | Chỉ tự giao cho mình | Chỉ tự giao task mới cho mình | Chỉ tự giao task mới cho mình |
| Sửa title/description/start date/nhóm quản lý | Có | Có, không mở rộng người nhận | Không | Không |
| Đổi due date | Có | Có | Không | Không |
| Đổi assignee | Có | Chỉ chính mình | Không | Không |
| Đổi trạng thái chung/bình luận | Có | Có | Có | Không |
| Tài liệu, phụ lục tài nguyên, trường tùy chỉnh task | Có | Có | Có | Không |
| Xóa task | Có | Có với task mình tạo | Không | Không |
| Xem revision cũ | Có | Có | Có | Có theo phạm vi task; revision chỉ đọc |
| Sửa ô bảng Dữ liệu tài nguyên | Mọi ô | Chỉ khi task nguồn đang giao cho mình | Chỉ khi task nguồn đang giao cho mình | Không |

Quyền người tạo không tự cho phép sửa ô nguồn của task không giao cho mình; quy tắc ô do người dùng chốt là admin hoặc assignee. User task tự tạo ban đầu phải tự giao nên hai điều kiện thường cùng đúng.

## Phân hệ khác

- Admin duyệt/tạo/quản lý tài khoản; CRUD nhóm và nhân sự; sửa graph/kéo thả. User không có các hành động này.
- Danh mục Công văn và Văn bản: cả admin/user CRUD theo quyền danh mục đã chốt ở bản cũ, tiếp tục áp dụng; hành động xóa liên kết được bảo vệ theo đề xuất ở SPEC.
- Kiến thức tổ: cả admin/user CRUD bài và tệp như bản trước.
- Mỗi tài khoản chỉ đọc/đánh dấu thông báo của chính mình; admin không mặc nhiên đánh dấu thông báo người khác.
- Tùy chọn theme là cá nhân.
- Header tìm kiếm, danh sách tài nguyên, mở trực tiếp task bằng ID, lịch sử và thông báo đều phải dùng cùng hàm kiểm tra quyền xem; không chỉ ẩn nút.

## Phạm vi nhóm

`canViewTask = admin OR creator OR assignee OR user.groupId in {managementGroupId, current groups of assignees}`. Không có auto-assignment chỉ vì chọn nhóm.

Quyền nhóm cập nhật khi chuyển thành viên; lịch sử không bị ghi lại thành nhóm mới. Quyền xem revision cũ đi theo quyền xem task hiện tại là đề xuất triển khai, chưa phải yêu cầu riêng về bảo mật lịch sử.

Prototype chỉ mô phỏng quyền ở frontend; MVP bắt buộc thực thi tương đương tại API và truy vấn dữ liệu.

