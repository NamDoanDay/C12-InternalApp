# Context

## Bối cảnh đã nêu

C12 / P4 - T1 Internal App là website nội bộ công ty, tập trung vào văn bản, tài nguyên và chuyên môn tổ. Người dùng muốn được phỏng vấn kỹ trước khi cụ thể hóa ý tưởng, có ít nhất bốn phong cách thiết kế, frontend để trải nghiệm và bộ tài liệu để preview.

Tham chiếu giao diện là Google Cloud Console: thanh đầu trang, sidebar trái có thể đóng/mở, vùng nội dung ưu tiên bảng dữ liệu, chế độ sáng/tối và ngăn chi tiết bên phải. Đây là tham chiếu cấu trúc và phong cách; chưa chốt phương án thiết kế cuối cùng.

**Quyết định cuối, thay thế yêu cầu append dòng trước đó:** cùng cặp Tên đơn vị + Cơ quan quản lý và cùng Hệ thống được gộp một dòng hiển thị. Ô Công văn chứa nhiều số; mỗi công văn có nhóm cột riêng, schema có thể khác nhau. Xác nhận nhập tạo event/snapshot timeline mới và giữ lịch sử, không tạo dòng hiển thị trùng hệ thống. Khi nhập lại cùng công văn, bảng hiển thị bản được xác nhận nhập mới nhất; các bản cũ vẫn xem qua timeline. Số liệu vẫn là tổng nhu cầu tại thời điểm công văn, không phải delta.

Workbook `test.xlsx` đã được root kiểm tra: Sheet1 A1:AG9, header 4 tầng; cột nền A:E; nhóm 952 F:M; nhóm 4651 N:AG. Chi tiết schema và ví dụ đối chiếu nằm trong SPEC.

## Thuật ngữ cần thống nhất

| Thuật ngữ | Hiểu biết hiện tại | Chưa chốt |
| --- | --- | --- |
| Đơn vị | Chủ thể xuất hiện ở nhóm dòng tài nguyên | Mã định danh, phân cấp, quan hệ với cơ quan quản lý |
| Cơ quan quản lý | Cột của bảng tài nguyên | Một hay nhiều cơ quan cho một đơn vị/hệ thống |
| Hệ thống | Một dòng hiển thị cho mỗi cặp đơn vị + cơ quan + hệ thống; chọn trong drawer để xem lịch sử | Khóa định danh và chuẩn hóa tên |
| Công văn | Số văn bản liên quan đến dòng | Có dùng chung bản ghi với danh mục văn bản/công văn không |
| Tài nguyên | Mỗi công văn là nhóm cột ngang ghi tổng nhu cầu tại thời điểm công văn, không phải delta | Quy tắc thiếu số liệu, thời điểm và sửa snapshot |
| Kiến thức tổ | Các thẻ văn bản pháp luật với tên và trích yếu | Có liên kết đến danh mục văn bản và tệp nguồn không |
| Cây tổ | Phân cấp lãnh đạo, chỉ huy và nhân sự | Phản ánh vị trí hay con người, có kiêm nhiệm/lịch sử không |

## Nhật ký quyết định

