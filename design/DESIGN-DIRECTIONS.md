C12 / P4 - T1 Internal App — Định hướng giao diện
Trạng thái: Đã có gallery chạy tại design/index.html, gồm 4 hướng giao diện, hỗ trợ Light/Dark và Responsive.

Stack: HTML + Tailwind CSS + JavaScript. Gallery dùng HTML/CSS/JS thuần, không cần build hoặc CDN. Không giả định backend đã có sẵn.

1.Quyết định sản phẩm
Bảng dữ liệu tài nguyên

- Gộp một dòng theo khóa Tên đơn vị + Cơ quan quản lý + Hệ thống.
- Sắp xếp theo tên đơn vị alphabet.
- Một hệ thống có thể liên kết nhiều công văn.
- Mỗi công văn có nhóm cột và schema riêng.
- Bảng hiển thị dữ liệu mới nhất của từng công văn; phiên bản cũ lưu trong timeline.
- Mỗi công văn thể hiện tổng nhu cầu tài nguyên tại thời điểm lập, không phải phần tăng thêm.
- Không cộng các nhóm công văn để tính tổng hiện tại.
- Hướng B được lọc công văn nhưng phải có đường trở lại bảng đầy đủ.
  Drawer chi tiết hệ thống
  Click một dòng mở drawer ba cột:

Bên trái: Danh sách hệ thống. 2. Ở giữa: Timeline lịch sử tải lên. 3. Bên phải: Thông tin chi tiết dạng nhãn – giá trị.
Yêu cầu:

- Header hiển thị tên đơn vị và cơ quan quản lý.
- Hệ thống và mốc timeline đang chọn phải nổi bật.
- Timeline sử dụng ngày giờ upload, không phải ngày ban hành công văn.
- Mỗi lần upload tạo một mốc lịch sử riêng.
- Có nút “Thêm trường thông tin mới”.
- Hiển thị snapshot dữ liệu đúng với mốc được chọn.
- Drawer hẹp chuyển ba cột thành bố cục dọc.
- Hỗ trợ focus, accessible state và giá trị dài xuống dòng.

2. Vai trò và quản lý dữ liệu
   Chỉ có hai vai trò:
   Chức năng Admin User
   Thêm/quản lý user Có Không
   Duyệt đăng ký Có Không
   Chỉnh sửa cây tổ Có Không
   CRUD kiến thức tổ Có Có
   CRUD dữ liệu tài nguyên Có Có
   CRUD danh mục Có Có
   Upload dữ liệu Có Có

Các nguyên tắc:

- Hồ sơ nhân sự độc lập với tài khoản đăng nhập.
- Một nhân sự không bắt buộc phải có tài khoản.
- Xóa tài khoản không đồng nghĩa xóa hồ sơ nhân sự.
- Chưa xác định quyền chỉnh sửa dữ liệu tài nguyên và quản lý trường động theo vai trò.

3. Quy tắc dữ liệu và bộ lọc

- Timeline lưu lịch sử theo từng lần upload.
- Thêm cột cho phép chọn vị trí: cột chung hoặc bên trong nhóm công văn.
- Lọc số công văn chỉ giữ những dòng có đăng ký đúng số công văn được chọn.
- Giữ toàn bộ nhóm cột công văn của các dòng phù hợp.
- Không giữ dòng không đăng ký công văn đang lọc.
- Cấu trúc nhóm tài nguyên phải tôn trọng workbook, bao gồm nhóm 4651 (N:AG) và GPU.

4. Cấu trúc giao diện
   Navigation

- Trang chính
- Văn bản / Tài nguyên
  - Thống kê
  - Quản lý văn bản, tài nguyên
  - Danh mục văn bản / công văn
- Chuyên môn tổ
  - Kiến thức tổ
  - Sơ đồ tổ
    Header
