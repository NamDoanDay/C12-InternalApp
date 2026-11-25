'use strict';

function orgWorkspace(){
  let level=rank=>state.people.filter(p=>Number(p.rank)===rank),
      cards=ps=>ps.map(p=>personGraphCard(p)).join('');

  return head('Cây sơ đồ tổ','',admin()?`<div class="flex gap"><button class="btn" data-action="add-person">${icon('plus')} Thêm nhân sự</button><button class="btn primary" data-action="add-group">${icon('plus')} Thêm nhóm</button></div>`:'')+
  `<section class="surface org-workspace">
    <div class="toolbar">
      <span class="muted small">${admin()?'Kéo thả cán bộ vào nhóm hoặc dùng nút Chuyển nhóm.':'Chỉ admin có quyền điều chỉnh cơ cấu tổ.'}</span>
      <span class="grow"></span>
      <button class="btn text" id="orgZoomOut" aria-label="Thu nhỏ sơ đồ">−</button>
      <span id="orgZoomLabel" style="font-weight:600">100%</span>
      <button class="btn text" id="orgZoomIn" aria-label="Phóng to sơ đồ">+</button>
    </div>
    <div class="graph-scroll">
      <div class="org-graph" id="orgGraph">
        <div class="graph-level-label">Lãnh đạo phòng</div><div class="graph-rank">${cards(level(0))||'<span class="muted">Chưa có lãnh đạo phòng</span>'}</div>
        <div class="graph-trunk"></div>
        <div class="graph-level-label">Tổ trưởng</div><div class="graph-rank">${cards(level(1))||'<span class="muted">Chưa có chỉ huy tổ</span>'}</div>
        <div class="graph-trunk"></div>
        <div class="graph-groups">
          ${state.taskGroups.filter(g=>!g.archived).map(g=>`<section class="graph-group" data-group-drop="${g.id}">
            <div class="graph-branch"></div>
            <div class="group-node">
              <strong>${esc(g.name)}</strong>
              <span class="small" style="color:var(--action);font-weight:700">${esc(g.code)}</span>
              ${admin()?`<button class="icon-btn-sm" data-group-edit="${g.id}" aria-label="Sửa nhóm ${esc(g.name)}" title="Sửa nhóm">${icon('settings')}</button>`:''}
            </div>
            <div class="graph-deputies">
              ${cards(state.people.filter(p=>p.groupId===g.id&&Number(p.rank)===2))||'<div class="graph-vacancy">Tổ phó phụ trách · Chưa phân công</div>'}
            </div>
            <div class="graph-members">
              ${cards(state.people.filter(p=>p.groupId===g.id&&Number(p.rank)>=3))||'<p class="small muted">Chưa có thành viên</p>'}
            </div>
          </section>`).join('')}
        </div>
      </div>
    </div>
    <div class="org-unassigned">
      <h3>Cán bộ chưa phân nhóm</h3>
      <div class="unassigned-list">
        ${cards(state.people.filter(p=>!p.groupId&&Number(p.rank)>=2))||'<span class="muted">Tất cả cán bộ đã được phân nhóm.</span>'}
      </div>
    </div>
    <details class="org-history" style="padding:16px 20px">
      <summary style="font-weight:600;cursor:pointer">Lịch sử điều chuyển nhóm (${state.orgAudit.length})</summary>
      ${state.orgAudit.slice().reverse().map(a=>`<article style="padding:10px 0;border-bottom:1px solid var(--border)">
        <strong>${esc(state.people.find(p=>p.id===a.personId)?.name||'Cán bộ')}</strong>
        <p style="margin:4px 0">${esc(groupName(a.oldGroupId))} → <strong>${esc(groupName(a.newGroupId))}</strong></p>
        <small style="color:var(--muted)">${fmt(a.at)} · Người thực hiện: ${esc(userName(a.actorId))}</small>
        ${a.taskChanges.map(c=>`<p class="small" style="color:var(--action)">${esc(c.oldCode)} → ${esc(c.newCode)}</p>`).join('')}
      </article>`).join('')||'<p class="muted">Chưa có biến động.</p>'}
    </details>
  </section>`;
}

