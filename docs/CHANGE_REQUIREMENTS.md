# Thay đổi yêu cầu ngày 16/11/2026

Đây là nguồn quyết định thay thế bản prototype v4 ngày 15/11. Yêu cầu đã chốt khác với đề xuất triển khai; bảng câu hỏi mở ở OPEN_QUESTIONS.md không được tự chuyển thành quyết định người dùng. Bản v4 và kết quả QA cũ được giữ ở archive/v4/ để truy vết.

## Quyết định đã chốt

1. Giữ một phong cách Cloud Console; bỏ bộ chọn bốn phong cách. Header thêm icon theme: bảng màu, gradient, ảnh nền URL và ảnh tải từ máy. Sáng/tối vẫn có.
2. Navigation đổi Văn bản/Tài nguyên thành **For you (Công việc của bạn)**; có Quản lý công việc, Thống kê, Quản lý tài nguyên và Danh mục Công văn / Văn bản. Chuyên môn tổ giữ Kiến thức và Cây sơ đồ. Quản lý nhân sự chỉ admin.
3. Hai danh mục Công văn và Văn bản riêng, đều CRUD. Trong phiếu task chọn mục đã có hoặc tạo mục mới. Bấm lưu mục mới trong phiếu task bổ sung ngay vào danh mục tương ứng, không chờ lưu task. Task theo công văn phải có ít nhất một công văn đầy đủ số, ngày phát hành, trích yếu. Tệp vật lý không bắt buộc; Văn bản có thể bổ sung/chỉnh sửa/đính kèm sau.
4. Hai loại task: theo công văn và thường. Title, start date và due date bắt buộc ở cả hai loại; ngày có giờ/phút, hạn không trước ngày bắt đầu. Task công văn chọn Đơn vị, Cơ quan quản lý và Nhóm quản lý task. Hệ thống nằm trên từng dòng phụ lục tài nguyên, không còn là một trường chung của task.
5. Admin có thể giao nhiều người ở nhiều nhóm. Chọn nhóm chỉ lọc người, không tự giao cho nhóm. Có thể bỏ qua bộ lọc nhóm để chọn người. User chỉ tạo và tự giao task cho chính mình.
6. Một trạng thái chung cho task: Đang xử lý, Đang lấy số, Đang trình ký, Đã hoàn thành; bất kỳ người được giao nào được cập nhật trạng thái chung. Không có tiến độ riêng từng người.
7. Tổng hợp: hoàn thành luôn là Đã hoàn thành; chưa hoàn thành và quá due date là Chậm muộn; còn lại là Đang xử lý, kể cả start date trong tương lai (nhãn phụ Chưa đến ngày bắt đầu). Số ngày muộn = ceil(thời gian quá hạn / 24 giờ); quá hạn 1 phút là 1 ngày.
8. Nhóm quản lý dùng cấp mã cho task công văn, độc lập nhóm lọc assignee. Sáu nhóm: Hạ tầng HT, Mạng/Hạ tầng mạng HTM, Điện nước DN, Máy chủ MC, HPC-AI đề án HPCAI, Quản lý văn bản QLVB. Mã Task-HT-01...; task thường Task-DAILY-01. Số tăng riêng mỗi tiền tố; ít nhất hai chữ số là đề xuất trình bày, không giới hạn 99 task. Task có ID nội bộ bất biến.
9. Mỗi thành viên thuộc một nhóm tại một thời điểm. Graph: Lãnh đạo phòng → Tổ trưởng → Tổ phó phụ trách nhóm → Thành viên/cán bộ tạm tuyển/nhân viên hợp đồng. Admin CRUD nhóm, thành viên, kéo thả chuyển nhóm; có thao tác thay thế bằng chọn nhóm để dùng bàn phím.
10. Chuyển người duy nhất được giao task công văn sang nhóm mới: người vẫn giữ task, Nhóm quản lý và mã task đổi theo nhóm mới. Task nhiều người nhận giữ mã; nhóm tham gia theo các người nhận hiện tại nên nhóm mới được xem. Task thường vẫn DAILY. Lịch sử lưu người chuyển, nhóm cũ/mới, thời điểm, mã cũ/mới. Nhóm quản lý của task nhiều người giữ nguyên là đề xuất kỹ thuật, xem câu hỏi mở.
11. User xem task nếu nhóm mình là nhóm quản lý hoặc là nhóm của bất kỳ người nhận; người được giao/người tạo luôn xem task mình. Admin xem toàn bộ. Chỉ quyền xem nhóm không cấp quyền sửa. Ma trận chi tiết ở PERMISSIONS.md.
12. Admin sửa mọi task và mọi ô tài nguyên. User được giao sửa trạng thái, bình luận, tài liệu, tài nguyên, trường tùy chỉnh; không tự sửa người nhận/lịch/title/description task người khác tạo. User có quyền sửa task mình tạo và chỉ tự giao. Chỉ admin hoặc người tạo task được đổi due date; ghi lịch sử hạn cũ/mới và tính lại tổng hợp.
13. Task công văn có hai bảng Công văn ở trên và Văn bản ở dưới, thêm phụ lục Tài nguyên cho thêm dòng/cột và tệp theo dòng. Cột phải có trường tùy chỉnh cho task. Click task từ danh sách mở sidebar chi tiết.
14. Dữ liệu tài nguyên gộp theo đơn vị + cơ quan + hệ thống. Thêm cột Văn bản ngay sau Công văn đăng ký. Lọc số công văn/văn bản từ danh mục, nhóm và Được giao cho tôi; số 952 chỉ giữ dòng đăng ký 952, vẫn hiện mọi công văn khác của dòng đó.
15. Sửa ô tài nguyên cập nhật task nguồn của giá trị hiện tại, tạo revision người sửa/giá trị cũ/mới/thời điểm. Admin mọi ô; user chỉ ô có task nguồn giao cho mình. Nhiều task cùng cung cấp ô lấy lần lưu mới nhất; lịch sử vẫn giữ.
16. Sidebar tài nguyên: Hệ thống → Phân loại công văn → Lịch sử cập nhật task → Chi tiết. Công văn lấy từ liên kết task, không yêu cầu có tệp. Mốc chỉ thuộc task/revision đã liên kết công văn đó tại thời điểm thay đổi. Chọn task mặc định bản mới nhất; chọn revision cũ xem bản chụp chỉ đọc. Nhật ký trạng thái/bình luận/chỉnh sửa ở chi tiết task. Phần thông tin công văn phía trên giữ nguyên khi chuyển task trong cùng công văn; chỉ Thông tin bổ sung phía dưới đổi theo task/revision.
17. Thông tin công văn cố định giữ trường: thời điểm upload, xác nhận nhập, ngày phát hành, tệp nguồn, ghi chú. Chưa upload thì không bịa timestamp/tệp; metadata ngày phát hành bắt buộc. Tạo thủ công không đồng nghĩa đã nhập tệp.
18. Thông báo task mới gửi admin + mọi người nhận + người thao tác, loại trùng người. Thêm người nhận gửi người mới ngay; nhóm chỉ xem không nhận giao việc. All/Unread, đánh dấu đọc, click mở task; user đang online phải thấy thay đổi. Realtime prototype trong tab cùng origin khác với backend đa thiết bị.
19. Chỉ upload tài nguyên trong phiếu task; bỏ upload trực tiếp ở Quản lý tài nguyên. Các khả năng parser và giới hạn DOCX/XLSX cũ không tự mở rộng.

