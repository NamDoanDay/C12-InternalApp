export const WORKFLOW_STATUSES = Object.freeze(['init', 'processing', 'number', 'signing', 'done']);
export const TASK_TYPES = Object.freeze(['document', 'resource', 'daily']);
export const AGGREGATE_STATUSES = Object.freeze(['all', 'processing', 'done', 'late']);

export const aggregateSql = `CASE
  WHEN t.workflow_status = 'done' THEN 'done'
  WHEN t.due_at IS NOT NULL AND t.due_at < UTC_TIMESTAMP(3) THEN 'late'
  ELSE 'processing' END`;

export function taskScopeSql(role, userId, personId) {
  if (role === 'admin') return { sql: '1 = 1', values: [] };
  const values = [userId, userId, personId || '', personId || ''];
  return {
    sql: `(
      t.created_by = ?
      OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = ? AND ta.ended_at IS NULL)
      OR EXISTS (SELECT 1 FROM person_group_memberships pgm WHERE pgm.person_id = ? AND pgm.valid_to IS NULL AND pgm.group_id = t.management_group_id)
      OR EXISTS (
        SELECT 1 FROM task_assignees ta
        JOIN app_users au ON au.id = ta.user_id AND au.archived_at IS NULL
        JOIN person_group_memberships pgm ON pgm.person_id = au.person_id AND pgm.valid_to IS NULL
        WHERE ta.task_id = t.id AND ta.ended_at IS NULL AND pgm.group_id = t.management_group_id
      )
      OR EXISTS (
        SELECT 1 FROM task_assignees ta
        JOIN app_users au ON au.id = ta.user_id AND au.archived_at IS NULL
        JOIN person_group_memberships assignee_group ON assignee_group.person_id = au.person_id AND assignee_group.valid_to IS NULL
        JOIN person_group_memberships caller_group ON caller_group.group_id = assignee_group.group_id AND caller_group.person_id = ? AND caller_group.valid_to IS NULL
        WHERE ta.task_id = t.id AND ta.ended_at IS NULL
      )
    )`, values
  };
}