function personGraphCard(p){
  return `<div class="graph-person" ${admin()&&Number(p.rank)>=2?`draggable="true" data-person-drag="${p.id}"`:''}>
    <button class="graph-person-main" data-person="${p.id}">
      <span class="avatar">${esc(p.name.split(' ').at(-1)?.[0]||'?')}</span>
      <strong>${esc(p.name)}</strong>
      <small>${esc(p.position)}</small>
      <span class="small muted">${esc(p.type)}</span>
    </button>
    ${admin()&&Number(p.rank)>=2?`<button class="graph-move" data-person-move="${p.id}">${icon('arrow')} Chuyển nhóm</button>`:''}
  </div>`;
}

function groupForm(id){
  if(!admin())return;
  let g=state.taskGroups.find(g=>g.id===id)||{};
  modal(id?'Sửa nhóm nghiệp vụ':'Thêm nhóm nghiệp vụ',`
    ${field('Tên nhóm','name',g.name,'text',true)}
    ${field('Mã nhóm (viết tắt không dấu)','code',g.code,'text',true)}
    ${id?'<button type="button" class="btn danger" id="archiveGroup" style="margin-top:12px">Lưu trữ nhóm này</button>':''}
  `,d=>{
    if(!admin())throw Error('Chỉ admin được quản lý nhóm.');
    d.code=d.code.trim().toUpperCase();
    if(!/^[A-Z0-9]+$/.test(d.code))throw Error('Mã nhóm chỉ gồm chữ hoa không dấu và số.');
    if(state.taskGroups.some(x=>x.id!==id&&x.code===d.code))throw Error('Mã nhóm đã tồn tại.');
    if(id)Object.assign(g,d);else state.taskGroups.push({...d,id:M.id(),archived:false});
    done('Đã lưu nhóm nghiệp vụ');
  });

  $('#archiveGroup')?.addEventListener('click',()=>{
    if(state.people.some(p=>p.groupId===id))return toast('Chuyển cán bộ sang nhóm khác trước khi xóa nhóm.');
    g.archived=true;
    done('Đã lưu trữ nhóm');
  });
}

function movePersonDialog(pid){
  if(!admin())return;
  let p=state.people.find(x=>x.id===pid);
  modal('Chuyển nhóm: '+p.name,`
    <p class="notice">Task một người nhận sẽ tự động đổi nhóm quản lý và mã task. Task nhiều người nhận được giữ nguyên mã.</p>
    <label class="field">
      <span>Nhóm mới</span>
      <select name="groupId">
        ${state.taskGroups.filter(g=>!g.archived).map(g=>`<option value="${g.id}" ${p.groupId===g.id?'selected':''}>${esc(g.name)} (${esc(g.code)})</option>`).join('')}
      </select>
    </label>
  `,d=>{
    M.movePerson(state,me(),pid,d.groupId);
    done('Đã chuyển nhóm và ghi lịch sử');
  });
}

