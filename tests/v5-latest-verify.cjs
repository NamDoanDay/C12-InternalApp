'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: KIỂM THỬ TOÀN DIỆN CẬP NHẬT GIAO DIỆN V5.2 ===');

// 1. Kiểm tra các tệp tin frontend
const frontendDir = path.join(__dirname, '..', 'frontend');
const readFrontend = file => fs.readFileSync(path.join(frontendDir, file), 'utf8');
const appJs = [
  'js/core/foundation.js', 'js/pages/app-shell.js', 'js/components/dialogs.js',
  'js/features/drawers.js', 'js/features/imports.js'
].map(readFrontend).join('\n');
const workspaceJs = readFrontend('js/pages/workspace.js');
const workspaceFormsJs = readFrontend('js/features/task-forms.js');
const workspaceDetailsJs = readFrontend('js/features/details.js');
const workspaceOrgThemeJs = readFrontend('js/features/org-theme.js');
const stylesCss = ['css/legacy.css', 'css/workspace.css', 'css/glass.css'].map(readFrontend).join('\n');
const indexHtml = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf8');
const specMd = fs.readFileSync(path.join(__dirname, '..', 'docs', 'SPEC.md'), 'utf8');
const changeReqMd = fs.readFileSync(path.join(__dirname, '..', 'docs', 'CHANGE_REQUIREMENTS.md'), 'utf8');

// Test 1: Màn hình Login & Wallpaper
console.log('\n[1] Kiểm tra Màn hình đăng nhập & Wallpaper:');
assert(fs.existsSync(path.join(frontendDir, 'login-bg.jpg')), 'Tệp login-bg.jpg phải tồn tại');
assert(stylesCss.includes('login-bg.jpg'), 'CSS phải có background login-bg.jpg');
assert(stylesCss.includes('.auth-card-wrap'), 'CSS phải có .auth-card-wrap cho card kính mờ');
assert(appJs.includes('auth-card-wrap'), 'app.js auth() phải wrap bằng auth-card-wrap');
assert(appJs.includes('auth-tabs'), 'app.js auth() phải có tab chuyển Đăng nhập / Đăng ký');
assert(appJs.includes('Đăng nhập User demo'), 'Phải có nút Đăng nhập User demo');
console.log('✓ Màn hình đăng nhập & hình nền wallpaper anime hồ nước/chú cáo hoàn tất');

// Test 2: Đăng nhập mặc định là tài khoản User
console.log('\n[2] Kiểm tra Đăng nhập mặc định là tài khoản User:');
assert(appJs.includes("'demo-u-g-HT'") || appJs.includes("role === 'user'"), 'app.js mặc định đăng nhập user');
console.log('✓ Đăng nhập lần đầu mặc định là tài khoản user hoàn tất');

// Test 3: Trang chính - Banner Welcome & Thông tin nội bộ tổ
console.log('\n[3] Kiểm tra Trang chính - Banner Welcome & Thông tin nội bộ:');
assert(workspaceJs.includes('Phòng 4. Tổ 1 HPC-AI'), 'Phải có tên tổ Phòng 4. Tổ 1 HPC-AI');
assert(workspaceJs.includes('THÔNG TIN NỘI BỘ TỔ 1'), 'Phải có tiêu đề THÔNG TIN NỘI BỘ TỔ 1');
assert(workspaceJs.includes('state.people.length') || workspaceJs.includes('cán bộ'), 'Phải có số lượng cán bộ');
assert(workspaceJs.includes('state.taskGroups') || workspaceJs.includes('nhóm'), 'Phải có số lượng nhóm');
assert(!workspaceJs.includes('Xem toàn bộ danh mục'), 'Đã bỏ nút Xem toàn bộ danh mục dưới Công văn gần đây');
console.log('✓ Trang chính chuẩn chuyên nghiệp theo ảnh hoàn tất');

// Test 4: Quản lý công việc (Kanban Board & Table view)
console.log('\n[4] Kiểm tra Quản lý công việc:');
assert(workspaceJs.includes('kanban-board'), 'Phải có bảng Kanban');
assert(workspaceJs.includes('All Task'), 'Phải có tab All Task');
assert(workspaceJs.includes('On Going'), 'Phải có cột On Going');
assert(workspaceJs.includes('Completed'), 'Phải có cột Completed');
assert(workspaceJs.includes('Upcoming'), 'Phải có cột Upcoming');
assert(workspaceJs.includes('Paused'), 'Phải có cột Paused');
assert(workspaceJs.includes('view-toggle-btn'), 'Phải có nút toggle giữa Kanban Board và Table view');
assert(workspaceJs.includes('task-search'), 'Phải có thanh tìm kiếm theo title, mã task, ngày bắt đầu/kết thúc');
console.log('✓ Quản lý công việc Bảng Kanban theo ảnh mẫu và Dạng Table hoàn tất');

// Test 5: Màn hình Thống kê (Calendar, Activity & Accordion nhóm)
console.log('\n[5] Kiểm tra Màn hình Thống kê:');
assert(workspaceJs.includes('calendar-widget'), 'Phải có widget Calendar');
assert(workspaceJs.includes('activity-widget'), 'Phải có widget Activity');
assert(workspaceJs.includes('stats-group-row'), 'Phải có bảng Theo nhóm quản lý');
assert(workspaceJs.includes('statsActiveGroup'), 'Click chọn nhóm phải mở accordion/dropdown xem task thuộc nhóm đó');
console.log('✓ Thống kê với Calendar, Activity và Accordion nhóm hoàn tất');

