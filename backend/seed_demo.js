const { initDb } = require('./db');
const bcrypt = require('bcrypt');

const GAMES = [
  'math-game','fauna-game','budget-game','supermarket-game',
  'savings-game','roulette-game','investment-game','quiz-game',
  'snowball-game','market-game'
];

// Datos variados para 20 alumnos del 8vo (algunos muy activos, otros menos)
const DEMO = [
  { streak: 21, achievements: 12, games: 28, daysAgo: 0 },
  { streak: 18, achievements: 10, games: 24, daysAgo: 1 },
  { streak: 15, achievements: 9,  games: 21, daysAgo: 0 },
  { streak: 14, achievements: 11, games: 26, daysAgo: 2 },
  { streak: 13, achievements: 8,  games: 19, daysAgo: 1 },
  { streak: 11, achievements: 7,  games: 17, daysAgo: 3 },
  { streak: 10, achievements: 9,  games: 22, daysAgo: 0 },
  { streak: 9,  achievements: 6,  games: 15, daysAgo: 4 },
  { streak: 8,  achievements: 7,  games: 18, daysAgo: 2 },
  { streak: 7,  achievements: 5,  games: 13, daysAgo: 5 },
  { streak: 6,  achievements: 6,  games: 14, daysAgo: 3 },
  { streak: 5,  achievements: 4,  games: 10, daysAgo: 7 },
  { streak: 4,  achievements: 5,  games: 11, daysAgo: 6 },
  { streak: 4,  achievements: 3,  games:  8, daysAgo: 8 },
  { streak: 3,  achievements: 4,  games:  9, daysAgo: 5 },
  { streak: 3,  achievements: 2,  games:  6, daysAgo: 10 },
  { streak: 2,  achievements: 3,  games:  7, daysAgo: 9 },
  { streak: 1,  achievements: 1,  games:  4, daysAgo: 14 },
  { streak: 1,  achievements: 2,  games:  5, daysAgo: 12 },
  { streak: 0,  achievements: 0,  games:  3, daysAgo: 20 },
];

function daysAgoDate(n) {
  const d = new Date('2026-06-22');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const db = await initDb();

  // Crear Eduardo_Profe_Ingles si no existe
  let profe = await db.get("SELECT id FROM users WHERE username = 'Eduardo_Profe_Ingles'");
  if (!profe) {
    const hash = await bcrypt.hash('Profe1234!', 10);
    const r = await db.run(
      "INSERT INTO users (username, password_hash, role, created_by) VALUES ('Eduardo_Profe_Ingles', ?, 'docente', (SELECT id FROM users WHERE username='admin'))",
      [hash]
    );
    profe = { id: r.lastID };
    console.log('✅ Eduardo_Profe_Ingles creado (contraseña: Profe1234!)');
  } else {
    console.log('ℹ️  Eduardo_Profe_Ingles ya existe');
  }

  // Asignar 8vo Básico A a Eduardo
  const curso8 = await db.get("SELECT id FROM courses WHERE name = '8vo Básico A'");
  if (!curso8) { console.error('❌ Curso 8vo Básico A no encontrado'); process.exit(1); }
  await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [profe.id, curso8.id]);
  console.log('✅ 8vo Básico A asignado a Eduardo_Profe_Ingles');

  // Obtener los 20 alumnos del 8vo Básico A en orden
  const students = await db.all(
    `SELECT u.id, u.username FROM users u
     JOIN course_students cs ON u.id = cs.student_id
     WHERE cs.course_id = ? AND u.role = 'alumno'
     ORDER BY u.username`,
    [curso8.id]
  );

  if (students.length === 0) { console.error('❌ No hay alumnos en 8vo Básico A'); process.exit(1); }
  console.log(`📋 Procesando ${students.length} alumnos...`);

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const demo = DEMO[i] || DEMO[DEMO.length - 1];
    const lastLogin = daysAgoDate(demo.daysAgo);

    // Upsert user_stats
    await db.run(
      `INSERT INTO user_stats (user_id, consecutive_days, achievements_count, last_login)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         consecutive_days = excluded.consecutive_days,
         achievements_count = excluded.achievements_count,
         last_login = excluded.last_login`,
      [s.id, demo.streak, demo.achievements, lastLogin]
    );

    // Limpiar game_completions anteriores para este alumno
    await db.run('DELETE FROM game_completions WHERE user_id = ?', [s.id]);

    // Insertar partidas jugadas (repartidas entre juegos variados)
    const gamesToInsert = [];
    for (let g = 0; g < demo.games; g++) {
      const gameId = GAMES[g % GAMES.length];
      const daysBack = Math.floor(Math.random() * (demo.daysAgo + 15));
      const date = daysAgoDate(daysBack);
      gamesToInsert.push({ gameId, date });
    }
    for (const { gameId, date } of gamesToInsert) {
      await db.run(
        "INSERT INTO game_completions (user_id, game_id, completed_at) VALUES (?, ?, ?)",
        [s.id, gameId, date]
      );
    }

    // Actualizar balance simulado
    const balance = demo.games * 150 + demo.achievements * 200;
    await db.run('UPDATE users SET balance = ? WHERE id = ?', [balance, s.id]);

    console.log(`  ✓ ${s.username}: racha=${demo.streak}, logros=${demo.achievements}, juegos=${demo.games}, último=${lastLogin}`);
  }

  console.log('\n✅ Datos de prueba cargados exitosamente.');
  console.log('📌 Login del docente: Eduardo_Profe_Ingles / Profe1234!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
