# Đặc tả chuẩn — C12 / P4 - T1 Internal App

> Cập nhật 26/11/2026. Đây là nguồn nghiệp vụ chuẩn hiện hành. Hãy đọc cùng [INDEX.md](INDEX.md), [PERMISSIONS.md](PERMISSIONS.md), [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) và [FRONTEND_RULES.md](FRONTEND_RULES.md).
>
> Quy ước: **Chuẩn đã chốt** là yêu cầu người dùng xác nhận; **Hiện trạng code** là hành vi đọc thấy trong phiên bản hiện tại; **Lệch/chưa hỗ trợ** ghi rõ phần không nên suy diễn thành đã triển khai. Khi hai phần khác nhau, giữ nguyên chuẩn và báo khoảng lệch.

## 1. Sản phẩm và phân hệ

C12 / P4 - T1 Internal App là prototype nội bộ quản lý công việc, văn bản, tài nguyên, kiến thức và nhân sự trong cùng workspace. Giao diện dùng tiếng Việt, HTML, Tailwind CSS và JavaScript thuần; chưa có backend/auth sản xuất.

Các view: Trang chính; For you (Công việc) gồm Quản lý công việc, Thống kê, Quản lý tài nguyên, Danh mục văn bản; Chuyên môn tổ gồm Kiến thức tổ và Cây sơ đồ tổ; Quản lý nhân sự dành cho admin. Header có tìm kiếm, chuyển LIGHT/DARK, chủ đề cá nhân, thông báo và tài khoản.

Chuẩn thiết kế là **Floating Glassmorphism tối giản**: nền kính vừa phải, blur có kiểm soát, viền sáng mảnh, shadow mềm, chữ tương phản cao, surfaces gom nhóm theo chức năng, khoảng đệm ngang thoáng, responsive và scrollbar gọn. Chi tiết ở `FRONTEND_RULES.md`.

## 2. Thuật ngữ và mô hình nghiệp vụ

- **User** là tài khoản đăng nhập; **Person** là hồ sơ nhân sự. Một Person có thể chưa có User. Chức vụ không phải role.
- Chỉ có role ứng dụng **admin** và **user**.
- **Group** là nhóm chuyên môn. Một Person thuộc tối đa một nhóm tại một thời điểm.
- **Nhóm quản lý task** dùng quản lý/phân loại task và sinh mã; không đồng nghĩa với bộ lọc nhóm khi chọn người nhận.
- **Assignee** là người được giao cụ thể. Chọn nhóm chỉ lọc danh sách thành viên, không giao task tự động cho cả nhóm.
- **Task** có ID nội bộ ổn định, mã hiển thị và loại: xử lý văn bản hoặc task thường.
- **Workflow status** là trạng thái nhập/lưu trên task. **Aggregate status** được suy ra từ workflow và due date để lọc, thống kê và hiển thị.
- **Văn bản** là thực thể danh mục duy nhất; công văn là một loại văn bản, không phải danh mục độc lập.
- **Tệp đính kèm** là file vật lý; bản ghi văn bản có thể tồn tại không có file.
- **Resource appendix** là dữ liệu tài nguyên phần cứng trong phiếu Tạo tài nguyên. Nó độc lập với task và không được tạo task ngầm.

## 3. Quản lý công việc

### 3.1 Tạo task

Task thường và task xử lý văn bản đều có title, mô tả, workflow status, nhóm quản lý, assignee cụ thể, lịch thực hiện (start/due), file đính kèm, bảng dữ liệu tùy chỉnh và custom fields. Title, start date, due date và ít nhất một assignee bắt buộc; due không được trước start. User chỉ tạo task giao cho chính mình; admin có thể chọn nhiều người thuộc nhiều nhóm. Bộ lọc nhóm trong picker chỉ giúp tìm người.

Task xử lý văn bản có thêm loại văn bản (Công văn, Thông tư, Nghị định, Quyết định, Luật, Nghị quyết, Báo cáo, Các loại văn bản khác), số văn bản và trích yếu. Số và trích yếu tùy chọn. Khi tạo task, cặp loại + số trùng văn bản đã có thì liên kết bản ghi đó; khác thì thêm mục mới vào Danh mục văn bản. Văn bản mới được thêm từ phiếu cũng xuất hiện trong danh mục. Không yêu cầu upload file để tạo task. “Văn bản liên quan” là custom table, không phải bảng/danh mục thứ hai.

