# Chạy local và Docker Compose

## Trạng thái hiện tại

Compose đóng gói MySQL 8.4, backend Node.js và Nginx phục vụ frontend cùng reverse proxy API/Socket.IO. Backend API đã có integration coverage trên MySQL thử nghiệm. Frontend SPA **chưa được chuyển khỏi demo/localStorage**, vì vậy stack Compose hiện là môi trường tích hợp đang phát triển, chưa phải bản sử dụng nghiệp vụ hoàn chỉnh. Theo dõi Phase 5–7 trong [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

## Chuẩn bị lần đầu trên máy mới

1. Cài Docker Desktop và khởi động Docker Engine.
2. Tạo root `.env` từ `.env.example`, rồi thay các placeholder bằng giá trị riêng của máy. Không commit `.env`.
3. Tạo `secrets/admin_password` (một dòng) với mật khẩu bootstrap admin đã được tổ chức phê duyệt. File này được mount dạng Docker secret; không đưa mật khẩu admin vào biến môi trường hay image.
4. Cấu hình này chạy HTTP local; khi đặt sau HTTPS proxy, bật `COOKIE_SECURE=true` và cấu hình trust proxy phù hợp.

## Khởi động

Chạy từ thư mục root repository:

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
```

Nginx mở tại `http://localhost:8080`; MySQL được publish tại `127.0.0.1:3307` cho MySQL Workbench. Backend chỉ publish trong mạng Compose, Nginx proxy `/api/` và `/socket.io/`. Backend tự áp dụng migration versioned khi start; migration chỉ thêm/cập nhật schema và bootstrap một admin lần đầu. Không tự seed dữ liệu mock.

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml ps
docker compose --env-file .env -f deploy/docker-compose.yml logs -f backend
```

## Dừng và dữ liệu

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml stop
docker compose --env-file .env -f deploy/docker-compose.yml start
```

MySQL nằm trong volume `mysql-data`; file upload nằm trong volume `uploaded-files`. `stop`, `start`, build lại hoặc cập nhật image không xóa các volume. Không dùng `down -v` nếu không chủ động muốn xóa vĩnh viễn DB và tệp tải lên. Tên volume theo project Compose `c12-internalapp`.

Kiểm tra tình trạng qua `/health/live`, `/health/ready` của backend trong mạng nội bộ và healthcheck của từng service. MySQL Workbench kết nối `127.0.0.1:3307` với user/password DB trong `.env`; DB `c12_internalapp` chỉ xuất hiện trên MySQL do Compose này tạo. Không đưa credential DB vào frontend.
