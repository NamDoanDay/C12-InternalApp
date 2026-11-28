# Quy tắc Backend và MySQL

Trạng thái: **quy tắc mục tiêu đã được xác nhận; Phase 1 nghiệm thu MySQL, Phase 2 auth/account API đang thực hiện; business API chưa hoàn tất**. Cập nhật 28/11/2026. Đọc cùng [API_CONTRACT.md](API_CONTRACT.md), [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), [SPEC.md](SPEC.md) và [PERMISSIONS.md](PERMISSIONS.md).

## 1. Stack và cấu trúc

- Node.js phiên bản LTS được pin tại thời điểm triển khai; Express cho REST; `mysql2/promise` cho MySQL 8.4; Socket.IO cho realtime.
- Vanilla JavaScript SPA hiện hữu được giữ, không đưa framework frontend mới vào.
- Dùng modular monolith theo miền nghiệp vụ. Mỗi miền phân tách `routes -> validation -> service -> repository`; controller/route chịu trách nhiệm HTTP, service nghiệp vụ và transaction, repository chỉ truy vấn DB.
- Dùng validation layer thống nhất; OpenAPI 3 là nguồn hợp đồng có thể truy cập qua Swagger UI.
- Chỉ thêm dependency khi cần cho bảo mật/chức năng đã chốt; khóa phiên bản bằng lockfile và ghi lý do trong plan.

```text
backend/
  src/
    app.js                 # Express middleware/routes
    server.js              # HTTP + Socket.IO lifecycle
    config/                # env parsing, logger
    middleware/            # auth, permission, validation, error handler
    modules/
      auth/ users/ people/ groups/
      tasks/ resources/ documents/ knowledge/
      notifications/ statistics/ files/
    db/                    # pool, transaction helper, migration runner
    realtime/              # Socket.IO auth, rooms, outbox relay
  test/                    # API/integration tests
  Dockerfile
  package.json
database/
  migrations/              # SQL migrations có version, chỉ chạy tiến
  seeds/                   # chỉ bootstrap admin kỹ thuật; không có mock domain data
  README.md                # khởi tạo, dọn một lần và vận hành DB
deploy/
  docker-compose.yml
  nginx/nginx.conf
  secrets/                 # file cục bộ bị gitignore; không commit
```

Tên thư mục/module là mục tiêu; trước khi tạo phải đối chiếu với source đã có trong phase tương ứng và không nhân đôi trách nhiệm.

## 2. Cấu hình và bí mật

- `.env` bị Git ignore, giữ cấu hình kết nối MySQL, JWT signing secret, port, pool size và cấu hình vận hành. `.env.example` chỉ chứa placeholder, không chứa credential dùng được.
- Mật khẩu khởi tạo admin đặt trong Docker secret dạng file cục bộ, không commit vào Git; tác vụ bootstrap cần nó. Secret không nằm trong image, migration SQL dạng plaintext hay log.
- Bootstrap hash password bằng Argon2id (ưu tiên) hoặc bcrypt với cost phù hợp; chỉ ghi password hash vào `users`. Buộc admin đổi mật khẩu mặc định ở lần đăng nhập đầu.
- Bootstrap admin chạy đúng một lần qua versioned migration/initializer và bảng ledger. Khi admin đã tạo, startup, build, redeploy hoặc migration khác không tạo lại, reset hay đổi password của admin.
- Không ghi access/refresh token, mật khẩu, secret, nội dung file, SQL có dữ liệu cá nhân vào log. Dùng request ID và structured logging; thông tin chi tiết DB chỉ ở log nội bộ đã lọc.
- Secret file và `.env` có quyền đọc tối thiểu. Không đưa chúng vào Docker build context/image.

## 3. MySQL, migrations và dữ liệu khởi tạo