Phiếu tạo task không có bảng Công văn đăng ký, Văn bản chỉ đạo hay Phụ lục tài nguyên phần cứng. Phần custom table ở card trái; trạng thái, nhóm, người nhận, lịch và custom fields ở card phải.

### 3.2 Workflow và aggregate status

Workflow status hiện dùng: Khởi tạo, Đang xử lý, Đang lấy số, Đang trình ký, Đã hoàn thành. Tổng hợp:

1. Workflow `Đã hoàn thành` luôn là **Đã hoàn thành**, bất kể due date.
2. Nếu chưa hoàn thành và hiện tại đã quá due date thì **Chậm muộn**.
3. Còn lại là **Đang xử lý**. Task chưa tới start date vẫn thuộc nhóm này.

Quá hạn được tính theo thời điểm ngày + giờ/phút. Tại đúng due time chưa trễ; trễ một phần ngày tính 1 ngày, sau 24 giờ tính 2 ngày (ceiling theo khoảng thời gian quá hạn). Mã thời gian sử dụng local date/time của trình duyệt; chính sách timezone backend chưa áp dụng.

### 3.3 Danh sách, bộ lọc, biểu đồ

Bốn tab tiếng Việt tương ứng Tổng công việc, Đang xử lý, Đã hoàn thành, Chậm muộn; tab là bộ lọc aggregate status, không phải workflow status. Không có Upcoming/Paused trong bộ tab chuẩn. Chuyển giữa Kanban và Table giữ cùng tập task đã lọc. Kanban luôn có đúng ba cột: Đang xử lý, Đã hoàn thành, Chậm muộn; task không khớp filter không xuất hiện nhưng khung cột giữ nguyên.

Bộ lọc phụ gồm tìm title/mã/ngày, Nhóm quản lý, Văn bản và loại task (xử lý văn bản/task thường). Chỉ tính task mà user được phép xem. Donut hiển thị ba aggregate status của phạm vi filter hiện hành; tổng ở tâm là số task trong phạm vi. Số lượng task nhiều assignee vẫn đếm một lần.

### 3.4 Mã task và chuyển nhóm

Task xử lý văn bản dùng tiền tố theo nhóm (ví dụ `Task-HT-01`, `Task-HPCAI-01`, `Task-HTM-01`); task thường dùng `Task-DAILY-01`. Mã là nhãn tra cứu, ID nội bộ không đổi khi mã được cấp lại.

Nhóm khởi tạo: Hạ tầng (HT), Mạng/Hạ tầng mạng (HTM), Điện nước (DN), Máy chủ (MC), HPC-AI đề án (HPCAI), Quản lý văn bản (QLVB). Hạ tầng và Mạng là hai nhóm riêng.

Khi chuyển assignee duy nhất sang nhóm khác, task vẫn giao cho người đó, Nhóm quản lý chuyển theo nhóm mới và mã task được cấp lại theo prefix mới. Task nhiều assignee giữ mã; nhóm mới của thành viên cho phép thành viên nhóm mới nhìn thấy task theo quy tắc quyền. Task thường vẫn mang mã DAILY. Lịch sử ghi người chuyển, thành viên, nhóm cũ/mới và thời điểm; thay đổi mã ghi cùng sự kiện liên quan.

## 4. Danh mục văn bản

Chỉ có một danh mục tên **Danh mục văn bản**, phân loại bằng tám loại đã nêu. Các tab loại văn bản lọc cùng danh sách; không có danh mục Công văn độc lập và không có bảng “Khác” riêng. Bản ghi có loại, số, ngày phát hành, trích yếu, ghi chú/file nếu có. Số, ngày và trích yếu có thể để trống trong danh mục; riêng form liên kết task không bắt buộc nhập số/trích yếu.

CRUD văn bản độc lập với task. Khi task xử lý văn bản lưu, nếu loại + số khớp thì dùng bản ghi hiện có; nếu không thì tạo bản ghi trong danh mục. Không tự thêm loại “Thông tư liên tịch”.

**Hiện trạng code:** `state.documents` là danh sách chuẩn; alias `officials`/`docs` còn để tương thích dữ liệu cũ. Trùng lặp được kiểm tra theo loại + số đã chuẩn hóa. Có thể tạo bản ghi không số.

## 5. Quản lý tài nguyên

