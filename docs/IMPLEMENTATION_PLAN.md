# Plan chuyển C12 Internal App sang Full-stack

Ngày lập: 28/11/2026. **Plan được người dùng xác nhận; Phase 0–2 hoàn thành, Phase 3–7 đang thực hiện. Chưa có phase cuối cùng nào được nghiệm thu bàn giao.** Không coi mục tiêu trong plan là chức năng đã triển khai. Scope chuẩn tại [SPEC.md](SPEC.md), API tại [API_CONTRACT.md](API_CONTRACT.md), quy tắc backend tại [BACKEND_RULES.md](BACKEND_RULES.md).

## Quy tắc quản lý phase

- Mỗi phase có checklist, điều kiện nghiệm thu và bằng chứng. Chỉ đánh dấu `[x]` sau khi công việc và kiểm chứng của phase đó hoàn tất; ghi ngày/kết quả bên dưới phase.
- Không chuyển phase nếu còn lỗi Critical/Major hoặc schema/API chưa tương thích với phase trước.
- Khi phát hiện đổi nghiệp vụ, cập nhật SPEC/API contract/plan trước code liên quan.
- Tests/build là yêu cầu của dự án này: chạy loại test được liệt kê ở phase tương ứng. Không dùng DB hoặc Docker volume người dùng cho test.
- Không chạy `docker compose down -v`, drop database hoặc reset dữ liệu trong luồng chạy thường. Script xóa cũ chỉ dành cho thao tác khởi tạo một lần, giới hạn schema `c12_internalapp`.

## Phase 0 — Nền tảng tài liệu và contract

**Trạng thái: Hoàn thành — 28/11/2026**

- [x] Rà soát SPEC, quyền, mô hình frontend, localStorage, quan hệ domain và giới hạn hiện tại.
- [x] Chốt Backend Rules: Node LTS/Express/MySQL 8.4/mysql2, validation, SQL, transactions, archive, secret, uploads.
- [x] Chốt REST/OpenAPI, error envelope, JWT, Socket.IO event/outbox contract.
- [x] Lập phase plan cùng checklist/ngưỡng nghiệm thu.
- [x] Cập nhật AGENTS/README/INDEX và tài liệu nghiệp vụ/kiến trúc để phân biệt hiện trạng với mục tiêu.
- [x] Kiểm tra đường dẫn Markdown nội bộ và `git diff --check`; không đụng code.

**Nghiệm thu:** mọi lựa chọn đã trả lời có tài liệu; API contract bao phủ từng phân hệ và lỗi/event; plan phân phase rõ ràng; không có nội dung nào khẳng định backend đã triển khai.

**Bằng chứng/kết quả:** Tài liệu backend/API/plan đã tạo; AGENTS, README, SPEC, PERMISSIONS, TECH_ARCHITECTURE, INDEX, CONTEXT, PRD và FRONTEND_RULES đồng bộ hiện trạng/mục tiêu. Kiểm tra liên kết Markdown nội bộ đạt; `git diff --check` không báo whitespace error. Không chạy test/build vì phase chỉ cập nhật tài liệu.

## Phase 1 — Backend skeleton, MySQL schema và bootstrap

**Trạng thái: Hoàn thành — 28/11/2026**

- [x] Tạo backend Node/Express modular skeleton, config validation, request ID, health/readiness endpoints và centralized error handler.
- [x] Tạo MySQL 8.4 migrations có version ledger; schema normalized cho entities/relations, audit/revisions, archive, file metadata, refresh sessions và outbox.
- [x] Bảo đảm migration không xóa/reseed dữ liệu khi start; FK dùng restrict, không cascade delete nghiệp vụ.
- [x] Tạo Docker secret setup hướng dẫn; bootstrap admin `admin` một lần, hash Argon2id, `must_change_password=true`; chỉ migration lần đầu thêm user.
- [x] Bảo đảm database cài mới chỉ có admin nghiệp vụ; các bảng nghiệp vụ khác rỗng; không fixture nhóm/người/task/resource/document/knowledge.
- [x] Chuẩn bị script thao tác một lần xóa data mock cũ chỉ trong schema `c12_internalapp`, không gọi khi Compose start; xác nhận target schema trước khi chạy.
- [x] Tạo integration test migrations trên database MySQL test mới; chứng minh chạy migration lần hai không reset data/credential.

