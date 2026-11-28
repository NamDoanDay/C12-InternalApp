# Database setup

## Current state

The current repository has no prior MySQL schema/migrations. The API will create tables through the numbered migrations in `migrations/`. A new database contains one active `admin` account and no business records; `schema_migrations` contains only technical version metadata.

## One-time reset of old application data

The owner explicitly authorized removing old/mock data without backup, limited to the `c12_internalapp` schema. If that schema exists in the MySQL instance, an operator may run `scripts/reset_c12_internalapp_once.sql` once while connected as a MySQL account with create/drop privileges. This file is destructive. It targets only the named schema, does not drop Docker volumes or other schemas, and must never be invoked by the backend, migration runner, Dockerfile or regular Compose startup.

After resetting/creating the empty schema, use the normal versioned migration runner. It never truncates/reseeds tables on subsequent starts. The first admin bootstrap is migration `002_bootstrap_admin.mjs`; it reads the password from a local Docker secret file, stores an Argon2id hash and records the migration version. If that version is already recorded, later runs do not recreate/reset the account, even if an administrator has been archived.

## Admin secret

Create a local file at `secrets/admin_password` containing the initial password. The file is ignored by Git. Docker Compose will mount it read-only at `/run/secrets/admin_password`. Do not place the value in `.env`, SQL, the image or logs. The first successful login must change the password. The repository does not contain the secret file.

## Migrations

`schema_migrations` is a technical ledger. SQL files are applied in filename order; JavaScript migrations are used only for operations that need application-side hashing. Never edit an already-applied migration; add a new version. Do not add mock business seed rows. Do not run tests against a developer's `c12_internalapp`; integration tests must use a separate test schema/database and credentials.
