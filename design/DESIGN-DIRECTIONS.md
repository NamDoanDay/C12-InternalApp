# C12 / P4 - T1 Internal App — Bốn hướng giao diện

Trạng thái: đã tạo gallery chạy thật tại `design/index.html`, gồm bốn hướng có light/dark và responsive. Các quyết định sản phẩm đã xác nhận bên dưới ưu tiên hơn wireframe ý tưởng ban đầu. Gallery dùng HTML/CSS/JS thuần, không cần build, không dùng CDN; frontend trải nghiệm dùng HTML + Tailwind + JS theo lựa chọn người dùng. Không giả định đăng nhập, trích xuất văn bản, lưu dữ liệu hay phân quyền đã có backend.

## Quyết định đã xác nhận sau phỏng vấn

- Bảng gộp một dòng theo khóa **Tên đơn vị + Cơ quan quản lý + Hệ thống**, sắp đơn vị alphabet. Đây là quyết định cuối cùng, thay thế phương án trung gian tạo dòng mới mỗi lần nhập. Công văn liên kết nhiều ID; mỗi công văn có nhóm cột và schema riêng, không giả định mọi nhóm cùng vCPU/RAM/Disk/License. Trong bảng hiện dữ liệu mới nhất theo từng công văn, phiên bản cũ ở timeline. Mỗi công văn mô tả **tổng nhu cầu tài nguyên tại thời điểm công văn**, không phải phần tăng thêm; không cộng các nhóm công văn để tính tổng hiện tại.
- Các hình/wireframe bên dưới là phương án ban đầu; khi dựng preview phải áp dụng bảng nhóm ngang này cho cả bốn hướng. Hướng B có thể lọc công văn đang xem, nhưng phải giữ đường trở lại bảng so sánh đầy đủ, không biến một hệ thống thành nhiều dòng.
- Click row mở drawer ba cột: **hệ thống bên trái → timeline ở giữa → thông tin chi tiết bên phải**. Title/subtitle ở đầu thể hiện đơn vị và cơ quan quản lý; hệ thống đang chọn hiện rõ trong cột trái và vùng chi tiết. Marker timeline đang chọn nổi bật; thông tin là cặp nhãn–giá trị theo hàng, có nút “Thêm trường thông tin mới”. Ảnh chỉ làm tham chiếu bố cục, không sao chép nội dung hoặc dữ liệu progress.
- Chỉ có hai vai trò `admin` và `user`. Admin thêm/quản lý user, duyệt đăng ký, và độc quyền chỉnh sửa cây tổ. Chưa suy ra quyền sửa dữ liệu tài nguyên hay quản lý trường động từ vai trò này.
- Hồ sơ nhân sự tách khỏi tài khoản đăng nhập và có liên kết tài khoản. Không bắt buộc mọi người trên cây tổ phải có tài khoản; không đồng nhất xóa tài khoản với xóa hồ sơ nhân sự.
- Mốc timeline dùng ngày giờ tải lên; mỗi lần nhập có bản lịch sử riêng dù khóa dữ liệu trùng. Thêm cột cho phép chọn vị trí cột chung hoặc trong một nhóm công văn. Không lẫn thời điểm upload với ngày ban hành công văn.
- Cả admin và user đều có CRUD kiến thức tổ. Nhóm cột tài nguyên nhiều tầng của workbook, bao gồm nhóm 4651 tại N:AG và GPU, phải được tôn trọng trong frontend; gallery rút gọn một số cột nhằm so sánh hình ảnh, không thay thế schema workbook.
- Admin/user đều có CRUD dữ liệu tài nguyên, danh mục và upload. Lọc số công văn chọn các dòng có Công văn đăng ký khớp số; vẫn giữ toàn bộ nhóm cột công văn của các dòng được chọn. Không giữ các dòng không đăng ký công văn đang lọc.

### Drawer chi tiết hệ thống — cập nhật bố cục