**Nghiệm thu:** migration từ schema trống thành công; chỉ admin xuất hiện ở dữ liệu nghiệp vụ; migration ledger có metadata; chạy lại startup không tạo/reset admin hoặc xóa record; reset script không target schema khác.

**Bằng chứng/kết quả:** `npm test` đạt 7/7 trên MySQL 8.4 container thử nghiệm riêng (`c12-internalapp-phase1-fresh`, cổng 33307, không gắn volume ứng dụng): migration tạo version ledger, đúng một admin active có hash Argon2id và cờ đổi mật khẩu; 23 bảng nghiệp vụ rỗng; migration chạy lại không tạo lại/ghi đè tài khoản đã sửa trạng thái/hash. Test health/error và config cũng đạt. Không dùng hoặc thay đổi các container/schema ứng dụng đang chạy. Migration runner bỏ qua riêng lỗi FK constraint đã tồn tại để phục hồi an toàn khi DDL tự commit nhưng ledger chưa kịp ghi. Phase 1 hoàn tất; reset script vẫn chưa chạy trên database hiện hữu.

## Phase 2 — Auth, account lifecycle và authorization

**Trạng thái: Hoàn thành — 28/11/2026**

- [x] Login bằng username/email + Argon2id password; pending/inactive bị từ chối; rate limit login.
- [x] Access JWT memory-only, refresh cookie HttpOnly rotation, CSRF, logout revocation, đổi password bắt buộc lần đầu.
- [x] API user registration pending, admin approve/reject/create/reset password; không gửi email ngoài phạm vi đã chốt.
- [x] Server policy cho task visibility/edit, resource view/edit, document/knowledge writes, HR admin-only.
- [x] Archive user giữ ID/relations; inactive user không đăng nhập; admin restore (person/group sẽ được hoàn thiện ở Phase 3).
- [x] Integration tests cho bootstrap, login, refresh/CSRF/logout, password change, pending/approved accounts, admin create/archive và policy bắt đổi mật khẩu.

**Nghiệm thu:** không thể vượt permission bằng cách sửa client; JWT không nằm trong localStorage; refresh token lưu hash/revoke được; account lifecycle không xóa links.

**Bằng chứng/kết quả:** Backend integration suite đạt 9/9 trên MySQL 8.4 container thử nghiệm riêng, bao gồm refresh rotation, CSRF, logout/replay, đổi mật khẩu bắt buộc, registration/approval, vòng đời user, task visibility/edit, resource, document/knowledge write policy và HR admin-only. UI auth/account thuộc Phase 5.

## Phase 3 — API nghiệp vụ và transaction

**Trạng thái: Đang thực hiện**

- [x] CRUD/archive/restore cho Person/Group/User/Document/Knowledge theo ma trận quyền; không hard-delete.
- [x] Task list/filter/summary/group-summary, create/update/archive/restore, history/comments/custom table/files.
- [x] Resource list/filter, create/update/archive/restore, row/column/schema dynamic, document/task links, history và XLSX export.
- [x] Task Xử lý văn bản tạo/liên kết document theo loại+số trong transaction.
- [x] Resource + optional task và Task Quản lý tài nguyên + Resource được tạo/cập nhật atomically; lưu quan hệ và revisions.
- [x] Revision/audit, notification và optimistic concurrency trong transaction; stale update trả 409.
- [ ] Hoàn thiện OpenAPI schemas cho mọi endpoint; mở rộng integration test rollback, cột/hàng appendices động và Excel filters.

**Nghiệm thu:** API trả đúng phạm vi quyền, cột/hàng động và filter; workflow aggregate thống nhất; ghi lỗi giữa transaction không để lại nửa dữ liệu hoặc event.