Quản lý tài nguyên có collection riêng, đồng thời hỗ trợ tạo task loại **Quản lý tài nguyên** trong form task hoặc bật **Tạo kèm công việc** ngay trong form tài nguyên. Ở luồng kèm task, tài nguyên và task được lưu cùng thao tác; một resource có thể liên kết nhiều task, còn một resource task liên kết đúng một resource (đơn vị/cơ quan/hệ thống). Tệp đính kèm và trường tùy chỉnh dùng chung giữa resource và các task liên kết. Mã resource task theo Nhóm quản lý.

Form tài nguyên có thông tin hệ thống, Công văn đăng ký, Văn bản cấp tài nguyên (loại văn bản dùng chung trong Danh mục văn bản), phụ lục phần cứng, tệp đính kèm và trường tùy chỉnh. Có thể tạo nhanh Văn bản cấp tài nguyên trong form; nếu cùng loại và số đã có thì liên kết bản ghi sẵn, nếu chưa có thì thêm vào Danh mục văn bản khi lưu tài nguyên.

Bảng tổng hợp gộp theo Tên đơn vị → Cơ quan quản lý → Hệ thống và có các cột liên kết Công văn đăng ký, Văn bản cấp tài nguyên, Công việc (Task). Mỗi Công văn đăng ký trong danh mục có nhóm cột con riêng, nhóm cha mang số văn bản và cột con chỉ mang tên trường; bộ lọc Công văn giới hạn các nhóm đang hiển thị. Công văn 952 và 4651 giữ schema đặc thù hiện có. Các công văn khác tự nhận schema mặc định `vGPU`, `RAM (GB)`, `Disk / Block (TB)`, `Disk / File Storage (TB)`, `Disk / Object (TB)`, `License`; schema cũ nếu có được giữ sau các cột mặc định. Header `colspan`, ô dữ liệu, chi tiết và Excel dùng cùng schema; xóa cột có xác nhận và xóa giá trị của cột đó khỏi các hàng thuộc đúng công văn. Người dùng chỉ thấy/xóa điều khiển schema nếu có quyền sửa mọi resource đang liên kết với công văn đó; admin luôn có quyền. Các cột định danh/thao tác cố định không xóa được. Không tạo “phụ lục riêng” tách ngoài nhóm công văn.

Thao tác bảng gồm thêm cột chung (chọn một Công văn đăng ký), cột riêng, hàng chung (chọn đơn vị/cơ quan/hệ thống) và hàng riêng. Bộ lọc gồm tìm đơn vị/cơ quan/hệ thống, văn bản liên kết và phạm vi “Được giao cho tôi / Tất cả”. Export Excel phản ánh tập dữ liệu đang lọc, merge đơn vị/cơ quan/hệ thống và toàn bộ nhóm cột theo văn bản. Không được giả danh file XLSX bằng CSV/HTML; nếu thư viện XLSX không tải được thì báo yêu cầu tải lại trang.

### Hiện trạng và khoảng lệch tài nguyên

- V7 lưu resource records riêng và hỗ trợ liên kết resource/task; quyền sửa resource xét admin, người tạo resource, hoặc người tạo/được giao ít nhất một task liên kết.
- Bộ lọc “Được giao cho tôi” lọc resource có task liên kết đang giao cho user hiện tại.
- Excel đang xuất từ dữ liệu lọc nhưng phần phụ lục đa hàng có thể chỉ lấy dòng đầu, nên chưa bảo đảm giống hệt bảng trong mọi trường hợp.
- Schema mặc định và schema động được lưu trong state phía trình duyệt (`resourceAppendixSchemas`); chưa có đồng bộ server hoặc bảo đảm phân quyền phía server.

## 6. Dữ liệu tài nguyên từ công văn và lịch sử (yêu cầu đã chốt, cần phân biệt với V7)

Các quyết định trước đây mô tả Dữ liệu tài nguyên như projection từ task: mỗi dòng phụ lục tạo hệ thống riêng; ô hiện tại lấy lần lưu gần nhất, có provenance đến task/revision; sửa ô cập nhật nguồn task và tạo lịch sử actor/old/new/time. Sidebar tài nguyên có Hệ thống, Phân loại công văn, Lịch sử cập nhật task và Chi tiết; task/revision mới nhất được chọn mặc định, bản cũ chỉ đọc. Những quyết định đó là **định hướng cũ đã bị thay thế khi user tách Quản lý tài nguyên khỏi Quản lý công việc**. Không dùng chúng để mô tả V7 như chức năng đang có. Các liên kết task/provenance/assignee-based resource editing hiện chưa có trong phân hệ độc lập.

