DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS issuer;
DROP TABLE IF EXISTS certs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS schema_migrations;
CREATE TABLE IF NOT EXISTS schema_migrations (
    id VARCHAR(255) NOT NULL PRIMARY KEY
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'issuer', 'admin')),
    address TEXT NOT NULL UNIQUE,
    institution_name TEXT,
    student_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT DEFAULT NULL
);

-- 3. Courses
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL UNIQUE,
    course_description TEXT NOT NULL,
    issuer_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT DEFAULT NULL,
    course_image_url TEXT NOT NULL DEFAULT '',
    student_emails TEXT NOT NULL DEFAULT '[""]',
    FOREIGN KEY (issuer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Certificates
CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issuer_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    student_email TEXT NOT NULL,
    cert_address TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (issuer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Students (separate table for extended info)
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    student_address TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT DEFAULT NULL,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'issuer'))
);

-- 7. Issuer
CREATE TABLE IF NOT EXISTS issuer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    institution_name TEXT NOT NULL UNIQUE,
    issuer_address TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT DEFAULT NULL,
    role TEXT NOT NULL DEFAULT 'issuer' CHECK (role IN ('student', 'admin', 'issuer'))
);

-- 8. Certs (links specific certs to users and courses)
CREATE TABLE IF NOT EXISTS certs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cert_hash TEXT ,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    email TEXT NOT NULL
);