**Bằng chứng/kết quả:** Backend có CRUD các miền nghiệp vụ, permissions, transaction, lịch sử, appendices động, XLSX, uploads/downloads và notification API; integration suite hiện đạt 9/9 trên MySQL 8.4 test container mới, volume-free. Đã bắt và sửa lỗi query danh sách Knowledge cùng test Socket.IO forced-password-change. Phase chưa nghiệm thu vì OpenAPI chưa đủ schema/coverage và cần bổ sung test chuyên sâu rollback/Excel lọc động.

## Phase 4 — Socket.IO và outbox

**Trạng thái: Đang thực hiện**

- [x] Xác thực handshake bằng JWT, tự gán user room, không cho client tự chọn room.
- [x] Ghi outbox event và audience trong cùng transaction nghiệp vụ.
- [x] Relay chỉ phát sau commit; event envelope có event ID để client dedupe.
- [ ] Bổ sung coverage sự kiện cho toàn miền; retry/idempotency metrics và dead-letter quan sát được.
- [ ] Socket tests: unauthenticated, forced-password-change, unauthorized room, rollback không phát, commit phát, retry dedupe.

**Nghiệm thu:** event không phát trước commit; người không có quyền không nhận event; lỗi relay retry được mà không tạo double update.

**Bằng chứng/kết quả:** Integration test đã xác nhận handshake không token và token yêu cầu đổi mật khẩu bị từ chối; user room được cấp server-side; `resource.created` chỉ nhận được sau khi bản ghi đã commit. Còn thiếu test rollback/event audience và quan sát retry/dead-letter.

## Phase 5 — Frontend API migration

**Trạng thái: Đang thực hiện**

- [x] Thêm API client same-origin, access JWT trong memory, refresh cookie/CSRF, phân loại lỗi và hiển thị request ID.
- [x] Nối đăng nhập/đăng ký/đổi mật khẩu và các luồng CRUD chính task/resource/document/people/group/knowledge/account; archive, bình luận, trạng thái thông báo và Socket.IO refresh.
- [x] Ngừng đọc/ghi workspace/session nghiệp vụ trong localStorage; không nhập dữ liệu cũ. Chỉ giữ tùy chọn giao diện.
- [ ] Hoàn thiện các luồng bảng legacy, tùy chọn hồ sơ/theme đồng bộ và mutation chưa có endpoint/API tương ứng; kiểm thử file links mới bổ sung.
- [ ] Hoàn thiện bảo toàn draft/validation/loading/error/conflict và kiểm chứng realtime khi đang mở modal.
- [x] Upload/download task/resource/document/knowledge và xuất XLSX tài nguyên qua API; giữ preview import DOCX/XLSX ở frontend.
- [x] Giữ UI Glassmorphism, tiếng Việt, navigation, liên kết task/resource, lịch sử truy vấn API và archive semantics; còn cần E2E xác nhận.

**Nghiệm thu:** mọi màn nghiệp vụ đọc/ghi API; refresh trang không mất dữ liệu DB; không còn phụ thuộc mock workspace/session localStorage; theme vẫn dùng được; lỗi có scope và request ID.

**Bằng chứng/kết quả:** `node --check` qua cho các file JavaScript đã sửa. `backend npm test` với database test biệt lập đạt 9 pass, 0 fail, 0 skip; có regression test cho PATCH đổi trạng thái giữ nguyên file links. Phase chưa nghiệm thu vì thiếu E2E trình duyệt và còn các luồng file/schema legacy cần hoàn thiện.

## Phase 6 — Integration QA và E2E

**Trạng thái: Đang thực hiện**

- [x] Dùng database kiểm thử biệt lập không gắn volume ứng dụng; chạy migrations và auth bootstrap test.
- [x] Chạy integration test theo các luồng task, resource, documents, dynamic table, permissions, archive, history, files, Excel và Socket/outbox có trong suite hiện hành; mở rộng coverage còn ở Phase 3–4.
- [x] Browser E2E thủ công qua stack Compose biệt lập: đăng nhập, tạo văn bản/nhóm/task, tạo resource kèm task, kiểm tra Kanban/Table, lịch sử liên kết và dữ liệu còn sau đăng nhập lại.
- [ ] E2E Playwright qua browser cho admin bootstrap/login/change password, thiết lập tổ chức, tạo document/task/resource, liên kết, sửa cột/hàng, history, notification và user permission.
- [ ] Kiểm LIGHT/DARK, responsive, modal scroll, lỗi validation/network/DB và session expiry.
- [ ] QA log bug có mức độ/owner/status; sửa và chạy lại case liên quan; không xóa lỗi chưa giải quyết khỏi log.

