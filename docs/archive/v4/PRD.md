# PRD

Trạng thái: bản nháp để phỏng vấn. Tiêu chí dưới đây là đề xuất nghiệm thu, chưa xác nhận giải pháp triển khai.

## Mục tiêu

Tạo một nơi truy cập nội bộ để tìm kiến thức tổ, xem sơ đồ nhân sự và quản lý thông tin văn bản/tài nguyên. Luồng chính cần giảm thao tác tra cứu bảng rộng và giúp người dùng xem, bổ sung thông tin ngay tại ngăn chi tiết.

## Người dùng

**Đã nêu:** có lãnh đạo quản lý/phụ trách, chỉ huy tổ, phó chỉ huy, cán bộ, tạm tuyển và hợp đồng trong sơ đồ tổ.

**Đã chốt:** chỉ có hai vai trò truy cập `admin` và `user`. Admin tạo tài khoản trực tiếp, duyệt đăng ký user; có trang Quản lý nhân sự riêng chỉ admin với CRUD. Chỉ admin được cập nhật cây nhân sự Chuyên môn tổ. Không có vai trò editor/viewer. Các chức danh trong sơ đồ không tự tạo thêm vai trò truy cập.

Hồ sơ nhân sự và tài khoản là hai thực thể tách biệt có liên kết. Hồ sơ có thể chưa có tài khoản. Khi duyệt đăng ký, admin có thể liên kết hồ sơ đã có hoặc tạo mới, tránh trùng.

**Chưa chốt:** quyền xem/thêm/sửa/xóa của admin và user tại các phân hệ còn lại, phạm vi dữ liệu, tiêu chí phát hiện trùng hồ sơ và ảnh hưởng của xóa tài khoản đến hồ sơ nhân sự.

**Đã chốt thêm:** cả admin/user CRUD dữ liệu tài nguyên, Danh mục văn bản và upload tệp. Cùng với custom fields và Kiến thức đã chốt, không còn coi các quyền này là pending; quản lý nhân sự/cây vẫn chỉ admin. Quy tắc xóa dữ liệu liên quan và quyền chưa được nêu khác vẫn cần làm rõ.

## Hai giai đoạn đã chốt

Giai đoạn đầu tạo bốn hướng thiết kế và prototype để trải nghiệm. Giai đoạn sau xây MVP thật. Prototype không được mô tả là đã có backend/xác thực thật khi chưa triển khai và kiểm chứng.

Giai đoạn đầu đã chốt HTML + Tailwind + vanilla JavaScript, không React; thêm thư viện thiết kế nếu cần. Prototype lưu localStorage, preview local, không deploy. Gallery bốn hướng và frontend trải nghiệm là hai đầu ra riêng. Seed chuyển cấu trúc/dữ liệu từ `reference/test.xlsx`; dữ liệu minh họa thêm cần phân biệt. Không tự khẳng định AI/OCR hay trích xuất tổng quát.

## Phạm vi đã nêu

- Đăng nhập, đăng ký; trang chính có giới thiệu và quick access.
- Header có nút đóng/mở sidebar trái, tên website, tìm kiếm, chuyển sáng/tối và tài khoản.
- Chuyên môn tổ gồm Kiến thức tổ và Cây sơ đồ tổ.
- Văn bản/Tài nguyên gồm Thống kê, Quản lý văn bản/tài nguyên và Danh mục văn bản/công văn.
- Quản lý văn bản/tài nguyên: lọc theo tháng, số văn bản, cấp quản lý bộ ngành/địa phương; xóa lọc; phóng to/thu nhỏ; thêm dòng, thêm cột; nhập Word/Excel; xem và bổ sung trường tại sidebar phải.
- Quyết định cuối thay thế append dòng: cùng đơn vị + cơ quan + hệ thống gộp một dòng; ô Công văn đăng ký chứa nhiều số. Xác nhận nhập tạo event/snapshot lịch sử mới, không thêm dòng hiển thị trùng hệ thống. Nhóm Tên đơn vị sort alphabet.
- Mỗi công văn có nhóm cột ngang/schema riêng; test.xlsx xác thực nhóm 952 khác nhóm 4651, header 4 tầng. Số liệu là tổng nhu cầu tại thời điểm công văn, không phải delta. Khi nhập lại cùng công văn, bảng hiển thị bản được xác nhận nhập mới nhất; phiên bản cũ còn trong timeline.
- Drawer tài nguyên theo cặp Tên đơn vị + Cơ quan quản lý; header gồm hai tên. Bố cục đã chốt: hệ thống trái, timeline giữa, chi tiết phải. Chọn hệ thống → mốc cập nhật công văn → snapshot/custom fields. Ngày ban hành công văn là trường chi tiết bên phải.
- Import đã chốt: trích xuất → xem trước/sửa/bổ sung → **Xác nhận nhập** mới tạo event/snapshot và mốc, kể cả nhập lại; bảng vẫn gộp một dòng theo hệ thống trong cặp đơn vị + cơ quan. Mốc giữ timestamp upload ban đầu dạng dd/MM/yyyy HH:mm:ss; thời điểm xác nhận lưu riêng. Lọc tháng theo upload.
- Trường tùy biến tách độc lập: table fields quan trọng chỉ hiện ở bảng; schema dùng chung toàn bộ dòng/mọi user, giá trị riêng từng dòng. Drawer fields bổ sung chỉ hiện trong chi tiết và chỉ thuộc mốc timeline đang chọn, không lan sang mốc/hệ thống khác. Không tự đồng bộ/chuyển thành cột. Cả admin/user đều được thêm/sửa/xóa cả hai nhóm; chưa suy ra quyền CRUD nội dung khác.
- Vị trí nút bảng: **Thêm cột** ở trên cùng bên phải; cả **Thêm cột** và **Thêm hàng** ở dưới cùng bên trái.
- Khi Thêm cột, chọn cột chung hoặc thuộc nhóm công văn cụ thể. Cả admin/user được thêm/sửa/xóa bài Kiến thức và tệp đính kèm.
- Nhập Word: điền Tên đơn vị, Cơ quan quản lý, Hệ thống, Công văn; chọn tệp; trích xuất, preview và xác nhận để thêm lịch sử đúng hệ thống/nhóm.
- Danh mục: STT, Số, Ngày, Trích yếu; tìm kiếm theo các trường này; thêm mới; xem chi tiết tại sidebar phải.

