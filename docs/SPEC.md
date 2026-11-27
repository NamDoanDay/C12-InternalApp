# Đặc tả chuẩn — C12 / P4 - T1 Internal App

> Cập nhật 27/11/2026. Đây là nguồn nghiệp vụ chuẩn hiện hành. Hãy đọc cùng [INDEX.md](INDEX.md), [PERMISSIONS.md](PERMISSIONS.md), [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) và [FRONTEND_RULES.md](FRONTEND_RULES.md).
>
> Quy ước: **Chuẩn đã chốt** là yêu cầu người dùng xác nhận; **Hiện trạng code** là hành vi đọc thấy trong phiên bản hiện tại; **Lệch/chưa hỗ trợ** ghi rõ phần không nên suy diễn thành đã triển khai. Khi hai phần khác nhau, giữ nguyên chuẩn và báo khoảng lệch.

## 1. Sản phẩm và phân hệ

C12 / P4 - T1 Internal App là workspace nội bộ quản lý công việc, văn bản, tài nguyên, kiến thức và nhân sự. Giao diện dùng tiếng Việt, HTML, Tailwind CSS và JavaScript thuần. **Hiện trạng triển khai:** SPA chạy trên trình duyệt, state workspace lưu trong localStorage; không có backend, API, realtime hoặc database. Đây là chế độ demo cục bộ, không phải triển khai nhiều người dùng.

Các view: Trang chính; For you (Công việc) gồm Quản lý công việc, Thống kê, Quản lý tài nguyên, Danh mục văn bản; Chuyên môn tổ gồm Kiến thức tổ và Cây sơ đồ tổ; Quản lý nhân sự dành cho admin. Header có tìm kiếm, chuyển LIGHT/DARK, chủ đề cá nhân, thông báo và tài khoản.

### 1.1 Đăng nhập demo, phiên và thiết lập người dùng

- Lần chạy đầu, nếu chưa có `c12-local-session`, code chọn User demo `demo-u-g-HT` (hoặc user đầu tiên) và ghi ID đó vào localStorage; vì vậy lần đầu thường vào thẳng Trang chính dưới vai trò User mà không hiện form đăng nhập.
- Form đăng nhập cục bộ tìm theo email hoặc tên hiển thị của User đã được duyệt. Dù có ô mật khẩu, hiện tại code không xác minh mật khẩu và không lưu mật khẩu. Checkbox “Ghi nhớ đăng nhập” chưa điều khiển hành vi phiên.
- Form đăng ký yêu cầu tên/email/mật khẩu trên giao diện, nhưng handler chỉ lưu tên/email với trạng thái `pending`; mật khẩu bị bỏ qua. Admin có thể duyệt hoặc từ chối yêu cầu; khi duyệt có thể liên kết Person có sẵn hoặc tạo hồ sơ Person mới. User pending/rejected không đăng nhập được.
- Admin có thể tạo tài khoản demo đã duyệt, chọn role và liên kết Person; không có mật khẩu đăng nhập. Menu tài khoản cho đổi tên hiển thị, chuyển vai trò demo, đăng xuất; admin có thể khôi phục seed, việc này thay thế workspace hiện lưu trong trình duyệt sau khi xác nhận.
- Đây là luồng mô phỏng phục vụ demo. Không coi là xác thực, quản lý mật khẩu, ghi nhớ phiên bảo mật hoặc quy trình phê duyệt production.

Chuẩn thiết kế là **Floating Glassmorphism tối giản**: nền kính vừa phải, blur có kiểm soát, viền sáng mảnh, shadow mềm, chữ tương phản cao, surfaces gom nhóm theo chức năng, khoảng đệm ngang thoáng, responsive và scrollbar gọn. Chi tiết ở `FRONTEND_RULES.md`.

## 2. Thuật ngữ và mô hình nghiệp vụ

- **User** là tài khoản đăng nhập; **Person** là hồ sơ nhân sự. Một Person có thể chưa có User. Chức vụ không phải role.
- Chỉ có role ứng dụng **admin** và **user**.
- **Group** là nhóm chuyên môn. Một Person thuộc tối đa một nhóm tại một thời điểm.
- **Nhóm quản lý task** dùng quản lý/phân loại task và sinh mã; không đồng nghĩa với bộ lọc nhóm khi chọn người nhận.
- **Assignee** là người được giao cụ thể. Chọn nhóm chỉ lọc danh sách thành viên, không giao task tự động cho cả nhóm.
- **Task** có ID nội bộ ổn định, mã hiển thị và loại: xử lý văn bản, quản lý tài nguyên hoặc task thường.
- **Workflow status** là trạng thái nhập/lưu trên task. **Aggregate status** được suy ra từ workflow và due date để lọc, thống kê và hiển thị.
- **Văn bản** là thực thể danh mục duy nhất; công văn là một loại văn bản, không phải danh mục độc lập.
- **Tệp đính kèm** là file vật lý; bản ghi văn bản có thể tồn tại không có file.
- **Resource appendix** là dữ liệu tài nguyên phần cứng trong phiếu Tạo tài nguyên. Resource độc lập về collection; chỉ tạo task khi người dùng bật rõ “Tạo kèm công việc”.

