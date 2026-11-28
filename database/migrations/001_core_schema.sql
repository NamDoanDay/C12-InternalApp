CREATE TABLE IF NOT EXISTS app_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  username VARCHAR(120) NOT NULL,
  normalized_username VARCHAR(120) NOT NULL,
  display_name VARCHAR(180) NOT NULL,
  email VARCHAR(254) NULL,
  normalized_email VARCHAR(254) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  status ENUM('pending', 'active', 'inactive', 'rejected') NOT NULL DEFAULT 'pending',
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  person_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  UNIQUE KEY uq_app_users_username (normalized_username),
  UNIQUE KEY uq_app_users_email (normalized_email),
  UNIQUE KEY uq_app_users_person (person_id),
  KEY ix_app_users_status_role (status, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS org_groups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  code VARCHAR(32) NOT NULL,
  group_type VARCHAR(48) NOT NULL DEFAULT 'specialty',
  lead_person_id CHAR(36) NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  UNIQUE KEY uq_org_groups_code (code),
  CONSTRAINT fk_org_groups_creator FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS people (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  position_title VARCHAR(180) NULL,
  graph_level VARCHAR(80) NULL,
  personnel_type VARCHAR(80) NULL,
  email VARCHAR(254) NULL,
  phone VARCHAR(80) NULL,
  note TEXT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  KEY ix_people_name (name),
  CONSTRAINT fk_people_creator FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE app_users
  ADD CONSTRAINT fk_app_users_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT ON UPDATE RESTRICT;

ALTER TABLE org_groups
  ADD CONSTRAINT fk_org_groups_lead FOREIGN KEY (lead_person_id) REFERENCES people(id) ON DELETE RESTRICT ON UPDATE RESTRICT;

CREATE TABLE IF NOT EXISTS person_group_memberships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  person_id CHAR(36) NOT NULL,
  group_id CHAR(36) NOT NULL,
  valid_from DATETIME(3) NOT NULL,
  valid_to DATETIME(3) NULL,
  changed_by CHAR(36) NOT NULL,
  KEY ix_membership_person_active (person_id, valid_to),
  KEY ix_membership_group_active (group_id, valid_to),
  CONSTRAINT fk_membership_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_membership_group FOREIGN KEY (group_id) REFERENCES org_groups(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_membership_actor FOREIGN KEY (changed_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  document_type VARCHAR(100) NOT NULL,
  document_number VARCHAR(180) NULL,
  normalized_number VARCHAR(180) NULL,
  issue_date DATE NULL,
  effective_date DATE NULL,
  issuing_agency VARCHAR(255) NULL,
  summary TEXT NULL,
  note TEXT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  UNIQUE KEY uq_documents_type_number (document_type, normalized_number),
  KEY ix_documents_active_type_date (archived_at, document_type, issue_date),
  CONSTRAINT fk_documents_creator FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS resources (
  id CHAR(36) NOT NULL PRIMARY KEY,
  identity_key CHAR(64) NOT NULL,
  unit_name VARCHAR(255) NOT NULL,
  managing_agency VARCHAR(255) NOT NULL,
  system_name VARCHAR(255) NOT NULL,
  level_name VARCHAR(80) NULL,
  direct_columns JSON NOT NULL,
  direct_rows JSON NOT NULL,
  custom_fields JSON NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_resources_identity (identity_key),
  KEY ix_resources_active_unit (archived_at, unit_name),
  CONSTRAINT fk_resources_creator FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS resource_document_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  resource_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  link_type ENUM('registration', 'asset') NOT NULL,
  linked_by CHAR(36) NOT NULL,
  linked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  KEY ix_resource_document_resource (resource_id, link_type, ended_at),
  KEY ix_resource_document_document (document_id, link_type, ended_at),
  CONSTRAINT fk_resource_document_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_resource_document_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_resource_document_actor FOREIGN KEY (linked_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS resource_appendix_schemas (
  document_id CHAR(36) NOT NULL PRIMARY KEY,
  columns_json JSON NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_by CHAR(36) NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_appendix_schema_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_appendix_schema_actor FOREIGN KEY (updated_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS resource_appendices (
  resource_id CHAR(36) NOT NULL,
  document_id CHAR(36) NOT NULL,
  shared_hardware_row_count INT UNSIGNED NOT NULL DEFAULT 1,
  shared_rows JSON NOT NULL,
  private_rows JSON NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (resource_id, document_id),
  CONSTRAINT fk_resource_appendix_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_resource_appendix_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  task_code VARCHAR(100) NOT NULL,
  task_type ENUM('document', 'resource', 'daily') NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NULL,
  workflow_status VARCHAR(80) NOT NULL,
  management_group_id CHAR(36) NULL,
  primary_document_id CHAR(36) NULL,
  start_at DATETIME(3) NULL,
  due_at DATETIME(3) NULL,
  custom_table JSON NOT NULL,
  custom_fields JSON NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  UNIQUE KEY uq_tasks_code (task_code),
  KEY ix_tasks_group_status_due (management_group_id, workflow_status, due_at, archived_at),
  KEY ix_tasks_document (primary_document_id),
  CONSTRAINT fk_tasks_group FOREIGN KEY (management_group_id) REFERENCES org_groups(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_tasks_document FOREIGN KEY (primary_document_id) REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS task_assignees (
  id CHAR(36) NOT NULL PRIMARY KEY,
  task_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  assigned_by CHAR(36) NOT NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  KEY ix_task_assignees_task (task_id, ended_at),
  KEY ix_task_assignees_user (user_id, ended_at),
  CONSTRAINT fk_task_assignee_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_task_assignee_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_task_assignee_actor FOREIGN KEY (assigned_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS task_resource_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  task_id CHAR(36) NOT NULL,
  resource_id CHAR(36) NOT NULL,
  linked_by CHAR(36) NOT NULL,
  linked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  KEY ix_task_resource_task (task_id, ended_at),
  KEY ix_task_resource_resource (resource_id, ended_at),
  CONSTRAINT fk_task_resource_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_task_resource_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_task_resource_actor FOREIGN KEY (linked_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS task_comments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  task_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  KEY ix_task_comments_task_time (task_id, created_at),
  CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_task_comments_author FOREIGN KEY (author_id) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS knowledge_articles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  document_number VARCHAR(180) NULL,
  document_type VARCHAR(100) NULL,
  issuing_level VARCHAR(80) NULL,
  issuing_agency VARCHAR(255) NULL,
  issue_date DATE NULL,
  effective_date DATE NULL,
  summary TEXT NULL,
  body LONGTEXT NULL,
  related_document_ids JSON NOT NULL,
  custom_fields JSON NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  KEY ix_knowledge_filters (issuing_level, issuing_agency, document_type, archived_at),
  CONSTRAINT fk_knowledge_creator FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS entity_revisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  entity_type VARCHAR(48) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NOT NULL,
  action VARCHAR(80) NOT NULL,
  changes_json JSON NOT NULL,
  snapshot_json JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_revisions_entity_time (entity_type, entity_id, created_at),
  CONSTRAINT fk_revisions_actor FOREIGN KEY (actor_id) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS stored_files (
  id CHAR(36) NOT NULL PRIMARY KEY,
  storage_key VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  media_type VARCHAR(180) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  uploaded_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  UNIQUE KEY uq_stored_files_storage_key (storage_key),
  KEY ix_stored_files_owner (uploaded_by, created_at),
  CONSTRAINT fk_files_uploader FOREIGN KEY (uploaded_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS task_file_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  task_id CHAR(36) NOT NULL,
  file_id CHAR(36) NOT NULL,
  linked_by CHAR(36) NOT NULL,
  linked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  KEY ix_task_file_task (task_id, ended_at),
  KEY ix_task_file_file (file_id, ended_at),
  CONSTRAINT fk_task_file_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_task_file_file FOREIGN KEY (file_id) REFERENCES stored_files(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_task_file_actor FOREIGN KEY (linked_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS resource_file_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  resource_id CHAR(36) NOT NULL,
  file_id CHAR(36) NOT NULL,
  linked_by CHAR(36) NOT NULL,
  linked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  KEY ix_resource_file_resource (resource_id, ended_at),
  KEY ix_resource_file_file (file_id, ended_at),
  CONSTRAINT fk_resource_file_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_resource_file_file FOREIGN KEY (file_id) REFERENCES stored_files(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_resource_file_actor FOREIGN KEY (linked_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS document_file_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  file_id CHAR(36) NOT NULL,
  linked_by CHAR(36) NOT NULL,
  linked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  KEY ix_document_file_document (document_id, ended_at),
  KEY ix_document_file_file (file_id, ended_at),
  CONSTRAINT fk_document_file_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_document_file_file FOREIGN KEY (file_id) REFERENCES stored_files(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_document_file_actor FOREIGN KEY (linked_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS knowledge_file_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  knowledge_id CHAR(36) NOT NULL,
  file_id CHAR(36) NOT NULL,
  linked_by CHAR(36) NOT NULL,
  linked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  KEY ix_knowledge_file_article (knowledge_id, ended_at),
  KEY ix_knowledge_file_file (file_id, ended_at),
  CONSTRAINT fk_knowledge_file_article FOREIGN KEY (knowledge_id) REFERENCES knowledge_articles(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_knowledge_file_file FOREIGN KEY (file_id) REFERENCES stored_files(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_knowledge_file_actor FOREIGN KEY (linked_by) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  notification_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(48) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  message VARCHAR(500) NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_notifications_user_read_time (user_id, read_at, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  rotated_from CHAR(36) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_refresh_token_hash (token_hash),
  KEY ix_refresh_user_active (user_id, revoked_at, expires_at),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_refresh_rotated_from FOREIGN KEY (rotated_from) REFERENCES refresh_tokens(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS outbox_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(48) NOT NULL,
  aggregate_id CHAR(36) NOT NULL,
  aggregate_version INT UNSIGNED NULL,
  payload_json JSON NOT NULL,
  request_id VARCHAR(100) NOT NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  published_at DATETIME(3) NULL,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  KEY ix_outbox_pending (published_at, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS outbox_recipients (
  event_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  PRIMARY KEY (event_id, user_id),
  CONSTRAINT fk_outbox_recipient_event FOREIGN KEY (event_id) REFERENCES outbox_events(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_outbox_recipient_user FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
