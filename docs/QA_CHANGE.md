# Kiểm tra bản thay đổi 16/11/2026

Đã kiểm tra các luồng trọng tâm. Phân biệt kiểm tra logic và thao tác trình duyệt; đây không phải nghiệm thu production.

## Kiểm tra tự động

node tests/change-model-review.cjs: **12 đạt, 0 lỗi**. Kiểm tra cú pháp tất cả JavaScript frontend bằng node --check: đạt.

| Tình huống | Kết quả |
|---|---|
| Deadline | Đúng thời điểm hạn chưa muộn; quá hạn làm tròn lên ngày; hoàn thành ưu tiên |
| Thông báo | Có người thao tác; không trùng người nhận |
| Trường bắt buộc | Kiểm tra title và lịch khi cập nhật |
| Quyền hạn | Người nhận không phải người tạo không sửa due date; được đổi trạng thái |
| Phạm vi xem | Projection áp dụng quyền trước khi gộp |
| Phụ lục | Mỗi hệ thống tạo một dòng riêng |
| Chuyển nhóm một người | Giữ ID, đổi mã/nhóm quản lý, giữ lịch sử |
| Chuyển nhóm nhiều người | Giữ mã, cập nhật nhóm tham gia |
| Migration | Không bịa liên kết hồ sơ/nhóm; không sửa nguồn v4 |
| Người tạo sửa hạn | Vẫn sửa được khi admin thêm người nhận khác |
| Sửa ô theo công văn | Chỉ đổi nhóm công văn đã chọn |
| Nguồn mới nhất | Lưu status/comment không chiếm nguồn ô từ task khác |

## Đã thao tác trên trình duyệt

- Tạo công văn QA-CV-1611 trong phiếu, không có file; xuất hiện ngay trong danh mục và giữ nội dung phiếu đang nhập.
- Tạo Task-HT-03 với hai người thuộc hai nhóm, hai phụ lục QA-app01 và QA-db01; bảng hiển thị hai hệ thống riêng.
- Sửa vCPU QA-app01 từ 8 thành 12: bảng/task nguồn cùng đổi; lịch sử cũ vẫn có 8 và chỉ đọc.
- Sidebar có bốn vùng; metadata công văn giữ ở trên, task/phụ lục ở dưới.
- Thêm cột chung Ghi chú bảng QA, nhập giá trị riêng cho một dòng; chọn task nguồn khi sửa định danh. Đã dọn cột và lưu trữ task tài nguyên kiểm thử.
- Bảng có Văn bản sau Công văn đăng ký; không còn upload tài nguyên trực tiếp ở màn chính.
- Tạo Task-DAILY-02 cho Nguyễn Văn An: tab user nhận task/thông báo không tải lại; click mở đúng task. Hai tab giữ phiên riêng.
- Due date bị khóa với người nhận không phải người tạo. Đăng xuất và tải lại vẫn ở màn đăng nhập.
- Sơ đồ có nhóm/thành viên. Chuyển Phạm Quốc Dũng Máy chủ → Hạ tầng bằng nút Chuyển nhóm; lịch sử ghi actor/nhóm/thời điểm, task nhiều người giữ mã. Đã chuyển lại Máy chủ.
- Chủ đề có bảng màu/chuyển sắc/ảnh URL/upload; nền chuyển sắc được giữ sau tải lại. Chỉ còn Cloud Console.

- Nhập trực tiếp reference/test.xlsx trong phiếu Task-HT-04: khớp Cà Mau / VP UBND tỉnh, đọc 2 snapshot (952 và 4651), bỏ qua 7 snapshot không phù hợp. Lưu ra 1 hệ thống; 952 có vCPU 900/RAM 1600, 4651 có vCPU 576/RAM 1536. Lọc 952 vẫn giữ cả hai nhóm. Header Disk/Sizing nhiều tầng hiển thị đúng.
- Kiểm tra sidebar desktop 1440 × 1000: bốn cột nằm trong panel, không tràn ngang. Mở mặc định task cập nhật mới nhất và công văn tương ứng; giữ ưu tiên công văn đang lọc.
- Console không ghi lỗi ứng dụng trong lượt kiểm tra này. Task QA nhập Excel được giữ để trải nghiệm dữ liệu từ workbook.

## Phạm vi chưa kiểm tra thủ công đầy đủ

- Có handler kéo thả graph; đã kiểm tra nút Chuyển nhóm, chưa khẳng định native drag trên mọi trình duyệt.
- Đã kiểm tra XLSX mẫu trong task; DOCX mới chưa chạy kiểm thử thủ công. Cần kiểm tra thêm workbook ngoài mẫu, dữ liệu lỗi, quota và nhập lại. QA v4 không thay thế luồng v5.
- Chưa kiểm tra hết tổ hợp CRUD, màn nhỏ, trình đọc màn hình, ảnh tự tải, nhiều người sửa đồng thời.
- Không kiểm thử backend hoặc realtime đa thiết bị vì không nằm trong prototype.

Dữ liệu kiểm thử có tiền tố QA; lịch sử/thông báo có thể được giữ để đối chiếu. Không reset dữ liệu người dùng để dọn kiểm thử.

