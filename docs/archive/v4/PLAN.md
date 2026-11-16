# Kế hoạch nháp

**Đã chốt hai giai đoạn:** thiết kế bốn hướng và prototype trước; xây MVP thật sau. Các vòng dưới đây phục vụ giai đoạn đầu, trừ phần ghi rõ MVP.

## Vòng 1: xác định nghiệp vụ

Phỏng vấn tiếp về phạm vi quyền của hai vai trò admin/user; ý nghĩa từng dòng tài nguyên; kho văn bản và liên kết; quy tắc import; tùy biến trường; sơ đồ nhân sự. Đã chốt admin tạo tài khoản trực tiếp và duyệt đăng ký; Quản lý nhân sự CRUD chỉ admin; chỉ admin cập nhật cây. Hồ sơ nhân sự tách khỏi tài khoản có liên kết; duyệt đăng ký có thể liên kết hồ sơ có sẵn hoặc tạo mới, tránh trùng. Tiếp tục hỏi vòng đời và ảnh hưởng khi xóa. Mỗi câu trả lời cập nhật vào CONTEXT, PRD và SPEC. Các giả định không được nâng thành yêu cầu nếu chưa xác nhận.

Quyết định cuối thay append dòng: bảng gộp một dòng theo đơn vị + cơ quan + hệ thống; ô Công văn nhiều số, mỗi nhóm cột có schema riêng như test.xlsx (952/4651, header 4 tầng). Xác nhận nhập sau preview tạo event/snapshot và mốc mới, kể cả nhập lại, không nhân đôi dòng hệ thống. Nhóm Tên đơn vị sort alphabet; số liệu tổng nhu cầu, không delta. Đã chốt bảng lấy bản được xác nhận nhập mới nhất cho cùng công văn, bản cũ còn trong timeline; cần hỏi quy tắc sửa snapshot sau nhập.

Drawer theo cặp Tên đơn vị + Cơ quan quản lý, header hai tên; hệ thống trái → timeline giữa → snapshot/custom fields phải. Mốc dùng timestamp upload ban đầu đủ dd/MM/yyyy HH:mm:ss, xác nhận lưu riêng; lọc tháng theo upload; ngày ban hành nằm trong chi tiết.

Đã chốt stack giai đoạn 1: HTML + Tailwind + vanilla JavaScript, không React; localStorage, preview local, không deploy. Gallery `design/index.html`; prototype `frontend/index.html`, `app.js`, `styles.css`. Chuyển seed từ workbook thật `reference/test.xlsx`; bổ sung dữ liệu demo phải ghi rõ. Auth/role là mô phỏng, chưa có đồng bộ nhiều người dùng. Parser/trích xuất không mặc định AI/OCR.

Custom fields đã tách hai nơi hiển thị độc lập: quan trọng chỉ ở bảng, bổ sung chỉ ở drawer; không tự sync/chuyển drawer field thành cột bảng. Cả admin/user có thêm/sửa/xóa hai nhóm. Cột bảng dùng chung schema toàn bộ dòng/user, giá trị riêng mỗi dòng; trường sidebar chỉ ở mốc đang chọn, không lan sang mốc/hệ thống khác. Phải đặt Thêm cột trên cùng phải và cả Thêm cột + Thêm hàng dưới cùng trái. Phỏng vấn tiếp đổi kiểu, xử lý/xác nhận xóa dữ liệu và đồng thời; quyền tài nguyên, Danh mục và upload đã chốt cho cả admin/user; ngữ nghĩa xóa dữ liệu liên quan cần làm rõ.

Đã chốt bổ sung: Thêm cột cho chọn cột chung hoặc nhóm công văn cụ thể; cả admin/user CRUD bài Kiến thức và tệp đính kèm. Không tiếp tục liệt kê hai quyết định này là pending.

## Vòng 2: bốn hướng thiết kế

