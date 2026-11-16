# Tài liệu C12 / P4 - T1 Internal App

Trạng thái: tài liệu yêu cầu đã chốt và câu hỏi mở cho preview, chưa phải xác nhận mọi chức năng đã triển khai/kiểm thử. Phase 1 đã chốt HTML + Tailwind + vanilla JavaScript, không React; localStorage và preview local, không deploy. Auth demo khác xác thực MVP; parser/AI/OCR không tự mặc định.

Đã chốt hai giai đoạn: bốn hướng thiết kế và prototype trước, MVP thật sau. Chỉ có admin/user; admin tạo tài khoản trực tiếp, duyệt đăng ký, dùng trang Quản lý nhân sự CRUD và là vai trò duy nhất được cập nhật cây nhân sự. Hồ sơ nhân sự tách khỏi tài khoản có liên kết; có thể chưa có tài khoản. Chưa chốt ảnh hưởng xóa tài khoản đến hồ sơ.

Quyết định cuối thay append dòng: cùng đơn vị + cơ quan + hệ thống gộp một dòng; ô Công văn có nhiều số, từng công văn có nhóm cột/schema riêng, xác thực từ test.xlsx (952 và 4651, header 4 tầng). Import qua trích xuất → preview/sửa/bổ sung → **Xác nhận nhập** tạo event/snapshot và mốc mới kể cả nhập lại, không nhân đôi dòng hiển thị. Nhóm Tên đơn vị sort alphabet. Nhập lại cùng công văn thì nhóm bảng lấy bản được xác nhận nhập mới nhất; bản cũ xem qua timeline.

Drawer theo cặp Tên đơn vị + Cơ quan quản lý, header hai tên; hệ thống trái → timeline giữa → snapshot/custom fields phải. Mốc giữ timestamp upload ban đầu đủ dd/MM/yyyy HH:mm:ss; xác nhận lưu riêng; lọc tháng theo upload; ngày ban hành công văn là trường chi tiết.

Custom fields tách độc lập; cả admin/user được thêm/sửa/xóa. Schema cột bảng dùng chung mọi dòng/user, giá trị riêng từng dòng, chỉ hiện bảng. Trường sidebar chỉ ở mốc timeline đang chọn, không lan sang mốc/hệ thống khác, chỉ hiện chi tiết; không tự sync hoặc chuyển thành cột. Nút Thêm cột trên cùng phải; Thêm cột và Thêm hàng cùng ở dưới cùng trái. Cả admin/user đã có CRUD tài nguyên, Danh mục và upload; ngữ nghĩa xóa dữ liệu liên quan cần làm rõ.

Thêm cột được chọn cột chung hoặc thuộc nhóm công văn cụ thể. Cả admin/user đã có quyền thêm/sửa/xóa bài Kiến thức và tệp đính kèm. Cách chạy preview xem [README dự án](../README.md); nguồn đối chiếu [test.xlsx](../reference/test.xlsx).

| Tài liệu | Nội dung |
| --- | --- |
| [PRD](PRD.md) | Bài toán, phạm vi, người dùng và tiêu chí nghiệm thu nháp |
| [Context](CONTEXT.md) | Bối cảnh, thuật ngữ, nguồn tham chiếu, quyết định còn mở |
| [Spec](SPEC.md) | Màn hình, hành vi và mô hình dữ liệu đề xuất |
| [Plan](PLAN.md) | Các vòng phỏng vấn, thiết kế, prototype và xác nhận |
| [Tech architecture](TECH_ARCHITECTURE.md) | Ranh giới hệ thống và các lựa chọn kiến trúc chưa chốt |
| [Requirements trace](REQUIREMENTS_TRACE.md) | Truy vết yêu cầu sang đặc tả/AC/đầu ra |
| [Open questions](OPEN_QUESTIONS.md) | Các câu hỏi còn mở, không trộn với quyết định đã chốt |

Quy ước xuyên suốt: **Đã nêu** là yêu cầu trực tiếp của người dùng; **Đề xuất** là phương án cần xác nhận; **Chưa chốt** là câu hỏi chưa có câu trả lời. Dữ liệu trong ảnh chỉ dùng để hiểu cấu trúc, không mặc định là dữ liệu nghiệp vụ đã xác minh. Nội dung ví dụ về văn bản pháp luật chưa được kiểm tra tính chính xác.

## Cách preview bộ tài liệu

Mở Markdown trong IDE/Codex hoặc [preview tài liệu](http://127.0.0.1:8002/docs/preview.html). Root đã xác nhận server cổng 8002 phục vụ HTTP 200 và preview tài liệu render Markdown tốt. [Gallery](http://127.0.0.1:8002/design/) và [prototype](http://127.0.0.1:8002/frontend/) dùng cùng server; trạng thái này chưa khẳng định các AC chức năng ứng dụng đã đạt.