### Quan hệ giữa Task, Resource và Văn bản

| Quan hệ | Khóa/liên kết chuẩn | Ý nghĩa |
|---|---|---|
| Task xử lý văn bản → Văn bản | `task.documentId` | Một task chỉ định văn bản chính; nếu chưa có bản ghi cùng loại + số, lưu task tạo bản ghi văn bản trong catalog. |
| Resource → Công văn đăng ký | `resource.registeredDocumentIds[]` | Các Công văn mà resource khai báo nhu cầu; phụ lục tương ứng nằm tại `resource.documentAppendices[documentId]`. |
| Resource → Văn bản cấp tài nguyên | `resource.assetDocumentIds[]` (alias tương thích `exchangeDocumentIds`) | Văn bản cấp/trao đổi về tài nguyên; đây là loại catalog riêng, không phải Công văn đăng ký. |
| Resource → Task | `resource.taskIds[]` và ngược lại `task.resourceId` | Một resource có thể có nhiều task liên kết; một task loại Quản lý tài nguyên gắn đúng một resource. Khi tạo từ task, resource được tìm theo ID/khóa Đơn vị + Cơ quan + Hệ thống hoặc được tạo mới. |

`state.documents` là catalog duy nhất và ID văn bản là định danh liên kết. Không tự suy ra liên kết resource chỉ vì một task xử lý văn bản đang trỏ đến cùng một Công văn; resource phải có `registeredDocumentIds` tương ứng. Văn bản cấp tài nguyên cũng không sinh nhóm appendix Công văn.

## 3. Quản lý công việc

### 3.1 Tạo task

Task thường và task xử lý văn bản đều có title, mô tả, workflow status, nhóm quản lý, assignee cụ thể, lịch thực hiện (start/due), file đính kèm, bảng dữ liệu tùy chỉnh và custom fields. Title, start date, due date và ít nhất một assignee bắt buộc; due không được trước start. User chỉ tạo task giao cho chính mình; admin có thể chọn nhiều người thuộc nhiều nhóm. Bộ lọc nhóm trong picker chỉ giúp tìm người.

Task xử lý văn bản có thêm loại văn bản (Công văn, Thông tư, Nghị định, Quyết định, Luật, Nghị quyết, Báo cáo, Văn bản cấp tài nguyên, Các loại văn bản khác), số văn bản và trích yếu. Số và trích yếu tùy chọn. Khi tạo task, cặp loại + số trùng văn bản đã có thì liên kết bản ghi đó; khác thì thêm mục mới vào Danh mục văn bản. Văn bản mới được thêm từ phiếu cũng xuất hiện trong danh mục. Không yêu cầu upload file để tạo task. “Văn bản liên quan” là custom table, không phải bảng/danh mục thứ hai.

Task **Quản lý tài nguyên** gắn với đúng một resource. Task dùng chung workflow status, nhóm quản lý, assignee, lịch, title/description; thông tin hệ thống, Công văn đăng ký, Văn bản cấp tài nguyên, phụ lục theo công văn, file và custom fields lấy từ resource liên kết. Một resource có thể liên kết nhiều task; tệp và custom fields được đồng bộ dùng chung. Có thể tạo task từ form task hoặc bật “Tạo kèm công việc” trong form resource; ở luồng sau, resource và task được lưu cùng thao tác. Nếu không bật, task không được tạo.

Phiếu tạo task không có bảng Công văn đăng ký, Văn bản chỉ đạo hay Phụ lục tài nguyên phần cứng. Phần custom table ở card trái; trạng thái, nhóm, người nhận, lịch và custom fields ở card phải.

### 3.2 Workflow và aggregate status

Workflow status hiện dùng: Khởi tạo, Đang xử lý, Đang lấy số, Đang trình ký, Đã hoàn thành. Tổng hợp:

