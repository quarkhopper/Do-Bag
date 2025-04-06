# Known Issues

## Database Issues (April 6, 2025)

### Missing 'name' Column in Users Table

**Error Message:**
```
ERROR: column "name" of relation "users" does not exist at character 42
STATEMENT: INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id
```

**Description:**
The application is attempting to insert a 'name' field into the users table, but this column doesn't exist in the database. This suggests a mismatch between the database schema defined in the migrations and the application code.

**Context:**
- The error occurs during user registration
- Migration files `001_init` and `002_add_users` have been run successfully
- The backend code expects a 'name' column but it's not being created in the migrations

**Next Steps:**
1. Review migration file `002_add_users` to ensure it includes the 'name' column
2. Consider adding a new migration to add the missing column
3. Verify schema consistency between database migrations and application code

**Status:** To be addressed 