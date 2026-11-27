# Kiến trúc kỹ thuật

Cập nhật 27/11/2026. Runtime hiện tại là SPA tĩnh chạy trên trình duyệt. Backend Node.js, MySQL, Socket.IO, Docker Compose và Nginx đã được gỡ khỏi source tree theo yêu cầu. Nghiệp vụ chuẩn vẫn ở [SPEC.md](SPEC.md); quy tắc quyền giao diện ở [PERMISSIONS.md](PERMISSIONS.md).

## Cấu trúc và runtime

- `frontend/index.html` là entry point. CSS/JavaScript được nạp bằng đường dẫn tương đối; có thể phục vụ thư mục `frontend/` bằng static web server.
- `frontend/js/data/demo-workspace.js` tạo bộ dữ liệu demo trong trình duyệt.
- `frontend/js/core/foundation.js` khởi tạo state, session demo và lưu workspace vào `localStorage` với khóa `c12-workspace-v7`.
- `frontend/js/core/model.js`, `frontend/js/pages/` và `frontend/js/features/` giữ model, render và tương tác nghiệp vụ phía client.
- `frontend/js/features/rework-v7.js` là implementation đang dùng cho bảng resource/catalog V7; file feature cũ vẫn được tải và một số hàm bị override theo thứ tự script. Xác định hàm cuối cùng sau toàn bộ script trước khi mô tả hoặc sửa một luồng.
- `frontend/assets/app.css` là bundle hiện hành; root `package.json` chỉ giữ Tailwind CLI để build CSS.
- Root `index.html` là preview tài liệu, không phải entry ứng dụng.

## Lưu trữ, phiên và giới hạn bảo mật

- State workspace được lưu trên trình duyệt hiện tại. Workspace seed mới dùng khi chưa có `c12-workspace-v7`; ngoài ra có augmentation/migration demo một lần theo phiên bản state như mô tả bên dưới. Các khóa localStorage legacy không bị xóa hoặc nhập tự động.
- Session demo lưu ở `c12-local-session`. Các nút User demo/Admin demo chỉ mô phỏng vai trò trong UI.
- Nếu không có session key, foundation khởi tạo phiên bằng User demo `demo-u-g-HT` hoặc User đầu tiên; vì thế lần đầu có thể vào thẳng ứng dụng. Đăng xuất mới đưa về form đăng nhập. Form đăng nhập chỉ dò email/tên user approved, không kiểm tra password; form đăng ký hiện bỏ qua password và chỉ tạo user pending. Không dùng hai form này làm mẫu auth production.
- Tùy chọn giao diện có các key riêng `c12-dark`, `c12-text-palette`, `c12-style`; accent/background cá nhân lưu trong `state.themeByUser`. Nền ảnh upload có thể lưu dạng data URL trong workspace localStorage và làm tăng dung lượng sử dụng.
- Không có xác thực máy chủ, phân quyền an toàn, đồng bộ đa thiết bị, API hoặc cập nhật realtime. Dữ liệu và role phía client có thể bị người dùng sửa; không dùng cho dữ liệu nhạy cảm hoặc triển khai production.
- `save()` ghi toàn bộ state JSON. Khi trình duyệt hết quota hoặc chặn storage, giao diện báo lỗi lưu. Tệp đính kèm lớn có thể vượt giới hạn localStorage.
- `docs/PERMISSIONS.md` mô tả quy tắc UI nghiệp vụ; đây không còn là kiểm soát bảo mật phía server.

## Dữ liệu demo và migration

- `demo-workspace.js` tạo bộ seed cho workspace rỗng. Ngoài seed ban đầu, `seedTaskDemo()` trong `pages/workspace.js` có one-time augmentation cho state cũ khi `demoSeedVersion < 2`: thêm/đồng bộ một số văn bản, nhóm/người, task, resource và knowledge; không chỉ khởi tạo khi thiếu workspace key.
- **Rủi ro dữ liệu:** augmentation thay resource trùng ID `demo-resource-{mã nhóm}` bằng fixture; chỉnh sửa của người dùng trên đúng record đó có thể bị mất. Mở trang resource có thể chạy migration V7 cho schema/cột và mật độ dữ liệu demo; migration có thể loại cột demo cũ, giảm còn tối đa 12 resource seed chưa có dấu vết tùy chỉnh, và giữ record có task/revision/file/custom field/phụ lục riêng. Sao lưu workspace cũ trước khi nâng code qua migration; hiện không có rollback tự động.
- `demo-workspace.js` và các bước augmentation/migration client độc lập với các database/volume Docker MySQL đã từng tồn tại.
- `M.migrate()` là chuyển đổi định dạng V5 cũ, không gọi trong khởi động thường xuyên để tránh làm mất dữ liệu V7. Hãy thêm migration tường minh, có kiểm tra phiên bản và sao lưu state trước khi đổi schema.
- Không tự xóa/reset localStorage. Khôi phục bộ dữ liệu mẫu qua giao diện là hành động thay thế workspace cục bộ và cần xác nhận.

## Chạy và build

Có thể mở `frontend/index.html` trực tiếp nếu trình duyệt cho phép các tài nguyên cục bộ, hoặc phục vụ thư mục `frontend/` bằng static server. Ví dụ từ root:

```powershell
python -m http.server 8080 --directory frontend --bind 127.0.0.1
```

Mở `http://127.0.0.1:8080`. Build CSS tại root bằng `npm run build:css`; theo dõi CSS bằng `npm run watch:css`.

Các thư viện XLSX/Mammoth và font được nạp qua CDN; tính năng tương ứng cần mạng và phải xử lý trường hợp thư viện không sẵn có.
