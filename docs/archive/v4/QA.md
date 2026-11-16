# Kết quả kiểm tra prototype

Kiểm tra ngày 15/11/2026, bản HTML/Tailwind/JavaScript tại localhost:8002. Đây là kiểm tra prototype cục bộ, không phải nghiệm thu backend/MVP.

## Đã kiểm tra

- JavaScript: kiểm tra cú pháp app và gallery; bài kiểm tra mô hình `frontend/verify-model.cjs`.
- Trình duyệt: trang vào, gallery bốn phong cách, chế độ sáng/tối, trình đọc Markdown.
- Nhập tệp `reference/test.xlsx` thật: trích xuất 9 snapshot dự kiến, hiển thị xem trước và cho sửa trước khi xác nhận.
- Dữ liệu mẫu đúng 5 hệ thống. Lọc số 952 còn 4 dòng; iCaMau chỉ có 4267 bị loại, nhóm 4651 vẫn được giữ.
- Nhập lại công văn 4651, sửa thử vCPU từ 576 thành 777 tại preview: bảng và mốc mới hiển thị 777; mốc cũ vẫn hiển thị 576.
- Trường bổ sung tạo tại mốc 4651 không xuất hiện tại mốc 952 và không xuất hiện trên bảng.
- Vai user không thấy quản lý nhân sự/nút sửa cây tổ, vẫn có chức năng thêm kiến thức. Admin có tab hồ sơ và tab tài khoản/duyệt; form duyệt có lựa chọn tạo mới hoặc liên kết nhân sự sẵn có.
- Giao diện đã được quan sát trên khung nhỏ và desktop 1440×900; bảng cuộn ngang trong vùng riêng, sidebar chi tiết thích ứng.
- Đã khôi phục dữ liệu mẫu sau thử nghiệm; giá trị 777 và trường kiểm thử không nằm trong bản bàn giao.

## Giới hạn kiểm tra

- Chưa kiểm thử bằng tệp DOCX nghiệp vụ thực tế; parser DOCX đọc nội dung/nhãn đơn giản, chưa có AI/OCR hoặc cam kết mọi mẫu.
- Excel được kiểm tra theo mẫu đã cung cấp. Dòng iCaMau đăng ký 4267 nhưng số liệu nằm dưới nhóm 4651 trong nguồn: giữ tọa độ nguồn và ghi chú để đối chiếu, không tự suy số liệu thành nhu cầu công văn 4267.
- Chưa kiểm thử toàn bộ tổ hợp CRUD, loại tệp đính kèm, trình duyệt và kích thước màn hình. Các câu hỏi nghiệp vụ còn mở ghi trong OPEN_QUESTIONS.md.
- Auth/role là mô phỏng; localStorage không chia sẻ giữa người dùng/thiết bị. Cần Internet tải Tailwind, font và thư viện đọc tệp từ CDN. Chưa có backend, lưu trữ tệp nguồn tài nguyên hoặc đồng bộ nhiều người.
