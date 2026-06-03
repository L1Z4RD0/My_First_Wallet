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

  return db;
}

module.exports = { initDb };
