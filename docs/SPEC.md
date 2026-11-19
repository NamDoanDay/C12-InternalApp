# Đặc tả chức năng — bản thay đổi 16/11/2026

Nguồn quyết định: CHANGE_REQUIREMENTS.md. Ma trận quyền: PERMISSIONS.md. Các lựa chọn ghi **Đề xuất** là giải pháp triển khai, không phải câu trả lời của người dùng.

## 1. Điều hướng và giao diện

Header gồm menu trái, tên C12 / P4 - T1 Internal App, tìm kiếm, sáng/tối, icon theme, thông báo và tài khoản.
For you (Công việc của bạn) gồm Quản lý công việc, Thống kê, Quản lý tài nguyên, Danh mục Công văn / Văn bản. Chuyên môn tổ gồm Kiến thức tổ và Cây sơ đồ. Admin có Quản lý nhân sự.

Dùng một phong cách Cloud Console, bỏ selector bốn phong cách. Theme cá nhân gồm bảng màu, gradient, ảnh URL và ảnh tải từ máy; tách khỏi chế độ sáng/tối. Nền ảnh không làm giảm độ đọc của bảng và form.

Trang task admin có bộ lọc công văn, văn bản, nhóm, nút thêm và ba thẻ tổng hợp. Trang user có Nhiệm vụ cá nhân và Được giao cho tôi như ảnh. **Đề xuất:** thêm tab Nhóm của tôi để truy cập task nhóm được phép xem mà không trộn với việc được giao.

Hai danh mục hiển thị hai bảng riêng cạnh nhau trên desktop, xếp dọc trên màn nhỏ. Mỗi bảng có tìm kiếm và CRUD độc lập.

## 2. Task và phiếu tạo

Task có ID nội bộ bất biến, mã hiển thị có thể thay đổi và loại OFFICIAL (theo công văn) hoặc DAILY (thường).
Các trường chung: tiêu đề, mô tả, người nhận, ngày bắt đầu, hạn hoàn thành, trạng thái, liên kết công văn/văn bản, phụ lục tài nguyên và trường tùy chỉnh.

Cả hai loại yêu cầu tiêu đề sau khi loại khoảng trắng thừa, ngày bắt đầu và hạn có giờ/phút. Hạn không trước ngày bắt đầu. Task OFFICIAL thêm Nhóm quản lý, Đơn vị và Cơ quan quản lý; phải liên kết ít nhất một công văn đủ số, ngày phát hành, trích yếu. **Hệ thống được chọn trên từng dòng phụ lục, không ở header task.**

Chọn một hoặc nhiều nhóm chỉ lọc danh sách người. Admin chọn cụ thể nhiều người thuộc các nhóm khác nhau; có thể bỏ lọc nhóm. User chỉ tự giao. **Đề xuất:** yêu cầu ít nhất một người nhận; task DAILY không tự sinh dòng tài nguyên.

Bố cục phiếu theo ảnh: title, description và bảng tài liệu/phụ lục bên trái; trạng thái, người nhận, nhóm, lịch và trường tùy chỉnh bên phải. Bảng Công văn ở trên, Văn bản ở dưới. Tệp vật lý không bắt buộc; Văn bản có thể bổ sung sau.

Chọn mục có sẵn trong hai danh mục hoặc tạo mới ngay trong phiếu. Save mục mới ghi ngay vào danh mục tương ứng; hủy task không tự xóa mục danh mục đã lưu. Công văn mới bắt buộc số/ngày/trích yếu. **Đề xuất:** Văn bản mới cũng dùng ba trường này để dữ liệu danh mục có ý nghĩa.

Upload DOCX/XLSX chỉ trong phiếu task: đọc tệp → preview → sửa/bổ sung → xác nhận áp dụng. Không có upload trực tiếp tại Quản lý tài nguyên. Hủy preview không ghi giá trị task; uploadedAt khác confirmedAt.