```text
┌ Tên đơn vị                                  [Đóng] ┐
│ Cơ quan quản lý                                    │
├ Hệ thống ──────┬ Lịch sử tải lên ┬ Chi tiết ────────┤
│ Hệ thống chọn  │ ● Ngày + giờ   │ Nhãn      Giá trị │
│ Hệ thống khác  │ │             │ Nhãn      Giá trị │
│                │ ○ Ngày + giờ  │ Nhãn      Giá trị │
│                │ │             │                   │
│                │ ○ Ngày + giờ  │ [+ Thêm trường]   │
└────────────────┴───────────────┴───────────────────┘
```

Mốc được chọn thể hiện bằng vị trí marker, chữ/weight và trạng thái accessible, không chỉ màu. Timeline dùng button ngày giờ upload; focus đi theo thứ tự thời gian. Trên drawer hẹp, ba cột chuyển dọc: chọn hệ thống, chọn mốc rồi xem nhãn–giá trị. Giá trị dài xuống dòng; nhãn gắn giá trị bằng description list. Gallery ghi rõ mốc và dữ liệu là minh họa; frontend phải hiển thị snapshot lịch sử tương ứng.

## Cơ sở thiết kế

Ảnh Google Cloud Console là tham chiếu cho cấu trúc: header công cụ, navigation bên trái, workspace dữ liệu, bảng ít trang trí và ngăn chi tiết bên phải. Ảnh bảng Excel là tham chiếu cho cấu trúc thông tin, không phải yêu cầu giữ nền đỏ hoặc gộp ô trên web.

Đã chạy UI/UX Pro Max với `enterprise document management dashboard --design-system --density 8`. Kết quả Flat Design có thể dùng cho độ rõ và ít hiệu ứng; phần landing page, typography kiểu thư viện cổ điển và màu giáo dục không phù hợp nên không áp dụng. Đã thử lại một lần với `enterprise data console --design-system --density 8`. Kết quả Minimalism & Swiss Style, palette enterprise xanh và layout grid phù hợp cho console; phần Hero + Features + CTA vẫn là mẫu landing page nên loại bỏ. Các token bên dưới là thiết kế đề xuất riêng, không phải kết quả database nguyên trạng. Stack đã chốt HTML + Tailwind + JS; đã truy vấn stack cho responsive table/dialog.

Truy vấn stack `responsive table dialog` và lần thử lại `responsive` đều không có kết quả xác minh trong database. Vì vậy responsive/dialog của gallery dùng các quy tắc UX chung trong quick-reference (focus, native dialog, cuộn bảng cục bộ, labels, reduced motion), không tuyên bố là stack recommendation trả về từ database.

## Khung thông tin chung

Navigation đề xuất:

```text
Trang chính
Văn bản/Tài nguyên
  Thống kê                 [chưa thiết kế chi tiết]
  Quản lý văn bản, tài nguyên
  Danh mục văn bản/công văn
Chuyên môn tổ
  Kiến thức tổ
  Sơ đồ tổ
```

Header: nút đóng/mở navigation, tên đầy đủ `C12 / P4 - T1 Internal App`, tìm kiếm, light/dark, tài khoản. Trên màn hình hẹp tên được xuống dòng hoặc rút gọn phần hiển thị có chủ đích; accessible name vẫn đầy đủ. Search toàn cục phải phân biệt với bộ lọc bảng. Không dùng cùng một trường cho hai tác vụ nếu chưa chốt hành vi.

Màn hình tài nguyên có tiêu đề và mô tả ngắn; toolbar Thêm dòng, Thêm cột, Tải lên, Toàn màn hình; filter Tháng, Số văn bản, Cấp quản lý và Xóa bộ lọc. Bảng ban đầu: STT, Tên đơn vị, Cơ quan quản lý, Hệ thống, Công văn, vCPU, RAM (GB), Disk (TB: Block / File Storage / Object), License. Các cột động đặt sau nhóm cố định. Dữ liệu demo phải ghi rõ là minh họa.

