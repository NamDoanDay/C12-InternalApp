# Hợp đồng Frontend – Backend

Trạng thái 28/11/2026: **auth/account, task, document, resource, group/person, knowledge, file API, Swagger UI và Socket.IO outbox relay đã có code; frontend chưa chuyển sang API; notification API chưa có; Docker/Nginx chưa có**. Integration suite cần chạy lại sau khi mở rộng sang organization/files/realtime. Nghiệp vụ xem [SPEC.md](SPEC.md), phân quyền xem [PERMISSIONS.md](PERMISSIONS.md).

## 1. Quy ước chung

- Base path: `/api/v1`; JSON UTF-8; thời gian UTC ISO-8601; ID opaque UUID/ULID ổn định, không dùng số dòng làm ID.
- List trả `{ data: [], page: { limit, offset, total } }`; mặc định 50, tối đa 200. Filter/sort phải nằm trong allowlist.
- Thành công: `{ data, meta?: { requestId, version } }`. Tạo trả `201`; cập nhật `200`; archive/restore trả `200`; không dùng HTTP `DELETE` cho entity nghiệp vụ vì phải bảo toàn liên kết.
- Mọi ghi nhận `actorId` từ access JWT, không từ body. Body update gửi `version` hiện biết; version cũ nhận `409 CONFLICT`.
- Upload hiện nhận body `application/octet-stream` tối đa 2 MiB; tên qua `x-file-name`, MIME cho phép qua `x-file-media-type`. API trả metadata, không trả base64 trong task/resource.
- Tất cả response được mô tả trong OpenAPI; Swagger UI nội bộ tại `/api/docs`, OpenAPI JSON tại `/api/openapi.json`. Production có thể khóa Swagger bằng cấu hình.

## 2. Thành công, lỗi và mã HTTP

