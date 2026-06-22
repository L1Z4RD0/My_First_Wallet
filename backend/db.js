const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcrypt');

async function addColumnIfNotExists(db, table, column, definition) {
  const info = await db.all(`PRAGMA table_info(${table})`);
  if (!info.some(col => col.name === column)) {
    await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function initDb() {
  const db = await open({
    filename: path.join(__dirname, 'billetera.sqlite'),
    driver: sqlite3.Database
  });

  // Tablas base (compatibles con esquema original)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      balance INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS game_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      game_id TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      amount INTEGER,
      interest_rate REAL,
      games_required INTEGER,
      games_played_since_investment INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      user_id INTEGER PRIMARY KEY,
      consecutive_days INTEGER DEFAULT 0,
      achievements_count INTEGER DEFAULT 0,
      last_login TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);

  // Migrar columnas nuevas a la tabla users (no destructivo)
  await addColumnIfNotExists(db, 'users', 'password_hash', 'TEXT');
  await addColumnIfNotExists(db, 'users', 'role', "TEXT DEFAULT 'alumno'");
  await addColumnIfNotExists(db, 'users', 'grade', 'INTEGER');
  await addColumnIfNotExists(db, 'users', 'created_by', 'INTEGER');

  // Tablas de cursos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL,
      teacher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS course_students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      UNIQUE(course_id, student_id),
      FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed del administrador si no existe
  const adminExists = await db.get("SELECT id FROM users WHERE username = 'admin'");
  if (!adminExists) {
    const hash = await bcrypt.hash('Admin1234!', 10);
    await db.run(
      "INSERT INTO users (username, password_hash, role, balance) VALUES ('admin', ?, 'admin', 0)",
      [hash]
    );
  }

  // Mantener compatibilidad: usuario jugador_1 original
  const legacyUser = await db.get('SELECT * FROM users WHERE id = 1');
  if (!legacyUser) {
    await db.run("INSERT INTO users (id, username, balance) VALUES (1, 'jugador_1', 0)");
  }

  // Seed cursos y alumnos de ejemplo
  const curso5Exists = await db.get("SELECT id FROM courses WHERE name = '5to Básico A'");
  if (!curso5Exists) {
    const adminUser = await db.get("SELECT id FROM users WHERE username = 'admin'");
    const adminId = adminUser?.id;

    const r5 = await db.run("INSERT INTO courses (name, grade) VALUES ('5to Básico A', 5)");
    const r8 = await db.run("INSERT INTO courses (name, grade) VALUES ('8vo Básico A', 8)");

    const genericHash = await bcrypt.hash('Alumno1234', 10);

    for (let i = 1; i <= 20; i++) {
      const num = String(i).padStart(2, '0');
      const u5 = `alumno5_${num}`;
      const u8 = `alumno8_${num}`;
      const e5 = await db.get('SELECT id FROM users WHERE username = ?', [u5]);
      const e8 = await db.get('SELECT id FROM users WHERE username = ?', [u8]);
      if (!e5) {
        const res5 = await db.run(
          'INSERT INTO users (username, password_hash, role, grade, created_by) VALUES (?, ?, ?, ?, ?)',
          [u5, genericHash, 'alumno', 5, adminId]
        );
        await db.run('INSERT INTO course_students (course_id, student_id) VALUES (?, ?)', [r5.lastID, res5.lastID]);
      }
      if (!e8) {
        const res8 = await db.run(
          'INSERT INTO users (username, password_hash, role, grade, created_by) VALUES (?, ?, ?, ?, ?)',
          [u8, genericHash, 'alumno', 8, adminId]
        );
        await db.run('INSERT INTO course_students (course_id, student_id) VALUES (?, ?)', [r8.lastID, res8.lastID]);
      }
    }
  }

  return db;
}

module.exports = { initDb };
