# C12 / P4 - T1 Internal App

Prototype nội bộ bằng **HTML + Tailwind + JavaScript thuần**, không React. Bản thay đổi ngày 16/11/2026 dùng một phong cách Cloud Console, quản lý task theo nhóm và liên kết task với dữ liệu tài nguyên. Backend, xác thực thật và đồng bộ đa thiết bị thuộc giai đoạn MVP sau.

## Preview cục bộ

Tại thư mục dự án, chạy:

```powershell
python -m http.server 8002 --bind 127.0.0.1
```

Nếu cổng 8002 đang phục vụ thì mở trực tiếp, không chạy thêm máy chủ.

- [Ứng dụng](http://127.0.0.1:8002/frontend/)
- [Tài liệu trong trình duyệt](http://127.0.0.1:8002/docs/preview.html)
- [Yêu cầu thay đổi](docs/CHANGE_REQUIREMENTS.md)
- [Đặc tả](docs/SPEC.md)
- [Ma trận quyền](docs/PERMISSIONS.md)
- [Root kiểm tra đặc tả](docs/ROOT_REVIEW.md)
- [Workbook tham chiếu](reference/test.xlsx)

Dừng máy chủ tự chạy bằng Ctrl+C. Không cần npm build cho cấu trúc HTML tĩnh. Thư viện/fonts qua CDN cần Internet.

## Trạng thái và giới hạn

Tài liệu bản mới đã được đối chiếu trước khi triển khai frontend. Các tiêu chí trong PRD là mục tiêu nghiệm thu, chưa phải tuyên bố mọi chức năng đã đạt. Xem ghi chú bàn giao và kết quả kiểm thử mới của root.

Auth và quyền trong prototype chỉ mô phỏng để duyệt luồng; không dùng mật khẩu sản xuất. Danh tính từng tab dùng sessionStorage, dữ liệu chung dùng kho trình duyệt. Thông báo giữa các tab cùng origin khác với realtime giữa nhiều máy.

Dữ liệu v4 cần được giữ nguyên và sao lưu khi nâng phiên bản. Nguồn cũ chưa có task chỉ được chuyển thành task khi admin bổ sung các trường bắt buộc; không bịa lịch sử hoặc tự reset dữ liệu.

Parser chỉ được công bố theo phần đã kiểm chứng; không mặc định đọc mọi DOCX/XLSX hoặc có AI/OCR. [QA15/11](docs/QA.md) là lịch sử v4, không phải nghiệm thu bản thay đổi. Bộ bốn phong cách cũ đã bị thay bằng Cloud Console; tài liệu cũ ở [archive/v4](docs/archive/v4/README.md).