1. Workflow `Đã hoàn thành` luôn là **Đã hoàn thành**, bất kể due date.
2. Nếu chưa hoàn thành và hiện tại đã quá due date thì **Chậm muộn**.
3. Còn lại là **Đang xử lý**. Task chưa tới start date vẫn thuộc nhóm này.

Quá hạn được tính theo thời điểm ngày + giờ/phút. Tại đúng due time chưa trễ; trễ một phần ngày tính 1 ngày, sau 24 giờ tính 2 ngày (ceiling theo khoảng thời gian quá hạn). Form tạo/sửa dùng thời gian local của trình duyệt; model client so sánh timestamp ISO theo epoch UTC. Chưa có cấu hình timezone nghiệp vụ riêng cho ngày hạn.

### 3.3 Danh sách, bộ lọc, biểu đồ

Bốn tab tiếng Việt tương ứng Tổng công việc, Đang xử lý, Đã hoàn thành, Chậm muộn; tab là bộ lọc aggregate status, không phải workflow status. Không có Upcoming/Paused trong bộ tab chuẩn. Chuyển giữa Kanban và Table giữ cùng tập task đã lọc. Kanban luôn có đúng ba cột: Đang xử lý, Đã hoàn thành, Chậm muộn; task không khớp filter không xuất hiện nhưng khung cột giữ nguyên.

Bộ lọc phụ gồm tìm title/mã/ngày, Nhóm quản lý, Văn bản và loại task (Xử lý văn bản, Quản lý tài nguyên, Task thường). Chỉ tính task mà user được phép xem. Donut hiển thị ba aggregate status của phạm vi filter hiện hành; tổng ở tâm là số task trong phạm vi. Số lượng task nhiều assignee vẫn đếm một lần.

Các bộ lọc đa chọn dùng OR giữa nhiều lựa chọn trong cùng một nhóm filter, và AND giữa các nhóm filter khác nhau. Chọn/bỏ/chọn tất cả cập nhật đồng thời tab, donut, Kanban và Table; tab chỉ lọc theo aggregate status. Tìm kiếm task so khớp title, mã, ngày bắt đầu và ngày kết thúc. Bản Table của admin dùng một danh sách; User thấy các nhóm “Nhiệm vụ cá nhân”, “Được giao cho tôi” và “Công việc cùng nhóm” trong phạm vi được phép xem.

### 3.4 Chi tiết, bình luận, nhật ký và nhập phụ lục

- Task mở drawer chi tiết với thông tin loại, workflow status, nhóm quản lý, assignee, lịch, người tạo; task resource có thêm thông tin hệ thống, Công văn đăng ký, Văn bản cấp tài nguyên và phụ lục; task xử lý văn bản hiển thị loại/số/trích yếu. Custom table, file và custom fields hiện có được hiển thị.
- Drawer có danh sách revision, bản hiện tại và bản lịch sử chỉ đọc. Nhật ký ghi actor, thời gian, hành động và các trường cũ/mới theo thao tác đã được model ghi revision; đây không phải audit log máy chủ và không bảo đảm mọi thay đổi có revision.
- Người có quyền sửa task có thể thêm bình luận; bình luận được lưu cùng task và tạo revision. Admin hoặc creator có thể lưu trữ task; lịch sử được giữ. Đóng modal/drawer bằng X, backdrop hoặc Esc không lưu form đang sửa.
- Task editor cho phép thêm/xóa cột, hàng trong custom table và quản lý tệp. Luồng “Nhập phụ lục tài nguyên” trong task yêu cầu nhập đơn vị/cơ quan và chọn Công văn trước; đọc DOCX/XLSX, xem/chỉnh preview, chỉ thêm vào draft sau khi xác nhận, rồi dữ liệu chỉ được ghi cùng lần lưu task. Các snapshot không khớp cặp đơn vị/cơ quan hoặc Công văn đã chọn bị bỏ qua.
- Không có nút xuất danh sách task trong view Quản lý công việc hiện tại. Export XLSX hiện có ở bảng Dữ liệu tài nguyên tổng hợp; nó dùng tập resource đang lọc và thư viện nạp CDN.

### 3.5 Mã task và chuyển nhóm

Task xử lý văn bản dùng tiền tố theo nhóm (ví dụ `Task-HT-01`, `Task-HPCAI-01`, `Task-HTM-01`); task thường dùng `Task-DAILY-01`. Mã là nhãn tra cứu, ID nội bộ không đổi khi mã được cấp lại.

Nhóm khởi tạo: Hạ tầng (HT), Mạng/Hạ tầng mạng (HTM), Điện nước (DN), Máy chủ (MC), HPC-AI đề án (HPCAI), Quản lý văn bản (QLVB). Hạ tầng và Mạng là hai nhóm riêng.

