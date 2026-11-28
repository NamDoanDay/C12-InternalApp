export function defaultAppendixColumns(number) {
  if (String(number || '') === '952') return ['vCPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License', 'Giải pháp ATTT', 'Kênh truyền'];
  if (String(number || '') === '4651') return ['vCPU', 'RAM (GB)', 'GPU (GB)', 'Disk / Block SSD (TB)', 'Disk / Block HDD (TB)', 'Disk / File Storage SSD (TB)', 'Disk / File Storage HDD (TB)', 'Disk / Object (TB)', 'Sizing 3 vùng', 'Sizing / DMZ', 'Sizing / DB', 'Sizing / APP', 'License thương mại', 'Kênh truyền', 'Giải pháp ATTT', 'Kế hoạch', 'Đặc thù', 'Hệ thống có trong danh mục theo các văn bản 278/2025/NĐ-CP; Nghị quyết 214/NQ-CP và Quyết định số 1132/QĐ-TTg', 'Ghi chú'];
  return ['vGPU', 'RAM (GB)', 'Disk / Block (TB)', 'Disk / File Storage (TB)', 'Disk / Object (TB)', 'License'];
}

export async function ensureDefaultAppendixSchema(executor, documentId, documentNumber, actorId) {
  const defaults = defaultAppendixColumns(documentNumber);
  const [rows] = await executor.execute('SELECT columns_json FROM resource_appendix_schemas WHERE document_id = ?', [documentId]);
  if (!rows[0]) {
    await executor.execute('INSERT INTO resource_appendix_schemas (document_id, columns_json, updated_by) VALUES (?, ?, ?)', [documentId, JSON.stringify(defaults), actorId]);
    return defaults;
  }
  return rows[0].columns_json || defaults;
}