Phụ lục Tài nguyên cho thêm/sửa/xóa dòng và cột. Mỗi dòng có ID, tên tài nguyên/Hệ thống, đơn vị đăng ký, tệp và giá trị bổ sung. Đã chốt: **mỗi dòng phụ lục tạo một dòng Hệ thống trong bảng chính**; cùng Đơn vị + Cơ quan + Hệ thống được gộp giữa các task. Không cộng các dòng hoặc dùng bộ tổng riêng.

## 3. Trạng thái và thời gian

Workflow chỉ có PROCESSING, GETTING_NUMBER, SIGNING, COMPLETED, tương ứng Đang xử lý, Đang lấy số, Đang trình ký, Đã hoàn thành. Mọi người được giao cập nhật cùng một trạng thái task.

Ba trạng thái tổng hợp:

- COMPLETED nếu workflow hoàn thành.
- LATE nếu chưa hoàn thành và now > dueAt.
- PROCESSING trong các trường hợp còn lại.

Chậm muộn không phải workflow riêng. Task chưa đến startAt vẫn thuộc Đang xử lý, có nhãn phụ Chưa đến ngày bắt đầu. Đúng dueAt chưa muộn. Khi muộn, lateDays = ceil((now - dueAt) / 86.400.000); quá 1 phút tính 1 ngày, quá 24 giờ tính 2 ngày.

Task hoàn thành sau hạn vẫn vào Đã hoàn thành. Có thể lưu completedAt cho phân tích sau, không thay quy tắc thẻ. Đổi hạn tính lại tổng hợp ngay và tạo lịch sử cũ/mới.

UI theo múi giờ môi trường Asia/Bangkok, ngày task dd/MM/yyyy HH:mm, lịch sử dd/MM/yyyy HH:mm:ss. Đây là cấu hình prototype theo môi trường user, chưa chọn chính sách đa múi giờ MVP.

Thẻ tổng hợp và thống kê dùng chung hàm, cùng phạm vi quyền; task nhiều người chỉ đếm một lần. **Đề xuất:** thẻ phản ánh cùng bộ lọc hiện tại của bảng.

## 4. Nhóm, mã và graph

Sáu nhóm ban đầu: Hạ tầng HT; Mạng/Hạ tầng mạng HTM; Điện nước DN; Máy chủ MC; HPC-AI đề án HPCAI; Quản lý văn bản QLVB. Admin CRUD nhóm.

Graph thể hiện Lãnh đạo phòng → Tổ trưởng → Các Tổ phó (là người phụ trách nhóm) → Các Thành viên/cán bộ tạm tuyển/nhân viên hợp đồng thuộc vào từng nhóm cụ thể. Dùng graph, cây sơ đồ tổ có thể kéo thả thành viên và sau khi kéo sang nhóm khác thì sẽ cập nhật lại nhóm cho thành viên đó. Thiết kế khung hình (border) riêng cho từng nhóm và có label tên nhóm, tức là hiển thị các nhóm chuyên môn thành nhánh cây. Những thành viên chưa có ở nhóm nào thì vào chung 1 card, có thể kéo thả các thành viên này vào các nhóm và gán vào cập nhật lại nhóm. Node có tên, chức danh, nhóm và loại nhân sự. Person độc lập User; người chưa có tài khoản vẫn nằm graph. Nhóm chưa có tổ phó hiển thị Chưa phân công, không tự gán người phụ trách. Giữ thao tác chọn nhóm thay thế cho bàn phím/mobile.

Mã OFFICIAL theo Nhóm quản lý, ví dụ Task-HT-01; DAILY dùng Task-DAILY-01. **Đề xuất:** số tăng riêng từng tiền tố, không tái sử dụng; mã cũ lưu alias; số có tối thiểu hai chữ số nhưng không giới hạn 99.

