# Kiến trúc kỹ thuật

Cập nhật 27/11/2026. Mô tả code triển khai hiện tại. Nghiệp vụ chuẩn nằm ở [SPEC.md](SPEC.md); quyền chi tiết ở [PERMISSIONS.md](PERMISSIONS.md).

## Cấu trúc repository

```text
C12-InternalApp/
├── frontend/                 # SPA HTML/CSS/JS, Nginx phục vụ nguyên cây
│   ├── index.html            # Entry point, giữ nguyên link tương đối
│   ├── assets/app.css        # Bundle CSS từ css/app.css
│   ├── css/                  # Tailwind entry, glass, workspace, auth, overrides
│   └── js/{core,pages,components,features,data}/
├── backend/                  # Express API + Socket.IO
│   ├── Dockerfile
│   ├── package.json
│   └── src/{auth,config,db,middleware,modules,sockets}/
├── database/{migrations,seeds}/
├── deploy/{docker-compose.yml,nginx/}
├── docs/ design/ reference/ tests/ .agents/
├── index.html                # Preview tài liệu tại root, không phải app entry
├── AGENTS.md README.md .env.example
└── package.json              # Tailwind CLI
```

## Runtime và dữ liệu

- Frontend là SPA HTML + Tailwind CSS v4 + JavaScript thuần. Nginx copy nội dung `frontend/` vào document root nên các URL `assets/...` và `js/...` vẫn hợp lệ.
- `frontend/js/core/api-client.js` là adapter tương thích cho state V7 hiện tại. App tải workspace qua `GET /api/v1/workspace` và ghi qua `PUT /api/v1/workspace`. Không nhập hoặc ghi dữ liệu nghiệp vụ localStorage cũ; localStorage chỉ giữ theme/palette và cờ lần đầu đăng nhập demo, bearer token nằm trong sessionStorage.
- MySQL là nguồn dữ liệu chuẩn. `workspace_state` giữ snapshot JSON có revision để tương thích renderer/form hiện tại. Các collection được phản chiếu vào `tasks`, `resources`, `documents`, `task_groups`, `people`, `knowledge_items`; JSON payload giữ phụ lục, trường động và revisions. `resource_task_links` và `resource_document_links` phản chiếu liên kết resource–task/văn bản, còn `auth_sessions` lưu phiên đăng nhập.
- Backend dùng Express, `mysql2/promise`, bcryptjs và JWT. Auth gồm đăng nhập, đăng ký chờ duyệt, demo login cấu hình được, tạo tài khoản. `accounts.status` được kiểm tra trên từng request có xác thực.
- Module API đọc: `/api/v1/tasks`, `/resources`, `/documents`, `/stats`, `/history`. Các mutation UI hiện đi qua snapshot workspace; transaction khóa hàng `FOR UPDATE`, kiểm tra revision, ghi snapshot và mirror records. Khi transaction thành công, API mới phát `workspace.updated` qua Socket.IO. Tạo credential tài khoản cũng phát `account.created` sau khi insert MySQL thành công.
- Socket.IO xác thực JWT handshake, hỗ trợ WebSocket và polling. Nginx proxy `/socket.io/` với Upgrade headers, timeout dài và buffering tắt.
- MySQL container publish cổng `3307` chỉ trên loopback (`127.0.0.1`) để DBMS client trên máy host kết nối; bên trong Docker backend vẫn kết nối qua host `mysql:3306`.
- `audit_events` ghi actor/revision cho lần lưu; chi tiết lịch sử task/resource vẫn nằm trong `revisions` của workspace và được đọc qua history API. Dữ liệu seed chỉ được nạp khi chưa có snapshot; reset seed là thao tác riêng dành cho admin và không thay đổi localStorage.

## Migration và seed

- SQL migration ở `database/migrations/*.sql`, chạy theo thứ tự tên và ghi vào `schema_migrations`. Migration mới đặt số tiếp theo (ví dụ `002_add_field.sql`); không sửa schema trực tiếp trên môi trường đã chạy.
- `database/seeds/seed-workspace.js` tạo dữ liệu mới cho MySQL: đủ loại văn bản, sáu nhóm, ít nhất hai thành viên mỗi nhóm, task xử lý văn bản/task tài nguyên/task thường, resource liên kết, kiến thức. Backend seed khi chưa có `workspace_state`.
- Mật khẩu seed được hash bcrypt; `DEMO_ADMIN_PASSWORD` và `DEMO_USER_PASSWORD` trong `.env` cấu hình mật khẩu. Các tài khoản seed user khác dùng mật khẩu user demo.
- Không nhập `c12-prototype-v*` từ browser. LocalStorage cũ được giữ nguyên như bản legacy, nhưng không còn là nguồn dữ liệu ứng dụng.

## Chạy và build

```powershell
Copy-Item .env.example .env
# đặt mật khẩu DB, JWT_SECRET và mật khẩu demo trong .env
docker compose -f deploy/docker-compose.yml up --build
```

Mở `http://localhost:8080` (hoặc `WEB_PORT`). Demo identities: `admin@c12.demo` và `user@c12.demo`; mật khẩu là giá trị trong `.env`. Lần đầu mở app tự đăng nhập User demo nếu demo login được bật; các lần sau dùng phiên đăng nhập hiện tại hoặc màn login. Chạy backend độc lập: từ `backend/` chạy `npm install`, cấu hình root `.env`, chuẩn bị MySQL rồi chạy `npm start`. SPA cần được phục vụ cùng origin để `/api/` và `/socket.io/` hoạt động.

Kết nối từ DBeaver/MySQL Workbench: host `127.0.0.1`, port `3307`, database `MYSQL_DATABASE`, user `MYSQL_USER`, password `MYSQL_PASSWORD` trong `.env`. Dùng tài khoản ứng dụng `c12_app`; không cần root. Nếu port `3307` đang bị chiếm, đổi port mapping trong `deploy/docker-compose.yml` rồi khởi chạy lại stack.

Tailwind: tại root chạy `npm run build:css` để build `frontend/assets/app.css`, hoặc `npm run watch:css`. XLSX/Mammoth hiện được nạp qua CDN.

## Ranh giới hiện tại

- Snapshot adapter giữ nguyên nhiều nghiệp vụ client-side; API module hiện cung cấp route đọc, chưa tách mutation thành endpoint use-case riêng. Mọi lần ghi vẫn đi qua transaction và chỉ phát realtime sau commit.
- Bảng entity là mirror để truy vấn theo domain; snapshot vẫn là nguồn render chính. Khi bỏ snapshot, cần migration có kiểm soát.
- API kiểm tra role và quyền Task/Resource cơ bản. Vì client gửi workspace snapshot, mọi thay đổi quyền phải đồng bộ `backend/src/modules/permissions.js` trước khi mở UI tương ứng.
- Reset seed chỉ dành admin, thay thế snapshot MySQL và không chạm localStorage.
- Root `index.html` là preview tài liệu; deployment phục vụ `frontend/index.html`.
