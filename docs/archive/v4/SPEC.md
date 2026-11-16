# Đặc tả chức năng nháp

## Sơ đồ màn hình đã nêu

```text
Đăng nhập / Đăng ký
Ứng dụng
├── Trang chính: giới thiệu, quick access
├── Chuyên môn tổ
│   ├── Kiến thức tổ
│   └── Cây sơ đồ tổ
├── Quản lý nhân sự [chỉ admin; vị trí điều hướng chưa chốt]
└── Văn bản/Tài nguyên
    ├── Thống kê [để sau]
    ├── Quản lý văn bản, tài nguyên
    └── Danh mục văn bản/công văn
```

Header dùng chung gồm menu, title, tìm kiếm, sáng/tối, tài khoản. Chưa chốt tìm kiếm toàn cục có tìm toàn bộ phân hệ hay chỉ chuyển trang.

## Triển khai giai đoạn 1 đã chốt

HTML + Tailwind + vanilla JavaScript, không React; có thể thêm thư viện thiết kế. Gallery ở `design/index.html`; prototype ở `frontend/index.html`, `app.js`, `styles.css`, trạng thái lưu localStorage. Preview local, không deploy. Đây là các đầu ra đang triển khai, không mặc định đã kiểm thử.

Auth/role là mô phỏng luồng, không phải kiểm soát truy cập thật. localStorage không đồng bộ nhiều user/thiết bị; yêu cầu schema dùng chung mọi user chỉ mô phỏng trong một kho demo. MVP mới thực thi quyền/lưu trữ dùng chung phía máy chủ. Chỉ mô tả parser/trích xuất theo khả năng đã kiểm chứng; không mặc định AI/OCR.

## Vai trò đã chốt

Chỉ có `admin` và `user`. Admin tạo tài khoản trực tiếp, duyệt đăng ký user; có trang Quản lý nhân sự với CRUD chỉ dành cho admin, và là vai trò duy nhất được cập nhật cây nhân sự Chuyên môn tổ. Không thêm editor/viewer. Quyền còn lại phải được hỏi rõ, không suy từ chức danh nhân sự. Prototype thể hiện trạng thái quyền trong giao diện; MVP sau phải kiểm tra quyền phía máy chủ.

**Quyền nội dung bổ sung đã chốt:** cả admin/user đều CRUD dữ liệu tài nguyên, Danh mục văn bản và upload tệp, ngoài quyền custom fields/kiến thức đã xác nhận. Điều này không mở quyền quản lý nhân sự/cây cho user. Ngữ nghĩa xóa dữ liệu liên quan, snapshot và tệp chưa chốt.

## Quản lý nhân sự và liên kết tài khoản

**Đã chốt:** Quản lý nhân sự là trang riêng chỉ admin, có tạo, xem, sửa, xóa hồ sơ. Hồ sơ nhân sự độc lập với tài khoản nhưng có liên kết; một hồ sơ có thể chưa có tài khoản. Khi duyệt đăng ký, admin được liên kết với hồ sơ sẵn có hoặc tạo hồ sơ mới để tránh trùng.

**Đề xuất:** luồng duyệt hiển thị thông tin đăng ký, kết quả đối chiếu hồ sơ và hai lựa chọn liên kết/tạo mới; yêu cầu xác nhận hồ sơ được chọn trước khi hoàn tất. Đối chiếu chỉ là gợi ý, không tự hợp nhất hồ sơ.

**Chưa chốt:** trường hồ sơ, khóa đối chiếu trùng, cardinality giữa tài khoản và nhân sự, trạng thái chờ duyệt/từ chối, quyền người dùng sửa hồ sơ bản thân, xóa tài khoản có giữ/tách/xóa hồ sơ không, xóa nhân sự có ảnh hưởng tài khoản/cây tổ không. Không mặc định xóa dây chuyền.

## Quản lý văn bản, tài nguyên

**Đã nêu:** lọc theo tháng, số văn bản, cấp quản lý; xóa lọc; phóng to/thu nhỏ vùng bảng; thêm dòng và cột; tải Word/Excel; mở sidebar chi tiết khi chọn dòng.

**Đã chốt vị trí thao tác:** nút **Thêm cột** ở trên cùng bên phải vùng bảng; cả **Thêm cột** và **Thêm hàng** ở dưới cùng bên trái vùng bảng. Không thay cặp nút dưới bằng một menu hoặc chỉ giữ một vị trí Thêm cột.

**Đã chốt lọc số công văn:** chọn số 952 thì giữ các dòng có 952 trong ô Công văn đăng ký; trên dòng khớp vẫn hiển thị toàn bộ thông tin, gồm nhóm 4651/các công văn khác nếu có. Không dùng bộ lọc số để ẩn nhóm cột khác. Khớp chính xác/gần đúng của input vẫn cần xác định nếu UI hỗ trợ nhập tự do.

