export const DOCUMENT_TYPES = Object.freeze([
  'Công văn', 'Thông tư', 'Nghị định', 'Quyết định', 'Luật', 'Nghị quyết',
  'Báo cáo', 'Văn bản cấp tài nguyên', 'Các loại văn bản khác'
]);

export function normalizeDocumentNumber(value) {
  return value?.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ') || null;
}