## 7. Cây sơ đồ tổ

Graph thể hiện Lãnh đạo phòng → Tổ trưởng → nhánh nhóm chuyên môn; mỗi nhánh có Tổ phó/người phụ trách và thành viên. Nhóm hiển thị trong graph với khung và nhãn riêng. Nhân sự chưa thuộc nhóm hiển thị chung trong card chưa phân nhóm, có thể kéo sang nhóm. Kéo thả/chọn nhóm cập nhật nhóm hiện tại của Person. Nhóm CRUD và thành viên/loại nhân sự (cán bộ, tạm tuyển, hợp đồng) được quản lý theo quyền. Cấu trúc graph theo nhóm là quyết định mới nhất; nhánh chỉ theo chức vụ là nội dung cũ đã thay thế.

Chuyển nhóm không gỡ assignee khỏi task hiện có. Quy tắc mã, Nhóm quản lý task và lịch sử liên quan ở mục 3.4.

## 8. Kiến thức tổ

Danh sách bài kiến thức có cấp ban hành (Trung ương/Địa phương), cơ quan ban hành, loại văn bản, tiêu đề/nội dung, ngày và file đính kèm nếu có. Có filter theo cấp, cơ quan và loại; CRUD và xem chi tiết. Cơ quan/loại là metadata nội dung, không tự tạo văn bản trong danh mục văn bản trừ khi người dùng thao tác riêng ở danh mục.

## 9. Nhân sự và tài khoản

Person và User là hai đối tượng riêng có thể liên kết. Admin quản lý hồ sơ, tài khoản, duyệt đăng ký và nhóm. Cây dùng hồ sơ Person; task assignment cần tài khoản phù hợp để đăng nhập. Chức vụ hiển thị không tạo quyền ngoài role admin/user.

## 10. Thông báo, lịch sử và tìm kiếm

Task mới: thông báo admin, assignee và actor, khử trùng người nhận. Thêm assignee: thông báo người mới. Người cùng nhóm chỉ xem không nhận thông báo giao việc. Có tab Tất cả/Chưa đọc, đánh dấu đọc; click mở chi tiết task và phải kiểm tra quyền.

Tìm kiếm toàn cục và tìm kiếm từng màn phải chỉ trả kết quả user được phép xem. Task revisions/lịch sử trạng thái, bình luận và chỉnh sửa nằm trong chi tiết task.

## 11. Trang chính và thống kê

Trang chính hiển thị thông tin tổ (tên tổ, quân số từ nhân sự, số nhóm và người phụ trách), phiên bản Cloud Console 1.0, số task theo dõi và task trễ; có quick access và văn bản gần đây.

Thống kê task phải dùng quyền và aggregate status như Quản lý công việc. **Hiện trạng code:** hoạt động và lịch trên trang thống kê có dữ liệu mẫu tĩnh, lịch tháng 11/2026; không coi đó là số liệu live.

## 12. Quyền

Ma trận chi tiết tại [PERMISSIONS.md](PERMISSIONS.md). Quy tắc cốt lõi: admin xem/sửa toàn cục; người tạo/assignee xem task; user thuộc nhóm quản lý hoặc nhóm assignee có thể xem task nhưng chỉ xem. User chỉ được chỉnh sửa các trường task theo vai trò đã nêu; admin hoặc người tạo được đổi due date. Nhóm chỉ lọc picker, không assign tự động.

Prototype chỉ enforcement ở client, không phải ranh giới bảo mật sản xuất.

## 13. Migrations, dữ liệu và giới hạn

Không reset storage để đổi schema. Migration phải giữ dữ liệu cũ và backup trước nâng cấp. Không tự dựng task/history hoặc timestamp không có trong nguồn. Storage là localStorage; session identity riêng từng tab trong sessionStorage. BroadcastChannel/storage event chỉ đồng bộ tab cùng browser/origin, không phải nhiều máy.

Không có backend, auth an toàn, API authorization, realtime đa thiết bị hoặc lưu trữ bền vững. CDN XLSX/Mammoth cần tải được; tính năng phụ thuộc thư viện phải hiển thị lỗi rõ nếu thiếu. Không khẳng định parser/OCR ngoài phần code thực sự xử lý.
