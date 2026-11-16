import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_document():
    doc = docx.Document()

    # Page setup - Margins (Normal: 1 inch = 1440 twips)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Header & Footer setup
        sectPr = section._sectPr
        header = section.header
        header_p = header.paragraphs[0]
        header_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        h_run = header_p.add_run("HỆ THỐNG QUẢN TRỊ NỘI BỘ C12 / PHÒNG 4 · TỔ 1 — ĐẶC TẢ KỸ THUẬT V5.1")
        h_run.font.name = "Segoe UI"
        h_run.font.size = Pt(8.5)
        h_run.font.color.rgb = RGBColor(100, 116, 139)

        footer = section.footer
        footer_p = footer.paragraphs[0]
        footer_p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        f_run1 = footer_p.add_run("Tài liệu kỹ thuật nội bộ — Lưu hành nội bộ P4/C12")
        f_run1.font.name = "Segoe UI"
        f_run1.font.size = Pt(8.5)
        f_run1.font.italic = True
        f_run1.font.color.rgb = RGBColor(148, 163, 184)

    # Styles setup
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Segoe UI'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = RGBColor(30, 41, 59) # Slate 800
    style_normal.paragraph_format.line_spacing = 1.2
    style_normal.paragraph_format.space_after = Pt(4)

    # Helper XML functions
    def set_cell_background(cell, hex_color):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
        tcPr.append(tcMar)

    def set_cell_borders(cell, top=None, bottom=None, left=None, right=None):
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}>'
                            f'<w:top w:val="{top or "none"}" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                            f'<w:left w:val="{left or "none"}" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                            f'<w:bottom w:val="{bottom or "none"}" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                            f'<w:right w:val="{right or "none"}" w:sz="4" w:space="0" w:color="CBD5E1"/>'
                            f'</w:tcBorders>')
        tcPr.append(borders)

    def add_custom_heading(text, level, space_before=12, space_after=4):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(space_before)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Segoe UI'

        if level == 1:
            run.font.size = Pt(16)
            run.font.color.rgb = RGBColor(15, 23, 42) # Slate 900
            # Add subtle underline or marker
            pPr = p._p.get_or_add_pPr()
            pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="4" w:color="2563EB"/></w:pBdr>')
            pPr.append(pBdr)
        elif level == 2:
            run.font.size = Pt(13)
            run.font.color.rgb = RGBColor(30, 64, 175) # Blue 800
        elif level == 3:
            run.font.size = Pt(11)
            run.font.color.rgb = RGBColor(51, 65, 85) # Slate 700
        return p

    def add_callout(text_list, title="LƯU Ý QUAN TRỌNG / ĐẶC TẢ KỸ THUẬT", border_color="2563EB", bg_color="EFF6FF"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(6.8)
        
        cell = tbl.cell(0, 0)
        set_cell_background(cell, bg_color)
        set_cell_margins(cell, top=140, bottom=140, left=200, right=180)

        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(f'<w:tcBorders {nsdecls("w")}>'
                            f'<w:top w:val="none"/>'
                            f'<w:left w:val="single" w:sz="36" w:space="0" w:color="{border_color}"/>'
                            f'<w:bottom w:val="none"/>'
                            f'<w:right w:val="none"/>'
                            f'</w:tcBorders>')
        tcPr.append(borders)

        cp = cell.paragraphs[0]
        cp.paragraph_format.space_before = Pt(2)
        cp.paragraph_format.space_after = Pt(3)
        c_title_run = cp.add_run(f"📌 {title}")
        c_title_run.bold = True
        c_title_run.font.size = Pt(10.5)
        c_title_run.font.color.rgb = RGBColor(30, 64, 175)

        for item in text_list:
            p = cell.add_paragraph()
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(f"• {item}")
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(51, 65, 85)

        # Empty paragraph after table for spacing
        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(2)
        sp.paragraph_format.space_after = Pt(4)

    def add_table_data(headers, rows_data, col_widths, align_right_cols=[]):
        tbl = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False

        # Header Row
        hdr_cells = tbl.rows[0].cells
        for i, header_text in enumerate(headers):
            cell = hdr_cells[i]
            cell.width = Inches(col_widths[i])
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_background(cell, "1E3A8A") # Navy Blue
            set_cell_margins(cell, top=140, bottom=140, left=120, right=120)
            set_cell_borders(cell, top="single", bottom="single", left="single", right="single")
            
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            run = p.add_run(header_text)
            run.bold = True
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(255, 255, 255)

        # Data Rows
        for r_idx, row_values in enumerate(rows_data):
            row_cells = tbl.rows[r_idx + 1].cells
            bg_color = "F8FAFC" if (r_idx % 2 == 1) else "FFFFFF"
            for c_idx, val in enumerate(row_values):
                cell = row_cells[c_idx]
                cell.width = Inches(col_widths[c_idx])
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                set_cell_background(cell, bg_color)
                set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                set_cell_borders(cell, top="single", bottom="single", left="single", right="single")
                
                p = cell.paragraphs[0]
                if c_idx in align_right_cols:
                    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                elif c_idx == 0 and len(col_widths) > 3 and col_widths[0] < 0.8:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.line_spacing = 1.15
                run = p.add_run(str(val))
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(30, 41, 59)

        sp = doc.add_paragraph()
        sp.paragraph_format.space_before = Pt(2)
        sp.paragraph_format.space_after = Pt(6)
        return tbl

    # ==================== 1. COVER / TIÊU ĐỀ ====================
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(18)
    title_p.paragraph_format.space_after = Pt(4)
    run_org = title_p.add_run("BỘ CÔNG AN — CỤC C12\nPHÒNG 4 / TỔ 1")
    run_org.bold = True
    run_org.font.size = Pt(12)
    run_org.font.color.rgb = RGBColor(71, 85, 105)

    doc_title_p = doc.add_paragraph()
    doc_title_p.paragraph_format.space_before = Pt(12)
    doc_title_p.paragraph_format.space_after = Pt(8)
    run_title = doc_title_p.add_run("BÁO CÁO ĐẶC TẢ CẬP NHẬT GIAO DIỆN VÀ TÍNH NĂNG PROTOTYPE V5.1")
    run_title.bold = True
    run_title.font.size = Pt(22)
    run_title.font.color.rgb = RGBColor(30, 58, 138) # Dark Blue

    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(16)
    run_sub = sub_p.add_run("HỆ THỐNG QUẢN TRỊ & ĐIỀU HÀNH NỘI BỘ (KHÔNG GIAN LÀM VIỆC PHÒNG 4 · TỔ 1)\nĐặc tả kỹ thuật 9 nhóm yêu cầu nâng cấp giao diện, trải nghiệm người dùng, phân quyền nghiệp vụ và kế hoạch thực thi")
    run_sub.font.size = Pt(11.5)
    run_sub.font.italic = True
    run_sub.font.color.rgb = RGBColor(100, 116, 139)

    # Metadata Table
    meta_headers = ["Thông số kỹ thuật", "Chi tiết cấu hình / Trạng thái", "Ghi chú theo dõi"]
    meta_data = [
        ["Mã tài liệu / Phiên bản", "SPEC-C12-P4T1-UI-V5.1", "Thay thế Prototype V4 ngày 15/11"],
        ["Ngày cập nhật chốt yêu cầu", "16/11/2026", "Tích hợp kết quả phỏng vấn nghiệp vụ"],
        ["Đơn vị chủ quản / Không gian", "C12 / Phòng 4 / Tổ 1", "Môi trường Cloud Console duy nhất"],
        ["Đối tượng áp dụng", "Toàn bộ cán bộ chiến sĩ Tổ 1 & Lãnh đạo Phòng 4", "Phân hệ Admin & User"],
        ["Trạng thái tài liệu", "Phê duyệt triển khai (Ready for Execution)", "Tài liệu kỹ thuật định hướng cho Frontend Agent"]
    ]
    add_table_data(meta_headers, meta_data, [2.0, 2.8, 2.0])

    # ==================== 2. BỐI CẢNH & MỤC TIÊU NÂNG CẤP ====================
    add_custom_heading("1. BỐI CẢNH VÀ MỤC TIÊU NÂNG CẤP HỆ THỐNG", 1, space_before=16)

    p_bg1 = doc.add_paragraph()
    p_bg1.add_run("Sau giai đoạn vận hành thử nghiệm phiên bản Prototype V4 (ngày 15/11/2026), Tổ Kỹ thuật đã phối hợp cùng Lãnh đạo Phòng 4 và các bộ phận nghiệp vụ thuộc Tổ 1 thực hiện đánh giá tổng thể về mức độ thân thiện, tính tiện dụng và hiệu năng xử lý công việc thực tế. Mặc dù phiên bản V4 đã đáp ứng các nghiệp vụ cơ bản về quản lý văn bản và tài nguyên hệ thống, quá trình sử dụng ghi nhận một số điểm nghẽn về trải nghiệm người dùng: giao diện còn phân tán với 4 phong cách khác nhau gây loãng nhận diện, bảng biểu tài nguyên thiếu trực quan khi rê chuột tra cứu, form tạo công việc còn cồng kềnh với các trường không liên quan đến công việc thường, và hệ thống popup modal che khuất tầm nhìn tổng thể.")

    p_bg2 = doc.add_paragraph()
    p_bg2.add_run("Phiên bản V5.1 được định hình nhằm giải quyết triệt để các hạn chế trên với ba mục tiêu chiến lược cốt lõi:")

    goals = [
        ("Chuẩn hóa ngôn ngữ thiết kế Cloud Console:", " Xóa bỏ hoàn toàn bộ chọn 4 giao diện thử nghiệm, thống nhất áp dụng một phong cách thiết kế duy nhất lấy cảm hứng từ Google Cloud Console — hiện đại, phẳng, tối giản, tối ưu không gian hiển thị mật độ dữ liệu cao."),
        ("Tối ưu hóa hành trình người dùng (User Experience):", " Tối giản cấu trúc tiêu đề màn hình (loại bỏ hoàn toàn breadcrumbs và phụ đề rườm rà), thay thế 100% modal popup bằng Right Sidebar Drawer chuyên nghiệp, trang bị bộ lọc đa chọn thông minh (multi-select filter), nâng cấp hiệu ứng hover phân tầng trên bảng dữ liệu."),
        ("Cải tiến luồng nghiệp vụ & Đảm bảo tính khả dụng cao:", " Phân biệt tường minh luồng tạo công việc thường (hỗ trợ Custom Table động) và công việc theo công văn; tự động hóa tính toán độ tương phản màu chữ (Contrast Engine) đạt chuẩn quốc tế WCAG 2.1 AA trên mọi chế độ Dark/Light mode và ảnh nền tùy biến.")
    ]
    for g_title, g_desc in goals:
        gp = doc.add_paragraph()
        gp.paragraph_format.left_indent = Inches(0.25)
        gp.paragraph_format.space_before = Pt(2)
        gp.paragraph_format.space_after = Pt(3)
        r1 = gp.add_run(f"• {g_title}")
        r1.bold = True
        r1.font.color.rgb = RGBColor(30, 64, 175)
        r2 = gp.add_run(g_desc)

    add_callout([
        "Mọi màn hình và luồng thao tác phải đảm bảo tính liên tục không làm gián đoạn dữ liệu của phiên trước.",
        "Nguyên tắc thiết kế xuyên suốt: Tối ưu không gian hiển thị, giảm thiểu số lần click chuột, phản hồi thị giác tức thì."
    ], title="NGUYÊN TẮC THIẾT KẾ PHIÊN BẢN V5.1")

    # ==================== 3. CHI TIẾT 9 YÊU CẦU GIAO DIỆN & NGHIỆP VỤ ====================
    add_custom_heading("2. CHI TIẾT 9 YÊU CẦU GIAO DIỆN VÀ NGHIỆP VỤ ĐÃ THỐNG NHẤT", 1, space_before=16)

    p_req_intro = doc.add_paragraph()
    p_req_intro.add_run("Dưới đây là đặc tả kỹ thuật chi tiết của 9 nhóm yêu cầu cải tiến giao diện và luồng nghiệp vụ được chốt chính thức qua các buổi làm việc trực tiếp:")

    # --- Yêu cầu 1 ---
    add_custom_heading("2.1. Yêu cầu 1: Header Layout Mới (Cấu Trúc Điều Hướng 3 Vùng)", 2)
    doc.add_paragraph("Thanh Header trên cùng được tái thiết kế toàn diện theo chuẩn Google Cloud Console, phân bổ thành 3 khu vực chức năng rõ rệt:")
    r1_items = [
        "Khu vực bên trái: Gồm Icon nút bật/tắt Navigation Drawer (Menu hamburger) và Logo/Tiêu đề định danh hệ thống 'C12 Console / P4 - T1' với biểu tượng nhận diện trang trọng.",
        "Khu vực ở giữa: Thanh tìm kiếm toàn cục (Global Search Bar) thiết kế bo tròn nhẹ (border-radius: 8px), tích hợp icon kính lúp, placeholder 'Tìm kiếm công việc, số công văn, hệ thống, tài nguyên...'. Khi gõ phím, tự động lọc nhanh trên toàn hệ thống.",
        "Khu vực bên phải: Cụm công cụ tương tác người dùng cao cấp bao gồm:",
        "  + Nút chuyển đổi Dark/Light Mode dạng Pill Switch: Nút bấm hình viên thuốc bo tròn tinh tế (theo phong cách công tắc cao cấp), hiển thị đồng thời cả icon Mặt trời (Light) và Mặt trăng (Dark) với con trượt trượt mượt mà có hiệu ứng chuyển động CSS (cubic-bezier).",
        "  + Icon Palette đổi mới: Biểu tượng bảng màu hiện đại, click mở panel chọn chủ đề (Màu chủ đạo, Gradient nền, ảnh URL, ảnh upload từ máy tính).",
        "  + Icon Thông báo có Badge số đỏ: Hiển thị số lượng thông báo mới chưa đọc (Unread Count). Nhấp vào mở ngăn thông báo nhanh.",
        "  + Avatar Profile người dùng: Hiển thị ảnh đại diện/chữ cái tên kèm thông tin tài khoản và menu ngữ cảnh cá nhân (Đăng xuất, Thông tin hồ sơ)."
    ]
    for it in r1_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # --- Yêu cầu 2 ---
    add_custom_heading("2.2. Yêu cầu 2: Trang Chính (Dashboard) Phong Cách Google Cloud Console", 2)
    doc.add_paragraph("Trang chính Dashboard được tinh chỉnh để cung cấp cái nhìn trực quan, không gian khoáng đạt và tập trung cao độ vào công việc trọng tâm:")
    r2_items = [
        "Thẻ Task Summary thu nhỏ mạnh (Compact Metric Cards): Thu gọn chiều cao thẻ số liệu từ kích thước lớn xuống dạng thẻ compact (cao khoảng 72px - 80px). Bổ sung icon trạng thái chuyên biệt cho từng loại: Đang xử lý (Màu xanh dương / Blue), Chậm muộn (Màu đỏ cảnh báo / Amber-Red), Đã hoàn thành (Màu xanh lá / Emerald Green), Tổng công việc (Màu chàm / Indigo). Số liệu hiển thị to rõ kèm nhãn phụ tinh giản.",
        "Welcome Banner chào mừng hiện đại: Khối banner đầu trang với nền chuyển sắc nhẹ, hiển thị thông điệp chào mừng cán bộ, hiển thị định danh không gian làm việc 'Phòng 4 · Tổ 1', mã phiên làm việc hiện hành, thời gian đăng nhập thực tế. Đi kèm hàng phím Quick Action Chips tiện ích ('+ Tạo công việc mới', 'Tra cứu công văn', 'Nhập bảng tính', 'Xem báo cáo thống kê').",
        "Lưới Quick Access thoáng đẹp: Bố trí các phân hệ truy cập nhanh với khoảng cách hàng và cột giãn rộng (gap: 20px - 24px), tạo cảm giác thoáng đãng, sang trọng. Mỗi thẻ phân hệ có icon phẳng nhận diện, tiêu đề rõ ràng, mô tả ngắn gọn và hiệu ứng hover nổi nhẹ (box-shadow nâng tầm)."
    ]
    for it in r2_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # --- Yêu cầu 3 ---
    add_custom_heading("2.3. Yêu cầu 3: Tối Giản Tiêu Đề Trang (Loại Bỏ Breadcrumbs & Subtitles)", 2)
    doc.add_paragraph("Để giải phóng tối đa không gian hiển thị cho bảng biểu và nội dung nghiệp vụ, hệ thống tiến hành tinh giản triệt để thanh tiêu đề:")
    r3_items = [
        "Xóa bỏ 100% thanh điều hướng breadcrumbs (vụn bánh mì) trên tất cả các trang con và phân hệ.",
        "Xóa bỏ toàn bộ các dòng phụ đề (subtitles / page descriptions) diễn giải rườm rà dưới mỗi tiêu đề trang.",
        "Quy chuẩn duy nhất: Chỉ giữ lại tiêu đề chính của trang (Page Title H1) với kích thước font chữ 22px bold, căn lề thẳng hàng với nội dung, tiết kiệm từ 40px đến 60px chiều cao màn hình trên mọi độ phân giải."
    ]
    for it in r3_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # --- Yêu cầu 4 ---
    add_custom_heading("2.4. Yêu cầu 4: Bộ Lọc Đa Chọn Thông Minh (Multi-Select Filter)", 2)
    doc.add_paragraph("Nâng cấp toàn bộ các trường lọc đơn (Single select) trên danh sách công việc và bảng dữ liệu thành bộ lọc đa chọn:")
    r4_items = [
        "Cấu trúc giao diện bộ lọc: Nút kích hoạt bộ lọc hiển thị nhãn tiêu chí (ví dụ: 'Nhóm quản lý', 'Trạng thái', 'Độ ưu tiên') đi kèm badge số lượng 'Đã chọn (x)' màu xanh dương nổi bật khi có từ 1 mục trở lên được chọn.",
        "Menu Dropdown danh sách checkbox: Nhấp vào nút sẽ mở dropdown danh sách các tùy chọn kèm checkbox. Tích hợp thanh tìm kiếm nhanh trong dropdown khi danh sách có trên 5 mục, cùng 2 nút tiện ích 'Chọn tất cả' và 'Bỏ chọn toàn bộ'.",
        "Logic xử lý dữ liệu chuẩn nghiệp vụ:",
        "  + Quan hệ OR giữa các giá trị được chọn trong CÙNG MỘT BỘ LỌC (Ví dụ: Người dùng tick chọn cả 'Nhóm Hạ tầng' và 'Nhóm Mạng' -> Hệ thống hiển thị các bản ghi thuộc Hạ tầng HOẶC Mạng).",
        "  + Quan hệ AND giữa CÁC BỘ LỌC KHÁC NHAU (Ví dụ: [Nhóm = Hạ tầng OR Mạng] VÀ [Trạng thái = Đang xử lý] -> Hệ thống chỉ hiển thị bản ghi vừa thuộc 2 nhóm trên VÀ đồng thời đang ở trạng thái Đang xử lý)."
    ]
    for it in r4_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # --- Yêu cầu 5 ---
    add_custom_heading("2.5. Yêu cầu 5: Tái Cấu Trúc Form 'Tạo Công Việc Mới'", 2)
    doc.add_paragraph("Form tạo công việc được thiết kế lại nhằm phản ánh chính xác quy trình tác nghiệp nội bộ giữa công việc hành chính thường và công việc gắn liền với công văn:")
    r5_items = [
        "Tiêu đề form & Kiểu chữ: Đổi tiêu đề chuẩn thành 'Tạo công việc mới' (thay cho 'Thêm công việc'). Tiêu đề trường (Labels) được thiết kế font chữ to, đậm rõ nét (font-weight: 600, 13.5px). Ô nhập tiêu đề công việc (Input Title) được thu gọn chiều cao thành dạng compact single-line hiện đại.",
        "Định vị lại khối Tệp đính kèm: Di chuyển vùng tải tệp đính kèm (Attachments) lên ngay dưới trường Mô tả công việc, giúp người dùng dễ dàng đính kèm tài liệu liên quan ngay sau khi viết tóm tắt nội dung.",
        "Phân nhánh nghiệp vụ theo Loại công việc (Task Type):",
        "  + Công việc thường (Task-DAILY): Tự động ẩn hoàn toàn các khối 'Công văn đăng ký', 'Văn bản chỉ đạo' và 'Phụ lục tài nguyên phần cứng'. Thay vào đó, kích hoạt khối 'Bảng dữ liệu tùy chỉnh' (Custom Table) cho phép cán bộ tự đặt tên bảng, tự tạo các cột (tên cột, kiểu dữ liệu text/number/date) và thêm các dòng nhập liệu tự do phục vụ tổng hợp nội bộ.",
        "  + Công việc theo công văn (Task-HT, Task-MC...): Giữ nguyên các khối liên kết Công văn, Văn bản và Phụ lục tài nguyên. Chuyển các trường Đơn vị, Cơ quan quản lý, Cấp quản lý tích hợp trực tiếp vào từng dòng Phụ lục tài nguyên để gộp dữ liệu chính xác theo Hệ thống.",
        "Phân quyền quản lý và phân công (Assignees):",
        "  + Đối với tài khoản User thường: Trường 'Nhóm quản lý' bị khóa cứng, tự động nhận giá trị là nhóm hiện tại của cán bộ; danh sách người thực hiện (Assignee) mặc định là chính user đó (không được tự ý giao việc cho người khác).",
        "  + Đối với tài khoản Admin: Toàn quyền lựa chọn Nhóm quản lý bất kỳ trong 6 nhóm và toàn quyền phân công nhiều cán bộ (Assignees) từ các nhóm khác nhau tham gia công việc."
    ]
    for it in r5_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # --- Yêu cầu 6 ---
    add_custom_heading("2.6. Yêu cầu 6: Bảng Dữ Liệu Tài Nguyên & Hiệu Ứng Tương Tác Hover", 2)
    doc.add_paragraph("Bảng dữ liệu tài nguyên tổng hợp là nơi cán bộ theo dõi thông số kỹ thuật hệ thống (vCPU, RAM, Disk, IP, Sizing). Giao diện được bổ sung các tính năng tương tác chuyên sâu:")
    r6_items = [
        "Bổ sung cột 'Chi tiết' ở vị trí đầu tiên: Đặt một cột chuyên dụng 'Chi tiết' ngay trước cột 'STT'. Mỗi dòng hiển thị một nút icon mở nhanh (Icon Eye / Side-Drawer Trigger). Nhấp vào nút này sẽ kích hoạt Right Sidebar Drawer hiển thị toàn bộ hồ sơ kỹ thuật, công văn liên kết và lịch sử thay đổi của hệ thống đó.",
        "Hiệu ứng Hover phân tầng dữ liệu (Two-Level Interactive Hover Highlight):",
        "  + Cấp độ 1 (Row Hover): Khi con trỏ chuột di chuyển vào bất kỳ vị trí nào trên dòng, toàn bộ hàng dữ liệu đó được phủ một lớp màu nền nổi bật nhẹ (màu xanh nhạt dịu mắt ở Light mode: #F1F5F9; màu xanh xám đậm ở Dark mode: #1E293B).",
        "  + Cấp độ 2 (Cell Hover): Đồng thời, chính ô dữ liệu mà con trỏ chuột đang trỏ vào (Cell) sẽ được tự động đổi sang màu nền đậm hơn một bậc kèm viền sáng vi mô (Border Highlight), giúp người dùng không bị lệch mắt khi đối chiếu dữ liệu giữa các cột bảng rộng."
    ]
    for it in r6_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # --- Yêu cầu 7 ---
    add_custom_heading("2.7. Yêu cầu 7: Navigation Menu & Menu 'For You' Ổn Định Tuyệt Đối", 2)
    doc.add_paragraph("Thanh menu điều hướng bên trái (Sidebar Navigation) được gia cố kỹ thuật để triệt tiêu mọi hiện tượng giật vỡ layout:")
    r7_items = [
        "Khóa cố định khung menu 'For you (Công việc của bạn)': Ngăn chặn hoàn toàn hiện tượng dớt chữ (text wrapping), vỡ dòng hoặc co giật chiều rộng sidebar khi người dùng click đóng/mở danh sách menu con (Quản lý công việc, Thống kê, Quản lý tài nguyên, Danh mục công văn/văn bản).",
        "Hiệu ứng xoay icon Chevron mượt mà: Biểu tượng mũi tên điều hướng (Chevron icon) sử dụng hiệu ứng chuyển động CSS Transform mượt mà (rotate 90 độ khi mở ra và trả về 0 độ khi thu gọn), thời gian chuyển động 200ms ease-in-out.",
        "Quy chuẩn CSS nhãn menu: Thiết lập white-space: nowrap, overflow: hidden, text-overflow: ellipsis cùng min-width cố định, đảm bảo thanh điều hướng luôn duy trì kích thước ổn định ở mọi trạng thái."
    ]
    for it in r7_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # --- Yêu cầu 8 ---
    add_custom_heading("2.8. Yêu cầu 8: Quy Chuẩn Right Sidebar Drawer (Thay Thế Toàn Bộ Modal Popup)", 2)
    doc.add_paragraph("Chuyển đổi toàn diện phương thức tương tác người dùng từ cửa sổ nổi (Modal Popup) sang ngăn kéo trượt từ cạnh phải màn hình (Right Sidebar Drawer):")
    r8_items = [
        "Xóa bỏ triệt để các hộp thoại modal cổ điển: Loại bỏ tình trạng cửa sổ popup nhảy giữa màn hình gây che khuất bối cảnh làm việc.",
        "Quy chuẩn phân cấp kích thước Drawer:",
        "  + Drawer Tác vụ Phức tạp (Form Tạo/Sửa Công việc, Nhập dữ liệu lớn): Thiết lập độ rộng chiếm từ 65% đến 75% chiều rộng khung nhìn (viewport width, tối thiểu 768px, tối đa 1150px). Cung cấp không gian tối ưu cho các bảng nhập liệu nhiều cột.",
        "  + Drawer Tra cứu Nhanh (Xem chi tiết tài nguyên, Lịch sử revision, Chi tiết công văn): Thiết lập độ rộng cố định từ 450px đến 500px.",
        "Trải nghiệm thao tác: Tích hợp lớp phủ mờ nền (Backdrop Overlay) có thể nhấp để đóng, nút Đóng (X) cố định ở góc trên bên phải, thanh cuộn độc lập bên trong drawer, hỗ trợ phím tắt Esc để đóng nhanh."
    ]
    for it in r8_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # --- Yêu cầu 9 ---
    add_custom_heading("2.9. Yêu cầu 9: Hệ Thống Theme & Tự Động Tương Phản Màu Chữ (Contrast Engine)", 2)
    doc.add_paragraph("Bảo đảm khả năng hiển thị rõ nét và bảo vệ thị lực cho cán bộ chiến sĩ trong mọi điều kiện ánh sáng môi trường:")
    r9_items = [
        "Hỗ trợ đa dạng chủ đề nền: Chế độ Sáng chuẩn (Light Mode), Chế độ Tối bảo vệ mắt (Dark Mode), Các bảng màu nhấn cá nhân (Blue, Teal, Indigo, Slate), Nền dải màu chuyển sắc (Gradients), và Nền hình ảnh tùy biến (ảnh URL hoặc ảnh tải từ máy tính).",
        "Thuật toán tự động tính toán độ tương phản (Dynamic Contrast Engine):",
        "  + Hệ thống phân tích giá trị độ sáng tương đối (Relative Luminance) của nền theo công thức quang học: L = 0.299*R + 0.587*G + 0.114*B.",
        "  + Tự động đảo màu chữ: Khi nền có độ sáng thấp (L < 128 - vùng nền tối), toàn bộ chữ viết, icon, nhãn số liệu tự động chuyển sang màu trắng sáng (#FFFFFF) hoặc xám sáng (#F8FAFC). Khi nền có độ sáng cao (L >= 128 - vùng nền sáng), chữ tự động chuyển sang màu xanh than đậm (#0F172A hoặc #1E293B).",
        "  + Đảm bảo tỷ lệ tương phản văn bản đạt hoặc vượt chuẩn quốc tế WCAG 2.1 AA (tối thiểu 4.5:1 cho văn bản tiêu chuẩn và 3:1 cho tiêu đề lớn), ngăn chặn hoàn toàn hiện tượng chữ chìm vào nền."
    ]
    for it in r9_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {it}")

    # ==================== 4. MA TRẬN PHÂN QUYỀN & RÀNG BUỘC NGHIỆP VỤ ====================
    add_custom_heading("3. MA TRẬN PHÂN QUYỀN VÀ RÀNG BUỘC NGHIỆP VỤ (ADMIN VS USER)", 1, space_before=16)

    doc.add_paragraph("Hệ thống duy trì 2 nhóm vai trò người dùng chính: Quản trị viên (Admin) và Cán bộ nghiệp vụ (User). Các ràng buộc bảo mật và quyền hạn xử lý được quy định nghiêm ngặt theo bảng ma trận dưới đây:")

    perm_headers = ["Hành động nghiệp vụ", "Quản trị viên (Admin)", "User (Người tạo task)", "User (Người được giao)", "User (Cùng nhóm)"]
    perm_data = [
        ["Xem công việc (View Task)", "Toàn quyền xem mọi task", "Được xem task mình tạo", "Được xem task được giao", "Xem nếu thuộc nhóm QL hoặc nhóm assignee"],
        ["Tạo công việc mới (Create)", "Giao cho bất kỳ ai/nhóm nào", "Chỉ tự giao cho chính mình", "Chỉ tự giao cho chính mình", "Chỉ tự giao cho chính mình"],
        ["Sửa Tiêu đề / Mô tả / Ngày bắt đầu", "Toàn quyền chỉnh sửa", "Được sửa task mình tạo", "Không có quyền", "Không có quyền"],
        ["Thay đổi Hạn hoàn thành (Due date)", "Toàn quyền thay đổi", "Được đổi (ghi lịch sử)", "Không được phép đổi", "Không được phép đổi"],
        ["Phân công người thực hiện (Assignee)", "Toàn quyền chọn nhiều người", "Chỉ tự gán chính mình", "Không được thay đổi", "Không được thay đổi"],
        ["Đổi Trạng thái chung / Gửi bình luận", "Toàn quyền cập nhật", "Được cập nhật", "Được cập nhật trạng thái chung", "Không có quyền (Chỉ đọc)"],
        ["Tài liệu / Phụ lục / Custom Table", "Toàn quyền sửa/thêm", "Được sửa trên task mình", "Được sửa trên task mình", "Không có quyền"],
        ["Sửa ô bảng Dữ liệu tài nguyên", "Toàn quyền sửa mọi ô", "Chỉ sửa ô có task nguồn giao mình", "Chỉ sửa ô có task nguồn giao mình", "Không có quyền"],
        ["Quản lý Danh mục & Sơ đồ tổ chức", "Toàn quyền CRUD nhóm/nhân sự", "Không có quyền quản trị", "Không có quyền quản trị", "Không có quyền quản trị"]
    ]
    add_table_data(perm_headers, perm_data, [1.8, 1.3, 1.3, 1.3, 1.3])

    add_custom_heading("3.1. Ràng Buộc Về Mã Định Danh & Chuyển Nhóm Nhân Sự", 2)
    doc.add_paragraph("Hệ thống bảo đảm tính toàn vẹn lịch sử dữ liệu khi có sự điều động, luân chuyển nhân sự giữa 6 nhóm nghiệp vụ (Hạ tầng HT, Mạng HTM, Điện nước DN, Máy chủ MC, HPC-AI HPCAI, Quản lý văn bản QLVB):")
    rule_items = [
        "Mã định danh công việc (Task ID): Task theo công văn có tiền tố theo nhóm quản lý (ví dụ: Task-HT-01, Task-MC-02); task thường luôn có tiền tố Task-DAILY-xx.",
        "Quy tắc chuyển nhóm cá nhân: Khi một cán bộ là người DUY NHẤT được giao task công văn chuyển sang nhóm mới, nhóm quản lý và mã task được cập nhật theo nhóm mới. Trường hợp task có NHIỀU người nhận từ các nhóm khác nhau, mã task và nhóm quản lý ban đầu được giữ nguyên để bảo đảm tính ổn định.",
        "Bảo lưu lịch sử kiểm toán (Audit Trail): Mọi thao tác thay đổi hạn xử lý, chuyển trạng thái, điều chuyển nhóm đều tự động ghi nhật ký hệ thống kèm thông tin: Người thực hiện (Actor), Giá trị cũ/mới, Dấu thời gian chính xác (Timestamp)."
    ]
    for rit in rule_items:
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.add_run(f"• {rit}")

    # ==================== 5. KẾ HOẠCH TRIỂN KHAI CHO AGENT FRONTEND ====================
    add_custom_heading("4. KẾ HOẠCH TRIỂN KHAI MÃ NGUỒN CHO AGENT FRONTEND", 1, space_before=16)

    doc.add_paragraph("Để hiện thực hóa trọn vẹn 9 yêu cầu nghiệp vụ trên kiến trúc mã nguồn hiện tại của dự án C12-InternalApp, Agent Frontend cần tuân thủ bảng phân công nhiệm vụ và phạm vi can thiệp file mã nguồn chi tiết như sau:")

    impl_headers = ["Tệp mã nguồn (File Path)", "Phân loại", "Nhiệm vụ kỹ thuật cần lập trình chi tiết"]
    impl_data = [
        [
            "frontend/app.js",
            "Logic Header & Theme",
            "1. Tái cấu trúc DOM Header thành 3 cụm: Nav, Search Bar, Quick Tools.\n"
            "2. Thay đổi nút Dark/Light thành switch dạng Pill có animation trượt mượt mà.\n"
            "3. Bổ sung icon Palette chọn theme mới và hiển thị badge đỏ trên icon thông báo.\n"
            "4. Triển khai thuật toán Contrast Engine tính Luminance nền để đảo màu chữ chuẩn WCAG."
        ],
        [
            "frontend/workspace.js",
            "Trang Dashboard & Nav",
            "1. Cập nhật Dashboard: Render thẻ Task Summary compact có icon màu tương ứng.\n"
            "2. Xây dựng Welcome Banner hiển thị thông tin Phòng 4 · Tổ 1 và Quick Action Chips.\n"
            "3. Loại bỏ toàn bộ code render breadcrumbs và subtitles trên mọi view.\n"
            "4. Cố định chiều rộng menu 'For you', thêm animation rotate cho chevron icon."
        ],
        [
            "frontend/workspace-forms.js",
            "Form & Custom Table",
            "1. Đổi tiêu đề form thành 'Tạo công việc mới', tinh chỉnh label đậm và title compact.\n"
            "2. Đẩy vùng upload tệp đính kèm lên ngay dưới ô Mô tả công việc.\n"
            "3. Phân nhánh Form: Task thường hiển thị Custom Table động (thêm cột, thêm dòng); Task công văn giữ phụ lục tài nguyên.\n"
            "4. Thực thi phân quyền: Khóa nhóm quản lý/assignee với User; mở toàn quyền cho Admin."
        ],
        [
            "frontend/workspace-details.js",
            "Right Sidebar Drawer",
            "1. Thay thế toàn bộ logic mở modal popup thành mở Right Sidebar Drawer.\n"
            "2. Cấu hình độ rộng Drawer: 65-75% cho form task/nhập liệu lớn; 450-500px cho tra cứu chi tiết.\n"
            "3. Tích hợp backdrop overlay làm mờ, nút Close X cố định và sự kiện phím tắt Esc."
        ],
        [
            "frontend/workspace-table.js",
            "Bảng Dữ Liệu & Bộ Lọc",
            "1. Thêm cột 'Chi tiết' chứa icon mở drawer trước cột STT trên bảng tài nguyên.\n"
            "2. Bổ sung hiệu ứng hover hai tầng: Hover dòng (row highlight) và Hover ô (cell highlight đậm hơn).\n"
            "3. Nâng cấp hệ thống bộ lọc đa chọn (Multi-select dropdown, badge số đếm, logic OR nội bộ và AND liên cột)."
        ],
        [
            "frontend/styles.css",
            "CSS Toàn Cục",
            "1. Định nghĩa biến CSS và style cho Header 3 vùng, Search Bar bo tròn.\n"
            "2. Code CSS cho công tắc chuyển chế độ Pill Switch Dark/Light (keyframes, transitions).\n"
            "3. Thiết lập biến màu tương phản tự động (--text-contrast-primary, --text-contrast-secondary).\n"
            "4. Định nghĩa animation trượt Drawer từ bên phải và hiệu ứng xoay chevron icon."
        ],
        [
            "frontend/workspace.css",
            "CSS Layout Phân Hệ",
            "1. Style thẻ Task Summary compact (cao ~76px) và lưới Quick Access giãn rộng.\n"
            "2. Style Welcome Banner hiện đại và các Quick Action Chips.\n"
            "3. Quy chuẩn CSS Drawer (width 65-75% & 450-500px, z-index, box-shadow, backdrop blur).\n"
            "4. Style widget Custom Table động và hiệu ứng hover phân tầng (row/cell highlight)."
        ]
    ]
    add_table_data(impl_headers, impl_data, [1.6, 1.2, 4.0])

    # ==================== 6. BỘ TIÊU CHÍ KIỂM THỬ (ACCEPTANCE TEST) ====================
    add_custom_heading("5. BỘ TIÊU CHÍ KIỂM THỬ NGHIỆM THU (ACCEPTANCE TEST CHECKLIST)", 1, space_before=16)

    doc.add_paragraph("Sau khi hoàn tất công tác lập trình, Agent Frontend và bộ phận QA bắt buộc phải kiểm tra đối soát từng kịch bản theo bảng tiêu chuẩn nghiệm thu gồm 9 tiêu chí sau:")

    test_headers = ["Mã kịch bản", "Hạng mục kiểm thử", "Quy trình thực hiện & Tiêu chí nghiệm thu (Pass Criteria)", "Kết quả"]
    test_data = [
        [
            "TC-01",
            "Kiểm tra Header Layout & Công cụ",
            "1. Kiểm tra 3 phân vùng Header: Logo/Title trái, Search bar giữa, Công cụ phải.\n"
            "2. Bấm nút Pill Switch: Kiểm tra icon Mặt trời/Mặt trăng trượt mượt mà, đổi giao diện Dark/Light tức thì.\n"
            "3. Kiểm tra icon Palette mở bảng theme; icon chuông thông báo hiển thị đúng badge số đỏ.",
            "Chờ kiểm thử"
        ],
        [
            "TC-02",
            "Kiểm tra Dashboard Cloud Console",
            "1. Kiểm tra 4 thẻ Task Summary hiển thị kích thước compact, có đầy đủ icon màu nhận diện.\n"
            "2. Kiểm tra Welcome Banner hiển thị đúng 'Phòng 4 · Tổ 1', mã phiên, thời gian và các quick action chips.\n"
            "3. Kiểm tra lưới Quick Access có khoảng cách hàng/cột thoáng đẹp (gap >= 20px).",
            "Chờ kiểm thử"
        ],
        [
            "TC-03",
            "Kiểm tra Tối giản Tiêu đề Trang",
            "1. Duyệt qua 100% các trang (Dashboard, Tasks, Resources, Analytics, Org Graph, Catalogs).\n"
            "2. Xác nhận KHÔNG CÒN bất kỳ thanh breadcrumbs nào.\n"
            "3. Xác nhận KHÔNG CÒN bất kỳ dòng subtitle mô tả phụ nào; chỉ còn lại tiêu đề H1 tinh gọn.",
            "Chờ kiểm thử"
        ],
        [
            "TC-04",
            "Kiểm tra Bộ lọc Đa chọn (Multi-select)",
            "1. Mở dropdown bộ lọc: Hiển thị danh sách checkbox, nút Chọn tất cả/Bỏ chọn và ô tìm kiếm.\n"
            "2. Chọn 2 giá trị trong cùng bộ lọc: Badge hiển thị 'Đã chọn (2)', dữ liệu lọc theo logic OR.\n"
            "3. Kết hợp 2 bộ lọc khác nhau: Dữ liệu lọc theo logic AND chính xác.",
            "Chờ kiểm thử"
        ],
        [
            "TC-05",
            "Kiểm tra Form Tạo Công Việc Mới",
            "1. Mở form: Tiêu đề hiển thị 'Tạo công việc mới', label to đậm, input title compact.\n"
            "2. Kiểm tra vùng tệp đính kèm nằm ngay dưới trường Mô tả công việc.\n"
            "3. Chọn Task thường: Ẩn công văn/phụ lục, hiển thị Custom Table cho phép thêm cột/dòng.\n"
            "4. Đăng nhập User: Nhóm QL bị khóa theo nhóm user, assignee là chính user; Đăng nhập Admin: Mở toàn quyền.",
            "Chờ kiểm thử"
        ],
        [
            "TC-06",
            "Kiểm tra Bảng Tài Nguyên & Hover",
            "1. Xác nhận cột 'Chi tiết' xuất hiện đầu tiên trước cột STT; bấm nút mở đúng Right Drawer chi tiết hệ thống.\n"
            "2. Rê chuột vào hàng: Cả hàng đổi màu nền nhẹ (Row Hover).\n"
            "3. Rê chuột vào ô: Ô đang trỏ đổi màu đậm hơn rõ rệt (Cell Hover).",
            "Chờ kiểm thử"
        ],
        [
            "TC-07",
            "Kiểm tra Menu 'For you' & Chevron",
            "1. Click đóng/mở menu 'For you': Các nhãn menu con không bị nhảy dòng, không vỡ layout sidebar.\n"
            "2. Icon Chevron xoay 90 độ mượt mà khi mở và quay về ban đầu khi đóng.",
            "Chờ kiểm thử"
        ],
        [
            "TC-08",
            "Kiểm tra Right Sidebar Drawer",
            "1. Xác nhận toàn bộ thao tác form và xem chi tiết đều mở qua Drawer trượt từ phải (Không còn popup giữa màn hình).\n"
            "2. Form công việc lớn chiếm 65-75% màn hình; Drawer xem chi tiết chiếm 450-500px.\n"
            "3. Nhấp backdrop hoặc nhấn phím Esc: Drawer đóng mượt mà.",
            "Chờ kiểm thử"
        ],
        [
            "TC-09",
            "Kiểm tra Contrast Engine & Theme",
            "1. Chuyển đổi giữa các theme: Nền sáng, Nền tối, Nền dải màu, Nền ảnh tải lên.\n"
            "2. Kiểm tra màu chữ tự động đảo trắng/đen đảm bảo luôn tương phản cao, dễ đọc, không bị chìm vào nền.",
            "Chờ kiểm thử"
        ]
    ]
    add_table_data(test_headers, test_data, [0.8, 1.8, 3.4, 0.8])

    # Final summary box
    add_callout([
        "Tài liệu đặc tả này là căn cứ kỹ thuật chính thức để Agent Frontend tiến hành viết mã và kiểm thử.",
        "Mọi phát sinh ngoài phạm vi đặc tả cần được báo cáo Tổ trưởng để phê duyệt trước khi hiện thực hóa.",
        "Thời hạn hoàn thành bàn giao mã nguồn Prototype V5.1: 17/11/2026."
    ], title="KẾT LUẬN & KẾ HOẠCH BÀN GIAO")

    # Output file path
    output_dir = r"c:\Users\FPT SHOP\Desktop\C12-InternalApp\docs"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "Bao_Cao_Cap_Nhat_Giao_Dien_V5.docx")
    
    doc.save(output_path)
    file_size = os.path.getsize(output_path)
    print(f"File created successfully at: {output_path}")
    print(f"File size: {file_size} bytes")

if __name__ == "__main__":
    create_document()