Chuyển nhóm người nhận duy nhất của task OFFICIAL: giữ ID task/người nhận, chuyển Nhóm quản lý, cấp mã mới theo nhóm mới. Task nhiều người giữ mã; nhóm tham gia thay theo các người nhận hiện tại. DAILY giữ mã DAILY. Lịch sử lưu người thực hiện, người được chuyển, nhóm cũ/mới, thời điểm và mã cũ/mới của task bị ảnh hưởng.

**Đề xuất:** task nhiều người giữ Nhóm quản lý ban đầu. Xóa nhóm đang có người/task thì yêu cầu chuyển liên kết hoặc lưu trữ nhóm, không xóa vĩnh viễn làm đứt lịch sử.

## 5. Quyền

Áp dụng PERMISSIONS ở mọi entry point: danh sách, tìm kiếm, notification, resource drawer, ID trực tiếp và revision cũ.

Admin xem/sửa toàn bộ. User xem task nếu là người tạo, người nhận, thuộc Nhóm quản lý hoặc nhóm của một người nhận. Chỉ cùng nhóm không cấp quyền cập nhật.
User được giao có thể đổi status, bình luận, tài liệu, tài nguyên và trường tùy chỉnh. Không phải người tạo thì không tự sửa tiêu đề/mô tả/lịch/nhóm/người nhận.
User sửa task mình tạo nhưng chỉ tự giao cho mình. Due date chỉ admin hoặc người tạo. Xóa task chỉ admin hoặc người tạo; **đề xuất** đánh dấu xóa để giữ liên kết và audit.

**Đề xuất phân vùng:** Nhiệm vụ cá nhân là task tự tạo; Được giao cho tôi là task mình nhận do người khác tạo. Tab nhóm cho việc chỉ được xem.

## 6. Công văn và Văn bản

Hai thực thể riêng, mỗi loại liên kết nhiều-nhiều với task. Trường chung: id, number, issuedAt, summary, sourceFiles, uploadedAt, confirmedAt, note.

Không dùng số làm khóa toàn hệ thống vì có thể trùng cơ quan/năm. **Đề xuất:** cảnh báo khi trùng số/ngày/cơ quan, cho chọn mục đã có; không tự hợp nhất.
Metadata hiện tại ở danh mục có thể cập nhật; revision task giữ danh sách liên kết và metadata cần thiết tại thời điểm lưu để không làm thay lịch sử.
**Đề xuất:** mục đang được task tham chiếu dùng archive thay xóa vật lý; giao diện giải thích task liên quan.

## 7. Dữ liệu tài nguyên

Một dòng theo Đơn vị + Cơ quan + Hệ thống, nhóm đơn vị sắp alphabet. Công văn đăng ký chứa nhiều số; cột Văn bản ngay sau đó. Mỗi công văn có schema cột riêng, header nhiều tầng như workbook. Cột thêm ở bảng độc lập trường tùy chỉnh task/sidebar; người tạo cột chọn cột chung hoặc nhóm công văn.

Bộ lọc có số công văn/văn bản từ danh mục, nhóm và Được giao cho tôi. Lọc 952: loại dòng chỉ4267; dòng952+4651 giữ cả hai nhóm. **Đề xuất:** bộ lọc cá nhân giữ dòng có nguồn được giao user, vẫn giữ mọi nhóm nguồn được phép xem trên dòng đó.

Mỗi ô có provenance: taskId, resourceItemId, revisionId, documentId, fieldKey, savedAt và seq. Nếu nhiều task cung cấp cùng ô thì lần lưu mới nhất thắng; hòa thời gian dùng seq tăng. Không lấy ngày phát hành làm thứ tự phiên bản.

Inline edit resolve nguồn rồi cập nhật đúng dòng phụ lục trong task, lưu revision và old/new/actor/time. Admin sửa mọi nguồn; user chỉ nguồn đang giao cho mình. Cột tùy chỉnh có thể sửa cũng phải có provenance. Không tạo kho giá trị main độc lập với task.

