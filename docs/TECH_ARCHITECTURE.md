# Kiến trúc đề xuất — 16/11/2026

Tiếp tục HTML, Tailwind, JavaScript thuần và một hướng Cloud Console. Mô hình bên dưới là thiết kế triển khai đề xuất, chưa chọn backend cho MVP.

## Mô hình dữ liệu
- User: id, role, personId.
- Person: id, currentGroupId, position, type. Group: id, name, code, active.
- Task: id, displayCode, codeAliases, type, managementGroupId, creatorId, assigneeIds, unitId, agencyId, title, description, startAt, dueAt, workflowStatus, officialDocumentIds, documentIds, customFields, resourceAppendix, createdAt, updatedAt, revisionSeq, deletedAt.
- ResourceItem: id, systemId, name, values, fileRefs; nằm trong phụ lục task, không dùng một systemId chung cho task.
- TaskRevision: id, taskId, seq, savedAt, actorId, snapshot, changes, eventType. Snapshot giữ dữ liệu và liên kết tài liệu ở thời điểm đó.
- Comment: id, taskId, authorId, text, createdAt.
- GroupTransfer: id, actorId, personId, oldGroupId, newGroupId, at, affectedTaskCodeChanges.
- OfficialDocument và Document: hai kho riêng, cùng các trường number, issuedAt, summary, sourceFiles, uploadedAt, confirmedAt, note.
- ResourceCellKey: unitId, agencyId, systemId, officialDocumentId, fieldKey.
- CellSource: taskId, resourceItemId, revisionId, savedAt, seq, value.
- Notification: id, eventId, taskId, recipientId, type, createdAt, readAt.
- UserTheme: palette, mode, gradient, imageUrl, imageBlobRef.

Tên trường là định hướng logic; chưa phải lược đồ DB đã triển khai.