**Nghiệm thu:** toàn bộ critical flow pass; không còn lỗi Critical/Major; report nêu rõ môi trường, dữ liệu và test chưa chạy.

**Bằng chứng/kết quả:** Integration suite trước đó chạy trên MySQL 8.4 container tạm, DB `c12_integration_verify`, không mount volume: 9 pass, 0 fail, 0 skip; regression PATCH giữ nguyên file links đã được sửa và khóa bằng assertion. Browser E2E thủ công chạy trên stack biệt lập tại `localhost:18080`: đăng nhập; tạo văn bản và nhóm; tạo task có assignee; tạo resource kèm task; kiểm tra task ở Kanban/Table, bộ đếm, resource/document/task links và lịch sử không bị nhân đôi; đăng nhập lại xác nhận dữ liệu vẫn tồn tại. Stack, test DB, upload volume và secret tạm đã được xóa sau kiểm tra. Lượt `npm test` cuối trên workspace đạt 8 pass, 0 fail, 1 migration integration test skip do không bật cấu hình MySQL test; `node --check` frontend và `git diff --check` đạt. Playwright automation, LIGHT/DARK responsive, modal scroll, validation/network/DB failure/session-expiry matrix vẫn chưa chạy; vì vậy Phase chưa nghiệm thu.

## Phase 7 — Docker, Nginx và bàn giao vận hành

**Trạng thái: Đang thực hiện**

- [x] Dockerfile backend; Compose MySQL/API/frontend-Nginx với healthcheck và persistent volumes.
- [x] Nginx static SPA + `/api/` reverse proxy + `/socket.io/` WebSocket upgrade/polling; same-origin.
- [x] `.env.example` placeholder; `.env` và Docker secret bị ignore; không đưa secret vào image.
- [x] Startup dependency qua health/readiness; migration ledger append-only, khởi động lại không seed/truncate.
- [ ] Kiểm tra cold start, restart, migration upgrade, websocket reconnect và persistence sau container recreate (không xóa volume).
- [ ] Viết runbook install/run/logs/health/update/backup/restore và troubleshooting; nếu chạy TLS ở proxy ngoài, ghi cấu hình yêu cầu.

**Nghiệm thu:** người dùng chạy được toàn hệ thống theo hướng dẫn, đăng nhập admin đổi password, tạo dữ liệu mới; restart giữ dữ liệu; Nginx phục vụ API/Socket; không cần bước setup thủ công ngoài secret/config đã tài liệu hóa.

**Bằng chứng/kết quả:** Compose/Nginx đã có và smoke test stack tách biệt đã qua ở lượt trước; chưa chạy lại sau cập nhật frontend. Cold start, restart, persistence và websocket reconnect vẫn cần nghiệm thu.

## Rủi ro và điều kiện an toàn

- Dữ liệu `localStorage` cũ sẽ không được chuyển sang DB và sẽ bị bỏ khỏi luồng app mới theo xác nhận; sao lưu ngoài scope nếu người dùng muốn giữ.
- Dọn database hiện hữu là destructive, chỉ nhắm `c12_internalapp`, không backup theo Q21; không thực thi ngoài phase có script riêng và xác nhận schema target.
- Admin password mặc định là credential đã công bố trong yêu cầu; chỉ bootstrap một lần và bắt đổi ngay.
- Cần Docker Desktop + MySQL image phù hợp; test không được kết nối volume/database đang dùng.
- Plan chưa tuyên bố bất kỳ phase backend nào đã hoàn thành cho tới khi có code và bằng chứng kiểm tra.