## Nội dung cũ bị thay thế

**Chốt sau cùng về phụ lục:** Đơn vị và Cơ quan là metadata chung task; **Hệ thống nằm ở từng dòng phụ lục**. Mỗi dòng phụ lục sinh một dòng Hệ thống riêng trong Dữ liệu tài nguyên; các đóng góp cùng Đơn vị + Cơ quan + Hệ thống từ nhiều task được gộp. Không cộng tổng các dòng. Quy tắc này thay yêu cầu chọn một Hệ thống ở header task.

- Bốn hướng thiết kế là lịch sử, không là UI đang phát triển.
- Cả user CRUD toàn bộ tài nguyên được thay bằng quyền ô theo task nguồn.
- Timeline chỉ theo import được thay bằng lịch sử task có revision.
- Upload trực tiếp màn tài nguyên bị bỏ; nhập tệp đi qua task.
- Một kho Danh mục công văn được tách thành hai danh mục riêng.

Các AC trong PRD/SPEC là mục tiêu nghiệm thu bản mới, chưa phải kết quả kiểm thử.



## Điều chỉnh giao diện ngày 17/11/2026

Quyết định mới nhất thay thế cách trình bày graph theo nhóm: Cây sơ đồ hiển thị theo cấp chức vụ Lãnh đạo quản lý/phụ trách → Chỉ huy tổ → Phó chỉ huy → Cán bộ/Tạm tuyển/Hợp đồng. Không hiển thị các nhóm chuyên môn thành nhánh cây. Dữ liệu nhóm, thành viên và quy tắc phân công/hiển thị task vẫn giữ nguyên. Dữ liệu hiện có chỉ xác định cấp chức vụ, không suy đoán quan hệ cấp trên trực tiếp giữa từng cá nhân.

Các sửa giao diện đi kèm: khôi phục lưới card Kiến thức tổ; tab nhân sự có viền và trạng thái đang chọn rõ; tô nổi cả dòng khi hover; trình bày lại hồ sơ chi tiết và thẻ duyệt đăng ký; hai danh mục Công văn/Văn bản chia đôi desktop và xếp dọc trên màn nhỏ, tìm kiếm có icon; navigation dùng nhãn For you (Công việc); icon truy cập nhanh căn giữa hộp.
