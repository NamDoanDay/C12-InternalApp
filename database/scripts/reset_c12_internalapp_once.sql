-- DESTRUCTIVE ONE-TIME OPERATION, authorized by the project owner.
-- This removes every table and row in c12_internalapp, including existing mock/business data.
-- It does not touch other schemas or Docker volumes. Never run during normal Compose startup.
DROP DATABASE IF EXISTS c12_internalapp;
CREATE DATABASE c12_internalapp CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
