# Kiến trúc kỹ thuật nháp

Giai đoạn 1 đã chốt HTML + Tailwind + vanilla JavaScript, không React; thêm thư viện thiết kế nếu cần. Prototype lưu localStorage, chạy preview local và không deploy. Backend, cơ sở dữ liệu, xác thực và hosting MVP chưa chọn.

Gallery `design/index.html`; app `frontend/index.html`, `app.js`, `styles.css`. Auth/role chỉ mô phỏng, không lưu mật khẩu thật. localStorage không đồng bộ user/thiết bị; schema dùng chung trong demo không phải multi-user backend. Cấu trúc seed từ `reference/test.xlsx`. Không khẳng định AI/OCR hoặc parser ngoài khả năng đã kiểm chứng.

Đã chốt làm bốn hướng thiết kế và prototype trước, MVP thật sau. Mô hình quyền chỉ có `admin` và `user`; admin tạo tài khoản trực tiếp, duyệt đăng ký và dùng trang Quản lý nhân sự CRUD; chỉ admin cập nhật cây nhân sự. Cả admin/user còn có CRUD tài nguyên, Danh mục, Kiến thức/tệp và custom fields; ngữ nghĩa xóa dữ liệu liên quan cần làm rõ. MVP phải thực thi quyền trên máy chủ; ẩn nút ở frontend không đủ để bảo vệ dữ liệu.

## Danh tính và hồ sơ đã chốt

`User` (tài khoản) và `Person` (hồ sơ nhân sự) là hai thực thể riêng có liên kết. `Person` có thể tồn tại mà không có `User`. Khi duyệt đăng ký, admin chọn liên kết `Person` hiện có hoặc tạo mới để tránh trùng. Chưa chốt cardinality, khóa đối chiếu và tác động xóa tài khoản; không cấu hình xóa dây chuyền từ User sang Person khi chưa có quyết định.

## Dữ liệu tài nguyên đã chốt

**Quyết định cuối thay append dòng:** bảng gộp một dòng theo cặp đơn vị + cơ quan và hệ thống. Ô Công văn chứa nhiều số; từng công văn có nhóm cột/schema riêng. Mỗi lần Xác nhận nhập DOCX/Excel tạo `ImportEvent` và `ResourceSnapshot` mới, kể cả nhập lại; không tạo dòng hiển thị trùng. Nhóm Tên đơn vị sort alphabet. Không đánh đồng gộp dòng với xóa/hợp nhất lịch sử nhập.

Mỗi snapshot ghi tổng nhu cầu tại thời điểm công văn, không phải delta; không cộng dồn snapshot. Nhóm cột công văn hiển thị **bản được xác nhận nhập mới nhất** cho đúng đơn vị + cơ quan + hệ thống + công văn; bản cũ vẫn truy cập trong timeline. Chọn version theo thứ tự xác nhận (`confirmedAt`), không theo ngày công văn hoặc thời gian upload (`uploadedAt`). Cách xử lý đồng thời khi timestamp bằng nhau còn cần đặc tả kỹ thuật.

Mẫu test.xlsx đã được root kiểm tra: Sheet1 A1:AG9, header 4 tầng; nền A:E, 952 F:M, 4651 N:AG. Schema 952 và 4651 khác nhau, gồm cả nhóm lồng nhiều tầng; xem SPEC để đối chiếu. **Đề xuất** lưu định nghĩa schema công văn và snapshot theo cấu trúc dữ liệu rồi pivot khi render; không tạo cột DB vật lý cho mỗi nhóm công văn. Có thể bảo đảm duy nhất thực thể dòng hệ thống bằng khóa phạm vi đơn vị/cơ quan/hệ thống, đồng thời mỗi snapshot có ID riêng và không đặt unique hệ thống–công văn để chặn lịch sử nhiều phiên bản. Đây là mô hình đề xuất, chưa chọn DB/schema vật lý.

Mỗi lần Xác nhận nhập đồng thời tạo mốc timeline mới. Drawer có scope cặp Tên đơn vị + Cơ quan quản lý; header gồm hai tên. Trong cặp đó, chọn hệ thống để truy vấn timeline cập nhật công văn rồi chọn mốc để đọc snapshot/custom fields. Không truy vấn timeline chỉ bằng tên hệ thống mà bỏ phạm vi đơn vị/cơ quan. Cách định danh chính xác vẫn cần chốt trong schema.