Subagent thiết kế tạo ít nhất bốn hướng có khác biệt rõ về bố cục, mật độ, bảng màu và phân cấp chữ, cùng bám nhiệm vụ tra cứu nội bộ và tham chiếu Google Cloud Console. So sánh trên cùng nội dung để người dùng chọn. Mỗi hướng cần có sáng/tối hoặc mô tả cách chuyển, ngăn chi tiết và bảng rộng.

Kết quả cần có: phương án người dùng chọn hoặc chỉnh, token thiết kế, bố cục responsive, trạng thái focus/chọn/lỗi/trống.

## Vòng 3: frontend trải nghiệm

Subagent frontend hiện thực các màn hình trong phạm vi đã chốt. Ưu tiên shell và điều hướng → bảng tài nguyên và sidebar → danh mục → kiến thức và cây tổ → Quản lý nhân sự chỉ admin → đăng nhập/đăng ký, admin tạo tài khoản và duyệt/liên kết hồ sơ theo mức demo đã thống nhất → luồng nhập tệp theo khả năng đã quyết định.

Mỗi tính năng phải ghi rõ hoạt động thật trong trình duyệt, lưu cục bộ hay mô phỏng. Công nghệ phase 1 đã chốt; phạm vi parser/import tổng quát và backend MVP còn cần xác định.

## Vòng 4: kiểm tra và preview

- Kiểm tra các luồng nghiệm thu PRD với dữ liệu đại diện.
- Kiểm tra bàn phím, nhãn nút biểu tượng, focus, tương phản sáng/tối, màn hình hẹp, bảng rộng và đóng/mở sidebar.
- Kiểm tra nhập tệp lỗi, dữ liệu thiếu, dữ liệu trùng và mất thay đổi theo phạm vi thực tế.
- Kiểm tra preview chưa ghi nghiệp vụ; Xác nhận nhập tạo event/snapshot và mốc, bảng gộp dòng theo hệ thống trong cặp đơn vị + cơ quan, kể cả nhập lại; timestamp upload giữ nguyên, tháng lọc theo upload, tách ngày ban hành/xác nhận.
- Đối chiếu test.xlsx: nhóm 952 và 4651 khác schema, header 4 tầng; row 6 giữ hai công văn và các giá trị đã xác thực. Không đánh đồng gộp dòng hiển thị với loại bỏ lịch sử nhập.
- Kiểm tra table fields chỉ ở bảng, drawer fields chỉ ở chi tiết; không tự sync hoặc tạo cột từ drawer; kiểm tra đúng hai vị trí Thêm cột và vị trí Thêm hàng theo yêu cầu.
- Kiểm tra cả admin/user có CRUD custom fields; schema cột chung nhưng giá trị theo dòng; trường sidebar không lan khỏi mốc đang chọn. Không mở rộng quyền CRUD nội dung khác khi chưa chốt.
- Kiểm tra nhóm bảng chọn bản xác nhận mới nhất, kể cả thứ tự upload và xác nhận khác nhau; giữ bản cũ trong timeline. Kiểm tra vị trí cột chung/nhóm và quyền CRUD Kiến thức/tệp của cả hai role.
- Kiểm tra cả admin/user CRUD tài nguyên/Danh mục/upload; user vẫn không quản lý nhân sự/cây. Lọc số 952 phải giữ dòng khớp và cả nhóm 4651/thông tin khác; cách match-row cho tháng chỉ là đề xuất chưa xác nhận.
- Cập nhật tài liệu theo sản phẩm đã có; đưa đường dẫn preview và hướng dẫn chạy xác thực được.

## Giai đoạn sau

Thống kê chỉ được đưa vào thiết kế khi đã bàn mục tiêu, nguồn dữ liệu, kỳ tính và chỉ số. Backend sản xuất, phân quyền thực thi, audit, sao lưu, vận hành và triển khai cần được đặc tả nếu người dùng chọn xây hệ thống thật; chưa coi là đã triển khai trong prototype.
