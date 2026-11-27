# C12 / P4 - T1 Internal App

Workspace nội bộ chạy dạng SPA HTML/Tailwind CSS v4/JavaScript thuần. Bản hiện tại không có backend hoặc database; dữ liệu được lưu cục bộ trong trình duyệt.

## Điểm bắt đầu

- [Hướng dẫn cho AI/IDE](AGENTS.md)
- [Index tài liệu](docs/INDEX.md)
- [Đặc tả nghiệp vụ chuẩn](docs/SPEC.md)
- [Quy tắc Front-end](docs/FRONTEND_RULES.md)

## Chạy ứng dụng

Tại root repo, chạy static server:

```powershell
python -m http.server 8080 --directory frontend --bind 127.0.0.1
```

Mở `http://127.0.0.1:8080`. Có thể chọn User demo hoặc Admin demo trong màn hình đăng nhập.

## Preview tài liệu local

Ở root repo:

```powershell
python -m http.server 8002 --bind 127.0.0.1
```

Mở [http://127.0.0.1:8002/docs/preview.html](http://127.0.0.1:8002/docs/preview.html) để xem index tài liệu. Root `index.html` là preview tài liệu; entry app là `frontend/index.html`.

Tailwind CLI root: `npm run build:css` hoặc `npm run watch:css`. Chi tiết runtime và lưu trữ nằm trong [docs/TECH_ARCHITECTURE.md](docs/TECH_ARCHITECTURE.md).

## Phạm vi và giới hạn

Workspace được lưu trong localStorage của trình duyệt hiện tại. Demo login chỉ mô phỏng vai trò phía client, không cung cấp xác thực hay bảo vệ dữ liệu an toàn; không dùng chế độ này cho triển khai nhiều người dùng hoặc dữ liệu nhạy cảm.

Tài liệu phân biệt nghiệp vụ đã xác nhận với hành vi code hiện tại. Khi code chưa đáp ứng chuẩn, khoảng lệch được ghi rõ trong SPEC/PRD; không coi yêu cầu là tính năng đã hoàn thành. Xem [docs/INDEX.md](docs/INDEX.md) để tìm tài liệu.