Khi chuyển assignee duy nhất sang nhóm khác, task vẫn giao cho người đó, Nhóm quản lý chuyển theo nhóm mới và mã task được cấp lại theo prefix mới. Task nhiều assignee giữ mã; nhóm mới của thành viên cho phép thành viên nhóm mới nhìn thấy task theo quy tắc quyền. Task thường vẫn mang mã DAILY. Lịch sử ghi người chuyển, thành viên, nhóm cũ/mới và thời điểm; thay đổi mã ghi cùng sự kiện liên quan.

## 4. Danh mục văn bản

Chỉ có một danh mục tên **Danh mục văn bản**, phân loại bằng chín loại: Công văn, Thông tư, Nghị định, Quyết định, Luật, Nghị quyết, Báo cáo, Văn bản cấp tài nguyên, Các loại văn bản khác. Các tab loại văn bản lọc cùng danh sách; không có danh mục Công văn độc lập và không có bảng “Khác” riêng. Bản ghi có loại, số, ngày phát hành, trích yếu, ghi chú/file nếu có. Số, ngày và trích yếu có thể để trống trong danh mục; riêng form liên kết task không bắt buộc nhập số/trích yếu.

CRUD văn bản độc lập với task. Khi task xử lý văn bản lưu, nếu loại + số khớp thì dùng bản ghi hiện có; nếu không thì tạo bản ghi trong danh mục. Không tự thêm loại “Thông tư liên tịch”.

**Hiện trạng code:** `state.documents` là danh sách chuẩn; alias `officials`/`docs` còn để tương thích dữ liệu cũ. Trùng lặp được kiểm tra theo loại + số đã chuẩn hóa. Có thể tạo bản ghi không số.

Task xử lý văn bản lưu ID văn bản chính (`documentId`); các màn hình chi tiết/danh mục tra văn bản theo ID này. Khi sửa văn bản, record catalog cùng ID được cập nhật nên các liên kết vẫn trỏ cùng bản ghi. Catalog detail tổng hợp task liên quan trực tiếp và task đi qua Resource. Catalog item chưa có revision/audit log riêng như task/resource. Nếu xóa một văn bản chưa liên kết, record bị xóa; nếu đang được Task/Resource tham chiếu, code archive để giữ ID, nhưng UI chọn/bảng chỉ hiển thị item active (xem khoảng lệch tại mục 5).

**Khoảng lệch code:** nếu Task đổi khỏi loại Xử lý văn bản, `saveTask()` không gọi lại `catalogDocumentForTask()` và hiện không xóa rõ `documentId` cũ; catalog detail có thể còn tính Task đó là liên quan. Cần xử lý/kiểm tra nếu quan hệ văn bản chính chỉ nên tồn tại trên Task Xử lý văn bản.

## 5. Quản lý tài nguyên

Quản lý tài nguyên có collection riêng, đồng thời hỗ trợ tạo task loại **Quản lý tài nguyên** trong form task hoặc bật **Tạo kèm công việc** ngay trong form tài nguyên. Ở luồng kèm task, tài nguyên và task được lưu cùng thao tác; một resource có thể liên kết nhiều task, còn một resource task liên kết đúng một resource (đơn vị/cơ quan/hệ thống). Tệp đính kèm và trường tùy chỉnh dùng chung giữa resource và các task liên kết. Mã resource task theo Nhóm quản lý.

Form tài nguyên có thông tin hệ thống, Công văn đăng ký, Văn bản cấp tài nguyên (loại văn bản dùng chung trong Danh mục văn bản), phụ lục phần cứng, tệp đính kèm và trường tùy chỉnh. Có thể tạo nhanh Văn bản cấp tài nguyên trong form; nếu cùng loại và số đã có thì liên kết bản ghi sẵn, nếu chưa có thì thêm vào Danh mục văn bản khi lưu tài nguyên.

Tài nguyên được nhận diện/gộp theo bộ Tên đơn vị + Cơ quan quản lý + Hệ thống sau chuẩn hóa. Khi lưu form mới trùng bộ này, code cập nhật/gộp vào resource hiện hữu thay vì tạo một resource trùng; giữ các liên kết/tệp/dòng phụ lục sẵn có theo logic merge. Khi tạo Quản lý tài nguyên từ form task, code dùng resourceId đang có hoặc tìm resource cùng bộ nhận diện; nếu không có thì tạo resource. Bởi vậy “tạo task loại Quản lý tài nguyên” cũng có thể tạo/cập nhật Resource kèm theo, không chỉ tạo một task độc lập.