- Đóng/mở navigation.
- Tên ứng dụng: C12 / P4 - T1 Internal App.
- Tìm kiếm toàn cục.
- Chuyển Light/Dark.
- Tài khoản.
  Lưu ý: Tìm kiếm toàn cục phải tách biệt với bộ lọc bảng.
  Màn hình quản lý tài nguyên
  Toolbar:
- Thêm dòng
- Thêm cột
- Tải lên
- Toàn màn hình
  Bộ lọc:
- Tháng
- Số văn bản
- Cấp quản lý
- Xóa bộ lọc
  Các cột mặc định:
  Nhóm Trường
  Định danh STT, Tên đơn vị, Cơ quan quản lý, Hệ thống
  Công văn Công văn
  Tài nguyên vCPU, RAM (GB)
  Disk Block, File Storage, Object
  Phần mềm License
  Mở rộng Các cột động

Dữ liệu demo phải ghi rõ là dữ liệu minh họa. 5. Cơ sở thiết kế UI/UX
Phong cách lựa chọn: Minimalism & Swiss Style, kết hợp Flat Design.

- Giao diện enterprise data console.
- Palette xanh theo hướng enterprise.
- Layout dạng grid, phân cấp thông tin rõ.
- Bảng dữ liệu ít trang trí, ưu tiên mật độ thông tin.
- Navigation trái, workspace trung tâm, drawer chi tiết bên phải.
  Không áp dụng:
- Landing page Hero + Features + CTA.
- Typography thư viện cổ điển.
- Phong cách màu sắc giáo dục.
- Nền đỏ hoặc gộp ô theo cách trình bày Excel.
  Responsive: Sử dụng các nguyên tắc UX phổ biến như focus management, native dialog, cuộn bảng cục bộ, label rõ ràng và reduced motion. Chưa có kết quả xác minh recommendation riêng cho responsive table/dialog từ database UI/UX Pro Max.

6. Phạm vi gallery
   Bốn hướng giao diện đều phải:

- Có Light/Dark.
- Hỗ trợ Responsive.
- Áp dụng cùng quy tắc bảng gộp theo ba khóa.
- Có drawer ba cột theo bố cục đã xác nhận.
- Sử dụng dữ liệu minh họa.
- Không thay thế schema workbook bằng bảng rút gọn.
  Lưu ý: Gallery là bản thử nghiệm giao diện, không đồng nghĩa các chức năng backend như đăng nhập, phân quyền, trích xuất văn bản hoặc lưu dữ liệu đã được triển khai.
  A. Cloud Console — Console quản trị
  Đề xuất ưu tiên
- Phong cách gần Google Cloud Console.
- Sidebar trái, workspace trung tâm, drawer chi tiết bên phải.
- Bảng dữ liệu ít trang trí, rõ ràng, mật độ cao.
- Phù hợp chuyển đổi từ Excel sang hệ thống quản trị.
  Đặc trưng: Giao diện quen thuộc, dễ sử dụng cho nghiệp vụ quản lý hạ tầng.
  B. Hồ sơ điều hành — Quản lý theo công văn
- Navigation tối màu, danh sách công văn bên trái.
- Bảng tài nguyên bên phải theo công văn được chọn.
- Hiển thị ngày, trích yếu và file gốc của công văn.
- Có chế độ quay lại bảng dữ liệu đầy đủ.
  Đặc trưng: Phù hợp quy trình tra cứu và đối chiếu tài nguyên theo công văn.
  C. Bàn làm việc dữ liệu — Tối ưu bảng
- Tối đa hóa không gian bảng dữ liệu.
- Command bar đặt ngay phía trên bảng.
- Hỗ trợ thêm dòng, thêm cột, upload và tùy chỉnh cột hiển thị.
- Có thanh trạng thái số dòng và bộ lọc.
- Drawer chi tiết có thể ghim trên desktop.
  Đặc trưng: Phù hợp người thường xuyên nhập liệu, lọc và xử lý dữ liệu.
  D. Không gian tổ — Ưu tiên chuyên môn