Ví dụ bắt buộc: dòng đăng ký **952 + 4651** được giữ và hiện cả hai nhóm; dòng **4267-only** bị loại. Giữ mọi nhóm chỉ áp dụng cho các dòng đã khớp 952, không có nghĩa giữ các dòng không đăng ký 952.

**Lọc tháng:** căn cứ uploadedAt đã chốt. Phương án chọn dòng có lần upload thuộc tháng và giữ mọi nhóm trên dòng là **đề xuất**; ví dụ user dùng số công văn không đủ để khẳng định cùng ngữ nghĩa match-row cho tháng.

**Quyết định cuối thay thế append dòng:** cùng cặp Tên đơn vị + Cơ quan quản lý và cùng Hệ thống gộp **một dòng hiển thị**. Ô Công văn đăng ký nhiều số. Mỗi lần Xác nhận nhập vẫn thêm event/snapshot và mốc timeline mới, kể cả nhập lại cùng công văn; không nhân đôi dòng hiển thị của hệ thống đã có. Dòng thuộc đúng nhóm Tên đơn vị; các nhóm sắp alphabet. Khi nhập lại công văn, nhóm cột hiển thị bản được xác nhận nhập mới nhất; phiên bản cũ còn trong timeline.

**Nhóm cột đã được làm rõ:** mỗi công văn có nhóm ngang với schema riêng, không bắt buộc cùng tập cột. Số liệu mỗi công văn là **tổng nhu cầu tại thời điểm đó**, không phải delta và không được cộng dồn giữa các công văn để tính tổng nhu cầu.

### Đối chiếu workbook test.xlsx

Nguồn do root đã kiểm tra: `Sheet1!A1:AG9`, header 4 tầng. A:E là STT, Tên đơn vị, Cơ quan quản lý, Hệ thống, Công văn đăng ký. Nhóm 952 ở F:M; nhóm 4651 ở N:AG.

| Nhóm | Schema xác thực từ workbook |
| --- | --- |
| 952 | vCPU; RAM; Disk Block/File Storage/Object; License; ATTT; Kênh |
| 4651 | vCPU; RAM; GPU; Disk Block SSD/HDD, File Storage SSD/HDD, Object; Sizing ba vùng DMZ/DB/APP; License thương mại; Kênh; ATTT; Kế hoạch; Thời gian đề nghị theo 4267; Đặc thù; Danh mục; Ghi chú |

Ví dụ đối chiếu row 6: Cà Mau / VP UBND tỉnh / Hệ thống quản lý văn bản và điều hành; E6 là 952 và 4651. Nhóm 952 có vCPU 900, RAM 1600; nhóm 4651 có vCPU 576, RAM 1536, Block SSD 24. Đây là ví dụ cấu trúc được cung cấp, không phải dữ liệu đã nhập vào app.

| Nhóm | Trường tham chiếu từ ảnh | Kiểu dữ liệu đề xuất |
| --- | --- | --- |
| Nhận diện | STT | Số thứ tự hiển thị, không làm khóa bản ghi |
| Chủ thể | Tên đơn vị, Cơ quan quản lý, Hệ thống | Tham chiếu danh mục hoặc chuỗi; cần chốt |
| Văn bản | Công văn đăng ký | Một ô liệt kê nhiều số; mỗi công văn ánh xạ nhóm cột/schema riêng |
| Tài nguyên | vCPU, RAM (GB) | Số không âm; cần chốt số nguyên/thập phân |
| Disk (TB) | Block, File Storage, Object | Số không âm; cần chốt đơn vị và quy đổi |
| Phần mềm | License | Văn bản hoặc danh sách license có cấu trúc; cần chốt |
| Tùy biến | Do người dùng bổ sung | Đề xuất text, number, date, select, URL |

### Hai nhóm trường tùy biến độc lập

**Đã chốt:** table fields chứa thông tin quan trọng và chỉ hiển thị ở bảng. Drawer fields chứa thông tin bổ sung ít quan trọng hơn và chỉ hiển thị trong sidebar chi tiết. Thêm trường tại nơi nào không tự tạo hoặc hiển thị trường tại nơi còn lại; không tự đồng bộ giá trị hay tự nâng drawer field thành cột bảng. Các trường hệ thống cố định không nằm trong quy tắc tách custom fields này.

**Đã chốt quyền/scope:** cả admin và user đều được thêm, sửa, xóa cột bảng và trường sidebar. Schema cột bảng dùng chung toàn bộ dòng và mọi user; mỗi dòng lưu giá trị riêng, chỉ hiển thị ở bảng. Trường sidebar chỉ thuộc mốc timeline đang chọn, không lan sang mốc hoặc hệ thống khác và chỉ hiển thị sidebar. Không suy quyền custom fields thành quyền CRUD toàn bộ nội dung của các phân hệ khác.