- Dùng InnoDB, `utf8mb4`, UTC lưu timestamp; chuyển timezone chỉ ở lớp hiển thị.
- Mọi truy vấn có dữ liệu đầu vào phải dùng placeholder (`?`) và bind parameters. Cấm nối chuỗi SQL chứa input; tên bảng/cột động phải lấy từ allowlist schema, không lấy trực tiếp từ client.
- Migration có số thứ tự duy nhất, được ghi vào `schema_migrations` sau khi migration thành công. Migrations chỉ tiến, không chạy `DROP`, `TRUNCATE`, reseed hay khởi tạo admin ở mỗi lần start.
- Các thay đổi destructive cần migration có phê duyệt, bước kiểm tra điều kiện và kế hoạch rollback/restore riêng; không gộp vào Compose startup.
- Lần cài mới: bảng người dùng có duy nhất tài khoản `admin`; bảng nghiệp vụ (task, resource, documents, people, groups, knowledge, notifications, revisions, file metadata) rỗng. Không seed nhóm, người, task, resource, văn bản hoặc knowledge giả. Enum/loại văn bản chuẩn có thể là constant được version-control trong code.
- Cho phép các bảng kỹ thuật có metadata bắt buộc: `schema_migrations`, outbox nếu chưa xử lý, refresh token chỉ sau đăng nhập; đây không phải dữ liệu nghiệp vụ mock.
- Theo Q21/Q23, thao tác dọn một lần chỉ nhắm schema `c12_internalapp`, xóa dữ liệu nghiệp vụ/mock cũ trong schema đó rồi khởi tạo schema rỗng và admin. Không xóa schema khác hoặc toàn bộ MySQL volume. Thao tác này không chạy trong `docker compose up`; không cần backup theo quyết định người dùng. Sau thao tác khởi tạo, mọi lần deploy thông thường phải bảo toàn dữ liệu.

## 4. Model quan hệ và lưu trữ linh hoạt

- Chuẩn hóa các thực thể có quan hệ và cần lọc/ủy quyền: users, people, groups, tasks, assignees, documents, resources, resource-document links, resource-task links, comments, revisions, notifications, files và audit history.
- Dùng FK và unique/index cho định danh/quan hệ. Không dùng `ON DELETE CASCADE` cho dữ liệu nghiệp vụ. Tránh hard-delete: API dùng archive/deactivate, giữ FK, link rows, revisions và file metadata; admin có thể khôi phục. Không có API purge trong phiên bản đầu.
- Task xử lý văn bản giữ `document_id`; nếu loại+số chưa có, tạo document trong cùng transaction. Resource tách `registered_document_ids` (Công văn) khỏi `asset_document_ids` (Văn bản cấp tài nguyên).
- Một Resource có thể liên kết nhiều task; Task Quản lý tài nguyên trỏ đúng một Resource. Tạo Resource kèm task và tạo Task Quản lý tài nguyên phải lưu trong một transaction.
- Cột/row appendix theo Công văn, shared/private rows, custom table và custom fields dùng JSON có schema validation, giới hạn kích thước/depth và versioning. Không tạo SQL table/column theo nội dung người dùng.
- Metadata cột động được lưu theo ID Công văn; mọi mutation xác thực schema đang hoạt động và quyền trên Resource liên quan.

## 5. Transaction, history và archive

- Tất cả thao tác nhiều bước dùng transaction. Commit xong mới trả thành công và mới được relay event; nếu bất kỳ bước nào lỗi, rollback toàn bộ.
- Ghi revision/audit cùng transaction với thay đổi chính, gồm actor ID, entity ID/type, action, timestamp UTC, fields changed và snapshot/old-new an toàn. Không ghi password/token/file bytes.
- Archive chỉ đặt trạng thái và metadata archive; không gỡ quan hệ. Archived record ẩn mặc định khỏi lựa chọn mới, nhưng vẫn hiện trong lịch sử/chi tiết liên kết dưới nhãn “Đã lưu trữ”. Admin có thể restore.
- User inactive không đăng nhập/nhận assignment mới; assignment và lịch sử cũ vẫn giữ và hiển thị. Person archive không xóa User hay `person_id`. Document archive không xóa Task/Resource references hoặc appendix.
- Hai luồng Resource+Task được tạo atomically; resource edits đồng bộ các trường dùng chung theo SPEC và tạo revisions tương ứng.

## 6. Xác thực, phân quyền, validation