## A. Cloud Console — hướng đề xuất ban đầu

Gần tham chiếu nhất, phù hợp người dùng cần chuyển từ Excel sang console quen thuộc. Sidebar liền với nền app; workspace là bề mặt riêng, chỉ bo góc ngoài vùng nội dung. Không biến mọi nhóm thành card.

| Token | Light | Dark |
|---|---|---|
| App | #F0F4F9 | #20252D |
| Surface | #FFFFFF | #303740 |
| Text | #202124 | #E8EAED |
| Muted | #5F6368 | #BDC4CE |
| Action | #0B57D0 | #A8C7FA |
| Border | #C9D2DF | #5D697A |

Type: Roboto hoặc fallback Arial có đầy đủ tiếng Việt; title 22/28 medium, body 14/20, form 16/24, table 14/20, số dùng tabular numerals. Sidebar 256px; header 64px; hàng bảng chuẩn 44px, compact 36px là tùy chọn desktop; drawer 440px. Nội dung căn trái, số căn phải. Selected row có fill xanh nhẹ và chỉ báo cạnh trái.

```text
┌ menu  C12 / P4 - T1 Internal App   [Tìm kiếm]   mode account ┐
│ Navigation │ Quản lý văn bản, tài nguyên       [+] [Upload] │
│ Văn bản ▾  │ [Tháng] [Số văn bản] [Cấp] [Xóa]  [Toàn màn] │
│  Quản lý   │ STT Đơn vị Cơ quan Hệ thống │ vCPU RAM Disk...│
│  Danh mục  │  1  Cà Mau ...             │ 272  384 ...    │
│ Chuyên môn │  2  ...                   │                 │
└────────────┴───────────────────────────┴─────────────────┘
```

Điểm đặc trưng: sử dụng khung console cho công việc quản trị hạ tầng; nhóm Disk thành header hai tầng, không nhuộm toàn bộ hàng đỏ. Đổi sang dark không đổi mật độ hoặc vị trí thao tác.

## B. Hồ sơ điều hành — nhấn mạnh văn bản và công văn

Phù hợp khi công việc thường bắt đầu từ số công văn rồi đối chiếu tài nguyên. Navigation tối màu hẹp, workspace sáng; panel trái trong trang giữ danh sách công văn, bên phải là bảng thuộc công văn đang chọn. Một công văn được trình bày như hồ sơ có ngày, trích yếu và file gốc, thay vì nhãn rải trong mỗi cell. Phải có chế độ xem toàn bộ bảng để không khóa người dùng vào từng hồ sơ.

| Token | Light | Dark |
|---|---|---|
| App | #EEF2F6 | #171F2A |
| Surface | #FFFFFF | #243141 |
| Text | #172C43 | #EDF3F9 |
| Muted | #53677A | #B8C8D8 |
| Action | #176B5B | #8DD6BF |
| Border | #BCCAD6 | #52677B |

Type: Source Sans 3 cho UI và nội dung; title 24/30 semibold, body 15/22, table 14/20. Sidebar 224px; danh sách hồ sơ 280px, ẩn được; drawer rộng 480px. Hàng 48px, trích yếu tối đa hai dòng trong danh sách. Căn trái và hierarchy bằng weight, không dùng serif trang trí.

```text
┌ menu  C12 / P4 - T1 Internal App      [Search] mode account ┐
│ Nav │ Quản lý tài nguyên      [Tất cả dữ liệu] [Tải lên]    │
│     ├ Công văn ─────┬ Công văn 952   [File gốc] [Chi tiết] │
│     │ [Tìm số...]  │ [Tháng] [Cấp] [Xóa]                 │
│     │ 952 ...      │ Hệ thống │ Đơn vị │ vCPU │ RAM ...   │
│     │ 4651 ...     │ ...      │ ...    │ ...  │           │
└─────┴──────────────┴──────────────────────────────────────┘
```