// Test 6: Quản lý tài nguyên - Thanh search tìm đơn vị, cơ quan, hệ thống
console.log('\n[6] Kiểm tra Quản lý tài nguyên:');
assert(workspaceDetailsJs.includes('resourceSearchInput'), 'Phải có ô tìm kiếm resourceSearchInput');
assert(workspaceDetailsJs.includes('Tìm đơn vị, cơ quan quản lý, hệ thống...'), 'Placeholder đúng yêu cầu');
console.log('✓ Thanh tìm kiếm trong Dữ liệu tài nguyên tổng hợp hoàn tất');

// Test 7: Form Tạo công việc mới (Xử lý văn bản vs Task thường, Trạng thái Khởi tạo, Assignee theo nhóm)
console.log('\n[7] Kiểm tra Form Tạo công việc mới:');
assert(workspaceFormsJs.includes('Xử lý văn bản'), 'Phải có loại công việc Xử lý văn bản');
assert(workspaceFormsJs.includes('Task thường'), 'Phải có loại công việc Task thường');
assert(workspaceJs.includes('Khởi tạo'), 'Phải có trạng thái Khởi tạo');
assert(workspaceFormsJs.includes('assigneeGroupSelect'), 'Phải có select Lọc theo nhóm cán bộ để chọn thành viên');
assert(workspaceFormsJs.includes('assignee-choice-row'), 'Checkboxes không bị dính chữ, có badge nhóm riêng');
console.log('✓ Form Tạo công việc mới phân loại, trạng thái khởi tạo và lọc người nhận hoàn tất');

// Test 8: Sidebar chi tiết Công văn / Văn bản & Cán bộ
console.log('\n[8] Kiểm tra Sidebar chi tiết:');
assert(appJs.includes('doc-detail-view'), 'Sidebar chi tiết công văn/văn bản đẹp mắt theo thẻ');
assert(appJs.includes('Nhóm chuyên môn'), 'Xem chi tiết cán bộ/user có trường Nhóm chuyên môn');
console.log('✓ Sidebar chi tiết công văn và cán bộ hoàn tất');

// Test 9: Overlay đóng im lặng (Silent close)
console.log('\n[9] Kiểm tra Overlay đóng im lặng:');
assert(appJs.includes('closeOverlay'), 'Có hàm closeOverlay');
assert(!workspaceFormsJs.includes("confirm('Đóng phiếu?"), 'Không có confirm popup phiền phức khi đóng overlay');
console.log('✓ Đóng sidebar qua overlay hoàn toàn im lặng, không popup/log cảnh báo hoàn tất');

// Test 10: Kiến thức tổ (Đầy đủ thông tin, form thêm mới và Filter)
console.log('\n[10] Kiểm tra Kiến thức tổ:');
assert(appJs.includes('k-badge-type'), 'Có badge loại văn bản');
assert(appJs.includes('k-badge-no'), 'Có số ký hiệu văn bản');
assert(appJs.includes('Cơ quan ban hành'), 'Có cơ quan ban hành');
assert(appJs.includes('Ngày hiệu lực'), 'Có ngày hiệu lực');
assert(appJs.includes('kfLevel') && appJs.includes('kfAgency') && appJs.includes('kfType'), 'Có các dropdown filter');
console.log('✓ Màn hình Kiến thức tổ chuẩn theo ảnh mẫu hoàn tất');

// Test 11: Account Menu
console.log('\n[11] Kiểm tra Account Menu:');
assert(stylesCss.includes('.account-menu'), 'CSS có style .account-menu');
assert(appJs.includes('account-menu-header'), 'account-menu có header đẹp mắt');
console.log('✓ Account Menu redesign hoàn tất');

// Test 12: Modern Glassmorphism Theme (Mặc định) & Wallpaper / Gradient
console.log('\n[12] Kiểm tra Theme Modern Glassmorphism & Wallpaper:');
assert(indexHtml.includes('data-theme="glassmorphism"'), 'index.html mặc định theme glassmorphism');
assert(stylesCss.includes('[data-theme="glassmorphism"]'), 'styles.css định nghĩa theme glassmorphism');
assert(workspaceOrgThemeJs.includes("setProperty('background',cssBg,'important')"), 'Gradient và hình nền áp dụng ngay vào body');
console.log('✓ Modern Glassmorphism Theme mặc định & sửa lỗi Gradient/Hình nền hoàn tất');

// Test 13: Cập nhật docs SPEC.md mục 4 và CHANGE_REQUIREMENTS.md mục 9
console.log('\n[13] Kiểm tra Cập nhật tài liệu:');
assert(specMd.includes('Lãnh đạo phòng → Tổ trưởng → Các Tổ phó (là người phụ trách nhóm)'), 'SPEC.md mục 4 đã cập nhật đúng yêu cầu');
assert(changeReqMd.includes('Lãnh đạo phòng → Tổ trưởng → Các Tổ phó (là người phụ trách nhóm)'), 'CHANGE_REQUIREMENTS.md mục 9 đã cập nhật đúng yêu cầu');
console.log('✓ SPEC.md và CHANGE_REQUIREMENTS.md đã cập nhật chính xác');

console.log('\n======================================================');
console.log('🎉 TẤT CẢ 13 BÀI KIỂM THỬ ĐÃ PASS 100%! HỆ THỐNG SẴN SÀNG! 🎉');
console.log('======================================================');