**Các đường tạo và liên kết:**

1. **Tạo Resource riêng:** nhập thông tin hệ thống, chọn Công văn đăng ký và Văn bản cấp tài nguyên; phụ lục lưu theo ID Công văn. Khi bật “Tạo kèm công việc”, form mở thêm thông tin task; một lần Lưu tạo/cập nhật Resource và tạo task liên kết. Tắt lựa chọn chỉ lưu Resource. Lỗi ở bước lưu kèm task phục hồi snapshot state client.
2. **Tạo Task Quản lý tài nguyên:** nhập title/status/nhóm/assignee/lịch cùng thông tin Resource, chọn các Công văn và Văn bản cấp tài nguyên; lưu Task rồi tạo/cập nhật Resource, nối `task.resourceId` ↔ `resource.taskIds`. Phụ lục theo Công văn được merge vào Resource tương ứng.
3. **Quản lý liên kết hiện có:** cột “Công việc (Task)” cho phép chọn/bỏ nhiều task loại Quản lý tài nguyên cho Resource; task chỉ thuộc một Resource tại một thời điểm. Cột “Công văn đăng ký” và “Văn bản cấp tài nguyên” mở picker riêng; các liên kết chỉ thay đổi khi lưu.
4. **Đồng bộ dữ liệu dùng chung:** Resource là nguồn hiển thị thông tin hệ thống, tài liệu liên kết, phụ lục, attachments và custom fields. Khi lưu resource, attachments/custom fields/resource snapshot được đồng bộ cho task Quản lý tài nguyên liên kết và có revision nếu thay đổi. Task status, assignee, lịch, title, description và bảng custom của từng task vẫn là dữ liệu task riêng.

`Công văn đăng ký` và `Văn bản cấp tài nguyên` luôn là hai tập ID khác nhau. Chỉ Công văn đăng ký cấp các nhóm cột appendix trong bảng; Văn bản cấp tài nguyên chỉ hiển thị ở cột liên kết riêng. Resource attachments cũng tách khỏi file đính kèm của bản ghi Document; không tự coi file của văn bản là file của resource.

Bảng tổng hợp gộp theo Tên đơn vị → Cơ quan quản lý → Hệ thống và có các cột liên kết Công văn đăng ký, Văn bản cấp tài nguyên, Công việc (Task). Mỗi Công văn đăng ký trong danh mục có nhóm cột con riêng, nhóm cha mang số văn bản và cột con chỉ mang tên trường; bộ lọc Văn bản giới hạn resource và các nhóm đang hiển thị. Công văn 952 và 4651 giữ schema đặc thù hiện có. Các công văn khác tự nhận schema mặc định `vGPU`, `RAM (GB)`, `Disk / Block (TB)`, `Disk / File Storage (TB)`, `Disk / Object (TB)`, `License`; schema cũ/column data nếu có được hợp nhất và giữ sau các cột mặc định. Header `colspan`, ô dữ liệu, chi tiết và Excel dùng cùng schema; xóa cột có xác nhận và xóa giá trị của cột đó khỏi các hàng thuộc đúng công văn. Người dùng chỉ thấy/xóa điều khiển schema nếu có quyền sửa mọi resource đang liên kết với công văn đó; admin luôn có quyền. Các cột định danh/thao tác cố định không xóa được. Không tạo “phụ lục riêng” tách ngoài nhóm Công văn.

#### Tự tạo nhóm cột khi có Công văn mới

Mỗi lần render workspace tài nguyên, code lấy **toàn bộ văn bản đang hoạt động có loại Công văn** làm danh sách nhóm header. Vì vậy Công văn mới được tạo từ Danh mục văn bản hoặc tự sinh khi lưu task Xử lý văn bản sẽ được thêm nhóm vào bảng ở lần render/khi mở lại màn tài nguyên. Nếu Công văn không phải 952/4651 và chưa có schema tùy chỉnh, sáu cột mặc định được tính từ schema helper; đây là schema mặc định phía client, không phải một Resource hay phụ lục đã được tạo. 952/4651 lấy schema đặc thù; schema đã lưu và tên cột đã có trên phụ lục được hợp nhất để giữ dữ liệu.

Tạo Công văn **không** tự tạo dòng tài nguyên, không tự đăng ký Công văn cho các resource cũ/mới và không tự điền số liệu. Ô nhóm đó hiển thị rỗng/“—” cho resource chưa có ID Công văn trong `registeredDocumentIds`; sau khi chọn Công văn cho resource và nhập phụ lục, giá trị mới được lưu dưới đúng ID Công văn. Tạo nhanh “Văn bản cấp tài nguyên” trong form resource chỉ thêm/liên kết loại văn bản cấp tài nguyên, không tạo nhóm cột appendix.