Điểm khác biệt thực chất: điều hướng theo hồ sơ làm thay đổi điểm bắt đầu tác vụ. Áp dụng quan hệ đã chốt: mỗi hệ thống một dòng, công văn là nhóm cột tổng nhu cầu theo thời điểm; chọn hồ sơ chỉ đổi phạm vi nhóm công văn hiển thị.

## C. Bàn làm việc dữ liệu — tối ưu xử lý bảng

Phù hợp khi nhập, lọc, chỉnh dữ liệu hàng ngày chiếm phần lớn thời gian. Header tối giản; command bar nằm sát bảng; có thanh trạng thái số dòng và bộ lọc. Nội dung tối đa chiều rộng. Drawer chi tiết có thể ghim ở desktop; bảng giữ vị trí cuộn khi đóng ngăn.

| Token | Light | Dark |
|---|---|---|
| App | #F3F5F8 | #181B22 |
| Surface | #FFFFFF | #252A34 |
| Text | #252638 | #EDF0FA |
| Muted | #62657A | #BCC1D2 |
| Action | #5145A5 | #C0B7FF |
| Border | #C9CBD8 | #5C6074 |

Type: IBM Plex Sans cho UI, không dùng monospace cho toàn bảng; title 20/26 semibold, body/table 14/20, metadata 13/18. Sidebar 232px hoặc rail 64px; header 56px; table header 40px; rows 40px; drawer 420px. Số căn phải. Vùng table có horizontal scroll cục bộ; trang không tràn ngang. Có tùy chọn hiện/ẩn cột để giảm nhu cầu cuộn.

```text
┌ menu  C12 / P4 - T1 Internal App  [Search]   mode account ┐
│ Nav │ Quản lý văn bản, tài nguyên                       │
│     │ [+ Dòng] [+ Cột] [Upload] [Cột hiển thị] [⛶]      │
│     │ [Tháng] [Số] [Cấp] [Xóa]                         │
│     │ STT Đơn vị Cơ quan Hệ thống Công văn vCPU RAM ...│
│     │ ...                                             │
│     │ 12 dòng • Bộ lọc đang áp dụng                    │
└─────┴───────────────────────────────────────────────────┘
```

Điểm đặc trưng: công cụ xử lý bảng giữ ưu tiên thị giác. Chưa bật sửa trực tiếp cell nếu chưa chốt quyền, lịch sử và cách lưu; click row luôn mở chi tiết theo brief.

## D. Không gian tổ — ưu tiên con người và chuyên môn

Phù hợp nếu trang chính là cổng dùng hàng ngày của cả tổ, ngoài tác vụ quản lý tài nguyên. Header sáng, sidebar phân nhóm rõ; trang chính có phần giới thiệu ngắn, quick access theo tác vụ và danh sách mới cập nhật. Trang sơ đồ tổ dùng cấu trúc cây gọn, node là con người có chức danh; bảng tài nguyên vẫn giữ console rõ ràng. Không đưa thống kê giả vào trang chính.

| Token | Light | Dark |
|---|---|---|
| App | #F1F5F8 | #1B2730 |
| Surface | #FFFFFF | #2A3A45 |
| Text | #163342 | #E9F2F5 |
| Muted | #546C78 | #BDCFD7 |
| Action | #006C80 | #8ED7E8 |
| Border | #B9CCD4 | #57717F |

Type: Be Vietnam Pro cho UI và nội dung tiếng Việt; title 24/32 semibold, body 15/24, table 14/20. Sidebar 248px; header 64px; card kiến thức radius 12px; bảng radius 0 trong surface; drawer 440px. Trang chính căn trái, quick access có nội dung và hành động khác biệt, không lặp grid thẻ thống kê.

