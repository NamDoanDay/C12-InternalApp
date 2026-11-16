# Phân tích thay đổi frontend — 16/11/2026

Trạng thái: chuẩn bị, **chưa thay mã ứng dụng**. Chỉ triển khai sau khi root kiểm tra bộ spec mới và gửi kích hoạt. HTML + Tailwind + vanilla JavaScript; giữ preview local, không tự thêm backend hay React.

**Quyết định bổ sung từ root/user:** metadata chung task là Đơn vị + Cơ quan quản lý. Hệ thống được chọn/nhập trên từng dòng phụ lục tài nguyên. Mỗi dòng phụ lục đóng góp vào dòng bảng chính; cùng Đơn vị + Cơ quan + Hệ thống gộp giữa các task/công văn, không cộng tổng. Import Excel chỉ append các dòng khớp cặp Đơn vị/Cơ quan của task, cảnh báo các dòng khác cặp; không tự đổi chủ thể của dữ liệu nguồn. Điểm 2 bên dưới đã được giải quyết bởi quyết định này.

## Hiện trạng

`app.js` đang là script tập trung: v4 localStorage, shell, resource projection từ snapshot, import riêng, một danh mục `docs`, nhân sự phân cấp rank, auth demo. `styles.css` có 4 phong cách và header bảng 4 tầng. Các hàm permissions hiện rải rác, chưa đủ cho quyền task mới. Seed đúng 5 hệ thống workbook và snapshot cũ phải được giữ.

## Hướng giao diện

Chỉ giữ Cloud Console. Nền ứng dụng `#F0F4F9`, surface `#FFFFFF`, chữ `#1F1F1F`, action `#0B57D0`, border `#D3DCE7`, selection `#E8F0FE`; ánh xạ token riêng cho dark. Roboto cho toàn ứng dụng, header 25/19/16px, body 14–16px. Nền gradient/ảnh chỉ ở lớp nền; bảng/form dùng surface đủ đặc để đọc được ở mọi theme. Không để chọn ảnh nền làm thay đổi cấu trúc hoặc quyền.

UI/UX search `enterprise task console --design-system --density 8` cho Flat Design phù hợp mật độ/khả năng đọc, nhưng landing/video pattern, palette teal/orange và font pairing bị loại vì không theo Cloud Console user chọn. Search `dragging movements --domain ux` xác nhận phải có thao tác chuyển nhóm bằng menu/nút và keyboard bên cạnh kéo thả. Không coi search output là quyết định thay yêu cầu user.

```text
Header: menu | C12 / P4 - T1 | search | theme | light/dark | notifications | account
For you: Công việc | Quản lý tài nguyên | Danh mục Công văn / Văn bản | Thống kê
Chuyên môn tổ: Kiến thức | Cây sơ đồ
Admin: Quản lý nhân sự

Task admin: filters + 3 summary cards + list + Tạo công việc
Task user: Nhiệm vụ cá nhân | Được giao cho tôi; có lối xem task nhóm
Task editor: nội dung/tài liệu/tài nguyên/bình luận | metadata/trường tùy chỉnh
Resource drawer: Hệ thống | Phân loại công văn | Task/lịch sử | chi tiết
```

## Tách phần xử lý đề xuất

1. **Model/store:** migration v4→v5, stable internal IDs, counters nhóm, task revisions bất biến, source-cell projection; lưu một transaction chỉ sau validation.
2. **Permission helpers:** `canViewTask`, `canEditTaskField`, `canAssign`, `canEditResourceCell`, `canManageOrg`; dùng ở cả render và mutation. Tài khoản giữ session theo tab để thử hai người đồng thời.
3. **Tasks:** type document/daily, managementGroup, selected assignees, mandatory dates/title, catalogs, appendix/custom fields, comments, workflow shared; summary derived tại thời điểm xem.
4. **Catalogs:** hai collection công văn/văn bản độc lập, CRUD. Modal tạo mới trong task lưu vào danh mục ngay. Công văn task-document phải đủ số/ngày/trích yếu; attachment tùy chọn.
5. **Resources:** giữ projection hàng theo unit/agency/system, thêm cột Văn bản; filter self/doc/văn bản; sửa ô ghi về đúng source task và append revision. Click control sửa ô không mở drawer do event bubbling; click hàng mở task history.
6. **Org graph:** leadership → trưởng → phó/group → members; group/person CRUD admin, dragdrop + menu chuyển nhóm. Một người một nhóm; thay nhóm là transaction gồm membership, task code/management nếu solo, visibility và audit.
7. **Notifications:** event IDs + recipient dedupe, per-user read state, all/unread, task open. BroadcastChannel + storage events cập nhật các tab cùng origin; không gọi là realtime nhiều thiết bị có backend.
8. **Themes:** icon mở palette/gradient/image presets/custom URL/upload; validate HTTPS image URLs, lỗi ảnh có fallback, lưu setting cá nhân; không tải ảnh user để bypass restriction.

## Quy tắc quan trọng phải kiểm tra

- 4 workflow statuses; aggregate completed trước overdue; future-start vẫn processing. Overdue chỉ khi now>due, ngày chậm `ceil((now-due)/86400000)`.
- Task chung một status, mọi assignee được cập nhật; creator/full, assignee/restricted, groupmate/read-only; due chỉ admin hoặc creator.
- Group-visible task là union managementGroup và nhóm assignees hiện tại; members không tự được assign khi chọn group filter.
- Solo document task chuyển nhóm theo assignee và cấp mã mới, internal ID cố định; multi-assignee giữ mã. Daily luôn DAILY. Counter không tái sử dụng, code cũ lưu audit.
- Resource cells dùng latest saved revision theo source scope; lịch sử cũ readonly; doc fixed metadata giữ nguyên khi chọn task revision.
- Không còn nút upload resource trực tiếp; import chỉ bên trong task.

## Ba điểm cần root quyết định khi validate spec

1. **Legacy migration:** snapshot v4 không có creator/assignee/due và nhiều công văn thiếu ngày/trích yếu, không thể bịa các trường bắt buộc để gọi là task hợp lệ. Đề xuất giữ nguyên source/snapshots dưới legacy read-only; admin dùng “Chuyển thành task” rồi bổ sung thông tin. Seed mới có thể dùng task demo đầy đủ và ghi nguồn minh họa.
2. **Một tệp nhiều hệ thống — đã chốt bổ sung:** task có cặp unit/agency chung, mỗi dòng phụ lục có system riêng. Excel preview chỉ nhận các dòng khớp cặp task, cảnh báo phần không khớp. Mỗi dòng phụ lục đóng góp vào bảng gộp theo unit/agency/system; không cần tạo task riêng cho từng hệ thống và không cộng tổng.
3. **Projection và quyền xem:** row gộp có cả task user được và không được xem. Đề xuất dựng projection từ tập task được phép xem; ô mà source hiện tại không cho xem phải ẩn/readonly, không lộ assignees/comments qua bảng, drawer hay search. Legacy source không có quyền xác định cần admin-only đến khi liên kết.

Các quy tắc đề xuất trên chưa thay thế spec được root duyệt. Chưa sửa frontend/index.html, app.js, styles.css hoặc design gallery.

## Kiểm tra sau triển khai

Model: migration giữ raw v4, permissions matrix, shared status, exact due boundary/ceil ngày, solo/multi move, ID collision, notification recipient dedupe, latest-cell source và immutable revision. Browser: task-create validation/catalog immediate save, multi-group assignees, user/admin views, inline editing vs row click, graph drop/menu equivalent, task readonly history, notifications across two tabs, dark/theme contrast và mobile.
