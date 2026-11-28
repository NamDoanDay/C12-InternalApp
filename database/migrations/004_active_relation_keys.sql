ALTER TABLE person_group_memberships
  ADD COLUMN active_person_key CHAR(36)
    GENERATED ALWAYS AS (IF(valid_to IS NULL, person_id, NULL)) STORED,
  ADD UNIQUE KEY uq_membership_active_person (active_person_key);

ALTER TABLE task_assignees
  ADD COLUMN active_assignment_key VARCHAR(73)
    GENERATED ALWAYS AS (IF(ended_at IS NULL, CONCAT(task_id, ':', user_id), NULL)) STORED,
  ADD UNIQUE KEY uq_task_assignee_active_pair (active_assignment_key);

ALTER TABLE task_resource_links
  ADD COLUMN active_task_key CHAR(36)
    GENERATED ALWAYS AS (IF(ended_at IS NULL, task_id, NULL)) STORED,
  ADD UNIQUE KEY uq_task_resource_active_task (active_task_key);

ALTER TABLE resource_document_links
  ADD COLUMN active_link_key VARCHAR(90)
    GENERATED ALWAYS AS (IF(ended_at IS NULL, CONCAT(resource_id, ':', document_id, ':', link_type), NULL)) STORED,
  ADD UNIQUE KEY uq_resource_document_active_link (active_link_key);
