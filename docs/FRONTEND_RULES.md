# Quy tắc Front-end và thiết kế

Ngày rà soát: 26/11/2026. Quy tắc này mô tả định hướng đã thống nhất và cấu hình đang có; nếu một chi tiết chưa được bảo đảm trong mọi view thì ghi nhận như khoảng cần xử lý, không suy đoán.

## 1. Tư tưởng thiết kế

Floating Glassmorphism tối giản: panels như các bề mặt nổi trên nền theme; nền bán trong suốt, blur tiết chế, viền sáng mảnh, shadow mềm, chữ/biểu tượng rõ nét. Bố cục ưu tiên surface gom nhóm chức năng (heading + action; filter + view controls; chart/data; table/card). Không tạo card lẻ cho từng nhãn hoặc title. Title/subtitle giữ tự nhiên, không thêm nền nổi riêng.

## 2. Surface, màu sắc và tương phản

- Header, sidebar, main surfaces và modal/drawer dùng cùng hệ token theme, tránh dải nền lệch giữa header và content.
- Card, table, row, control bên trong surface có thể đậm hơn một mức để phân tầng; tránh nhiều lớp `backdrop-filter` chồng lên nhau.
- Dùng token màu chữ chính/phụ/muted/icon; màu chữ cần tương phản rõ ở LIGHT và DARK, kể cả placeholder, badge, bảng và icon.
- Hỗ trợ cả `-webkit-backdrop-filter` và `backdrop-filter`; có fallback bán trong suốt khi blur không hỗ trợ.
- Border sáng mảnh, shadow mềm; tránh border màu cứng và nền đục gây mất chất liệu kính.
- Theme cá nhân, ảnh nền, màu chữ và chế độ LIGHT/DARK là các thiết lập riêng; chuyển theme phải cập nhật đồng bộ.

### 2.1 Token nền và phân tầng hiện có

Không rải màu hex trực tiếp vào component nếu đã có token. Nguồn hiện hành chủ yếu là `frontend/css/legacy.css` và các override cuối trong `frontend/css/ui-polish.css`:

| Token | LIGHT | DARK | Dùng cho |
|---|---|---|---|
| `--app` | `#eef2f9` | `#090d16` | fallback canvas |
| `--surface` | `rgba(255,255,255,.72)` | `rgba(17,24,39,.75)` | surface chính |
| `--surface-card` | `rgba(255,255,255,.65)` | `rgba(30,41,59,.70)` | card con |
| `--glass-bg` | `rgba(255,255,255,.36)` | `rgba(15,23,42,.42)` | lớp kính cơ bản |
| `--glass-content-bg` | `rgba(255,255,255,.52)` | `rgba(15,23,42,.62)` | nội dung trong panel |
| `--glass-control-bg` | `rgba(255,255,255,.62)` | `rgba(15,23,42,.72)` | input/select/control |
| `--glass-row-bg` | `rgba(255,255,255,.60)` | `rgba(30,41,59,.68)` | hàng dữ liệu |
| `--glass-row-hover` | `rgba(255,255,255,.76)` | `rgba(45,61,84,.80)` | hover row |
| `--glass-border` | `rgba(255,255,255,.35)` | `rgba(255,255,255,.28)` | viền kính |
| `--glass-shadow` | `0 12px 32px rgba(15,23,42,.08), inset 0 1px 0 rgba(255,255,255,.7)` | `0 12px 32px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.2)` | nổi khối |

Màu chữ semantic: LIGHT dùng `--text-primary`, `--text-secondary`, `--text-muted`, `--text-icon` mặc định `#0f172a`; DARK dùng `#f8fafc`. Mọi biến màu chữ hiện nối qua `--text-contrast-primary/secondary`. Theme cá nhân có thể thay palette; component phải tiếp tục tham chiếu token semantic. Màu nhóm appendix đặc thù: 4651 `#475569`, 952 `#919b7b`; chỉ áp lên nhận diện nhóm, không dùng làm màu chữ mặc định.

Form/chi tiết có lớp rõ hơn surface chung để chữ không chìm: LIGHT `--flow-sidebar-bg: rgba(255,255,255,.82)`, `--flow-body-bg: rgba(255,255,255,.66)`, `--flow-surface-bg: rgba(255,255,255,.76)`, viền `.62`; DARK lần lượt `rgba(15,23,42,.9)`, `rgba(15,23,42,.78)`, `rgba(30,41,59,.84)`, viền `.18`. Shadow lấy từ `--flow-surface-shadow`. Đây là các giá trị CSS hiện có, không thay thế token tổng.

### 2.2 Nhịp khoảng cách, bo góc và typography