## Ngoài vòng thiết kế hiện tại

Thống kê được người dùng chỉ định bàn sau. Chưa có yêu cầu về chỉ số, biểu đồ hoặc báo cáo. Mọi xác thực, đồng bộ dữ liệu và xử lý tài liệu thật phải được thống nhất riêng; bản preview không được mô tả các mô phỏng là tính năng đã vận hành.

## Tiêu chí nghiệm thu nháp

| Mã | Tình huống | Kết quả mong đợi |
| --- | --- | --- |
| AC-01 | Bấm nút menu ở header | Sidebar trái đóng/mở; vùng nội dung vẫn sử dụng được |
| AC-02 | Mở một mục điều hướng có mục con | Hiển thị đúng các mục con và trạng thái trang đang chọn |
| AC-03 | Chuyển chế độ sáng/tối | Chữ, bảng, trạng thái chọn và nút vẫn dễ đọc; không mất nội dung đang thao tác |
| AC-04 | Chọn bộ lọc tài nguyên rồi xóa lọc | Bảng phản ánh bộ lọc; xóa lọc đưa về tập dữ liệu ban đầu |
| AC-05 | Click một dòng tài nguyên | Sidebar phải mở đúng cặp Tên đơn vị + Cơ quan quản lý của dòng; header hiển thị hai tên và danh sách hệ thống trong cặp |
| AC-06 | Thêm hệ thống chưa có trong cặp đơn vị + cơ quan | Xuất hiện dòng mới đúng nhóm; thông tin bắt buộc thiếu được chỉ rõ; hành vi Thêm hàng với hệ thống đã có cần chốt |
| AC-07 | Admin hoặc user thêm/sửa custom field | Cả hai role có thao tác; hai nơi hiển thị độc lập, tuân thủ scope; chính sách đổi kiểu/xử lý dữ liệu cũ cần chốt |
| AC-08 | Mở luồng tải Word | Có các trường metadata đã yêu cầu và bộ chọn tệp; trạng thái xử lý/ lỗi được thể hiện |
| AC-09 | Trích xuất tệp | Cho preview/sửa/bổ sung trước xác nhận; không tự ghi dữ liệu nghiệp vụ khi lỗi hoặc chưa xác nhận |
| AC-10 | Tìm số, ngày hoặc trích yếu trong danh mục | Chỉ hiển thị bản ghi phù hợp; có trạng thái không tìm thấy |
| AC-11 | Click thẻ kiến thức hoặc nhân sự | Xem được nội dung tương ứng; chi tiết nhân sự mở phía phải |
| AC-12 | Phóng to bảng rồi thu nhỏ | Quay lại bố cục trước; bộ lọc và dòng đang chọn được giữ |
| AC-13 | User mở sơ đồ tổ | Không có quyền cập nhật cây; admin có thao tác cập nhật. MVP phải thực thi quyền ở phía máy chủ |
| AC-14 | Mở Quản lý nhân sự | Chỉ admin truy cập và thực hiện tạo, xem, sửa, xóa hồ sơ; user không được phép |
| AC-15 | Admin duyệt đăng ký | Có lựa chọn liên kết hồ sơ sẵn có hoặc tạo mới; không tự tạo hồ sơ trùng khi đã chọn liên kết |
| AC-16 | Hồ sơ chưa có tài khoản | Vẫn tồn tại và được quản lý độc lập; không bắt buộc tạo tài khoản để tạo hồ sơ |
| AC-17 | Xác nhận nhập công văn cho hệ thống đã có, kể cả trùng công văn cũ | Tạo event/snapshot và mốc mới, giữ lịch sử; không thêm dòng hiển thị trùng hệ thống trong cùng cặp đơn vị + cơ quan |
| AC-18 | Hiển thị số liệu của công văn | Hiển thị tổng nhu cầu ở thời điểm đó; không cộng dồn các công văn để suy ra tổng |
| AC-19 | Chọn mốc trong drawer tài nguyên | Mốc được làm nổi bật ở giữa, vùng chi tiết phải hiển thị snapshot tương ứng; danh sách hệ thống nằm trái |
| AC-20 | Nhập dữ liệu của hệ thống | Bảng gộp theo đơn vị + cơ quan + hệ thống; đặt đúng nhóm Tên đơn vị, nhóm sort alphabet |
| AC-21 | Chọn hệ thống trong drawer | Timeline chuyển sang các lần cập nhật công văn của hệ thống thuộc đúng cặp đơn vị + cơ quan đang mở |
| AC-22 | Chọn mốc timeline của hệ thống | Vùng chi tiết hiển thị snapshot và custom fields tương ứng; không lẫn dữ liệu hệ thống/cặp khác |
| AC-23 | Upload, trích xuất và sửa preview nhưng chưa Xác nhận nhập | Chưa tạo row/timeline nghiệp vụ; cho sửa và bổ sung dữ liệu trước khi xác nhận |
| AC-24 | Upload rồi xác nhận ở thời điểm khác | Mốc hiển thị timestamp upload ban đầu đủ dd/MM/yyyy HH:mm:ss; thời điểm xác nhận lưu riêng |
| AC-25 | Lọc tháng khi ngày upload khác tháng ngày ban hành | Kết quả dựa trên tháng upload; ngày ban hành vẫn là trường chi tiết riêng |
| AC-26 | Thêm table field | Trường chỉ xuất hiện ở bảng; không tự xuất hiện trong drawer |
| AC-27 | Thêm drawer field | Trường chỉ xuất hiện trong chi tiết; không tự tạo cột bảng hoặc đồng bộ với table field |
| AC-28 | Quan sát thao tác thêm của bảng | Có Thêm cột trên cùng bên phải; có cả Thêm cột và Thêm hàng dưới cùng bên trái |
| AC-29 | Admin/user thêm hoặc đổi schema cột bảng | Schema áp dụng toàn bộ dòng và mọi user; giá trị vẫn riêng từng dòng |
| AC-30 | Admin/user thêm/sửa/xóa trường sidebar ở mốc A | Chỉ tác động mốc A; mốc và hệ thống khác không nhận trường/giá trị đó |
| AC-31 | Kiểm tra quyền custom fields | Cả admin và user có thêm/sửa/xóa cột bảng, trường sidebar; không từ đó cấp thêm quyền các phân hệ chưa chốt |
| AC-32 | Hệ thống có công văn 952 và 4651 | Một dòng, ô Công văn có cả hai số, hai nhóm ngang có schema riêng; không ép cùng tập cột |
| AC-33 | Đối chiếu dữ liệu mẫu row 6 test.xlsx | Cà Mau/VP UBND tỉnh/Hệ thống quản lý văn bản và điều hành; 952: vCPU 900/RAM 1600; 4651: vCPU 576/RAM 1536/Block SSD 24 |
| AC-34 | Nhập lại cùng công văn cho cùng hệ thống | Nhóm bảng chuyển sang bản xác nhận nhập mới nhất; bản cũ vẫn mở qua timeline; không thêm dòng trùng |
| AC-35 | Upload A trước B nhưng xác nhận A sau B | Nhóm công văn lấy A vì xác nhận mới nhất; mốc A vẫn dùng uploadedAt ban đầu, không đổi thành confirmedAt |
| AC-36 | Thêm cột | Cho chọn cột chung hoặc thuộc nhóm công văn cụ thể và render đúng vị trí |
| AC-37 | Admin hoặc user quản lý Kiến thức | Cả hai role đều thêm/sửa/xóa bài và tệp đính kèm trong phạm vi demo/MVP tương ứng |
| AC-38 | Admin/user quản lý tài nguyên, Danh mục và upload | Cả hai role đều có CRUD dữ liệu tài nguyên, Danh mục văn bản và upload tệp; user không có CRUD nhân sự/cây |
| AC-39 | Lọc số công văn 952 | Dòng đăng ký 952 + 4651 được giữ với toàn bộ thông tin/cả nhóm 4651; dòng chỉ đăng ký 4267 bị loại. Chỉ dòng có 952 được giữ, không ẩn các nhóm khác trên dòng khớp |

## Điều kiện hoàn thiện PRD

Chốt quyền nội dung còn mở; quan hệ kho văn bản; quy tắc chỉnh sửa snapshot sau nhập; mapping ngoài mẫu và chi tiết nhập còn lại; đổi kiểu/xóa dữ liệu tùy biến và sửa đồng thời; stack/cách preview. Quyền/scope custom fields không mở rộng sang toàn bộ CRUD nội dung. Drawer theo cặp đơn vị + cơ quan, hệ thống trái/timeline giữa/chi tiết phải. Xác nhận nhập tạo event/snapshot và mốc, giữ cả lần nhập lại; bảng gộp một dòng theo hệ thống trong cặp, timestamp upload dùng cho mốc/lọc tháng. Chưa đặt KPI định lượng vì chưa có dữ liệu nền hoặc mục tiêu thời gian nghiệp vụ.