personForm=function(id){
  if(!admin())return;
  originalPersonForm(id);
  let p=state.people.find(x=>x.id===id);
  $('#editForm .drawer-body')?.insertAdjacentHTML('afterbegin',`
    <label class="field" style="margin-bottom:12px">
      <span>Nhóm chuyên môn</span>
      <select name="groupId">
        <option value="">Chưa phân nhóm</option>
        ${state.taskGroups.filter(g=>!g.archived).map(g=>`<option value="${g.id}" ${p?.groupId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}
      </select>
    </label>
  `);
  let f=$('#editForm'),originalSubmit=f.onsubmit;
  f.onsubmit=async e=>{
    let next=f.elements.groupId?.value;
    if(p&&next&&next!==p.groupId){
      try{M.movePerson(state,me(),p.id,next)}
      catch(err){e.preventDefault();$('#formError').textContent=err.message;return}
    }
    return originalSubmit(e);
  };
};

const COLOR_PRESETS=['#2563eb','#0284c7','#0d9488','#16a34a','#d97706','#dc2626','#7c3aed','#4f46e5','#0891b2','#475569'];
const GRADIENTS=[
  'linear-gradient(135deg,#eff6ff,#dbeafe)',
  'linear-gradient(135deg,#ecfdf5,#d1fae5)',
  'linear-gradient(135deg,#fef3c7,#fde68a)',
  'linear-gradient(135deg,#f5f3ff,#ede9fe)',
  'linear-gradient(135deg,#0f172a,#1e293b)',
  'linear-gradient(135deg,#1e1b4b,#312e81)',
  'linear-gradient(135deg,#1e293b,#0f172a)',
  'linear-gradient(135deg,#134e4a,#064e3b)'
];
const BACKGROUNDS=[
  ['Cloud Datacenter','https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=80'],
  ['Modern Office','https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80'],
  ['Mountain Sunrise','https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80'],
  ['Cyber Security Network','https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1600&q=80']
];

// =========================================================
// YÊU CẦU 9: TỰ ĐỘNG ĐIỀU CHỈNH ĐỘ TƯƠNG PHẢN (CONTRAST ENGINE)
// =========================================================
function calcLuminanceFromHex(hex){
  if(!hex||!hex.startsWith('#'))return 255;
  let c=hex.slice(1);
  if(c.length===3)c=c.split('').map(x=>x+x).join('');
  let r=parseInt(c.slice(0,2),16)||0,
      g=parseInt(c.slice(2,4),16)||0,
      b=parseInt(c.slice(4,6),16)||0;
  return 0.299*r + 0.587*g + 0.114*b;
}

function applyPersonalTheme(){
  let settings=state.themeByUser[session]||{},
      root=document.documentElement;
  root.dataset.theme=localStorage.getItem('c12-style')||'glassmorphism';

  let isDark=root.classList.contains('dark');
  let color=settings.color||(isDark?'#818cf8':'#4f46e5');
  root.style.setProperty('--action',color);

  // Background styling (Gradient & Custom Image)
  let bg=settings.background||'';
  if(bg){
    let cssBg=bg.startsWith('linear-gradient(')||bg.startsWith('radial-gradient(')?bg:`url("${bg.replace(/["\\\n\r]/g,'')}")`;
    root.style.setProperty('--workspace-bg',cssBg);
    document.body.style.setProperty('background',cssBg,'important');
    document.body.style.setProperty('background-attachment','fixed','important');
    document.body.style.setProperty('background-size','cover','important');
    document.body.style.setProperty('background-position','center','important');
    document.body.classList.add('has-workspace-background');
  }else{
    root.style.setProperty('--workspace-bg','');
    document.body.style.removeProperty('background');
    document.body.classList.remove('has-workspace-background');
  }

  applyContrastEngine();
}