Lỗi chuẩn:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu gửi lên chưa hợp lệ.",
    "scope": "Backend",
    "details": [{ "field": "dueAt", "code": "BEFORE_START", "message": "Ngày kết thúc phải sau ngày bắt đầu." }],
    "requestId": "req_..."
  }
}
```

`scope` trong API chỉ là `Backend` hoặc `Database`; lỗi JavaScript phía client được frontend phân loại riêng là `Frontend` và không giả làm lỗi API. `details` không chứa query, stack trace, password/token hoặc dữ liệu không thuộc caller.

| HTTP | `code` mẫu | Dùng khi |
|---|---|---|
| 400 | `BAD_REQUEST` | JSON/parameter sai cấu trúc |
| 401 | `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED` | Chưa xác thực hoặc token sai/hết hạn |
| 403 | `FORBIDDEN` | Đã đăng nhập nhưng thiếu quyền |
| 404 | `NOT_FOUND` | Không tồn tại hoặc không được phép tiết lộ tồn tại |
| 409 | `CONFLICT`, `STALE_VERSION`, `DUPLICATE_DOCUMENT` | Trùng key, trạng thái xung đột hoặc version cũ |
| 413 | `FILE_TOO_LARGE`, `PAYLOAD_TOO_LARGE` | Vượt giới hạn upload/body |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | MIME/loại file không hỗ trợ |
| 422 | `VALIDATION_ERROR` | Trường/quan hệ nghiệp vụ không hợp lệ |
| 429 | `RATE_LIMITED` | Quá giới hạn request |
| 500 | `INTERNAL_ERROR` | Lỗi backend không dự kiến |
| 503 | `DATABASE_UNAVAILABLE` | DB không sẵn sàng; `scope: Database` |

DB constraint/transaction errors được ánh xạ sang code an toàn (`DATABASE_CONSTRAINT`, `DATABASE_TRANSACTION_FAILED`) và scope `Database`; chi tiết kỹ thuật chỉ nằm trong log gắn `requestId`.

## 3. Xác thực và phiên

| Method | Route | Ý nghĩa/quyền |
|---|---|---|
| POST | `/auth/login` | Username/email + password; chỉ active/approved account |
| POST | `/auth/refresh` | Rotate refresh cookie; CSRF protection |
| POST | `/auth/logout` | Thu hồi refresh token hiện tại |
| GET | `/auth/me` | User/Person/role hiện tại và `mustChangePassword` |
| PUT | `/auth/password` | Đổi mật khẩu; bắt buộc nếu `mustChangePassword=true` |
| POST | `/registrations` | Đăng ký public → pending; chỉ trả thông tin tối thiểu |
| GET | `/admin/registrations` | Admin xem pending |
| POST | `/admin/registrations/{id}/approve` | Admin duyệt và liên kết/tạo Person |
| POST | `/admin/registrations/{id}/reject` | Admin từ chối, giữ lịch sử |

Access token truyền qua `Authorization: Bearer ...` cho REST và Socket.IO handshake `auth`; refresh token chỉ ở cookie `HttpOnly`. CSRF token cookie đọc được từ trình duyệt và phải gửi lại trong `X-CSRF-Token` cho refresh/logout. Frontend không ghi access/refresh/session vào `localStorage`.

## 4. Các miền API

Các request/response chính mang `{ version }`; chi tiết field bắt buộc lấy từ SPEC/domain schema và khai báo đầy đủ trong OpenAPI.

### User, Person, Group

| Method | Route | Quyền/hành vi |
|---|---|---|
| GET/POST | `/users`, `/users` | Admin; tạo user, password hash server-side |
| PATCH | `/users/{id}` | Admin sửa role/status/person link; audit |
| POST | `/users/{id}/archive`, `/users/{id}/restore` | Admin; ngừng/khôi phục login, giữ links |
| POST | `/users/{id}/reset-password` | Admin đặt password tạm, bắt đổi lần sau |
| GET | `/organization/people` | User đọc danh sách nhân sự; hỗ trợ `q` |
| POST/PATCH | `/organization/people`, `/organization/people/{id}` | Admin tạo/sửa Person |
| POST | `/organization/people/{id}/archive`, `/organization/people/{id}/restore` | Admin; giữ User/task/group links |
| POST | `/organization/people/{id}/group` | Admin chuyển Person sang nhóm/không nhóm, ghi membership lịch sử; task assignment không đổi |
| GET | `/organization/groups` | User đọc nhóm và quân số |
| POST/PATCH | `/organization/groups`, `/organization/groups/{id}` | Admin tạo/sửa group/name/code/lead |
| POST | `/organization/groups/{id}/archive`, `/organization/groups/{id}/restore` | Admin; archive kết thúc membership hiện tại, lịch sử giữ nguyên |

### Tasks

| Method | Route | Ý nghĩa |
|---|---|---|
| GET | `/tasks` | Chỉ task caller được xem; filter theo `q`, `aggregateStatus`, `workflowStatus`, `managementGroupId`, `documentId`, `taskType`, ngày và paging |
| POST | `/tasks` | Tạo Task thường/Xử lý văn bản/Quản lý tài nguyên; validation và authorization |
| GET/PATCH | `/tasks/{id}` | Chi tiết/update có quyền, version check |
| POST | `/tasks/{id}/archive`, `/tasks/{id}/restore` | Creator/admin archive; giữ nguyên toàn bộ relationships |
| GET | `/tasks/{id}/history` | Revision, comments và lịch sử theo quyền task |
| POST | `/tasks/{id}/comments` | Người có quyền cập nhật task được bình luận |
| GET | `/tasks/summary` | Aggregate counts/donut theo chính phạm vi/filter mà list dùng |
| GET | `/tasks/group-summary` | Thống kê theo nhóm quản lý và quyền xem |

`POST /tasks` cho loại Xử lý văn bản nhận `document` hoặc `documentId`; khi type+number trùng thì liên kết record có sẵn, nếu không thì tạo Document và Task trong cùng transaction. Với Task Quản lý tài nguyên nhận `resource`/`resourceId`, task một resource duy nhất. Assignees, lịch, bảng tùy chỉnh và file references được validate cùng thao tác.

### Resources, dynamic appendix và Excel

| Method | Route | Ý nghĩa |
|---|---|---|
| GET/POST | `/resources` | List có quyền view, filter `q`, `documentId`, `assignedToMe`, paging; tạo Resource; có thể nhận `createTask` atomically |
| GET/PATCH | `/resources/{id}` | Chi tiết/cập nhật hệ thống, link văn bản/task, custom fields, files, appendix; version check |
| POST | `/resources/{id}/archive`, `/resources/{id}/restore` | Ngừng/khôi phục; giữ resource-task/document links |
| GET | `/resources/{id}/history` | Revision Resource và Task liên kết mà caller được xem |
| PATCH | `/resources/{id}/appendices/{documentId}` | Cập nhật hàng chung/riêng cho đúng Công văn và Resource |
| PATCH | `/resources/{id}/appendices/{documentId}/schema` | Thay cấu trúc cột động, kiểm tra resource `version` và schema `schemaVersion` |
| GET | `/resources/appendix-defaults/{documentId}` | Lấy schema mặc định của Công văn |
| GET | `/resources/export.xlsx` | XLSX toàn bộ resource theo cùng filter/quyền UI; response file download |

Appendix payload có `columns`, `sharedRows`, `privateRows`; schema giới hạn 100 cột/500 hàng. 952/4651 dùng cấu trúc hiện hành; Công văn khác mặc định 6 cột `vGPU`, `RAM (GB)`, các Disk Block/File/Object và `License`. Công văn tạo mới hoặc liên kết Resource được tự khởi tạo schema. Xóa cột khỏi schema không xóa dữ liệu cũ trong JSON. Bỏ liên kết kết thúc bằng `ended_at`, không hard-delete.

### Documents, Knowledge, files, notifications

| Method | Route | Ý nghĩa/quyền |
|---|---|---|
| GET/POST | `/documents` | List/filter theo loại, số/ngày/trích yếu; đọc user, ghi admin |
| GET/PATCH | `/documents/{id}` | Chi tiết/cập nhật admin; version check |
| POST | `/documents/{id}/archive`, `/documents/{id}/restore` | Admin; giữ links task/resource và appendix |
| GET/POST | `/knowledge` | Filter cấp/cơ quan/loại; đọc user, ghi admin |
| GET/PATCH | `/knowledge/{id}` | Chi tiết/update admin |
| POST | `/knowledge/{id}/archive`, `/knowledge/{id}/restore` | Giữ tài liệu và lịch sử |
| POST | `/files` | Upload binary tối đa 2 MiB vào `FILE_STORAGE_DIR`; metadata response |
| GET | `/files/{id}/content` | Download sau authorization theo entity/file relation |
| POST | `/files/{id}/archive`, `/files/{id}/restore` | Ẩn/khôi phục file; giữ references, không xóa bytes trong phiên bản đầu |
| GET | `/notifications` | Thông báo của user hiện tại; `unread=true`, `limit`, `offset`; trả `unreadCount` |
| POST | `/notifications/read` | Đánh dấu `notificationIds` hoặc toàn bộ thông báo hiện tại (`all: true`) đã đọc |

Tạo Resource có thể nhận `createTask: true` cùng payload task; Resource, Task, link tài liệu/file, revision, thông báo assignee và outbox được ghi trong một transaction. Khi false hoặc thiếu, task không được tạo. File chưa gắn vào entity chỉ tải được bởi uploader/admin; file đã liên kết được tải theo quyền của entity.

### Search và export

- `GET /search?q=...`: ở phiên bản đầu tìm task như global search hiện tại; chỉ trả task được phép xem.
- `GET /resources/export.xlsx` nhận đúng filter của bảng (query, Công văn/Văn bản, phạm vi assigned-to-me); không chỉ export page hiện tại. Server tạo XLSX hợp lệ và đặt `Content-Disposition` UTF-8.
- Không có export task nếu chưa có yêu cầu nghiệp vụ mới. Task appendix import vẫn preview ở frontend; chuẩn hóa payload, upload file và persist bằng task/resource API.

## 5. Hợp đồng lỗi Frontend

- API error hiển thị code/message/scope đã sanitize, requestId để hỗ trợ tra log.
- Lỗi parse/render/runtime do client được ghi `Frontend` trong toast/log UI; không gọi nó là Backend/Database.
- Network offline/timeout phân loại `NETWORK`/`TIMEOUT`, không tự kết luận database lỗi khi không có response server.
- Field validation gắn đúng control; lỗi form không xóa dữ liệu đang nhập. Conflict yêu cầu tải phiên bản mới hoặc cho người dùng đối chiếu, không âm thầm ghi đè.

## 6. Socket.IO contract

Handshake: access JWT trong `auth.token`; server xác minh account active, version/token expiry. Client không tự tham gia room tùy ý. Server tự gán room `user:{id}`; entity visibility được resolve từ permission service. Room/event payload không thay thế API authorization.

Envelope event:

```json
{
  "eventId": "evt_...",
  "type": "resource.updated",
  "entity": { "type": "resource", "id": "...", "version": 8 },
  "occurredAt": "2026-11-28T09:00:00.000Z",
  "requestId": "req_..."
}
```

Các event phiên bản đầu:

| Event | Audience | Client action |
|---|---|---|
| `task.created`, `task.updated`, `task.archived`, `task.restored` | user được phép xem task theo ACL tại lúc ghi | Refetch/upsert list nếu filter còn khớp; giữ form đang mở |
| `task.comment.created` | người được xem task | Refetch comments/history và unread indicator |
| `resource.created`, `resource.updated`, `resource.archived`, `resource.restored` | user được phép xem Resource (hiện toàn role) | Refetch row/detail/export counts |
| `document.created`, `document.updated`, `document.archived`, `document.restored` | authenticated user; không chứa dữ liệu nhạy cảm | Refetch catalog và appendix group schema |
| `knowledge.*`, `person.*`, `group.*`, `user.*` | người có quyền admin hoặc user bị ảnh hưởng | Refetch phần UI có quyền |
| `notification.created`, `notification.read` | chủ notification | Cập nhật badge/drawer |

Tên event chỉ phát sau DB commit. Transaction ghi outbox row và audience recipients; relay đọc outbox, phát vào room user đã xác định, rồi đánh dấu delivered. Retry dùng `eventId` ổn định; client dedupe event và vẫn refetch API. UI phải giữ draft form/modal, không ghi đè giá trị đang nhập khi nhận event. Thay đổi không phát event trước commit; lỗi ghi DB không phát event.

## 7. Swagger/OpenAPI

OpenAPI mô tả mọi route, schemas, enums, response status, role/policy, cookie/bearer auth, event names và ví dụ lỗi. CI kiểm tra spec parse/contract; không để Swagger suy diễn từ code thiếu annotation. Swagger UI chỉ bật cho mạng nội bộ/dev hoặc yêu cầu auth admin trong môi trường production.
