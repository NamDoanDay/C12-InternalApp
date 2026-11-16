'use strict';

function emptyTask(){
  let userGroup = M.personGroup(state, session) || (state.taskGroups[0]?.id || 'g-HT');
  return {
    type:'document',
    title:'',
    description:'',
    managementGroupId: admin() ? '' : userGroup,
    unit:'',
    agency:'',
    level:'Địa phương',
    assigneeIds: admin() ? [] : [session],
    start:'',
    due:'',
    status:'processing',
    officialIds:[],
    documentIds:[],
    resources:[],
    resourceColumns:['vCPU','RAM (GB)'],
    customFields:[],
    attachments:[],
    comments:[],
    customTable:{
      name:'Bảng dữ liệu theo dõi',
      columns:['STT','Hạng mục công việc','Người thực hiện','Kết quả kiểm tra','Ghi chú'],
      rows:[
        {STT:'1','Hạng mục công việc':'Kiểm tra hệ thống định kỳ','Người thực hiện':me()?.name||'','Kết quả kiểm tra':'Đạt yêu cầu','Ghi chú':''}
      ]
    }
  };
}

function taskForm(id, fromLegacy){
  let existing=id?taskBy(id):null;
  if(existing&&!M.canEdit(state,me(),existing))return toast('Bạn không có quyền sửa task.');
  formTask=M.clone(existing||emptyTask());
  if(!formTask.customTable){
    formTask.customTable={
      name:'Bảng dữ liệu công việc',
      columns:['STT','Hạng mục công việc','Người thực hiện','Ghi chú'],
      rows:[{STT:'1','Hạng mục công việc':'Nhiệm vụ 1','Người thực hiện':me()?.name||'','Ghi chú':''}]
    };
  }
  if(fromLegacy)Object.assign(formTask,fromLegacy);
  openTaskId=id||'';
  renderTaskForm();
}