Hướng bố cục đã chốt: hệ thống trái, timeline giữa, chi tiết phải. Ngày mốc là timestamp upload ban đầu (`uploadedAt`), hiển thị `dd/MM/yyyy HH:mm:ss`; thời điểm xác nhận (`confirmedAt`) lưu riêng. Ngày ban hành (`documentDate`) là trường chi tiết riêng. Lọc tháng theo uploadedAt. Preview chưa được xác nhận không tạo entry/timeline nghiệp vụ. Các sự kiện tạo mốc khác chưa chốt. Không đồng nhất timeline với audit log.

## Trường tùy biến đã chốt về nơi hiển thị

Table fields và drawer fields là hai nhóm độc lập: nhóm quan trọng chỉ hiển thị ở bảng, nhóm bổ sung chỉ hiển thị trong sidebar chi tiết. Không tự đồng bộ định nghĩa/giá trị giữa hai nhóm và không tự tạo table column từ drawer field. Cả admin/user đều được thêm, sửa, xóa hai nhóm; cả admin/user cũng đã có CRUD tài nguyên, Danh mục, Kiến thức/tệp và upload; nhân sự/cây chỉ admin.

Schema table fields dùng chung toàn bộ rows và mọi user; giá trị khóa theo từng row. Drawer fields thuộc đúng mốc timeline đang chọn, không kế thừa sang mốc hoặc hệ thống khác. **Đề xuất** tách namespace hoặc discriminator, và ràng buộc giá trị bảng theo row ID, drawer fields theo timeline-entry ID để bảo toàn scope; chưa chọn schema vật lý. Đổi kiểu, chính sách xóa dữ liệu cũ và xử lý sửa đồng thời chưa chốt.

UI phải có Thêm cột trên cùng bên phải và cả Thêm cột + Thêm hàng dưới cùng bên trái vùng bảng. Các vị trí thêm cột dùng cùng luồng table fields, không đổi thành luồng drawer fields.

Thêm cột đã chốt chọn cột chung hoặc nằm trong nhóm công văn cụ thể. **Đề xuất** definition chứa vị trí và group ID khi thuộc nhóm; chưa chọn schema vật lý. Cả admin/user có CRUD Kiến thức và tệp đính kèm; lưu tệp demo hoặc metadata phải mô tả đúng khả năng thực tế, chưa mặc định có object storage sản xuất.

## Quyền và bộ lọc bổ sung đã chốt

Cả admin/user CRUD tài nguyên, Danh mục văn bản và upload tệp. MVP phải kiểm tra quyền phía máy chủ; prototype chỉ mô phỏng. Quản lý nhân sự/cây vẫn chỉ admin. Chính sách xóa snapshot/tệp/liên kết khi xóa nội dung chưa chốt.

Lọc số công văn thực hiện chọn các dòng có số trong danh sách đăng ký, giữ nguyên toàn bộ nhóm cột và dữ liệu của dòng. Ví dụ lọc 952 vẫn hiện nhóm 4651 cùng dòng. Không lọc schema/projection cột theo số đang tìm. Lọc tháng theo uploadedAt đã chốt; match dòng có upload thuộc tháng rồi giữ mọi nhóm là đề xuất cần xác nhận riêng.

## Ranh giới prototype và hệ thống thật

| Năng lực | Có thể preview ở frontend | Khi xây hệ thống thật cần chốt |
| --- | --- | --- |
| Điều hướng, theme, bảng, sidebar | Trạng thái trong trình duyệt | URL, deep link, tùy chọn người dùng |
| Đăng nhập/đăng ký | Luồng form minh họa nếu được đồng ý | Identity provider, duyệt tài khoản, session, khôi phục truy cập |
| Thêm/sửa, trường tùy biến | Dữ liệu mẫu hoặc lưu cục bộ nếu chốt | API, quyền, validation, đồng thời, phiên bản cấu trúc |
| Import | Chọn tệp và kiểm tra dữ liệu nếu parser có thật | Parser, hàng đợi, mapping, trùng lặp, storage và lỗi |
| Trích xuất Word/Excel | Chỉ công bố phần đã triển khai | Mẫu tài liệu, độ chính xác, phương pháp và kiểm tra người dùng |
| Cây nhân sự | Dữ liệu mẫu | Quyền riêng tư, phạm vi hiển thị, lịch sử phân công |

