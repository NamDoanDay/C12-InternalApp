# Kiến trúc kỹ thuật

Cập nhật 28/11/2026. Đây là ứng dụng SPA vanilla đang được chuyển từ demo cục bộ sang full-stack. Đăng nhập, bootstrap workspace, các luồng ghi chính và realtime hiện dùng API; migration frontend vẫn chưa nghiệm thu toàn bộ. Trạng thái và bằng chứng theo [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md); nghiệp vụ chuẩn tại [SPEC.md](SPEC.md), quyền tại [PERMISSIONS.md](PERMISSIONS.md), API/event tại [API_CONTRACT.md](API_CONTRACT.md).

## Cấu trúc runtime

- `frontend/index.html` là SPA entry; Nginx phục vụ nguyên cây `frontend/` để giữ đường dẫn tương đối. `frontend/js/core/api-client.js` là client same-origin cho `/api/v1`, JWT access trong memory, refresh cookie/CSRF, upload/download, xuất XLSX và Socket.IO.
- `frontend/js/core/foundation.js` khởi tạo state rỗng và không đọc/ghi workspace/session nghiệp vụ vào localStorage. Chỉ tùy chọn giao diện như theme/palette còn dùng localStorage. `frontend/js/features/` và `frontend/js/pages/` vẫn chứa một số luồng legacy được bao bởi save adapter; cần tiếp tục loại các mutation chưa có API trực tiếp.
- `backend/src/` là Node.js/Express modular monolith. Modules hiện có: auth, users/registrations, organization, documents, tasks, resources, knowledge, files và notifications. API prefix `/api/v1`; health endpoints, Swagger `/api/docs`, OpenAPI `/api/openapi.json`.
- `database/migrations/` là migration có ledger; `database/seeds/` chỉ tạo admin bootstrap một lần, không seed dữ liệu nghiệp vụ mẫu. Các lần khởi động sau không xóa dữ liệu.
- `deploy/docker-compose.yml` chạy MySQL, backend, Nginx frontend. Nginx proxy `/api/` và `/socket.io/`; MySQL và file uploads có named volumes. `.env` và secret bootstrap không được commit.
- Root `index.html` là preview tài liệu, không phải app entry.

## State, auth và API sync

- Cơ sở dữ liệu là nguồn dữ liệu nghiệp vụ; frontend không nhập dữ liệu localStorage cũ. `loadWorkspace()` lấy dữ liệu qua API sau đăng nhập. Ghi trực tiếp dùng endpoint domain; các màn legacy gọi save adapter so sánh state và gửi CRUD/archive qua API. Adapter hiện chưa thay thế được endpoint chuyên biệt cho mọi quan hệ và tệp.
- Access JWT chỉ giữ trong memory; refresh cookie HttpOnly có CSRF token. Không đưa token hay dữ liệu nghiệp vụ vào localStorage. Theme settings vẫn cục bộ.
- Lỗi API hiển thị scope, mã lỗi, message và request ID; lỗi runtime phía client được phân loại Frontend. Không hiển thị stack trace cho người dùng.
- Socket.IO xác thực bằng JWT; server gán user room. Backend ghi outbox cùng transaction và relay sau commit. Frontend tải lại workspace khi nhận event; nếu modal đang mở thì trì hoãn refresh đến khi đóng để tránh ghi đè form.
- Các luồng đã nối chính gồm đăng nhập/đăng ký/đổi mật khẩu, task, resource + task kèm theo, document, people/group, knowledge, archive, bình luận, notification read, resource XLSX và lịch sử. Vẫn cần hoàn thiện/kiểm chứng quản lý tệp document/knowledge, task file update, bảng legacy, E2E và các lỗi xung đột phiên bản.

## MySQL và bảo toàn dữ liệu

- MySQL 8.4 lưu thực thể quan hệ; dữ liệu bảng động/field linh hoạt được validate rồi lưu JSON có version.
- Mọi input SQL dùng tham số. Ghi nhiều bước dùng transaction; history/audit và outbox được ghi cùng transaction; Socket.IO chỉ phát sau commit.
- Archive là cách xóa mặc định; foreign keys dùng RESTRICT và liên kết/history được giữ. Không chạy reset/truncate khi ứng dụng khởi động.
- Database mới chỉ có một tài khoản admin bootstrap đã hash và bắt đổi mật khẩu; các bảng nghiệp vụ rỗng. Không dùng mock data và không nhập workspace localStorage cũ.
- File bytes lưu ngoài web root tại `FILE_STORAGE_DIR`; MySQL giữ metadata và link. Volume uploads cần được mount để giữ tệp.

## Khởi chạy và kiểm chứng

Từ root repo, tạo `.env` từ `.env.example`, chuẩn bị `secrets/admin_password`, rồi dùng Docker Compose theo [DEPLOYMENT.md](DEPLOYMENT.md). Không dùng `python -m http.server` làm cách chạy full-stack vì static server không cấp API/Socket.IO.

Kiểm tra hiện tại: JavaScript đã sửa qua `node --check`; backend `npm test` đạt 9 pass, 0 fail, 0 skip trên MySQL 8.4 container/database tạm biệt lập, không gắn volume ứng dụng. Suite tìm ra và xác nhận sửa PATCH đổi trạng thái không làm mất file links. Browser E2E, kiểm thử LIGHT/DARK/responsive và Compose/Nginx smoke chưa chạy. Xem [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) để biết hạng mục nào đã xong/chưa xong; không suy diễn checkbox mục tiêu thành nghiệm thu.

## Quy tắc mở rộng

Thêm module backend trong `backend/src/modules/<domain>/`, dùng schema validation, service/route theo convention, quyền trong API, prepared statements và transaction cho writes. Ghi revision + outbox trước commit; relay event chỉ sau commit. Thêm migration append-only trong `database/migrations/`; không chỉnh migration đã chạy và không seed business mock. Frontend gọi API qua `C12Api`, giữ token trong memory, hiển thị lỗi có scope/request ID và không ghi business state vào localStorage. Cập nhật API contract, SPEC/permissions nếu nghiệp vụ thay đổi và plan bằng bằng chứng kiểm chứng.