Thao tác bảng gồm thêm cột chung (chọn một Công văn đăng ký), cột riêng, hàng chung (chọn đơn vị/cơ quan/hệ thống) và hàng riêng. Bộ lọc gồm tìm đơn vị/cơ quan/hệ thống, văn bản liên kết và phạm vi “Được giao cho tôi / Tất cả”. Export Excel phản ánh tập dữ liệu đang lọc, merge đơn vị/cơ quan/hệ thống và toàn bộ nhóm cột theo văn bản. Không được giả danh file XLSX bằng CSV/HTML; nếu thư viện XLSX không tải được thì báo yêu cầu tải lại trang.

Hàng phụ lục chung được dùng chung theo số dòng của các Công văn đã chọn; hàng phụ lục riêng lưu theo đúng Công văn đăng ký và có thể nhập các giá trị định danh riêng. Cột riêng nằm ngoài các nhóm Công văn. Render bảng, chỉnh sửa ô và export đọc schema/các hàng chung-riêng từ cùng state resource; khi xuất, code dựng XLSX với các dòng phụ lục chung và riêng, các nhóm/cột con và merge ô định danh. Nút mắt ở cột Thao tác là đường mở chi tiết; click vào phần còn lại của hàng không mở drawer. Hover chỉ nhấn hàng đang trỏ chuột.

### Hiện trạng và khoảng lệch tài nguyên

- V7 lưu resource records riêng và hỗ trợ liên kết resource/task; quyền sửa resource xét admin, người tạo resource, hoặc người tạo/được giao ít nhất một task liên kết.
- Bộ lọc “Được giao cho tôi” lọc resource có task liên kết đang giao cho user hiện tại.
- Export XLSX hiện đã lấy các dòng phụ lục chung và riêng từ dữ liệu đang lọc, dựng nhóm header/cột con và merge ô định danh. Việc giống tuyệt đối bảng trên màn hình hoặc workbook tham chiếu chưa được xác nhận bằng đối chiếu trực quan trên Excel; không coi đó là lỗi đã kiểm thử hay bảo đảm tương thích in ấn.
- Schema mặc định và schema động được lưu trong state phía trình duyệt (`resourceAppendixSchemas`); chưa có đồng bộ server hoặc bảo đảm phân quyền phía server.
- Mặc định sáu cột cho Công văn mới được suy ra khi render; state schema riêng chỉ được lưu khi có thay đổi schema. Nếu người dùng xóa hết cột của một Công văn, schema rỗng được lưu và nhóm header bị ẩn. Đây là hành vi code hiện tại; cần quyết định nếu nghiệp vụ muốn luôn giữ ít nhất một cột mặc định.
- Khi một văn bản đang được Resource/Task tham chiếu bị xóa, code lưu trữ thay vì hard-delete để giữ ID liên kết. Tuy vậy, bảng tài nguyên và bộ chọn chỉ lấy văn bản active; Công văn lưu trữ vì thế không còn nhóm appendix trong bảng/export dù liên kết và dữ liệu phụ lục vẫn còn trong state. Cần xác nhận có nên tiếp tục hiển thị nhóm archived/read-only để tránh dữ liệu bị khuất.

## 6. Lịch sử và liên kết Resource–Task

Resource là bản ghi độc lập, không phải projection từ task. Mỗi resource lưu revision có actor, thời điểm, thao tác, trường thay đổi và snapshot dữ liệu. Task resource lưu `resourceId`/`resourceData`; resource lưu `taskIds`. Màn chi tiết resource ghép lịch sử resource và revisions của các task liên kết thành timeline, cho phép mở chi tiết task. Khi cập nhật resource, thông tin resource, file và custom fields được đồng bộ sang task loại Quản lý tài nguyên liên kết và ghi revision task nếu nội dung dùng chung thay đổi. Khi bỏ liên kết/xóa resource, task được giữ lại; liên kết bị gỡ và task có revision ghi nhận việc đó.

Khi tạo resource kèm task, thao tác được thực hiện cùng một lần lưu ở state phía client; nếu gặp lỗi, state được phục hồi từ snapshot trước lưu. Lịch sử và liên kết chỉ tồn tại trong storage trình duyệt. Không có transaction database/server.

## 7. Cây sơ đồ tổ