| Chủ đề | Trạng thái | Nội dung |
| --- | --- | --- |
| Tên website | Đã nêu | C12 / P4 - T1 Internal App |
| Điều hướng và ngăn chi tiết | Đã nêu | Sidebar trái; click bản ghi mở sidebar phải |
| Thống kê | Để sau theo yêu cầu | Chỉ giữ vị trí trong điều hướng; chưa thiết kế chỉ số |
| Stack giai đoạn 1 | Đã chốt | HTML + Tailwind + vanilla JavaScript, không React; thêm thư viện thiết kế nếu cần |
| Lưu trữ/preview giai đoạn 1 | Đã chốt | Prototype localStorage, preview local cổng 8002, không deploy |
| Backend/hosting MVP | Chưa chốt | Chưa chọn DB, identity provider, backend hoặc hạ tầng |
| Giai đoạn triển khai | Đã chốt | Bốn hướng thiết kế và prototype trước; MVP thật sau |
| Vai trò | Đã chốt | Chỉ admin và user; không có editor/viewer |
| Quản lý tài khoản | Đã chốt | Admin tạo tài khoản trực tiếp và duyệt đăng ký user |
| Quản lý nhân sự | Đã chốt | Trang riêng chỉ admin, gồm CRUD hồ sơ nhân sự |
| Hồ sơ và tài khoản | Đã chốt | Hai thực thể tách biệt, có liên kết; nhân sự có thể chưa có tài khoản |
| Duyệt đăng ký | Đã chốt một phần | Liên kết hồ sơ có sẵn hoặc tạo hồ sơ mới, tránh trùng; tiêu chí đối chiếu chưa chốt |
| Xóa tài khoản | Chưa chốt | Chưa xác định ảnh hưởng đến hồ sơ nhân sự và liên kết |
| Đơn vị dòng tài nguyên | Quyết định cuối thay append dòng | Một dòng hiển thị theo đơn vị + cơ quan + hệ thống; import thêm snapshot/event lịch sử, không thêm dòng trùng |
| Nhóm đơn vị | Đã chốt | Dòng đặt đúng nhóm Tên đơn vị; các nhóm sort alphabet |
| Nhóm cột công văn | Đã chốt | Ô Công văn chứa nhiều số; từng công văn có schema riêng, xác thực từ nhóm 952 và 4651 trong test.xlsx |
| Ý nghĩa số liệu công văn | Đã chốt | Tổng nhu cầu tại thời điểm đó; không phải mức tăng/giảm |
| Drawer tài nguyên | Đã chốt về phạm vi | Theo cặp Tên đơn vị + Cơ quan quản lý; header gồm hai tên; chọn Hệ thống → mốc timeline → snapshot/custom fields |
| Bố cục drawer | Đã chốt | Hệ thống trái, timeline giữa, chi tiết phải |
| Tạo mốc timeline | Đã chốt | Trích xuất → xem trước/sửa/bổ sung → Xác nhận nhập tạo event/snapshot và mốc mới, kể cả nhập lại; không nhân đôi dòng hiển thị |
| Version hiển thị bảng | Đã chốt | Mỗi nhóm công văn lấy bản được xác nhận nhập mới nhất; bản cũ vẫn trong timeline |
| Phạm vi timeline | Đã chốt | Chọn hệ thống trong cặp đơn vị + cơ quan để xem các lần cập nhật công văn |
| Thời gian mốc | Đã chốt | Timestamp upload ban đầu, hiển thị dd/MM/yyyy HH:mm:ss; timestamp xác nhận lưu riêng |
| Lọc tháng | Đã chốt | Theo timestamp upload, không theo ngày ban hành công văn |
| Ngày ban hành | Đã chốt | Trường chi tiết ở vùng phải, tách khỏi timestamp upload và xác nhận |
| Nơi hiển thị trường tùy biến | Đã chốt | Table fields quan trọng chỉ ở bảng; drawer fields bổ sung ít quan trọng hơn chỉ ở chi tiết; độc lập, không tự sync/chuyển thành cột |
| Vị trí thêm ở bảng | Đã chốt | Thêm cột trên cùng bên phải; Thêm cột và Thêm hàng dưới cùng bên trái |
| Quyền custom field | Đã chốt | Cả admin/user đều thêm, sửa, xóa cột bảng và trường sidebar |
| Schema cột bảng | Đã chốt | Dùng chung toàn bộ dòng và mọi user; giá trị riêng từng dòng; chỉ hiện ở bảng |
| Vị trí cột mới | Đã chốt | Khi thêm cột được chọn cột chung hoặc thuộc nhóm công văn cụ thể |
| Quyền kiến thức | Đã chốt | Cả admin/user thêm, sửa, xóa bài Kiến thức và tệp đính kèm |
| Quyền tài nguyên/danh mục/upload | Đã chốt | Cả admin/user CRUD dữ liệu tài nguyên, Danh mục văn bản và upload tệp |
| Lọc số công văn | Đã chốt | Chọn dòng có số trong Công văn đăng ký; giữ mọi nhóm công văn/thông tin trên dòng, không ẩn nhóm khác |
| Phạm vi hiển thị khi lọc tháng | Đề xuất cần xác nhận | Tháng theo uploadedAt đã chốt; cách match-row/giữ nhóm với tháng không suy thành đã chốt từ ví dụ lọc số |
| Scope trường sidebar | Đã chốt | Chỉ thuộc mốc timeline đang chọn; không lan sang mốc/hệ thống khác; chỉ hiện sidebar |
| Cây nhân sự | Đã chốt một phần | Chỉ admin được cập nhật; quyền khác chưa chốt |
| Import và trích xuất | Chưa chốt | Chưa quyết định parser, AI, OCR hoặc mức tự động hóa |

## Câu hỏi ưu tiên cho phỏng vấn

1. Các lần sửa thủ công sau khi đã nhập có tạo mốc ngoài mốc import không? Hủy preview hoặc upload lại có giữ dữ liệu nháp không, và thời hạn giữ nháp bao lâu?
2. Công văn, danh mục văn bản và kiến thức tổ có dùng chung kho văn bản không? Ngoài test.xlsx, những mẫu/schema nào cần hỗ trợ import?
3. Cả admin/user đã có quyền thêm/sửa/xóa custom fields; cột bảng dùng chung, trường sidebar theo mốc. Khi đổi kiểu dữ liệu hoặc xóa cột bảng có giá trị, cần xử lý dữ liệu cũ và xác nhận tác động thế nào?
4. Khi xóa tài khoản, hồ sơ nhân sự và liên kết xử lý thế nào? Khi xóa dữ liệu tài nguyên hoặc danh mục, các snapshot/tệp/liên kết bị ảnh hưởng thế nào? Quyền CRUD đã chốt cho cả admin/user, còn ngữ nghĩa xóa cần làm rõ.
5. Cây tổ quản lý vị trí hay hồ sơ người? Một người có thể giữ nhiều vị trí và có cần lưu lịch sử điều chuyển?
