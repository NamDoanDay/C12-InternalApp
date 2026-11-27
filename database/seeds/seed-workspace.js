const groupsSeed = [['HT', 'Hạ tầng'], ['HTM', 'Mạng / Hạ tầng mạng'], ['DN', 'Điện nước'], ['MC', 'Máy chủ'], ['HPCAI', 'HPC-AI đề án'], ['QLVB', 'Quản lý văn bản']];
const types = ['Công văn', 'Thông tư', 'Nghị định', 'Quyết định', 'Luật', 'Nghị quyết', 'Báo cáo', 'Văn bản cấp tài nguyên', 'Các loại văn bản khác'];

function makeWorkspace() {
  const now = new Date(), ago = days => new Date(now.getTime() + days * 86400000).toISOString();
  const taskGroups = groupsSeed.map(([code, name], i) => ({ id: `group-${code}`, code, name, archived: false, sortOrder: i }));
  const people = [], users = [
    { id: 'admin', name: 'Quản trị viên', email: 'admin@c12.demo', role: 'admin', status: 'approved', personId: '' }
  ];
  const groupUsers = {};
  for (const [code, name] of groupsSeed) {
    const deputyId = `person-${code}-lead`, deputyUserId = `demo-lead-${code}`;
    people.push({ id: deputyId, name: `Phụ trách ${name}`, position: 'Tổ phó, phụ trách nhóm', rank: 2, type: 'Cán bộ', groupId: `group-${code}`, email: `${code.toLowerCase()}.lead@c12.demo`, phone: '', note: '' });
    users.push({ id: deputyUserId, name: `Phụ trách ${name}`, email: `${code.toLowerCase()}.lead@c12.demo`, role: 'user', status: 'approved', personId: deputyId });
    groupUsers[code] = [deputyUserId];
    for (let n = 1; n <= 2; n++) {
      const personId = `person-${code}-${n}`, id = code === 'HT' && n === 1 ? 'demo-u-g-HT' : `demo-${code.toLowerCase()}-${n}`;
      const nameValue = [`Nguyễn Văn An`, `Trần Minh Bình`, `Lê Hoàng Chi`, `Phạm Quốc Dũng`, `Vũ Hoàng Hà`, `Đỗ Gia Khôi`][groupsSeed.findIndex(x => x[0] === code)] + (n === 2 ? ` ${n}` : '');
      people.push({ id: personId, name: nameValue, position: n === 1 ? 'Cán bộ phụ trách' : 'Cán bộ', rank: 3, type: n === 2 && code === 'DN' ? 'Hợp đồng' : 'Cán bộ', groupId: `group-${code}`, email: `${code.toLowerCase()}${n}@c12.demo`, phone: '', note: '' });
      users.push({ id, name: nameValue, email: code === 'HT' && n === 1 ? 'user@c12.demo' : `${code.toLowerCase()}${n}@c12.demo`, role: 'user', status: 'approved', personId });
      groupUsers[code].push(id);
    }
  }
  const documents = [
    ['Công văn', '952', 'Đăng ký nhu cầu tài nguyên hạ tầng điện toán đám mây'],
    ['Công văn', '4651', 'Rà soát, bổ sung nhu cầu tài nguyên và phương án bảo đảm an toàn thông tin'],
    ['Công văn', 'CV-DEMO-01', 'Đăng ký tài nguyên hạ tầng đám mây'],
    ['Thông tư', '18/2026/TT-BCA', 'Quy định quy trình quản lý hệ thống thông tin'],
    ['Nghị định', '42/2026/NĐ-CP', 'Quy định về dữ liệu và dịch vụ số'],
    ['Quyết định', '2439/QĐ-TTg', 'Ban hành Khung kiến trúc dữ liệu quốc gia'],
    ['Luật', '12/2026/QH16', 'Luật chuyển đổi số'],
    ['Nghị quyết', '28/NQ-CP', 'Nhiệm vụ bảo đảm an toàn thông tin'],
    ['Báo cáo', 'BC-C12-2026-11', 'Báo cáo hiện trạng tài nguyên'],
    ['Văn bản cấp tài nguyên', 'VTN-2026-015', 'Phê duyệt cấp tài nguyên dùng chung'],
    ['Các loại văn bản khác', 'TB-C12-2026-09', 'Thông báo phối hợp triển khai']
  ].map(([documentType, no, summary], i) => ({ id: `doc-${i + 1}`, documentType, type: documentType, no, date: ago(-i - 10).slice(0, 10), summary, agency: ['Cục C12', 'Bộ Công an', 'Chính phủ'][i % 3], note: '', files: [], archived: false, createdAt: ago(-45) }));
  const resourceRecords = groupsSeed.map(([code, name], i) => {
    const doc = documents[i % 3];
    return { id: `resource-${code}`, unit: 'Cà Mau', agency: `Đơn vị phụ trách ${name}`, system: `Hệ thống demo ${code}`, level: 'Địa phương', registeredDocumentIds: [doc.id], assetDocumentIds: [documents[9].id], exchangeDocumentIds: [documents[9].id], documentAppendices: { [doc.id]: { columns: ['vCPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License'], rows: [{ 'vCPU': String((i + 1) * 8), 'RAM (GB)': String((i + 1) * 32), 'Disk / Block (TB)': String(i + 1), 'Disk / File Storage (TB)': String(i + 2), 'Disk / Object (TB)': '0', License: 'Linux; PostgreSQL' }], privateRows: [] } }, sharedHardwareRowCount: 1, attachments: [], customFields: [{ id: `field-${code}`, name: 'Môi trường', value: i % 2 ? 'Dự phòng' : 'Chính' }], taskIds: [], hardwareColumns: ['STT', 'Tên tài nguyên', 'Văn bản nguồn'], hardwareRows: [{ STT: '1', 'Tên tài nguyên': `Hệ thống demo ${code}` }], revisions: [], createdBy: 'admin', editors: groupUsers[code], createdAt: ago(-35), updatedAt: ago(-1) };
  });
  const tasks = [];
  groupsSeed.forEach(([code, name], i) => {
    const groupId = `group-${code}`, assignees = groupUsers[code].slice(1), doc = documents[3 + (i % 6)], resource = resourceRecords[i];
    const base = { managementGroupId: groupId, assigneeIds: [assignees[i % assignees.length]], start: ago(-4), description: `Nhiệm vụ minh họa thuộc nhóm ${name}.`, aliases: [], customFields: [], attachments: [], archived: false, comments: [], revisions: [], createdBy: 'admin', creatorId: 'admin', createdAt: ago(-5), updatedAt: ago(-1) };
    tasks.push({ ...base, id: `task-${code}-doc`, code: `Task-${code}-01`, type: 'document', status: i % 2 ? 'signing' : 'processing', due: ago(8), title: `Xử lý ${doc.documentType.toLocaleLowerCase('vi')} ${doc.no}`, documentType: doc.documentType, documentNumber: doc.no, documentSummary: doc.summary, documentId: doc.id, documentIds: [], officialIds: [], customTable: { name: 'Văn bản liên quan', columns: ['STT', 'Số', 'Trích yếu'], rows: [{ STT: '1', 'Số': doc.no, 'Trích yếu': doc.summary }] } });
    const task = { ...base, id: `task-${code}-resource`, code: `Task-${code}-02`, type: 'resource', status: i === 0 ? 'done' : 'processing', due: ago(i === 0 ? -1 : 6), title: `Cập nhật tài nguyên ${name}`, resourceId: resource.id, resourceData: structuredClone(resource), documentType: '', documentNumber: '', documentSummary: '', documentId: '', documentIds: [documents[9].id], officialIds: resource.registeredDocumentIds, customFields: structuredClone(resource.customFields), attachments: [], customTable: { name: 'Bảng dữ liệu tùy chỉnh', columns: ['STT', 'Hạng mục', 'Trạng thái'], rows: [{ STT: '1', 'Hạng mục': 'Rà soát tài nguyên', 'Trạng thái': 'Đang thực hiện' }] } };
    resource.taskIds.push(task.id);
    resource.revisions.push({ id: `revision-${code}`, at: ago(-5), actorId: 'admin', action: 'Tạo dữ liệu demo', changes: [], data: structuredClone(resource) });
    task.revisions = [{ id: `task-revision-${code}`, at: ago(-5), actorId: 'admin', action: 'Tạo task demo', changes: [], data: { title: task.title, status: task.status } }];
    tasks.push(task);
    tasks.push({ ...base, id: `task-${code}-daily`, code: `Task-${code}-03`, type: 'daily', status: 'processing', due: ago(i === 1 || i === 3 ? -2 : 2), title: `Rà soát định kỳ ${name}`, documentType: '', documentNumber: '', documentSummary: '', documentId: '', documentIds: [], officialIds: [], customTable: { name: '', columns: [], rows: [] } });
  });
  const knowledge = [
    ['Quy trình rà soát an toàn hệ thống', 'Hướng dẫn', 'Thông tư', 'Bộ Công an'],
    ['Hướng dẫn quản lý dữ liệu dùng chung', 'Quy định', 'Nghị định', 'Chính phủ'],
    ['Quy trình phối hợp xử lý sự cố', 'Quy trình', 'Quyết định', 'UBND tỉnh Cà Mau']
  ].map(([title, type, docType, agency], i) => ({ id: `knowledge-${i + 1}`, title, no: `HD-C12-2026-0${i + 1}`, type, docType, level: i === 2 ? 'Địa phương' : 'Trung ương', agency, date: ago(-i - 2).slice(0, 10), effectiveDate: '', summary: 'Tài liệu mẫu phục vụ hướng dẫn nghiệp vụ và phối hợp của tổ.', content: 'Nội dung tham khảo được seed trong MySQL.', related: '', note: '', files: [] }));
  const schemas = {
    '952': ['vCPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License', 'Giải pháp ATTT', 'Kênh truyền'],
    '4651': ['vCPU', 'RAM (GB)', 'GPU (GB)', 'Disk / Block SSD (TB)', 'Disk / Block HDD (TB)', 'Disk / File Storage SSD (TB)', 'Disk / File Storage HDD (TB)', 'Disk / Object (TB)', 'Sizing 3 vùng', 'Sizing / DMZ', 'Sizing / DB', 'Sizing / APP', 'License thương mại', 'Kênh truyền', 'Giải pháp ATTT', 'Kế hoạch', 'Đặc thù', 'Hệ thống có trong danh mục theo các văn bản 278/2025/NĐ-CP; Nghị quyết 214/NQ-CP và Quyết định số 1132/QĐ-TTg', 'Ghi chú'],
    'CV-DEMO-01': ['vGPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License']
  };
  return {
    version: 7, demoSeedVersion: 2, localDemandSeeded: true, resourceDemoDensityV2: true, users, people, taskGroups, tasks,
    documents, docs: documents, officials: documents, knowledge, resourceRecords,
    schemas, resourceAppendixSchemas: {}, columns: [], counters: Object.fromEntries(groupsSeed.map(([code]) => [code, 3])),
    notifications: [], comments: [], archivedTasks: [], files: {}, settings: {}, createdAt: ago(0)
  };
}

module.exports = { makeWorkspace };