- Dùng nhịp spacing 4/8/12/16/20/24px: gap 8–12px trong nhóm điều khiển; gap 12–16px giữa surface; padding surface thông thường 16–24px ngang và 12–20px dọc. Form/drawer dùng gap 12px, padding nhóm 14–16px; mobile giảm còn gap 10px, padding 10–12px.
- Bo góc token `--radius` hiện 14px; surface/card thường 14–20px tùy component, control 10–12px, pill chỉ dùng cho trạng thái/tag.
- Cỡ chữ cơ bản body 14px; `h1` 22px/700, `h2` 18px/600, `h3` 15px/600 theo `legacy.css`. Nội dung thường không nhỏ hơn 12px; caption có thể nhỏ hơn nếu không chứa dữ liệu cần đọc thường xuyên.
- Bảng tài nguyên là ngoại lệ dense theo yêu cầu nghiệp vụ: bảng 10.5px, line-height 1.12; cell padding 2px 3px; hàng 22px. Chip 9.5px. Không dùng mật độ này cho bảng nghiệp vụ khác nếu làm giảm khả năng đọc.
- Dùng Roboto trước, fallback hệ thống; không thêm font tải ngoài nếu chưa có yêu cầu.

## 3. Layout và responsive

- Surfaces có padding trái/phải phù hợp viewport (thường 16–24px) và gap nhất quán.
- Các phần tử con trong flex/grid cần `min-width: 0`; cho phép wrap và giới hạn overflow tại đúng vùng cuộn.
- `overflow-x` không được tạo thanh ngang ở app shell; bảng rộng được cuộn trong table container.
- Sidebar collapsed phải rời khỏi vùng nhìn/luồng, không để lại dải mờ; main phải tận dụng phần không gian giải phóng.
- Bảng có cột cố định/rộng hợp lý; không để text/control chồng lên scrollbar.
- Modal/drawer khóa scroll nền; chỉ một vùng nội dung chính có scroll. Đóng bằng X, backdrop hoặc Esc phải khôi phục scroll.
- Kanban công việc luôn ba cột aggregate status; filter chỉ đổi task trong cột, không đổi số cột.

## 4. Quy tắc các view đặc thù

- **Quản lý công việc:** title/action; filter; donut + legend; tab aggregate/view switch và board/table theo thứ tự trong SPEC. Tab và summary dùng cùng bộ lọc trạng thái. Donut có lỗ rỗng thật, tổng ở tâm, legend gọn và đồng màu với segments.
- **Thống kê:** Tổng quan công việc hiển thị đủ bốn summary card theo cùng thứ tự tổng/đang xử lý/hoàn thành/chậm muộn; số liệu theo phạm vi task mà user xem được và các filter task hiện hành. Card tổng mở Quản lý công việc ở tab Tổng công việc.
- **Quản lý tài nguyên:** bảng gộp Đơn vị/Cơ quan/Hệ thống; nhóm appendix theo mọi Công văn active trong catalog, không chỉ các Công văn đã được resource đăng ký. Công văn mới sinh nhóm header theo schema mặc định ở lần render màn tài nguyên; không tự tạo Resource, không tự gắn vào Resource, và giá trị ô chỉ có khi đúng resource chọn Công văn đó. Công văn 952/4651 giữ schema riêng; Công văn khác có sáu cột mặc định. Cột con có nút xóa riêng trong header, yêu cầu xác nhận và xóa dữ liệu của đúng nhóm; header `colspan`, body và Excel cùng đọc schema hiện hành. Không đặt nút xóa lên cột định danh/thao tác cố định. Nhóm màu hiện yêu cầu: 4651 `#475569`, 952 `#919b7b`. Export phản ánh filter và merge; nếu XLSX lib thiếu, thông báo lỗi thay vì tạo file giả. “Văn bản cấp tài nguyên” là loại catalog độc lập, hiển thị trong cột liên kết riêng, không sinh appendix group.
- **Danh mục văn bản:** một danh mục, tabs theo loại văn bản, tìm kiếm và bảng; không dựng danh mục Công văn tách biệt.
- **Cây sơ đồ:** graph theo nhánh nhóm; drag/drop thay đổi group, có đường thao tác không cần kéo nếu thiết bị không hỗ trợ.
- **Kiến thức tổ:** card độc lập với gap/padding, text/action wrap được; filters vẫn hiển thị rõ.
- **Modal/drawer:** nền header/body thống nhất, child surfaces tách lớp nhẹ; không lộ content phía sau gây nhiễu.
- **Form/chi tiết task và tài nguyên:** sidebar thao tác/lịch sử dùng nền kính đậm hơn vùng nội dung; các nhóm thông tin, văn bản/phụ lục, tệp, trường tùy chỉnh, bình luận, revisions và task liên kết được gom vào surface riêng. Nhịp gap giữa surface là 12px, padding panel 14–16px; token `--flow-sidebar-bg`, `--flow-body-bg`, `--flow-surface-bg` có giá trị riêng cho LIGHT/DARK.