```text
┌ menu  C12 / P4 - T1 Internal App  [Search] mode account ┐
│ Nav │ Không gian làm việc của tổ                       │
│     │ Giới thiệu ngắn về nhiệm vụ và phạm vi hệ thống  │
│     │ [Tra cứu tài nguyên] [Tra cứu công văn]          │
│     │ [Kiến thức tổ]       [Sơ đồ tổ]                  │
│     │ Văn bản mới cập nhật / mục đã xem gần đây        │
└─────┴──────────────────────────────────────────────────┘
```

Điểm khác biệt thực chất: trang chính và navigation hỗ trợ nhu cầu khám phá kiến thức, nhân sự trước; trang dữ liệu có mức độ chặt chẽ tương đương A.

## Quy tắc tương tác áp dụng cả bốn hướng

- Navigation toggle có trạng thái mở/đóng được đọc bởi screen reader; mục cha có chevron riêng và giữ nguyên trạng thái submenu khi đổi trang.
- Click row mở drawer. Checkbox hoặc hành động trong hàng không đồng thời mở drawer. Drawer có tiêu đề, nút đóng, vùng cuộn riêng; Esc đóng và trả focus về row kích hoạt. Khi có sửa chưa lưu phải chọn lưu hoặc bỏ thay đổi.
- Trên desktop rộng drawer đẩy workspace nếu còn đủ chỗ; trên màn hình hẹp drawer thành overlay hoặc trang chi tiết full width. Không ép bảng và drawer vào màn hình 375px.
- Header bảng và các cột định danh đầu có thể sticky; giữ header nhóm công văn ngang, trong mỗi nhóm có các chỉ tiêu tài nguyên. Không dùng merge cell trong body để giữ sorting/filter theo từng hệ thống rõ ràng.
- Mỗi trường động có tên, kiểu dữ liệu, phạm vi áp dụng; không cho hai cột cùng khóa. Thêm trường vào một hồ sơ phải khác hành động tạo cột cho toàn hệ thống.
- Upload có bước chọn file và metadata → đọc file → xem trước dữ liệu trích xuất/mapping → xác nhận nhập → kết quả thành công/lỗi. Không ghi dữ liệu ngay khi chọn file. Các giá trị thiếu hoặc không chắc chắn có cảnh báo bằng chữ.
- Bảng số liệu có unit trong header, không gắn đơn vị vào mọi cell; vCPU/RAM/Disk có validation số và giá trị thiếu phân biệt 0. Không suy luận License thành danh sách phần mềm đã xác thực.
- Kiến thức tổ hiển thị tên, trích yếu và loại tài liệu; nội dung pháp luật trong brief chỉ là dữ liệu do người dùng cung cấp, cần xác minh trước khi coi là kho pháp lý chính thức.
- Cây tổ không chỉ biểu diễn bằng đường nối và vị trí. Có danh sách dạng cây accessible, thu gọn từng nhánh, tìm người; node hiển thị chức vụ và trạng thái nhân sự bằng chữ.
- 44×44px cho touch target, focus rõ, text contrast ít nhất 4.5:1, thông báo lỗi ngay tại trường, không chỉ dùng màu, tắt chuyển động không thiết yếu với reduced motion.

## Câu hỏi cần phỏng vấn trước khi dựng preview