**Đã chốt vị trí cột mới:** form Thêm cột cho chọn cột chung hoặc thuộc nhóm công văn cụ thể; không mặc định mọi cột mới nằm cuối bảng ngoài nhóm. Schema cột vẫn dùng chung mọi dòng/user trong vị trí được chọn.

**Chưa chốt:** đổi kiểu dữ liệu, xử lý dữ liệu cũ, quy tắc xác nhận/khôi phục khi xóa cột có giá trị và xung đột sửa đồng thời.

**Đã chốt drawer tài nguyên:** phạm vi là cặp **Tên đơn vị + Cơ quan quản lý**, không chỉ hệ thống hoặc row đang click. Header title gồm hai tên. Drawer có danh sách các Hệ thống trong cặp đó; chọn hệ thống để xem timeline các lần cập nhật công văn; chọn mốc để xem snapshot gồm các cặp nhãn/giá trị và custom fields. Mốc đang chọn nổi bật; có thao tác thêm trường thông tin mới.

**Đã chốt hướng bố cục:** danh sách hệ thống bên trái, timeline ở giữa, chi tiết bên phải, đúng ảnh tham chiếu. Drawer là ngăn bên phải ứng dụng. Ngày ban hành công văn là trường trong vùng chi tiết phải.

**Đề xuất tương tác:** cố định header bảng; cuộn ngang trong bảng khi cần; nhãn cột thể hiện đơn vị; phân nhóm theo đơn vị thay cho ô gộp nếu phù hợp. Drawer đóng bằng nút và Esc; cảnh báo khi bỏ thay đổi chưa lưu. Các phần ngoài snapshot như văn bản liên quan vẫn là đề xuất.

**Đã chốt mốc và thời gian:** sau khi trích xuất, người dùng xem trước, sửa và bổ sung. Chỉ bấm **Xác nhận nhập** mới tạo event/snapshot và mốc timeline, kể cả nhập lại; dòng hiển thị gộp theo đơn vị + cơ quan + hệ thống. Mốc dùng timestamp upload ban đầu, hiển thị đủ `dd/MM/yyyy HH:mm:ss`; timestamp xác nhận lưu riêng. Lọc tháng theo timestamp upload, không theo ngày ban hành. Chưa xác nhận thì chưa ghi dữ liệu nghiệp vụ.

**Chưa chốt:** tìm số văn bản chính xác hay gần đúng; bộ ngành/địa phương là thuộc tính đơn vị hay văn bản; sửa snapshot sau nhập có tạo mốc mới không. Timeline đã chốt theo hệ thống được chọn trong đúng cặp đơn vị + cơ quan, không theo từng row riêng. Không mặc định mọi lần lưu tạo một mốc; trường sidebar đã chốt chỉ ở mốc đang chọn, không áp dụng cho các mốc khác.

## Nhập tài liệu

Luồng DOCX đã chốt: mở sidebar hoặc popup → nhập/chọn đơn vị, cơ quan quản lý, hệ thống, công văn → upload và ghi timestamp → trích xuất → xem trước/sửa/bổ sung → **Xác nhận nhập** → thêm event/snapshot và mốc mới, lưu timestamp xác nhận riêng. Bảng gộp theo đơn vị + cơ quan + hệ thống; chỉ hệ thống chưa có mới cần dòng hiển thị mới. Excel theo cùng cổng preview/xác nhận; cấu trúc mẫu test.xlsx đã xác thực, mapping tổng quát chưa chốt. Không ghi dữ liệu nghiệp vụ trước xác nhận.

**Đã chốt:** preview cho sửa/bổ sung trước xác nhận; timeline giữ timestamp upload ban đầu dù xác nhận muộn hơn. Lần nhập lại vẫn có event/snapshot riêng trong lịch sử, đồng thời cùng hệ thống được gộp một dòng hiển thị. **Đề xuất:** không tự tạo/ghi đè danh mục khi chưa rõ quy tắc; giữ dữ liệu người dùng điền khi xử lý thất bại. Không loại bỏ lịch sử vì trùng công văn/hệ thống.

**Chưa chốt:** có hỗ trợ thêm `.doc` ngoài `.docx` và `.xls` ngoài mẫu `.xlsx` không; mapping tổng quát nhiều sheet/ô gộp/schema ngoài mẫu; tệp quét/mật khẩu; dung lượng; chuẩn hóa tên; lưu tệp gốc/thời hạn lưu. Không mặc định cần OCR/AI. Nhập lại vẫn giữ lịch sử và không thêm dòng hiển thị trùng; bảng lấy bản được xác nhận nhập mới nhất, bản cũ xem qua timeline.

