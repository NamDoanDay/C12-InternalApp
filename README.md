# C12 / P4 - T1 Internal App

Workspace nội bộ chạy bằng SPA HTML/Tailwind CSS v4/JavaScript thuần, Express + Socket.IO và MySQL. Nginx phục vụ frontend và reverse proxy API/realtime.

## Điểm bắt đầu

- [Hướng dẫn cho AI/IDE](AGENTS.md)
- [Index tài liệu](docs/INDEX.md)
- [Đặc tả nghiệp vụ chuẩn](docs/SPEC.md)
- [Quy tắc Front-end](docs/FRONTEND_RULES.md)

## Chạy bằng Docker (khuyến nghị)

```powershell
Copy-Item .env.example .env
# đặt mật khẩu DB, JWT_SECRET và mật khẩu demo riêng trong .env
docker compose -f deploy/docker-compose.yml up --build
```

Mở `http://localhost:8080` (hoặc `WEB_PORT`). Đăng nhập demo bằng `admin@c12.demo` / `user@c12.demo` với mật khẩu đã đặt trong `.env`.

## Preview tài liệu local

Ở root repo:

```powershell
python -m http.server 8002 --bind 127.0.0.1
```

Mở [http://127.0.0.1:8002/docs/preview.html](http://127.0.0.1:8002/docs/preview.html) để xem index tài liệu. App cần được phục vụ cùng origin qua Nginx để `/api/` và `/socket.io/` hoạt động. Root `index.html` là preview tài liệu; entry app là `frontend/index.html`.

Tailwind CLI root: `npm run build:css` hoặc `npm run watch:css`. Backend độc lập: chạy `npm install` trong `backend/`, sau đó `npm start`; cần MySQL và file `.env` ở root. Chi tiết cấu hình nằm trong [docs/TECH_ARCHITECTURE.md](docs/TECH_ARCHITECTURE.md).

## Phạm vi và giới hạn

MySQL là nguồn dữ liệu nghiệp vụ. Các khóa localStorage cũ không được nhập hoặc ghi đè; tùy chọn theme vẫn lưu cục bộ. Tài khoản demo dành cho development; thay secret mặc định trong `.env` và không commit file đó.

Tài liệu phân biệt nghiệp vụ đã xác nhận với hành vi code hiện tại. Khi code chưa đáp ứng chuẩn, khoảng lệch được ghi rõ trong SPEC/PRD; không coi yêu cầu là tính năng đã hoàn thành. Xem [docs/INDEX.md](docs/INDEX.md) để tìm tài liệu.