Không lưu mật khẩu người dùng trong localStorage. Luồng mô phỏng không được trình bày là xác thực hoặc phân quyền thật.

## Cấu trúc logic đề xuất

```text
Giao diện
  Shell / Điều hướng / Theme / Tìm kiếm
  Tài nguyên / Danh mục văn bản / Kiến thức / Sơ đồ tổ
  Bảng / Bộ lọc / Form / Ngăn chi tiết / Luồng import
          |
Lớp dữ liệu thống nhất (adapter)
          |
  Dữ liệu demo                     [prototype nếu được chọn]
  API + xác thực + phân quyền      [hệ thống thật, chưa chốt]
          |
  Kho dữ liệu nghiệp vụ / Kho tệp / Xử lý import
```

Adapter là đề xuất để giao diện không phụ thuộc cách lưu trữ và dễ thay dữ liệu mẫu bằng API sau này. Chưa xác định giao thức hoặc thư viện.

## Những quyết định ảnh hưởng kiến trúc

1. Quy mô: số người dùng đồng thời, số bản ghi, số tệp và dung lượng; quyết định cách phân trang, tìm kiếm, import đồng bộ hay nền.
2. Triển khai: mạng nội bộ hay Internet, thiết bị được phép, hạ tầng sẵn có; quyết định hosting và truy cập tệp.
3. Danh tính: tài khoản nội bộ/SSO/email, đăng ký tự do hay được duyệt; quyết định tích hợp xác thực và provisioning.
4. Dữ liệu: sau Xác nhận nhập tạo event/snapshot/mốc kể cả nhập lại; bảng gộp dòng hệ thống và mỗi nhóm công văn lấy bản xác nhận mới nhất. uploadedAt là ngày mốc/căn cứ lọc tháng; confirmedAt chọn version hiển thị; documentDate riêng. Cần chốt chỉnh sửa sau nhập, trường hợp đồng thời và audit.
5. Tùy biến: đã chốt quyền admin/user và scope hai nhóm; còn cần quyết định validation, đổi kiểu/xóa dữ liệu cũ và xử lý sửa đồng thời.
6. Tài liệu: file có cấu trúc hay scan; mức trích xuất và kiểm tra; quyết định parser, có cần OCR/AI hay không.

## Luồng import đề xuất cho hệ thống thật

Nhận metadata/tệp và ghi uploadedAt → kiểm tra định dạng/dung lượng → trích xuất → đối chiếu danh mục → preview/sửa/bổ sung → **Xác nhận nhập** → thêm event/snapshot/mốc, lưu confirmedAt riêng, giữ uploadedAt → cập nhật projection nhóm công văn trên dòng hệ thống sang bản xác nhận mới nhất. Chưa xác nhận không ghi dữ liệu nghiệp vụ. Nhập lại vẫn giữ phiên bản cũ trong timeline; dòng hiển thị vẫn gộp, chỉ hệ thống chưa có mới tạo thực thể dòng. Quy tắc thử lại lỗi kỹ thuật cần hỏi riêng để không vô tình xóa hoặc nhân đôi event ngoài ý định xác nhận. Đề xuất lưu liên kết tệp nguồn; chưa chốt chính sách lưu tệp.

## Kiểm tra kỹ thuật và giới hạn

Prototype tĩnh không cần build. Có thể phục vụ workspace bằng `python -m http.server 8002 --bind 127.0.0.1`; xem root README. Chỉ ghi các kiểm tra đã thực hiện; tính năng đang được triển khai chưa được coi là đã đạt AC. Ưu tiên đối chiếu seed, projection bản xác nhận mới nhất, giữ lịch sử, scope trường và cổng xác nhận import. MVP cần kiểm tra phân quyền thật phía máy chủ.