## Danh mục văn bản/công văn

Các cột đã nêu: STT, Số, Ngày, Trích yếu. Có tìm kiếm và thêm mới; chọn dòng mở sidebar phải.

**Đề xuất:** trường Số lưu dạng chuỗi để giữ dấu gạch, số 0 và ký hiệu; Ngày lưu dạng ngày, hiển thị theo ngày/tháng/năm. Thông tin bắt buộc và quy tắc số văn bản trùng chưa chốt. Các trường khác trong sidebar cần phỏng vấn.

## Kiến thức tổ và sơ đồ tổ

Kiến thức tổ dùng card tên văn bản và trích yếu; ví dụ do người dùng đưa chỉ là nội dung minh họa chưa xác minh. Chưa chốt quản lý phiên bản, trạng thái hiệu lực, chính sách lưu/loại/dung lượng tệp và liên kết danh mục; quyền CRUD bài/tệp đã chốt bên dưới.

**Đã chốt quyền:** cả admin/user đều thêm, sửa, xóa bài Kiến thức và tệp đính kèm. Quy tắc loại/dung lượng/lưu trữ tệp, phiên bản nội dung và liên kết kho văn bản chưa chốt.

Cây tổ có thứ bậc lãnh đạo quản lý/phụ trách → chỉ huy tổ → phó chỉ huy → cán bộ/tạm tuyển/hợp đồng. Click mở sidebar nhân sự. **Chưa chốt:** các loại cuối là nhóm hay thuộc tính của người; có nhiều lãnh đạo, vị trí trống, kiêm nhiệm, lịch sử hay không.

## Mô hình dữ liệu đề xuất

| Thực thể | Nội dung | Quan hệ chưa chốt |
| --- | --- | --- |
| User, Role, Membership | Tài khoản; hai role admin/user; phạm vi tổ chưa chốt | Cardinality với Person, vòng đời và phạm vi quyền |
| Unit, Authority, System | Đơn vị, cơ quan, hệ thống | Cardinality và lịch sử chuyển quản lý |
| Document, Attachment | Số/ngày/trích yếu, tệp gốc | Dùng chung cho công văn và kiến thức hay tách |
| SystemDisplayRow | Một dòng tổng hợp theo đơn vị + cơ quan + hệ thống; nhiều số công văn và nhóm schema riêng | Chuẩn hóa khóa; mỗi nhóm công văn lấy bản xác nhận mới nhất |
| ResourceSnapshot, ImportEvent | Mỗi lần Xác nhận nhập tạo lịch sử mới; nhóm bảng lấy bản xác nhận mới nhất, không phải một snapshot một dòng | Chỉnh sửa sau nhập, số liệu thiếu và đồng thời |
| LatestConfirmedProjection | Snapshot được xác nhận mới nhất theo đơn vị + cơ quan + hệ thống + công văn; bản cũ giữ trong timeline | Xử lý xác nhận đồng thời/timestamp bằng nhau |
| DocumentGroupSchema | Cấu trúc cột phân cấp riêng của từng công văn, ví dụ 952 khác 4651 | Quản trị schema, mapping tổng quát |
| TimelineEntry | Mốc mới khi Xác nhận nhập; xem theo hệ thống trong cặp đơn vị + cơ quan; thời gian hiển thị là uploadedAt ban đầu | Sự kiện khác có tạo mốc không |
| Import timestamps | uploadedAt (upload), confirmedAt (xác nhận); ngày ban hành công văn là documentDate riêng | Chính sách upload lại/hủy và thời hạn giữ nháp |
| TableFieldDefinition, TableFieldValue | Schema dùng chung mọi dòng/user; giá trị riêng từng dòng; chỉ hiện bảng; cả admin/user có thêm/sửa/xóa | Đổi kiểu, phiên bản, xóa dữ liệu cũ và đồng thời |
| DrawerFieldDefinition, DrawerFieldValue | Chỉ thuộc mốc timeline đang chọn; độc lập mốc/hệ thống khác và table fields; cả admin/user có thêm/sửa/xóa | Đổi kiểu, xóa/khôi phục, đồng thời |
| Position, Person, Assignment | Cấu trúc tổ; hồ sơ Person tách khỏi User, có thể chưa có tài khoản | Kiêm nhiệm, hiệu lực theo thời gian, cardinality/liên kết và quy tắc xóa |
| ImportJob, ImportItem | Trạng thái nhập và bản ghi dự kiến | Lưu vết và chính sách thử lại |

Đây là mô hình khái niệm phục vụ trao đổi, chưa phải schema triển khai.