function renderCustomTableEditor(t){
  let ct=t.customTable||{name:'Bảng dữ liệu',columns:['STT','Hạng mục'],rows:[]};
  return `<table class="dynamic-data-table">
    <thead>
      <tr>
        ${ct.columns.map((c,ci)=>`<th>
          <div class="th-wrap">
            <span>${esc(c)}</span>
            ${ci>0?`<button type="button" class="icon-btn-sm" data-del-custom-col="${ci}" title="Xóa cột ${esc(c)}">${icon('close')}</button>`:''}
          </div>
        </th>`).join('')}
        <th style="width:40px"></th>
      </tr>
    </thead>
    <tbody>
      ${ct.rows.map((row,ri)=>`<tr>
        ${ct.columns.map(c=>`<td>
          <input data-custom-cell-row="${ri}" data-custom-cell-col="${esc(c)}" value="${esc(row[c]??'')}">
        </td>`).join('')}
        <td style="text-align:center">
          <button type="button" class="icon-btn-sm" data-del-custom-row="${ri}" title="Xóa dòng ${ri+1}">${icon('trash')}</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
  ${ct.rows.length===0?'<div class="empty" style="padding:16px">Chưa có dòng dữ liệu nào. Bấm "+ Thêm dòng" để bắt đầu.</div>':''}`;
}

// =========================================================
// YÊU CẦU 5 & 8: FORM TẠO/SỬA CÔNG VIỆC DẠNG RIGHT SIDEBAR DRAWER
// =========================================================
function renderTaskForm(){
  let t=formTask,
      original=t.id?taskBy(t.id):null,
      full=!original||admin()||original.creatorId===session,
      lock=full?'':'disabled',
      dueLock=!original||M.canEditDue(state,me(),original)?'':'disabled';

  if(!admin()&&!t.id){
    t.managementGroupId=M.personGroup(state,session)||t.managementGroupId;
    t.assigneeIds=[session];
  }

  $('#overlay').innerHTML=`<div class="scrim task-editor-scrim" id="taskEditorScrim">
    <section id="taskEditor" class="drawer wide-drawer task-editor-drawer" role="dialog" aria-modal="true" aria-label="${t.id?'Chỉnh sửa công việc':'Tạo công việc mới'}">
      <form id="taskEditorForm" style="display:flex;flex-direction:column;height:100%">
        <div class="drawer-head">
          <div>
            <span class="small muted" style="letter-spacing:0.5px">${t.code?esc(t.code):'CÔNG VIỆC MỚI'}</span>
            <h2 style="margin-top:2px">${t.id?'Chỉnh sửa công việc':'Tạo công việc mới'}</h2>
          </div>
          <button class="icon-btn" type="button" id="closeTaskEditor" aria-label="Đóng phiếu">${icon('close')}</button>
        </div>

        <div class="task-editor-layout">
          <!-- MAIN AREA -->
          <div class="task-editor-main">
            <!-- Tiêu đề công việc: Compact single-line -->
            <label class="field">
              <span>Tiêu đề công việc <span class="required">*</span></span>
              <input name="title" class="task-title-input" value="${esc(t.title)}" required ${lock} placeholder="Nhập tên công việc...">
            </label>

            <!-- Mô tả công việc -->
            <label class="field">
              <span>Mô tả công việc</span>
              <textarea name="description" rows="3" ${lock} placeholder="Tóm tắt yêu cầu, nội dung chỉ đạo hoặc mục tiêu công việc...">${esc(t.description)}</textarea>
            </label>

            <!-- KHỐI TỆP ĐÍNH KÈM KHÁC ĐƯỢC ĐẨY LÊN NGAY DƯỚI MÔ TẢ -->
            <div class="task-attachments-section" style="background:var(--app);padding:14px 18px;border-radius:10px;border:1px solid var(--border)">
              <div class="section-title" style="margin:0 0 10px;display:flex;align-items:center;justify-content:space-between">
                <h3 style="margin:0">Tệp đính kèm khác</h3>
                <label class="btn text" style="cursor:pointer">
                  <input type="file" id="taskAttachment" multiple hidden>
                  ${icon('upload')} Tải tệp lên
                </label>
              </div>
              <div>${fileLinks(t.attachments,true)||'<span class="small muted">Chưa có tệp đính kèm.</span>'}</div>
            </div>

            <!-- PHÂN NHÁNH NGHIỆP VỤ: TASK THƯỜNG VS THEO CÔNG VĂN -->
            ${t.type==='daily'?`
              <!-- TASK THƯỜNG: BẢNG DỮ LIỆU TÙY CHỈNH (CUSTOM TABLE) -->
              <div class="custom-table-container">
                <div class="custom-table-header-bar">
                  <div>
                    <span class="small muted" style="font-weight:600;text-transform:uppercase;color:var(--action)">Bảng dữ liệu tùy chỉnh (Custom Table)</span>
                    <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
                      <label style="font-weight:600;font-size:13.5px">Tên bảng:</label>
                      <input class="custom-table-name-input" id="customTableName" value="${esc(t.customTable?.name||'Bảng dữ liệu công việc')}" placeholder="Nhập tên bảng dữ liệu...">
                    </div>
                  </div>
                  <div class="flex gap">
                    <button type="button" class="btn" id="addCustomTableCol">${icon('plus')} Thêm cột</button>
                    <button type="button" class="btn primary" id="addCustomTableRow">${icon('plus')} Thêm dòng</button>
                  </div>
                </div>
                <div class="table-scroll compact-scroll" style="margin-top:10px">
                  ${renderCustomTableEditor(t)}
                </div>
              </div>
            `:`
              <!-- THEO CÔNG VĂN: GIỮ NGUYÊN CÔNG VĂN, VĂN BẢN VÀ PHỤ LỤC TÀI NGUYÊN -->
              <div class="task-document-section">
                <div class="section-title" style="margin:0 0 10px;display:flex;align-items:center;justify-content:space-between">
                  <h3 style="margin:0">Công văn đăng ký <span class="required">*</span></h3>
                  <button type="button" class="btn text" id="addTaskOfficial">${icon('plus')} Chọn / tạo công văn</button>
                </div>
                ${taskCatalogTable('officials',t.officialIds)}

                <div class="section-title" style="margin:16px 0 10px;display:flex;align-items:center;justify-content:space-between">
                  <h3 style="margin:0">Văn bản chỉ đạo</h3>
                  <button type="button" class="btn text" id="addTaskDocument">${icon('plus')} Chọn / tạo văn bản</button>
                </div>
                ${taskCatalogTable('documents',t.documentIds)}
              </div>

              <!-- PHỤ LỤC TÀI NGUYÊN: TÍCH HỢP 3 TRƯỜNG ĐƠN VỊ, CƠ QUAN, CẤP QUẢN LÝ -->
              <div class="resource-appendix-section">
                <div class="section-title" style="margin:16px 0 10px;display:flex;align-items:center;justify-content:space-between">
                  <h3 style="margin:0">Phụ lục tài nguyên phần cứng</h3>
                  <div class="flex gap">
                    <button type="button" class="btn text" id="importTaskResource">${icon('upload')} Nhập DOCX / Excel</button>
                    <button type="button" class="btn text" id="addTaskResourceColumn">${icon('plus')} Thêm cột</button>
                  </div>
                </div>

                <!-- 3 TRƯỜNG TÍCH HỢP TRONG PHẦN PHỤ LỤC TÀI NGUYÊN -->
                <div class="form-grid" style="background:var(--app);padding:14px;border-radius:8px;border:1px solid var(--border);margin-bottom:12px">
                  ${field('Tên đơn vị *','unit',t.unit,'text',t.type==='document')}
                  ${field('Cơ quan quản lý *','agency',t.agency,'text',t.type==='document')}
                  <label class="field">
                    <span>Cấp quản lý</span>
                    <select name="level" id="taskLevel" ${lock}>
                      <option value="Địa phương" ${t.level!=='Bộ ngành'?'selected':''}>Địa phương</option>
                      <option value="Bộ ngành" ${t.level==='Bộ ngành'?'selected':''}>Bộ ngành</option>
                    </select>
                  </label>
                </div>

                ${taskResourceEditor(t)}
                <button type="button" class="btn text" id="addTaskResourceRow" style="margin-top:8px">${icon('plus')} Thêm dòng tài nguyên</button>
                <div id="taskImportArea"></div>
              </div>
            `}
          </div>

          <!-- SIDEBAR: METADATA & PHÂN QUYỀN -->
          <aside class="task-editor-side">
            <label class="field">
              <span>Loại công việc</span>
              <select name="type" ${lock}>
                <option value="document" ${t.type==='document'?'selected':''}>Theo công văn</option>
                <option value="daily" ${t.type==='daily'?'selected':''}>Task thường</option>
              </select>
            </label>

            <label class="field">
              <span>Trạng thái</span>
              <select name="status">
                ${Object.entries(WF).map(([k,v])=>`<option value="${k}" ${t.status===k?'selected':''}>${v}</option>`).join('')}
              </select>
            </label>

            <label class="field">
              <span>Nhóm quản lý ${t.type==='document'?'<span class="required">*</span>':''}</span>
              <select name="managementGroupId" ${admin()?'':'disabled'}>
                <option value="">Chọn nhóm quản lý</option>
                ${state.taskGroups.filter(g=>!g.archived).map(g=>`<option value="${g.id}" ${g.id===t.managementGroupId?'selected':''}>${esc(g.name)} (${esc(g.code)})</option>`).join('')}
              </select>
              ${!admin()?'<span class="small muted">Khóa theo nhóm hiện tại của cán bộ trong tổ</span>':''}
            </label>

            <div class="divider"></div>
            <h3>Người được giao</h3>
            ${admin()?`
              <label class="field">
                <span>Lọc theo nhóm cán bộ</span>
                <select id="assigneeGroup" multiple size="3">
                  ${state.taskGroups.filter(g=>!g.archived).map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join('')}
                </select>
              </label>
              <div class="assignee-picker" id="assigneeList">
                ${assigneeChoices(t)}
              </div>
            `:`
              <div class="chip active" style="padding:10px 12px;display:flex;gap:8px">
                ${icon('users')}
                <span><strong>${esc(me().name)}</strong> (Tự giao cho mình)</span>
              </div>
              <p class="small muted" style="margin-top:4px">Cán bộ chỉ tự giao công việc cho chính mình.</p>
            `}

            <div class="divider"></div>
            <h3>Lên lịch thực hiện</h3>
            <label class="field">
              <span>Ngày bắt đầu *</span>
              <input name="start" type="datetime-local" required value="${localTime(t.start)}" ${lock}>
            </label>
            <label class="field">
              <span>Hạn hoàn thành *</span>
              <input name="due" type="datetime-local" required value="${localTime(t.due)}" ${dueLock}>
            </label>
            ${dueLock?'<p class="small muted">Chỉ admin hoặc người tạo task được thay đổi hạn.</p>':''}

            <div class="divider"></div>
            <div class="section-title" style="margin:0;display:flex;align-items:center;justify-content:space-between">
              <h3 style="margin:0">Trường tùy chỉnh</h3>
              <button type="button" class="icon-btn" id="addTaskCustom" aria-label="Thêm trường">${icon('plus')}</button>
            </div>
            ${t.customFields.map((c,i)=>`<div class="custom-row">
              <input data-custom-name="${i}" placeholder="Tên trường" value="${esc(c.name)}">
              <input data-custom-value="${i}" placeholder="Giá trị" value="${esc(c.value)}">
              <button type="button" data-custom-remove="${i}" aria-label="Xóa trường">${icon('close')}</button>
            </div>`).join('')}
          </aside>
        </div>

        <div class="modal-foot">
          <p class="error grow" id="taskError" role="alert"></p>
          <button class="btn" type="button" id="cancelTask">Hủy</button>
          <button class="btn primary" type="submit">${t.id?'Lưu thay đổi':'Tạo công việc'}</button>
        </div>
      </form>
    </section>
  </div>`;

  let form=$('#taskEditorForm');
  let capture=()=>captureTaskForm();
  form.oninput=capture;
  form.onchange=capture;

  form.onsubmit=e=>{
    e.preventDefault();
    capture();
    try{
      M.saveTask(state,me(),formTask);
      persist();
      formTask=null;
      $('#overlay').innerHTML='';
      page='tasks';
      render();
      toast('Đã lưu công việc và gửi thông báo');
    }catch(err){
      $('#taskError').textContent=err.message;
    }
  };

  let cancel=()=>{
    if(confirm('Đóng phiếu? Các công văn/văn bản đã lưu vào danh mục vẫn được giữ.')){
      formTask=null;
      $('#overlay').innerHTML='';
    }
  };

  $('#closeTaskEditor').onclick=cancel;
  $('#cancelTask').onclick=cancel;

  let scrim=$('#taskEditorScrim');
  if(scrim)scrim.onclick=e=>{if(e.target===scrim)cancel()};

  if(form?.elements?.type){
    form.elements.type.onchange=()=>{
      capture();
      renderTaskForm();
    };
  }

  // Custom Table events (Task thường)
  $('#customTableName')?.addEventListener('input',e=>{
    if(!formTask.customTable)formTask.customTable={columns:[],rows:[]};
    formTask.customTable.name=e.target.value;
  });

  $('#addCustomTableCol')?.addEventListener('click',()=>{
    capture();
    let name=prompt('Nhập tên cột mới cho bảng tùy chỉnh:');
    if(!name?.trim())return;
    name=name.trim();
    if(!formTask.customTable)formTask.customTable={name:'Bảng dữ liệu',columns:[],rows:[]};
    if(!formTask.customTable.columns.includes(name)){
      formTask.customTable.columns.push(name);
      formTask.customTable.rows.forEach(r=>{r[name]=''});
      renderTaskForm();
    }
  });

  $('#addCustomTableRow')?.addEventListener('click',()=>{
    capture();
    if(!formTask.customTable)formTask.customTable={name:'Bảng dữ liệu',columns:['STT'],rows:[]};
    let newRow={};
    formTask.customTable.columns.forEach((c,ci)=>{
      newRow[c]=ci===0?String(formTask.customTable.rows.length+1):'';
    });
    formTask.customTable.rows.push(newRow);
    renderTaskForm();
  });

  $$('[data-del-custom-col]').forEach(btn=>{
    btn.onclick=()=>{
      capture();
      let ci=Number(btn.dataset.delCustomCol);
      let colName=formTask.customTable.columns[ci];
      formTask.customTable.columns.splice(ci,1);
      formTask.customTable.rows.forEach(r=>delete r[colName]);
      renderTaskForm();
    };
  });

  $$('[data-del-custom-row]').forEach(btn=>{
    btn.onclick=()=>{
      capture();
      let ri=Number(btn.dataset.delCustomRow);
      formTask.customTable.rows.splice(ri,1);
      renderTaskForm();
    };
  });

  $$('[data-custom-cell-row]').forEach(input=>{
    input.oninput=()=>{
      let ri=Number(input.dataset.customCellRow),
          col=input.dataset.customCellCol;
      if(formTask.customTable?.rows[ri]){
        formTask.customTable.rows[ri][col]=input.value;
      }
    };
  });

  // Official / Document / Appendix events (Theo công văn)
  $('#addTaskOfficial')?.addEventListener('click',()=>{capture();catalogPicker('officials')});
  $('#addTaskDocument')?.addEventListener('click',()=>{capture();catalogPicker('documents')});
  
  $$('[data-unlink-doc]').forEach(b=>b.onclick=()=>{
    capture();
    let arr=b.dataset.kind==='officials'?'officialIds':'documentIds';
    formTask[arr]=formTask[arr].filter(x=>x!==b.dataset.unlinkDoc);
    renderTaskForm();
  });

  $$('[data-task-doc-edit]').forEach(b=>b.onclick=()=>{
    capture();
    catalogEdit(b.dataset.kind,b.dataset.taskDocEdit,true);
  });

  $$('[data-doc-file]').forEach(input=>input.onchange=async()=>{
    try{
      let refs=await storeFiles(input.files);
      docBy(input.dataset.kind,input.dataset.docFile).files=refs;
      persist();renderTaskForm();
    }catch(err){toast(err.message)}
  });

  $('#addTaskResourceRow')?.addEventListener('click',()=>{
    capture();
    t.resources.push({id:M.id(),system:'',name:'',values:{},files:[]});
    renderTaskForm();
  });

  $('#addTaskResourceColumn')?.addEventListener('click',()=>{
    capture();
    let name=prompt('Tên cột tài nguyên mới:');
    if(name?.trim()&&!t.resourceColumns.includes(name.trim()))t.resourceColumns.push(name.trim());
    renderTaskForm();
  });

  $$('[data-remove-resource]').forEach(b=>b.onclick=()=>{
    capture();
    t.resources=t.resources.filter(r=>r.id!==b.dataset.removeResource);
    renderTaskForm();
  });

  $$('[data-resource-file]').forEach(input=>input.onchange=async()=>{
    capture();
    try{
      t.resources.find(r=>r.id===input.dataset.resourceFile).files.push(...await storeFiles(input.files));
      renderTaskForm();
    }catch(err){toast(err.message)}
  });

  $('#addTaskCustom')?.addEventListener('click',()=>{
    capture();
    t.customFields.push({id:M.id(),name:'',value:''});
    renderTaskForm();
  });

  $$('[data-custom-remove]').forEach(b=>b.onclick=()=>{
    capture();
    t.customFields.splice(+b.dataset.customRemove,1);
    renderTaskForm();
  });

  $('#assigneeGroup')?.addEventListener('change',()=>{
    capture();
    let gs=[...$('#assigneeGroup').selectedOptions].map(o=>o.value);
    $('#assigneeList').innerHTML=assigneeChoices(t,gs);
    $('#assigneeList').onchange=capture;
  });

  $('#taskAttachment')?.addEventListener('change',async()=>{
    capture();
    try{
      t.attachments.push(...await storeFiles($('#taskAttachment').files));
      renderTaskForm();
    }catch(err){toast(err.message)}
  });

  $('#importTaskResource')?.addEventListener('click',()=>{capture();taskImportPanel()});
  $('#taskEditor input[name=title]')?.focus?.();
}

function captureTaskForm(){
  if(!formTask||!$('#taskEditor'))return;
  let f=$('#taskEditorForm');
  if(!f)return;
  for(let k of ['title','description','type','status','managementGroupId','unit','agency','level']){
    let el=f.elements?.[k]||f.querySelector?.(`[name="${k}"]`);
    if(el&&!el.disabled)formTask[k]=el.value;
  }
  for(let k of ['start','due']){
    let el=f.elements?.[k]||f.querySelector?.(`[name="${k}"]`);
    if(el&&!el.disabled)formTask[k]=el.value?new Date(el.value).toISOString():'';
  }
  if(admin()){
    let shown=$$('[data-assignee]');
    let visibleIds=shown.map(e=>e.dataset.assignee);
    formTask.assigneeIds=[...new Set([...formTask.assigneeIds.filter(x=>!visibleIds.includes(x)),...shown.filter(e=>e.checked).map(e=>e.dataset.assignee)])];
  }else if(!formTask.id){
    formTask.assigneeIds=[session];
    formTask.managementGroupId=M.personGroup(state,session)||formTask.managementGroupId;
  }

  $$('[data-item-system]').forEach(e=>formTask.resources.find(r=>r.id===e.dataset.itemSystem).system=e.value);
  $$('[data-item-name]').forEach(e=>formTask.resources.find(r=>r.id===e.dataset.itemName).name=e.value);
  $$('[data-item-value]').forEach(e=>{
    let r=formTask.resources.find(r=>r.id===e.dataset.itemValue);
    let did=formTask.resourceEditDocId||formTask.officialIds[0],
        previous=r.docValues?.[did]?.[e.dataset.field]??r.values[e.dataset.field];
    if(String(previous??'')!==e.value){
      if(did){
        r.docValues||={};r.docValues[did]||={};
        r.docValues[did][e.dataset.field]=e.value;
      }else r.values[e.dataset.field]=e.value;
    }
  });
  $$('[data-custom-name]').forEach(e=>formTask.customFields[+e.dataset.customName].name=e.value);
  $$('[data-custom-value]').forEach(e=>formTask.customFields[+e.dataset.customValue].value=e.value);
}

function assigneeChoices(t,groupIds=[]){
  return state.users.filter(u=>u.status==='approved'&&(!groupIds.length||groupIds.includes(M.personGroup(state,u.id)))).map(u=>`
    <label><input type="checkbox" data-assignee="${u.id}" ${t.assigneeIds.includes(u.id)?'checked':''}>
    <span>${esc(u.name)}<small>${esc(groupName(M.personGroup(state,u.id)))}</small></span></label>
  `).join('');
}

function taskCatalogTable(kind,ids){
  return `<div class="table-scroll compact-scroll">
    <table class="data-table">
      <thead><tr><th>Số</th><th>Ngày phát hành</th><th>Trích yếu</th><th>Tệp đính kèm</th><th></th></tr></thead>
      <tbody>
        ${ids.map(id=>{
          let d=docBy(kind,id);
          return d?`<tr>
            <td><button class="link-button" type="button" data-task-doc-edit="${id}" data-kind="${kind}"><strong>${esc(d.no)}</strong></button></td>
            <td>${day(d.date)}</td>
            <td>${esc(d.summary)}</td>
            <td>${fileLinks(d.files||[])}<label class="file-inline">${icon('upload')}Thêm tệp<input type="file" data-doc-file="${id}" data-kind="${kind}" hidden></label></td>
            <td><button type="button" class="icon-btn-sm" data-unlink-doc="${id}" data-kind="${kind}" aria-label="Bỏ liên kết">${icon('close')}</button></td>
          </tr>`:'';
        }).join('')||'<tr><td colspan="5" class="muted">Chưa có mục nào được liên kết.</td></tr>'}
      </tbody>
    </table>
  </div>`;
}

function taskResourceEditor(t){
  return `<div class="table-scroll compact-scroll">
    <table class="data-table appendix-table">
      <thead>
        <tr>
          <th>STT</th>
          <th>Hệ thống *</th>
          <th>Tên tài nguyên</th>
          ${t.resourceColumns.map(c=>`<th>${esc(c)}</th>`).join('')}
          <th>Tệp theo dòng</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${t.resources.map((r,i)=>`<tr>
          <td>${i+1}</td>
          <td><input data-item-system="${r.id}" aria-label="Hệ thống dòng ${i+1}" value="${esc(r.system)}" placeholder="Chọn / nhập hệ thống" list="knownSystems"></td>
          <td><input data-item-name="${r.id}" aria-label="Tên tài nguyên dòng ${i+1}" value="${esc(r.name)}"></td>
          ${t.resourceColumns.map(c=>`<td><input data-item-value="${r.id}" data-field="${esc(c)}" aria-label="${esc(c)} dòng ${i+1}" value="${esc(r.docValues?.[t.resourceEditDocId||t.officialIds[0]]?.[c]??r.values[c]??'')}"></td>`).join('')}
          <td>${fileLinks(r.files)}<label class="file-inline">${icon('upload')}Tải tệp<input type="file" data-resource-file="${r.id}" hidden></label></td>
          <td><button type="button" class="icon-btn-sm" data-remove-resource="${r.id}" aria-label="Xóa dòng">${icon('trash')}</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
    <datalist id="knownSystems">
      ${[...new Set([...(state.legacyRows||[]).map(r=>r.system),...state.tasks.flatMap(t=>t.resources.map(r=>r.system))])].map(s=>`<option>${esc(s)}</option>`).join('')}
    </datalist>
  </div>`;
}

async function storeFiles(files){
  state.files||={};
  let refs=[];
  for(let file of files){
    if(file.size>2*1024*1024)throw Error('Prototype giới hạn 2 MB mỗi tệp.');
    let url=await new Promise((resolve,reject)=>{
      let r=new FileReader();
      r.onload=()=>resolve(r.result);
      r.onerror=()=>reject(Error('Không đọc được tệp.'));
      r.readAsDataURL(file);
    }),fid=M.id();
    state.files[fid]={id:fid,name:file.name,size:file.size,type:file.type,url};
    refs.push({id:fid,name:file.name,size:file.size});
  }
  return refs;
}

function fileLinks(refs=[],remove=false){
  return refs.map(f=>{
    let source=state.files?.[f.id];
    return `<span class="file-pill">${icon('file')}${source?`<a href="${esc(source.url)}" download="${esc(f.name)}">${esc(f.name)}</a>`:esc(f.name)} <small>${Math.ceil((f.size||0)/1024)} KB</small></span>`;
  }).join('');
}

function catalogPicker(kind){
  taskCatalogKind=kind;
  let ids=formTask[kind==='officials'?'officialIds':'documentIds'];
  modal(`Chọn ${kind==='officials'?'công văn':'văn bản'}`,
    `<input id="catalogPickerSearch" class="catalog-search" placeholder="Tìm theo số hoặc trích yếu..." style="margin-bottom:12px">
    <div id="catalogChoices" style="max-height:55vh;overflow-y:auto">${catalogChoices(kind,ids)}</div>`,
    ()=>{capture();renderTaskForm()},
    false,
    'Xong'
  );

  let capture=()=>{
    let arr=kind==='officials'?'officialIds':'documentIds';
    $$('[data-pick-doc]').forEach(e=>{
      if(e.checked&&!formTask[arr].includes(e.dataset.pickDoc))formTask[arr].push(e.dataset.pickDoc);
      if(!e.checked)formTask[arr]=formTask[arr].filter(x=>x!==e.dataset.pickDoc);
    });
  };

  $('#catalogChoices').onchange=capture;
  $('#catalogPickerSearch').oninput=e=>{
    capture();
    $('#catalogChoices').innerHTML=catalogChoices(kind,formTask[kind==='officials'?'officialIds':'documentIds'],e.target.value);
  };
}

function catalogChoices(kind,ids,q=''){
  return state[kind].filter(d=>!d.archived&&`${d.no} ${d.summary}`.toLowerCase().includes(q.toLowerCase())).map(d=>`
    <label class="catalog-choice">
      <input type="checkbox" data-pick-doc="${d.id}" ${ids.includes(d.id)?'checked':''}>
      <span><strong>${esc(d.no)}</strong> · ${day(d.date)}<small>${esc(d.summary)}</small></span>
    </label>
  `).join('')||'<p class="muted">Không có mục phù hợp.</p>';
}

function catalogEdit(kind,id,insideTask=false){
  let d=docBy(kind,id)||{},label=kind==='officials'?'công văn':'văn bản';
  modal(`${id?'Sửa':'Tạo'} ${label}`,`
    ${insideTask?'<div class="notice">Lưu mục này sẽ bổ sung vào danh mục ngay.</div>':''}
    ${field('Số '+label+' *','no',d.no,'text',true)}
    ${field('Ngày phát hành *','date',d.date,'date',true)}
    <label class="field"><span>Trích yếu *</span><textarea name="summary" required>${esc(d.summary)}</textarea></label>
    ${field('Cơ quan ban hành','agency',d.agency)}
    <label class="field"><span>Ghi chú</span><textarea name="note">${esc(d.note)}</textarea></label>
    <label class="field"><span>Tệp đính kèm</span><input type="file" name="catalogFile"></label>
    ${id?'<button class="btn danger" type="button" id="archiveCatalog" style="margin-top:10px">Lưu trữ mục này</button>':''}
  `,async(data,f)=>{
    if(!data.no.trim()||!data.date||!data.summary.trim())throw Error('Điền đủ số, ngày phát hành và trích yếu.');
    if(state[kind].some(x=>x.id!==id&&!x.archived&&x.no.trim()===data.no.trim()&&x.date===data.date))throw Error('Đã có mục cùng số và ngày phát hành.');
    let files=[...(d.files||[])];
    if(f.elements.catalogFile.files.length)files.push(...await storeFiles(f.elements.catalogFile.files));
    let obj={...d,...data,files,id:id||M.id()};
    delete obj.catalogFile;
    if(id)Object.assign(d,obj);else state[kind].push(obj);
    persist();
    if(insideTask){
      let key=kind==='officials'?'officialIds':'documentIds';
      if(!formTask[key].includes(obj.id))formTask[key].push(obj.id);
      renderTaskForm();
      toast('Đã lưu vào danh mục');
    }else done('Đã lưu '+label);
  });

  $('#archiveCatalog')?.addEventListener('click',()=>{
    d.archived=true;
    persist();
    if(insideTask)renderTaskForm();
    else done('Đã lưu trữ');
  });
}

function catalogsWorkspace(){
  return head('Danh mục Công văn / Văn bản')+
  `<div class="catalog-split">
    ${['officials','documents'].map(kind=>`<section class="surface">
      <div class="toolbar">
        <h2>${kind==='officials'?'Công văn đăng ký':'Văn bản chỉ đạo'}</h2>
        <span class="grow"></span>
        <button class="btn text" data-catalog-new="${kind}">${icon('plus')} Thêm mới</button>
      </div>
      <div class="catalog-search-wrap">
        <input data-catalog-search="${kind}" placeholder="Tìm số, ngày, trích yếu..." aria-label="Tìm ${kind}">
      </div>
      <div id="table-${kind}">${catalogWorkspaceTable(kind)}</div>
    </section>`).join('')}
  </div>`;
}

function catalogWorkspaceTable(kind,query=''){
  let list=state[kind].filter(d=>!d.archived&&`${d.no} ${d.date} ${d.summary}`.toLowerCase().includes(query.toLowerCase()));
  return `<div class="table-scroll">
    <table class="data-table">
      <thead><tr><th>STT</th><th>Số</th><th>Ngày phát hành</th><th>Trích yếu</th></tr></thead>
      <tbody>
        ${list.map((d,i)=>`<tr data-catalog-edit="${d.id}" data-kind="${kind}" tabindex="0">
          <td>${i+1}</td>
          <td><strong>${esc(d.no)}</strong></td>
          <td>${day(d.date)}</td>
          <td title="${esc(d.summary)}">${esc(d.summary)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${list.length?'':'<div class="empty">Chưa có dữ liệu.</div>'}
  </div>`;
}