Graph thể hiện Lãnh đạo phòng → Tổ trưởng → nhánh nhóm chuyên môn; mỗi nhánh có Tổ phó/người phụ trách và thành viên. Nhóm hiển thị trong graph với khung và nhãn riêng. Nhân sự chưa thuộc nhóm hiển thị chung trong card chưa phân nhóm, có thể kéo sang nhóm. Kéo thả/chọn nhóm cập nhật nhóm hiện tại của Person. Nhóm CRUD và thành viên/loại nhân sự (cán bộ, tạm tuyển, hợp đồng) được quản lý theo quyền. Cấu trúc graph theo nhóm là quyết định mới nhất; nhánh chỉ theo chức vụ là nội dung cũ đã thay thế.

Chuyển nhóm không gỡ assignee khỏi task hiện có. Quy tắc mã, Nhóm quản lý task và lịch sử liên quan ở mục 3.4.

## 8. Kiến thức tổ

Danh sách bài kiến thức có cấp ban hành (Trung ương/Địa phương), cơ quan ban hành, loại văn bản, tiêu đề/nội dung, ngày và file đính kèm nếu có. Có filter theo cấp, cơ quan và loại; CRUD và xem chi tiết. Cơ quan/loại là metadata nội dung, không tự tạo văn bản trong danh mục văn bản trừ khi người dùng thao tác riêng ở danh mục.

Form hiện có số ký hiệu, loại văn bản, cấp, cơ quan, ngày ban hành, ngày hiệu lực, trích yếu và ghi chú/nguồn. Detail có các vùng thuộc tính, toàn văn, văn bản liên quan và tệp. Hành vi CRUD không được giới hạn rõ theo admin/user trong UI hiện tại; xem mục “Điểm cần xác nhận” dưới đây và không suy diễn đây là quyền đã chốt.

## 9. Nhân sự và tài khoản

Person và User là hai đối tượng riêng có thể liên kết. Admin quản lý hồ sơ, tài khoản, duyệt đăng ký và nhóm. Cây dùng hồ sơ Person; task assignment cần tài khoản phù hợp để đăng nhập. Chức vụ hiển thị không tạo quyền ngoài role admin/user.

Hồ sơ Person lưu tên, chức vụ, cấp graph, loại nhân sự (cán bộ/tạm tuyển/hợp đồng), nhóm chuyên môn, email, điện thoại và ghi chú. Xóa Person giữ User và gỡ liên kết `personId`. Tài khoản admin tạo có trạng thái approved; yêu cầu đăng ký công khai tạo tài khoản pending. User tạo từ hồ sơ/duyệt đăng ký không đồng nghĩa có mật khẩu.

## 10. Thông báo, lịch sử và tìm kiếm

Task mới: thông báo admin, assignee và actor, khử trùng người nhận. Thêm assignee: thông báo người mới. Người cùng nhóm chỉ xem không nhận thông báo giao việc. Có tab Tất cả/Chưa đọc, đánh dấu đọc; click mở chi tiết task và phải kiểm tra quyền.

Tìm kiếm toàn cục và tìm kiếm từng màn phải chỉ trả kết quả user được phép xem. Task revisions/lịch sử trạng thái, bình luận và chỉnh sửa nằm trong chi tiết task.

**Hiện trạng giao diện:** phím `/` đưa focus vào tìm kiếm toàn cục khi focus không ở input/textarea/select. Kết quả workspace search hiện tìm task theo title, mã, mô tả và aliases, có lọc quyền qua `visibleTasks()`; nó không phải tìm kiếm hợp nhất toàn bộ entity. Một implementation cũ trong `app-shell.js` từng tìm resource/catalog/person/knowledge, nhưng view override hiện hành dùng `workspaceSearch()` nên không được xem các loại đó là kết quả tìm kiếm toàn cục đang hoạt động.

Thông báo hiện chỉ được tạo từ luồng task create/assignment; không có bằng chứng mọi cập nhật resource/document/knowledge đều sinh notification. Drawer cho lọc tất cả/chưa đọc, đánh dấu từng mục hoặc tất cả đã đọc; click thông báo đánh dấu đã đọc và mở task tương ứng nếu task còn tồn tại/quyền cho phép.

## 11. Trang chính và thống kê

Trang chính hiển thị thông tin tổ (tên tổ, quân số từ nhân sự, số nhóm và người phụ trách), phiên bản Cloud Console 1.0, số task theo dõi và task trễ; có quick access và văn bản gần đây.