- Trang chính giới thiệu nhiệm vụ và các tác vụ thường dùng.
- Quick access tới tài nguyên, công văn, kiến thức và sơ đồ tổ.
- Có danh sách nội dung mới cập nhật.
- Sơ đồ tổ thể hiện cây nhân sự và chức vụ.
  Đặc trưng: Phù hợp làm cổng làm việc chung cho toàn tổ.

2. Hệ thống thiết kế
   Phương án Font Màu nhấn Phong cách
   A Roboto Xanh dương Cloud Console
   B Source Sans 3 Xanh lá Hồ sơ điều hành
   C IBM Plex Sans Tím Data Workspace
   D Be Vietnam Pro Xanh cyan Không gian tổ

Cả bốn phương án hỗ trợ Light/Dark và Responsive. 3. Quy tắc tương tác chung

- Click dòng mở drawer chi tiết.
- Checkbox và thao tác trong dòng không kích hoạt drawer.
- Drawer hỗ trợ đóng bằng Esc và trả focus về vị trí ban đầu.
- Bảng có cuộn ngang cục bộ, header và cột định danh có thể sticky.
- Nhóm công văn hiển thị theo cấu trúc cột nhiều tầng.
- Trường động có tên, kiểu dữ liệu và phạm vi áp dụng.
- Upload theo quy trình: chọn file → đọc file → xem trước/mapping → xác nhận → kết quả.
- Kiểm tra dữ liệu số, phân biệt giá trị 0 và dữ liệu thiếu.
- Hỗ trợ accessibility, keyboard navigation và reduced motion.

4. Các vấn đề cần xác nhận
   Nhóm người dùng chính và ba tác vụ thường xuyên nhất.
   Bốn hướng cùng preview trên màn quản lý tài nguyên hay mỗi hướng có cả trang chính.
   Thứ tự sắp xếp và nhóm công văn mặc định hiển thị.
   Bộ lọc tháng theo ngày công văn hay kỳ báo cáo.
   Quyền xem/sửa tài nguyên, công văn, kiến thức và trường động.
   Upload chỉ demo hay cần đọc DOCX/XLSX thực tế.
   Cách xử lý dữ liệu trùng khi nhập Excel.
   Thiết bị chính và quy mô dữ liệu dự kiến.
   Thông tin hiển thị trong hồ sơ nhân sự.
   Phạm vi tìm kiếm toàn cục.
   Rủi ro cần lưu ý
   Rủi ro Hướng xử lý
   Cộng các công văn gây trùng tài nguyên Giữ snapshot riêng, không cộng ngang
   Nhầm ngày công văn và ngày upload Tách thành hai metadata
   Đồng nhất tài khoản và nhân sự Quản lý thành hai thực thể
   Quá nhiều cột động Quản lý schema và preset hiển thị
   Merge cell gây lỗi lọc/sắp xếp Không merge body
   Trích xuất sai dữ liệu Bắt buộc xem trước và xác nhận
   Demo bị hiểu là backend thật Ghi rõ trạng thái minh họa
   Xóa bộ lọc bị hiểu là xóa dữ liệu Dùng nhãn rõ ràng
   Hai sidebar làm hẹp workspace Responsive drawer và fullscreen

Kết luận
Bốn hướng có cùng phạm vi nghiệp vụ, nhưng khác nhau về trọng tâm:

- A: Quản trị hệ thống.
- B: Quản lý công văn.
- C: Xử lý dữ liệu.
- D: Không gian làm việc chung.
  Gallery HTML đã có theme switch, Light/Dark, filter, fullscreen và drawer ba cột. Chưa có quyết định cuối cùng về phương án được chọn.

Lưu ý: Tất cả phương án phải giữ nguyên quyết định sản phẩm đã chốt: một hệ thống một dòng theo khóa Tên đơn vị + Cơ quan quản lý + Hệ thống; công văn là các nhóm cột ngang và thể hiện tổng nhu cầu tại thời điểm công văn.
