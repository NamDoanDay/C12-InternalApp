# C12 / P4 - T1 Internal App

Workspace nội bộ có frontend SPA HTML/Tailwind CSS v4/JavaScript thuần, Node.js/Express, MySQL 8.4 và Socket.IO. Frontend đã bắt đầu dùng API cho đăng nhập, tải workspace và các luồng nghiệp vụ chính; migration chưa nghiệm thu toàn bộ. Workspace/session nghiệp vụ không còn đọc/ghi localStorage; theme preferences vẫn cục bộ. Theo dõi tiến độ, mục còn thiếu và bằng chứng kiểm thử tại [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Điểm bắt đầu

- [Hướng dẫn cho AI/IDE](AGENTS.md)
- [Index tài liệu](docs/INDEX.md)
- [Đặc tả nghiệp vụ chuẩn](docs/SPEC.md)
- [Quy tắc Front-end](docs/FRONTEND_RULES.md)
- [Quy tắc Backend/MySQL](docs/BACKEND_RULES.md)
- [Hợp đồng API/Socket.IO](docs/API_CONTRACT.md)
- [Plan và checklist phase](docs/IMPLEMENTATION_PLAN.md)
- [Chạy local/Docker Compose](docs/DEPLOYMENT.md)

## Chạy ứng dụng

### MySQL + backend + Nginx

Tạo `.env` từ `.env.example`, tạo `secrets/admin_password`, sau đó từ root chạy:

```powershell
docker compose --env-file .env -f deploy/docker-compose.yml up -d --build
```

Mở `http://localhost:8080`. Tài khoản admin bootstrap yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên. Dùng Docker Compose để chạy đủ frontend/API/MySQL/Socket.IO; static server không cung cấp các dịch vụ backend. Xem [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) để quản lý containers, MySQL Workbench và volumes.

## Preview tài liệu local

Ở root repo:

```powershell
python -m http.server 8002 --bind 127.0.0.1
```

Mở [http://127.0.0.1:8002/docs/preview.html](http://127.0.0.1:8002/docs/preview.html) để xem index tài liệu. Root `index.html` là preview tài liệu; entry app là `frontend/index.html`.

Tailwind CLI root: `npm run build:css` hoặc `npm run watch:css`. Chi tiết runtime và lưu trữ nằm trong [docs/TECH_ARCHITECTURE.md](docs/TECH_ARCHITECTURE.md).

## Phạm vi và giới hạn

Frontend đang chuyển workspace và xác thực sang API. Dữ liệu nghiệp vụ lấy từ MySQL; không nhập dữ liệu localStorage cũ. localStorage chỉ giữ tùy chọn giao diện như theme/palette. Một số màn legacy vẫn dùng save adapter và cần nghiệm thu đầy đủ trước khi coi migration hoàn tất; xem trạng thái, bằng chứng kiểm thử và phần còn thiếu tại [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

Tài liệu phân biệt nghiệp vụ đã xác nhận với hành vi code hiện tại. Khi code chưa đáp ứng chuẩn, khoảng lệch được ghi rõ trong SPEC/PRD; không coi yêu cầu là tính năng đã hoàn thành. Xem [docs/INDEX.md](docs/INDEX.md) để tìm tài liệu.