Quy tắc bảng: header có nhãn ổn định, không ngắt giữa ký tự; dùng `min-width: 0` cho cột co giãn, `overflow-wrap: anywhere` chỉ cho giá trị dài, và không dùng `word-break: break-all` cho heading. Bảng rộng cuộn trong wrapper riêng; thao tác có accessible label; edit/delete controls không đẩy hoặc che tiêu đề. Hover chỉ làm nổi `tr` được trỏ chuột trực tiếp, đặc biệt khi `rowspan` dùng chung cell; không tô lây hàng lân cận. Table density và width là theo từng bảng, không áp global rule khiến form/table khác vỡ.

## 5. CSS và Tailwind trong repo

- Tailwind v4 qua CLI. Source entry: `frontend/css/app.css`; generated bundle: `frontend/assets/app.css`.
- `app.css` import theme/utilities và các stylesheet legacy/workspace/glass/auth/rework/UI polish theo thứ tự. CSS cuối có thể override CSS trước; trước khi thêm rule, tìm selector cũ và quyết định đặt trong file đúng domain.
- Dùng token CSS đã có trước khi tạo màu/spacing mới. Theme variables chủ yếu đặt trong `frontend/css/legacy.css`; lớp glass/overrides nằm trong `glass.css`, `rework-v7.css`, `ui-polish.css`.
- Tránh sửa generated CSS trực tiếp; chạy `npm run build:css` chỉ khi thay CSS source và khi người dùng yêu cầu/cho phép kiểm chứng build.
- HTML dùng class rõ nghĩa theo component; JS tạo markup bằng render/view functions. Giữ tiếng Việt hiện tại và escaping dữ liệu người dùng.

## 6. JavaScript UI và tương tác

- App là vanilla JS với namespace/module pattern toàn cục; không đưa React/Vue vào nếu chưa có quyết định kiến trúc.
- Điều hướng gọi render hiện hành; event delegation được dùng trong shell. Kiểm tra binding để tránh listener trùng sau render.
- State domain và rendering tách theo `core`, `pages`, `features`; thêm behavior gần module sở hữu nó.
- Modal dùng dialog utilities chung; luôn xử lý body scroll lock, backdrop, Esc và cleanup.
- Không dùng `console.log`/alert để báo luồng nghiệp vụ nếu app có toast/dialog; không lưu thay đổi khi user đóng bằng overlay trừ khi user đã xác nhận hành vi lưu.
- Search/filter phải kết hợp quyền truy cập trước khi render hoặc đếm; không chỉ ẩn nút.

## 7. Nạp script và thay đổi an toàn

Script được tải theo thứ tự trong `frontend/index.html`; các feature cũ và V7 override có thể cùng được nạp. Trước khi sửa hàm trùng tên, xác định implementation cuối cùng thực sự chạy và các side effects migration. Không xóa legacy chỉ dựa trên việc view mới override nó.

Không đổi schema/migration, seed data, quyền hoặc nghiệp vụ trong task CSS-only. Không reset localStorage. Khi user yêu cầu “chỉ cập cập nhật docs”, không sửa HTML/CSS/JS/build output.

## 8. Accessibility và trạng thái

- Button có tên dễ hiểu, focus-visible rõ; icon-only có accessible label.
- Input/select có label liên kết; lỗi validation gần trường; disabled/empty/loading state có thông tin.
- Hover không phải tín hiệu duy nhất; hỗ trợ focus và lựa chọn bằng bàn phím.
- Responsive: dropdown/filter xuống dòng thay vì tràn; table cuộn riêng; drawer không vượt viewport.

## 9. Kiểm tra theo yêu cầu

Không tự chạy test/build trừ khi user yêu cầu. Khi được yêu cầu validate UI, kiểm tra LIGHT/DARK, sidebar open/collapsed, màn nhỏ, modal mở/đóng, filter rỗng/đầy và nội dung dài. Phân biệt kiểm tra tĩnh code với kiểm tra trực quan trình duyệt.

## 10. Tích hợp API (mục tiêu đã chốt, chưa triển khai)

- Nghiệp vụ và phiên xác thực không lưu trong localStorage. Access JWT chỉ ở memory; refresh dùng cookie `HttpOnly` theo [API_CONTRACT.md](API_CONTRACT.md). Theme/palette/background preference tiếp tục lưu cục bộ.
- API client tập trung xử lý JSON/error envelope; không tạo fetch/headers/refresh logic riêng cho từng view. Network failure được phân biệt với Backend/Database error.
- Backend field errors hiển thị cạnh control; lỗi runtime báo rõ “Frontend”; API errors giữ `code`, `message`, `scope` và request ID dễ sao chép.
- Realtime event là tín hiệu refetch qua API, không phải nguồn dữ liệu tin cậy. Khi nhận event, không ghi đè nội dung form đang nhập hoặc đóng modal/drawer; dùng version/conflict flow.
- Loading, empty, unauthorized, archived và retry states phải giữ cùng layout/surface hiện hữu; archived links được hiển thị trong lịch sử/chi tiết nhưng không cho gán mới.
- Chưa tuyên bố API integration đã có trong source cho tới khi Phase 5 của [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) được nghiệm thu.
