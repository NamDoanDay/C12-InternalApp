# C12 / P4 - T1 Internal App

Prototype workspace nội bộ chạy bằng HTML, Tailwind CSS v4 và JavaScript thuần.

## Điểm bắt đầu

- [Hướng dẫn cho AI/IDE](AGENTS.md)
- [Index tài liệu](docs/INDEX.md)
- [Đặc tả nghiệp vụ chuẩn](docs/SPEC.md)
- [Quy tắc Front-end](docs/FRONTEND_RULES.md)

## Chạy local

Ở root repo:

```powershell
python -m http.server 8002 --bind 127.0.0.1
```

Mở [http://127.0.0.1:8002/frontend/](http://127.0.0.1:8002/frontend/) để dùng ứng dụng, hoặc [http://127.0.0.1:8002/docs/preview.html](http://127.0.0.1:8002/docs/preview.html) để xem index tài liệu. Cổng 8002 cần đang trống; dừng server bằng Ctrl+C.

Tailwind CLI đã nằm trong dependency cục bộ. Sau khi sửa CSS source, có thể chạy `npm run build:css`; `npm run watch:css` dùng trong lúc phát triển. Build CSS không cần cho việc chỉ sửa nội dung HTML/JS. Fonts, XLSX/Mammoth CDN cần kết nối mạng.

## Phạm vi và giới hạn

Đây là prototype: state lưu trong trình duyệt, danh tính demo theo tab, thông báo/storage sync chỉ giữa tab cùng browser và origin. Chưa có backend, xác thực an toàn, server-side authorization hay realtime đa thiết bị. Không dùng thông tin nhạy cảm thật.

Tài liệu phân biệt nghiệp vụ đã xác nhận với hành vi code hiện tại. Khi code chưa đáp ứng chuẩn, khoảng lệch được ghi rõ trong SPEC/PRD; không coi yêu cầu là tính năng đã hoàn thành. Xem [docs/INDEX.md](docs/INDEX.md) để tìm tài liệu.