Trang chính tính summary task trong phạm vi được xem; các nút truy cập nhanh điều hướng tới task, resource, catalog, graph, knowledge và stats. Số quân số tính theo toàn bộ `state.people`, số nhóm theo nhóm chưa archive; tên tổ/phiên bản là nội dung tĩnh trong view.

Thống kê task tính summary theo task user được xem và áp dụng bộ lọc task đang có. Card “Tổng công việc” mở màn task với tab tổng. Theo nhóm quản lý là accordion có số task/hoàn thành/chậm muộn và bảng chi tiết. **Hiện trạng code:** widget Activity dùng năm bản ghi fixture tĩnh; lịch cố định tháng 11/2026, chọn ngày chỉ lọc Activity fixture. Không coi lịch/Activity là dữ liệu live, và nút đổi tháng chưa có đầy đủ logic thay đổi tháng trong implementation hiện tại.

## 12. Quyền

Ma trận chi tiết tại [PERMISSIONS.md](PERMISSIONS.md). Quy tắc cốt lõi: admin xem/sửa toàn cục; người tạo/assignee xem task; user thuộc nhóm quản lý hoặc nhóm assignee có thể xem task nhưng chỉ xem. User chỉ được chỉnh sửa các trường task theo vai trò đã nêu; admin hoặc người tạo được đổi due date. Nhóm chỉ lọc picker, không assign tự động.

**Hiện trạng:** role và quyền được mô phỏng phía client để hỗ trợ demo. Người dùng có thể sửa state hoặc đổi role qua công cụ trình duyệt; đây không phải ranh giới bảo mật. Không lưu mật khẩu máy chủ hoặc JWT.

## 13. Dữ liệu, migrations và giới hạn

Workspace hiện lưu trong localStorage `c12-workspace-v7`, session demo trong `c12-local-session`; theme/palette cũng lưu cục bộ. `demo-workspace.js` cung cấp seed ban đầu cho workspace trống, còn `seedTaskDemo()` và `migrateResourceColumnsV7()` có các bước augmentation/chuẩn hóa một lần theo version khi khởi chạy/mở view liên quan. Không còn MySQL seed, SQL migration, JWT hoặc Socket.IO trong source hiện hành. XLSX/Mammoth còn phụ thuộc CDN; tính năng phụ thuộc thư viện phải hiển thị lỗi rõ nếu thiếu. Không khẳng định parser/OCR ngoài phần code thực sự xử lý.

**Rủi ro dữ liệu đã biết:** augmentation `seedTaskDemo()` thay các resource có ID demo trùng `demo-resource-{mã nhóm}` bằng fixture mới, ngoài việc thêm dữ liệu demo khác. Migration V7 cũng dọn schema/record demo cũ và giảm mật độ một phần dữ liệu nhu cầu địa phương theo điều kiện nhận diện thay đổi. Vì vậy mở workspace cũ chưa có `demoSeedVersion >= 2` có thể thay đổi state cục bộ; đây không chỉ là seed khi kho trống. Sao lưu dữ liệu trước khi mở phiên bản code có migration nếu cần giữ mọi chỉnh sửa demo. Không tự xóa/reset localStorage để khắc phục lỗi và không giả định các migration hiện tại có rollback.

Không tự import hoặc xóa các localStorage key legacy. Các khóa tùy chọn giao diện hiện có: `c12-dark` (LIGHT/DARK), `c12-text-palette` (preset hoặc màu chữ tùy chọn), `c12-style` (dataset theme); màu accent/nền cá nhân lưu trong `state.themeByUser[session]` cùng workspace. Nền cá nhân nhận gradient, URL HTTPS hoặc ảnh tải lên tối đa 2 MB. Reset seed thay workspace qua UI sau xác nhận, không phải thao tác database.

### Điểm cần xác nhận khi thay đổi nghiệp vụ

- Quyền CRUD của User thường với Danh mục văn bản và Kiến thức tổ chưa được chốt thành ma trận rõ. Code UI hiện cho thao tác thêm/sửa/xóa ở một số luồng mà không kiểm tra `admin()` đồng nhất. Tài liệu ghi nhận hành vi này, không khẳng định đó là chuẩn phân quyền cuối.
- Ô mật khẩu/“Ghi nhớ đăng nhập” trên trang đăng nhập chưa có hành vi xác thực/lưu tương ứng; cần quyết định nếu muốn chuyển prototype thành đăng nhập thực.
- Tìm kiếm toàn cục hiện hành chỉ tìm task; các entity khác có tìm kiếm riêng theo màn. Nếu yêu cầu tìm kiếm hợp nhất, cần chốt loại entity và quyền hiển thị.
