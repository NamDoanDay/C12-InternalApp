const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const byId = list => new Map((list || []).map(item => [item.id, item]));

function validateWorkspaceUpdate(current, next, user) {
  if (!next || typeof next !== 'object' || Number(next.version) !== 7) throw Object.assign(new Error('Định dạng dữ liệu workspace không hợp lệ.'), { status: 400 });
  if (user.role === 'admin') return;
  for (const key of ['users', 'people', 'taskGroups', 'counters', 'columns', 'schemas', 'resourceAppendixSchemas']) {
    if (!same(current[key], next[key])) throw Object.assign(new Error('Bạn không có quyền quản lý tài khoản, nhân sự, nhóm hoặc cấu trúc bảng.'), { status: 403 });
  }
  const beforeTasks = byId(current.tasks), afterTasks = byId(next.tasks);
  const resources = byId(current.resourceRecords);
  const allTasks = [...beforeTasks.values(), ...[...afterTasks.values()].filter(task => !beforeTasks.has(task.id))];
  const canEditResource = resource => resource && (
    resource.createdBy === user.id || allTasks.some(task =>
      (task.resourceId === resource.id || (resource.taskIds || []).includes(task.id)) &&
      (task.creatorId === user.id || task.assigneeIds?.includes(user.id))
    )
  );
  for (const id of new Set([...beforeTasks.keys(), ...afterTasks.keys()])) {
    const before = beforeTasks.get(id), after = afterTasks.get(id);
    if (same(before, after)) continue;
    if (!before) {
      if (after.creatorId !== user.id || !after.assigneeIds?.length || after.assigneeIds.some(id => id !== user.id)) throw Object.assign(new Error('User chỉ được tạo task và giao task cho chính mình.'), { status: 403 });
      continue;
    }
    const isCreator = before.creatorId === user.id, isAssignee = before.assigneeIds?.includes(user.id), linkedResource = resources.get(before.resourceId) || [...resources.values()].find(resource => resource.taskIds?.includes(before.id)), canEditLinkedResource = canEditResource(linkedResource);
    if (!isCreator && !isAssignee && !canEditLinkedResource) throw Object.assign(new Error('Bạn không có quyền sửa task này.'), { status: 403 });
    if (!after && !isCreator) throw Object.assign(new Error('Chỉ người tạo hoặc quản trị viên được xóa task.'), { status: 403 });
    if (!after) continue;
    for (const key of ['id', 'code', 'creatorId', 'createdAt']) {
      if (!same(before[key], after?.[key])) throw Object.assign(new Error('Không được thay đổi mã hoặc chủ sở hữu task.'), { status: 403 });
    }
    if (!isCreator) {
      const sharedResourceKeys = new Set(['resourceData', 'attachments', 'customFields', 'revisions', 'updatedAt']);
      const assigneeKeys = new Set(['status', 'comments', 'customFields', 'customTable', 'attachments', 'resources', 'resourceData', 'revisions', 'updatedAt', 'progress', 'completedAt']);
      const allowed = isAssignee ? assigneeKeys : canEditLinkedResource ? sharedResourceKeys : new Set();
      for (const key of new Set([...Object.keys(before), ...Object.keys(after || {})])) {
        if (!same(before[key], after?.[key]) && !allowed.has(key)) throw Object.assign(new Error(isAssignee ? 'Người được giao không thể sửa thông tin phân công hoặc nội dung gốc.' : 'Chỉ được đồng bộ phần tài nguyên dùng chung của task liên kết.'), { status: 403 });
      }
    } else if (after && !same(before.assigneeIds, after.assigneeIds) && after.assigneeIds?.some(id => id !== user.id)) {
      throw Object.assign(new Error('User chỉ được tự giao công việc.'), { status: 403 });
    }
  }
  const beforeResources = byId(current.resourceRecords), afterResources = byId(next.resourceRecords);
  for (const id of new Set([...beforeResources.keys(), ...afterResources.keys()])) {
    const before = beforeResources.get(id), after = afterResources.get(id);
    if (same(before, after)) continue;
    if (!before && after?.createdBy !== user.id) throw Object.assign(new Error('Tài nguyên mới phải do chính user tạo.'), { status: 403 });
    if (before && !canEditResource(before)) throw Object.assign(new Error('Bạn không có quyền sửa tài nguyên này.'), { status: 403 });
    if (before && after && (before.id !== after.id || before.createdBy !== after.createdBy || before.createdAt !== after.createdAt)) throw Object.assign(new Error('Không được thay đổi mã hoặc chủ sở hữu tài nguyên.'), { status: 403 });
  }
}
module.exports = { validateWorkspaceUpdate };