1. Người dùng chính là cán bộ nhập liệu, chỉ huy xem báo cáo hay toàn bộ thành viên? Ba tác vụ thường xuyên nhất, theo thứ tự?
2. Bốn hướng sẽ được preview trên cùng màn quản lý tài nguyên để so sánh công bằng hay mỗi hướng có cả trang chính? Ưu tiên A gần Google Cloud, hay B/C/D thay đổi cách làm việc?
3. Đã chốt một hệ thống một row, công văn là nhóm cột ngang và là tổng nhu cầu tại thời điểm đó. Cần xác nhận cách sắp xếp nhóm công văn, nhóm mặc định hiển thị và cách biểu thị hệ thống chưa xuất hiện trong một công văn.
4. Tháng lọc theo ngày công văn, ngày upload, hay tháng kỳ báo cáo? Số công văn match một phần hay chính xác? Có lọc theo năm không?
5. Đã chốt mốc theo ngày giờ upload; không còn câu hỏi về nguồn thời gian.
6. Đã chốt thêm cột cho phép đặt cột chung hoặc trong nhóm công văn; frontend thể hiện lựa chọn vị trí.
7. Đã chốt admin/user và đăng ký có admin duyệt; admin độc quyền sửa cây tổ. Cần chốt quyền xem/sửa tài nguyên, công văn, kiến thức, trường động của user và phạm vi theo tổ/đơn vị.
8. Cần chỉ prototype dữ liệu demo, hay upload DOCX/XLSX đọc thật ngay trong browser? Có file scan hoặc DOC cũ không? File có thông tin nhạy cảm được phép gửi tới dịch vụ AI bên ngoài không?
9. Nhập Excel cần template cố định hay tự ánh xạ tên cột? Khi trùng dữ liệu xử lý bỏ qua, cập nhật hay tạo mới?
10. Thiết bị chính và số row dự kiến: 500, 10.000 hay nhiều hơn? Cần dùng mobile để nhập hay chỉ xem?
11. Drawer con người gồm dữ liệu nào; thông tin liên hệ nào phải ẩn? Một người có thể kiêm nhiệm nhiều vị trí không?
12. Search header tìm cả nội dung file, kiến thức, nhân sự và công văn hay chỉ điều hướng tới module? Có cần giới hạn theo quyền không?

## Rủi ro cần xử lý rõ trong spec

| Rủi ro | Ảnh hưởng | Đề xuất |
|---|---|---|
| Cộng các công văn là tổng nhu cầu | Tổng tài nguyên sai vì đếm lặp | Giữ snapshot theo công văn, không cộng ngang; quy tắc chọn snapshot hiện tại cần xác nhận |
| Nhầm ngày công văn với ngày upload | Hiểu sai thứ tự lịch sử | Timeline ghi ngày giờ upload; ngày công văn là metadata riêng |
| Tài khoản và hồ sơ nhân sự bị đồng nhất | Mất hoặc sai cây tổ khi quản lý tài khoản | Tách hai thực thể, biểu diễn liên kết rõ và chốt hành vi ngắt liên kết |
| Cột động quá nhiều | Bảng khó đọc, trích xuất không đồng nhất | Kiểu dữ liệu và quản lý schema; preset cột hiển thị |
| Merge cell như Excel | Sorting/filter gây hiểu nhầm | Group row hoặc lặp nhãn định danh |
| Trích xuất sai | Dữ liệu được ghi vào sai đơn vị | Bắt buộc review và xác nhận trước nhập |
| Bản demo giống đăng nhập thật | Người dùng hiểu sai độ hoàn thiện | Ghi rõ chế độ demo và tiêu chí backend còn thiếu |
| Xóa filter bị hiểu là xóa dữ liệu | Tâm lý sợ thao tác | Dùng nhãn “Xóa bộ lọc”, giữ dữ liệu |
| Có hai sidebar trên laptop | Workspace không còn đủ rộng | Drawer responsive, fullscreen bảng và bảo toàn vị trí cuộn |

## Tự đánh giá theo brief

Đã loại landing hero và font học thuật do search trả về, vì đây là công cụ nội bộ thao tác bảng. Bốn hướng dùng cùng phạm vi tính năng nhưng khác điểm bắt đầu và hierarchy: A console, B hồ sơ, C bảng, D tổ. Không coi thay accent color là một phong cách mới. Dùng card cho knowledge theo yêu cầu; tránh bọc mọi nội dung trong card. Gallery đã có HTML chạy thật với theme switch, light/dark, filter, fullscreen và drawer ba cột. Chưa có quyết định chọn một hướng cuối cùng.
