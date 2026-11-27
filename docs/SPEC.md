# Đặc tả chuẩn — C12 / P4 - T1 Internal App

> Cập nhật 27/11/2026. Đây là nguồn nghiệp vụ chuẩn hiện hành. Hãy đọc cùng [INDEX.md](INDEX.md), [PERMISSIONS.md](PERMISSIONS.md), [TECH_ARCHITECTURE.md](TECH_ARCHITECTURE.md) và [FRONTEND_RULES.md](FRONTEND_RULES.md).
>
> Quy ước: **Chuẩn đã chốt** là yêu cầu người dùng xác nhận; **Hiện trạng code** là hành vi đọc thấy trong phiên bản hiện tại; **Lệch/chưa hỗ trợ** ghi rõ phần không nên suy diễn thành đã triển khai. Khi hai phần khác nhau, giữ nguyên chuẩn và báo khoảng lệch.

## 1. Sản phẩm và phân hệ

C12 / P4 - T1 Internal App là workspace nội bộ quản lý công việc, văn bản, tài nguyên, kiến thức và nhân sự. Giao diện dùng tiếng Việt, HTML, Tailwind CSS và JavaScript thuần; runtime gồm Node.js/Express, Socket.IO, MySQL và Nginx. Mô hình lưu state hiện tương thích bằng workspace JSON snapshot cùng các bảng domain mirror; không coi đây là mô hình quan hệ đã chuẩn hóa hoàn toàn.

Các view: Trang chính; For you (Công việc) gồm Quản lý công việc, Thống kê, Quản lý tài nguyên, Danh mục văn bản; Chuyên môn tổ gồm Kiến thức tổ và Cây sơ đồ tổ; Quản lý nhân sự dành cho admin. Header có tìm kiếm, chuyển LIGHT/DARK, chủ đề cá nhân, thông báo và tài khoản.

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

Quá hạn được tính theo thời điểm ngày + giờ/phút. Tại đúng due time chưa trễ; trễ một phần ngày tính 1 ngày, sau 24 giờ tính 2 ngày (ceiling theo khoảng thời gian quá hạn). Form tạo/sửa dùng thời gian local của trình duyệt; API so sánh timestamp ISO theo epoch UTC. Chưa có cấu hình timezone nghiệp vụ riêng cho ngày hạn.

### 3.3 Danh sách, bộ lọc, biểu đồ

Bốn tab tiếng Việt tương ứng Tổng công việc, Đang xử lý, Đã hoàn thành, Chậm muộn; tab là bộ lọc aggregate status, không phải workflow status. Không có Upcoming/Paused trong bộ tab chuẩn. Chuyển giữa Kanban và Table giữ cùng tập task đã lọc. Kanban luôn có đúng ba cột: Đang xử lý, Đã hoàn thành, Chậm muộn; task không khớp filter không xuất hiện nhưng khung cột giữ nguyên.

Bộ lọc phụ gồm tìm title/mã/ngày, Nhóm quản lý, Văn bản và loại task (Xử lý văn bản, Quản lý tài nguyên, Task thường). Chỉ tính task mà user được phép xem. Donut hiển thị ba aggregate status của phạm vi filter hiện hành; tổng ở tâm là số task trong phạm vi. Số lượng task nhiều assignee vẫn đếm một lần.

### 3.4 Mã task và chuyển nhóm

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

### Hiện trạng và khoảng lệch tài nguyên

- V7 lưu resource records riêng và hỗ trợ liên kết resource/task; quyền sửa resource xét admin, người tạo resource, hoặc người tạo/được giao ít nhất một task liên kết.
- Bộ lọc “Được giao cho tôi” lọc resource có task liên kết đang giao cho user hiện tại.
- Excel đang xuất từ dữ liệu lọc nhưng phần phụ lục đa hàng có thể chỉ lấy dòng đầu, nên chưa bảo đảm giống hệt bảng trong mọi trường hợp.
- Schema mặc định và schema động được lưu trong state phía trình duyệt (`resourceAppendixSchemas`); chưa có đồng bộ server hoặc bảo đảm phân quyền phía server.
- Mặc định sáu cột cho Công văn mới được suy ra khi render; state schema riêng chỉ được lưu khi có thay đổi schema. Nếu người dùng xóa hết cột của một Công văn, schema rỗng được lưu và nhóm header bị ẩn. Đây là hành vi code hiện tại; cần quyết định nếu nghiệp vụ muốn luôn giữ ít nhất một cột mặc định.
- Khi một văn bản đang được Resource/Task tham chiếu bị xóa, code lưu trữ thay vì hard-delete để giữ ID liên kết. Tuy vậy, bảng tài nguyên và bộ chọn chỉ lấy văn bản active; Công văn lưu trữ vì thế không còn nhóm appendix trong bảng/export dù liên kết và dữ liệu phụ lục vẫn còn trong state. Cần xác nhận có nên tiếp tục hiển thị nhóm archived/read-only để tránh dữ liệu bị khuất.

## 6. Lịch sử và liên kết Resource–Task

Resource là bản ghi độc lập, không phải projection từ task. Mỗi resource lưu revision có actor, thời điểm, thao tác, trường thay đổi và snapshot dữ liệu. Task resource lưu `resourceId`/`resourceData`; resource lưu `taskIds`. Màn chi tiết resource ghép lịch sử resource và revisions của các task liên kết thành timeline, cho phép mở chi tiết task. Khi cập nhật resource, thông tin resource, file và custom fields được đồng bộ sang task loại Quản lý tài nguyên liên kết và ghi revision task nếu nội dung dùng chung thay đổi. Khi bỏ liên kết/xóa resource, task được giữ lại; liên kết bị gỡ và task có revision ghi nhận việc đó.

Khi tạo resource kèm task, thao tác được thực hiện cùng một lần lưu ở state phía client; nếu gặp lỗi, state được phục hồi từ snapshot trước lưu. Đây không phải transaction database/server. Lịch sử và liên kết chỉ tồn tại trong storage trình duyệt.

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

Code hiện kiểm tra JWT/account status ở API; API cũng chặn một số thay đổi role, task và resource. Do UI đang ghi theo workspace snapshot, đối chiếu rule chi tiết trong `backend/src/modules/permissions.js`; không suy diễn mọi quyền đã được enforce hoàn toàn chỉ từ việc ẩn nút UI.

## 13. Dữ liệu, migrations và giới hạn

Không reset storage để đổi schema. SQL migration phải giữ dữ liệu đã có; database seed chỉ chạy khi chưa có workspace. Theo quyết định hiện hành, không import các khóa `c12-prototype-v*`; giữ nguyên chúng trên trình duyệt và dùng MySQL seed mới. Không tự dựng task/history hoặc timestamp ngoài bộ dữ liệu seed khai báo. JWT session nằm trong sessionStorage; tùy chọn theme vẫn dùng localStorage. Workspace và domain mirror lưu trong MySQL.

Socket.IO phát `workspace.updated` sau khi API commit MySQL thành công; không phát trước commit. API mutations hiện tập trung ở snapshot endpoint, chưa tách thành endpoint riêng cho từng form/use case. XLSX/Mammoth còn phụ thuộc CDN; tính năng phụ thuộc thư viện phải hiển thị lỗi rõ nếu thiếu. Không khẳng định parser/OCR ngoài phần code thực sự xử lý.
