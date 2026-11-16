# Ghi chú bàn giao frontend — 16/11/2026

Bản hiện tại dùng HTML, Tailwind CDN, CSS và JavaScript thuần; một giao diện Cloud Console. Mở qua máy chủ HTTP theo README.

## Cấu trúc

| Tệp | Trách nhiệm |
|---|---|
| app.js, styles.css | Khung và các luồng đăng nhập demo, nhân sự, kiến thức, parser gốc |
| model.js | Quyền, task, deadline, lịch sử, chuyển nhóm, projection tài nguyên và migration |
| workspace.js | Điều hướng, lưu v5, task, thống kê và đồng bộ tab |
| workspace-forms.js | Phiếu task, hai danh mục và phụ lục |
| workspace-details.js | Chi tiết task, sidebar tài nguyên bốn vùng, lịch sử |
| workspace-org-theme.js | Sơ đồ nhóm, chuyển thành viên, chủ đề, thông báo |
| workspace-import.js | Nhập tài nguyên trong task và tích hợp bổ sung |
| workspace-table.js | Cột dùng chung, sửa ô, bộ lọc và header nhiều tầng |
| workspace.css | Giao diện bản thay đổi |

Thứ tự script trong index.html là bắt buộc. Các module workspace mở rộng hàm của prototype cũ; cần kiểm tra cả trang còn dùng app.js khi thay đổi.

## Dữ liệu và hành vi

- Kho mới: c12-prototype-v5; giữ nguồn v4 và c12-backup-v4. Tài nguyên cũ chưa có task được xem riêng và chuyển đổi bởi admin sau khi bổ sung thông tin; không tự gán nhóm/lịch sử.
- Phiên từng tab dùng c12-v5-session trong sessionStorage. Đăng xuất giữ trạng thái khi tải lại.
- Task có ID nội bộ ổn định, mã theo nhóm hoặc DAILY. Chuyển người duy nhất của task công văn đổi nhóm quản lý/mã, giữ lịch sử.
- Mỗi dòng phụ lục có Hệ thống riêng. Bảng gộp Unit + Agency + System, lấy giá trị mới nhất theo từng ô/công văn; status/comment không thay nguồn giá trị tài nguyên.
- Sửa ô ghi ngược đúng task nguồn và tạo lịch sử. Cột bảng dùng chung độc lập với trường tùy chỉnh trong task.
- Sidebar: Hệ thống → Phân loại công văn → Lịch sử cập nhật task → Chi tiết. Mốc cũ chỉ đọc; metadata công văn ở trên, dữ liệu task ở dưới.
- Công văn/văn bản là hai danh mục riêng. Mục tạo trong phiếu được lưu ngay; công văn bắt buộc số/ngày/trích yếu, tệp tùy chọn.
- Thông báo dùng BroadcastChannel và storage giữa các tab cùng origin/trình duyệt, chưa có backend đa thiết bị.

## Nhập tệp và giới hạn

Nhập DOCX/XLSX nằm trong phiếu task. SheetJS đọc Excel; Mammoth đọc DOCX trong trình duyệt. Xem trước và xác nhận vào phụ lục rồi lưu task. Chỉ ánh xạ snapshot khớp Đơn vị/Cơ quan và công văn đã chọn.

Excel hỗ trợ mẫu test.xlsx, không phải mọi workbook. DOCX đọc văn bản/cặp nhãn:giá trị; không OCR hoặc .doc cũ. Lỗi thư viện/dữ liệu được báo tại giao diện. Tệp dùng kho trình duyệt có giới hạn dung lượng.

Đăng nhập và phân quyền chỉ để trải nghiệm luồng, không phải bảo mật máy chủ. Dùng tài khoản demo, không dùng mật khẩu thật. Chưa có API, xác thực sản xuất, sao lưu tập trung hoặc giải quyết xung đột nhiều máy. CDN/parser/fonts/ảnh nền URL cần Internet.

Kết quả hiện hành: [QA_CHANGE](../docs/QA_CHANGE.md). Kiểm tra logic: node tests/change-model-review.cjs. QA ngày 15/11 chỉ mô tả v4.