Sửa tên Hệ thống chỉ đổi dòng nguồn và khóa projection của đóng góp đó, không đổi task khác. Sửa Đơn vị/Cơ quan chung task ảnh hưởng mọi dòng phụ lục thuộc task, cần cảnh báo và commit lịch sử cùng lúc. Ô Công văn/Văn bản mở selector danh mục và xác nhận phạm vi task; không sửa chuỗi nhãn rời.

Legacy thiếu task nguồn: **đề xuất** chỉ admin xem ở chế độ chỉ đọc, chuyển thành task hợp lệ trước edit. Không tự bịa người nhận, ngày hay lịch sử.

## 8. Sidebar và revision

Drawer bên phải có bốn vùng:
**Hệ thống | Phân loại công văn | Lịch sử cập nhật task | Chi tiết.**

Header là Đơn vị/Cơ quan. Hệ thống chỉ trong đúng cặp này. Phân loại công văn lấy các liên kết task, không đòi tệp vật lý. **Đề xuất:** nhánh Không có công văn cho nguồn hợp lệ không liên kết.

Cột lịch sử liệt kê task và revision liên quan công văn tại thời điểm revision đó. Mặc định chọn task mới nhất và revision mới nhất. Không gán công văn vào revision cũ chỉ vì hiện tại task vừa liên kết công văn đó.

Phần trên chi tiết giữ thông tin công văn: tên hệ thống, số, upload, xác nhận nhập, ngày phát hành, tệp nguồn, ghi chú. Chuyển task trong cùng công văn không đổi phần trên. Chưa có tệp ghi Chưa đính kèm; chưa upload ghi Chưa tải lên; không tạo timestamp giả.

Phần Thông tin bổ sung bên dưới lấy snapshot task: mã/title, workflow/tổng hợp, người nhận, start/due, tài liệu, custom fields, phụ lục. Nhật ký trạng thái/bình luận/sửa nằm trong chi tiết task. Chọn revision cũ chỉ đọc, có Trở về bản hiện tại.

Trang task dùng chung component chi tiết, không tạo hai phiên bản dữ liệu task khác nhau.

## 9. Thông báo và đồng bộ demo

Tạo task gửi cho tập hợp admin + assignees + actor, loại trùng người. Thêm người nhận chỉ báo người mới. Người chỉ xem nhóm không nhận thông báo giao việc.
Notification có id, eventId, taskId, recipientId, type, createdAt, readAt; một event chỉ một notification cho mỗi người. Có Tất cả/Chưa đọc, đánh dấu đọc và đánh dấu tất cả đã đọc. **Đề xuất:** click mở task và đánh dấu đọc, kiểm tra lại quyền tại thời điểm click.
Không tự gửi notification comment/status khi chưa được yêu cầu; audit vẫn ghi.

Danh tính demo dùng sessionStorage từng tab. Dữ liệu nghiệp vụ và thông báo dùng localStorage chung; BroadcastChannel/storage event cập nhật tab user đang mở sau commit. Không đổi identity của tab khác. Đồng bộ chỉ trong cùng trình duyệt/origin, không phải realtime đa máy. Không lưu mật khẩu thật.

## 10. Nguồn được phép xem và lịch sử

Tạo projection, tìm kiếm, đếm và drawer từ tập task **đã lọc quyền xem**. Không dùng projection admin rồi chỉ ẩn nút: công văn/giá trị/assignee/revision của task ngoài quyền không được lộ. Chọn ô mới nhất chỉ trong tập nguồn hợp lệ.

Mọi thay đổi qua form hoặc inline dùng chung commit path. Revision là snapshot bất biến, có thay đổi cũ/mới, actor và thời gian; không chỉnh snapshot cũ bằng editor. Quyền xem revision cũ theo quyền task hiện tại là **đề xuất**.

Migration ở TECH_ARCHITECTURE. Giữ dữ liệu v4, không reset khi tăng version. **Đề xuất import nhiều cặp đơn vị/cơ quan:** preview cho chọn một cặp cho task hiện tại hoặc tách task; không âm thầm thay thông tin chung để nhập hết.
