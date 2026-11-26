# Kiến trúc Front-end hiện tại

Rà soát 26/11/2026. Đây là mô tả code hiện có, không phải kiến trúc backend mục tiêu.

## Stack và build

- SPA tĩnh: HTML + Tailwind CSS v4 CLI + JavaScript thuần; không React/Vue.
- `frontend/index.html` là entry point ứng dụng.
- Package scripts: `npm run build:css` (compile/minify) và `npm run watch:css`.
- Tailwind source: `frontend/css/app.css`; bundle được nạp là `frontend/assets/app.css`.
- Local preview: `python -m http.server 8002 --bind 127.0.0.1`, sau đó `/frontend/`.
- XLSX và Mammoth được nạp qua CDN; mất mạng/thất bại CDN ảnh hưởng tính năng phụ thuộc.

## Cấu trúc thư mục

| Path | Trách nhiệm |
|---|---|
| `frontend/index.html` | DOM shell và thứ tự nạp assets/scripts |
| `frontend/css/app.css` | Tailwind entry/import chain |
| `frontend/css/legacy.css` | CSS nền cũ và nhiều theme token |
| `frontend/css/workspace.css` | layout workspace/views |
| `frontend/css/glass.css` | surfaces/glass styling |
| `frontend/css/pages/auth.css` | auth view |
| `frontend/css/rework-v7.css`, `ui-polish.css` | overrides/điều chỉnh mới hơn |
| `frontend/js/core/foundation.js` | namespace, session/state nền và helpers |
| `frontend/js/data/local_demand.js` | seed dataset tài nguyên |
| `frontend/js/pages/app-shell.js` | navigation, header, shell và render routing |
| `frontend/js/components/dialogs.js` | dialog/modal utilities và scroll lock |
| `frontend/js/features/drawers.js` | drawer views |
| `frontend/js/features/imports.js` | import flows |
| `frontend/js/core/model.js` | nghiệp vụ task, quyền, trạng thái, danh mục |
| `frontend/js/pages/workspace.js` | page renderers/state hydration |
| `frontend/js/features/task-forms.js` | form tạo/sửa task |
| `frontend/js/features/details.js` | chi tiết task/person/document |
| `frontend/js/features/org-theme.js` | graph tổ và theme cá nhân |
| `frontend/js/features/import-export.js` | import/export hooks |
| `frontend/js/features/resource-table.js` | resource UI/base helpers |
| `frontend/js/core/ui-repair.js` | UI repair compatibility |
| `frontend/js/features/rework-v7.js` | V7 resource/catalog override và migration |

> Danh sách trên là trách nhiệm cấp cao. Thứ tự load trong HTML quyết định implementation override cuối cùng; kiểm tra code trước khi sửa hàm trùng tên.

## Thứ tự script hiện tại

`foundation.js` → `local_demand.js` → `app-shell.js` → `dialogs.js` → `drawers.js` → `imports.js` → `model.js` → `workspace.js` → `task-forms.js` → `details.js` → `org-theme.js` → `import-export.js` → `resource-table.js` → `ui-repair.js` → `rework-v7.js`.

## State, session, migration

- Prototype state JSON lưu trong localStorage. Các khóa quan trọng gồm `c12-prototype-v7`; loader đọc/upgrade các cấu trúc phiên bản trước và backup dữ liệu cũ khi phù hợp.
- Danh tính từng tab lưu trong sessionStorage (khóa hiện hành `c12-v5-session`, có fallback tương thích). Demo user mặc định `demo-u-g-HT`.
- Theme có khóa mode/style/text palette và state theme theo user; xem [FRONTEND_RULES.md](FRONTEND_RULES.md).
- BroadcastChannel `c12-v7` và browser `storage` event báo thay đổi giữa các tab cùng origin.
- Không có server persistence, multi-device sync, API, auth provider hoặc server-side authorization.
- Trước migration phải giữ nguyên backup; không xóa/reset storage để “sửa” schema.

## Runtime data paths cần nhớ

- Tasks, catalog documents, groups, people, account, comments/revisions và notifications nằm trong state prototype.
- V7 resource records là collection độc lập nhưng liên kết nhiều-nhiều ở phía resource (`taskIds`) với task resource có một `resourceId`; resource task chỉ giữ đúng một resource. `resourceData`, attachments và custom fields được đồng bộ snapshot trong các bản ghi liên kết. Khi tạo resource kèm task, V7 dùng snapshot state để rollback nếu lưu lỗi; không có transaction backend.
- Resource được tìm/gộp theo khóa đã chuẩn hóa Tên đơn vị + Cơ quan quản lý + Hệ thống khi lưu; task resource mới liên kết resource theo `resourceId` hiện tại hoặc cùng khóa nghiệp vụ, nếu không có thì tạo resource.
- Schema cột appendix theo Công văn: `resourcesWorkspace()` lấy mọi `state.documents` active có type `Công văn` để dựng header. `resourceDocColumnsV7()` chọn schema tùy chỉnh ở `state.resourceAppendixSchemas`, schema đặc thù 952/4651, hoặc sáu cột mặc định; cột appendix đã lưu theo resource cũng được hợp nhất. Do đó Công văn mới tạo header nhóm ở lần render workspace tài nguyên, nhưng không tự tạo resource hay liên kết vào resource. Schema/cột được sửa là client-side state.
- Resource lưu liên kết Công văn ở `registeredDocumentIds`, Văn bản cấp tài nguyên ở `assetDocumentIds` (alias cũ `exchangeDocumentIds`), phụ lục theo `documentAppendices[documentId]`; cột Task trong bảng lấy mã từ quan hệ task. Task Xử lý văn bản lưu `documentId` đến catalog item chính. Các liên kết này không tự suy ra lẫn nhau.
- Catalog dùng `state.documents`; alias cũ `officials`/`docs` phục vụ migration/tương thích. Loại danh mục khai báo ở `DOCUMENT_TYPES` trong `frontend/js/core/model.js`, gồm cả “Văn bản cấp tài nguyên”.
- Văn bản được archive nếu đang được task/resource tham chiếu; hard-delete chỉ áp dụng văn bản chưa liên kết. Renderer tài nguyên chỉ dựng appendix groups cho văn bản active, vì vậy archived doc có thể còn link/data nhưng không còn xuất hiện thành nhóm cột trên bảng/export.
- Stats page có một số fixture; không coi mọi widget là live data.

## Giới hạn và an toàn thay đổi

- localStorage/sessionStorage không phải database hoặc bảo mật; không đưa dữ liệu nhạy cảm thật vào prototype.
- Không sửa build bundle trực tiếp nếu source CSS có thể sửa; không bỏ legacy module trước khi kiểm tra load order và side effects.
- Không chạy kiểm thử/build nếu người dùng không yêu cầu. Hiện package không khai báo test script; `tests/` chứa các script riêng có thể tham khảo.
- Có script kiểm tra lịch sử trong `tests/` còn kỳ vọng decision log tách riêng; sau khi log được gộp vào SPEC, script đó cần được cập nhật trước khi dùng như validator tài liệu. Không chạy script này như bằng chứng nghiệm thu hiện tại.
- Khi mô tả tính năng, phân biệt UI, client-side behavior và server-side guarantee (hiện chưa có).