// =========================================================
// YÊU CẦU 8: POPUP THEME DẠNG RIGHT SIDEBAR DRAWER
// =========================================================
function themesDialog(){
  let s=state.themeByUser[session]||{};
  let textPreference=getTextPalettePreference(), textState=getTextColorState();
  modal('Chủ đề không gian làm việc',`
    <section class="text-palette-panel" aria-labelledby="textPaletteHeading">
      <div class="text-palette-heading">
        <div><h3 id="textPaletteHeading">Màu chữ</h3><p>Áp dụng đồng bộ cho nội dung, nhãn, icon và dữ liệu.</p></div>
        <span class="text-contrast-score">${textState.ratio ? `${textState.ratio.toFixed(1)}:1` : 'AA'}</span>
      </div>
      <div class="text-palette-presets" role="group" aria-label="Preset màu chữ">
        ${Object.entries(TEXT_PALETTES).map(([id,p])=>`<button type="button" class="text-palette-option ${textPreference===id?'selected':''}" data-text-preset="${id}" aria-pressed="${textPreference===id}"><span class="text-palette-dot" style="--sample-text:${p[document.documentElement.classList.contains('dark')?'dark':'light']}">Aa</span><span>${p.label}</span></button>`).join('')}
      </div>
      <div class="text-custom-row">
        <label for="textColorPicker">Màu tùy chỉnh</label>
        <input id="textColorPicker" type="color" value="${textPreference.startsWith('custom:')?textPreference.slice(7):textState.color}" aria-label="Chọn màu chữ tùy chỉnh">
        <span id="textColorStatus" role="status" aria-live="polite">${textState.adjusted?`Màu đã được tự điều chỉnh để đạt tương phản ${textState.ratio.toFixed(1)}:1.`:'Màu chữ được duy trì ở mức tương phản cao.'}</span>
        <button type="button" class="btn text-reset" id="resetTextColor">Khôi phục mặc định</button>
      </div>
    </section>

    <h3 style="color:var(--text-contrast-primary)">Màu chủ đạo (Primary Accent)</h3>
    <div class="palette-grid">
      ${COLOR_PRESETS.map(c=>`<button type="button" class="theme-swatch ${s.color===c?'selected':''}" data-color="${c}" style="--swatch:${c}" aria-label="Màu ${c}"></button>`).join('')}
    </div>

    <h3 style="color:var(--text-contrast-primary)">Nền chuyển sắc (Gradient)</h3>
    <p class="muted small">Tự động cân bằng độ tương phản để văn bản luôn sắc nét.</p>
    <div class="gradient-grid">
      <button type="button" data-background="" style="background:var(--app);color:var(--text-contrast-primary);font-weight:700">Mặc định</button>
      ${GRADIENTS.map(c=>`<button type="button" data-background="${c}" style="background:${c}"></button>`).join('')}
    </div>

    <h3 style="color:var(--text-contrast-primary)">Hình nền tùy biến</h3>
    <div class="background-grid">
      ${BACKGROUNDS.map(([n,url])=>`<button type="button" data-background="${esc(url)}">
        <img src="${esc(url)}" alt="" loading="lazy">
        <span>${n}</span>
      </button>`).join('')}
    </div>

    ${field('URL ảnh nền HTTPS','backgroundUrl',s.background?.startsWith('https:')?s.background:'','url')}
    <label class="field">
      <span>Hoặc tải ảnh từ máy tính (tối đa 2 MB)</span>
      <input id="customBackground" type="file" accept="image/*">
    </label>
    <div class="notice" style="margin-top:10px">Tùy biến chủ đề áp dụng riêng cho tài khoản ${esc(me()?.name||'')}.</div>
  `,d=>{
    if(d.backgroundUrl){
      if(!/^https:\/\//i.test(d.backgroundUrl))throw Error('Chỉ dùng URL ảnh HTTPS.');
      s.background=d.backgroundUrl;
    }
    state.themeByUser[session]=s;
    persist();
    applyPersonalTheme();
    done('Đã lưu chủ đề không gian làm việc');
  });

  $$('[data-color]').forEach(b=>b.onclick=()=>{
    s.color=b.dataset.color;
    state.themeByUser[session]=s;
    applyPersonalTheme();
    $$('[data-color]').forEach(x=>x.classList.toggle('selected',x===b));
  });

  const syncTextColorControls=()=>{
    applyContrastEngine();
    let preference=getTextPalettePreference(), current=getTextColorState();
    $$('[data-text-preset]').forEach(b=>{
      let selected=b.dataset.textPreset===preference;
      b.classList.toggle('selected',selected);
      b.setAttribute('aria-pressed',String(selected));
    });
    let status=$('#textColorStatus');
    if(status)status.textContent=current.adjusted
      ? `Màu chưa đủ tương phản; đã tự điều chỉnh thành ${current.color} (${current.ratio.toFixed(1)}:1).`
      : `Độ tương phản hiện tại ${current.ratio?current.ratio.toFixed(1)+':1':'đạt chuẩn AA'}; màu chữ sẽ tự đổi sắc theo LIGHT/DARK.`;
  };

  $$('[data-text-preset]').forEach(b=>b.onclick=()=>{
    setTextPalettePreference(b.dataset.textPreset);
    syncTextColorControls();
  });

  $('#textColorPicker')?.addEventListener('input',e=>{
    setTextPalettePreference(`custom:${e.target.value}`);
    syncTextColorControls();
  });

  $('#resetTextColor')?.addEventListener('click',()=>{
    setTextPalettePreference('auto');
    if($('#textColorPicker'))$('#textColorPicker').value=getTextColorState().color;
    syncTextColorControls();
  });

  $$('[data-background]').forEach(b=>b.onclick=()=>{
    s.background=b.dataset.background;
    state.themeByUser[session]=s;
    applyPersonalTheme();
    let urlInput=$('#editForm input[name=backgroundUrl]');
    if(urlInput)urlInput.value='';
  });

  $('#customBackground').onchange=async()=>{
    try{
      let file=$('#customBackground').files[0];
      if(!file||!file.type.startsWith('image/'))throw Error('Chọn tệp hình ảnh.');
      if(file.size>2*1024*1024)throw Error('Ảnh tối đa 2 MB.');
      s.background=await new Promise(resolve=>{
        let r=new FileReader();
        r.onload=()=>resolve(r.result);
        r.readAsDataURL(file);
      });
      state.themeByUser[session]=s;
      applyPersonalTheme();
    }catch(err){
      $('#formError').textContent=err.message;
    }
  };
}

// =========================================================
// YÊU CẦU 8: POPUP THÔNG BÁO DẠNG RIGHT SIDEBAR DRAWER
// =========================================================
function notificationsDialog(tab='all'){
  let all=state.notifications.filter(n=>n.recipientId===session).sort((a,b)=>b.at.localeCompare(a.at)),
      list=all.filter(n=>tab!=='unread'||!n.read);

  drawer('Thông báo hệ thống',`${all.filter(n=>!n.read).length} chưa đọc`,`
    <div class="notification-tabs" style="display:flex;gap:10px;padding:16px 20px;border-bottom:1px solid var(--border)">
      <button class="btn ${tab==='all'?'primary':''}" id="notifyAll">Tất cả (${all.length})</button>
      <button class="btn ${tab==='unread'?'primary':''}" id="notifyUnread">Chưa đọc (${all.filter(n=>!n.read).length})</button>
      <span class="grow"></span>
      <button class="btn text" id="notifyReadAll">Đánh dấu tất cả đã đọc</button>
    </div>
    <div class="notification-list" style="padding:0 20px;overflow-y:auto;flex:1">
      ${list.map(n=>`<article class="notification-item ${n.read?'read':''}" style="display:flex;align-items:center;border-bottom:1px solid var(--border);padding:14px 0">
        <button data-notification="${n.id}" style="text-align:left;flex:1">
          <strong style="color:var(--text-contrast-primary)">${esc(n.title)}</strong>
          <p style="font-size:13px;margin:4px 0;color:var(--text-contrast-secondary)">${esc(n.body)}</p>
          <small style="color:var(--muted)">${fmt(n.at)}</small>
        </button>
        ${!n.read?`<button class="btn text" data-notification-read="${n.id}">${icon('check')} Đã đọc</button>`:''}
      </article>`).join('')||'<div class="empty">Không có thông báo nào.</div>'}
    </div>
  `);

  $('#notifyAll').onclick=()=>notificationsDialog('all');
  $('#notifyUnread').onclick=()=>notificationsDialog('unread');
  $('#notifyReadAll').onclick=()=>{
    all.forEach(n=>n.read=true);
    persist();
    notificationsDialog(tab);
  };
  $$('[data-notification-read]').forEach(b=>b.onclick=()=>{
    let n=all.find(n=>n.id===b.dataset.notificationRead);
    if(n){n.read=true;persist();notificationsDialog(tab)}
  });
  $$('[data-notification]').forEach(b=>b.onclick=()=>{
    let n=all.find(n=>n.id===b.dataset.notification);
    if(n){n.read=true;persist();taskDrawer(n.taskId)}
  });
}