- Login dùng username/email và password hash. Tài khoản pending/archived/disabled không được đăng nhập. Rate limit theo IP và account key; so sánh password qua thư viện mật mã chuẩn.
- Access JWT ngắn hạn trong bộ nhớ frontend; refresh token ngẫu nhiên, hash lưu trong DB, rotate mỗi lần dùng và gửi bằng cookie `HttpOnly`, `SameSite`; `Secure` bật qua HTTPS, CSRF protection cho refresh/logout. Logout thu hồi token.
- Mọi private API xác thực và authorize tại server. `PERMISSIONS.md` là ma trận đầu vào: admin toàn quyền; task visibility/scope theo creator, assignee và group; resource edit theo creator/resource task creator/assignee; resource view all; user tự giao task cho mình; catalog/knowledge writes admin-only.
- Account registration có thể tạo trạng thái pending; admin duyệt/từ chối hoặc tạo user. Email notification/reset links không thuộc phạm vi đầu tiên; admin reset password qua luồng được audit.
- Request body/query/params/file đều validate tại biên. Validate loại dữ liệu, enum, chiều dài, số lượng list, ngày bắt đầu/kết thúc, ID tồn tại/active, liên kết và quyền. Không tin `role`, `actorId`, `createdBy` từ body; lấy actor từ JWT.
- Với cập nhật toàn aggregate, dùng `version` hoặc `updated_at` để phát hiện stale writes và trả `409 CONFLICT`, tránh ghi đè chỉnh sửa của user khác.

## 7. REST, lỗi và Swagger

- API prefix `/api/v1`; JSON; UTC ISO-8601; paging mặc định `limit=50`, tối đa `200`; sort/filter allowlist. Các route và error/event contract nằm trong [API_CONTRACT.md](API_CONTRACT.md).
- Lỗi có envelope nhất quán gồm `code`, `message`, `scope`, `details` an toàn, `requestId`. Validation trả field errors; không gửi SQL, stack trace hay secret đến browser.
- Express có centralized async error handler; phân loại `VALIDATION`, `AUTH`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `DATABASE`, `INTERNAL`. Mỗi endpoint có OpenAPI schema/request/response, auth/permission, status/error examples; Swagger UI bật nội bộ và có thể tắt/bảo vệ khi deploy.

## 8. Tệp, Excel và bảo vệ ứng dụng

- File bytes lưu trên volume riêng của backend; MySQL lưu metadata, checksum, owner, archive state và liên kết. Download đi qua API có kiểm quyền; file được sinh tên opaque, kiểm tra MIME/signature/extension, giới hạn size/count, không thực thi trong web root. Không nhận path tùy ý.
- Giữ giới hạn 2 MiB/file của frontend hiện có cho đến khi được thay đổi có quyết định; API áp giới hạn thực, không chỉ tin client. File ảnh theme là tùy chọn giao diện và không cần upload nghiệp vụ API trong giai đoạn đầu.
- XLSX export resource nhận cùng filter như bảng, export toàn bộ tập kết quả có quyền; dữ liệu lấy từ truy vấn server và tạo file XLSX hợp lệ. DOCX/XLSX import phụ lục có thể parse/preview ở frontend, nhưng API validate payload chuẩn hóa trước khi persist.
- CORS chỉ allowlist origin cấu hình; khi phục vụ cùng origin qua Nginx mặc định không mở rộng CORS. Dùng Helmet, rate limit (đặc biệt login/upload/export), body-size limits, secure cookies, TLS tại reverse proxy, prepared queries, HTML escaping và dependency audit.
- Không trả stack trace ra production. Logs có request ID, user ID nếu đã xác thực, module, error code và DB correlation ID đã lọc.

## 9. Kiểm thử Backend

- Unit test cho validation, policy và domain transitions.
- Integration test chạy trên MySQL test riêng, có migration từ schema trống; kiểm tra transaction rollback, archive không gỡ quan hệ, password hash/rotation, uniqueness và outbox.
- API contract test so sánh OpenAPI; Socket test xác nhận unauthorized room/event không được nhận.
- Test DB không dùng database người dùng hoặc volume phát triển. E2E chạy qua Nginx/Compose trên dữ liệu test riêng; xóa volume test không được nhắm nhầm `c12_internalapp` đang dùng.
