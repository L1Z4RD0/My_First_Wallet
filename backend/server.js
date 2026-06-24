const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'mfw-secret-key-2024-edu-financiera';

const GAME_REWARDS = {
  'math-game':        { full: 500,  repeat: 100 },
  'fauna-game':       { full: 1000, repeat: 200 },
  'budget-game':      { full: 300,  repeat: 60  },
  'supermarket-game': { full: 250,  repeat: 50  },
  'savings-game':     { full: 200,  repeat: 40  },
  'roulette-game':    { full: 350,  repeat: 70  },
  'investment-game':  { full: 400,  repeat: 80  },
  'quiz-game':        { full: 300,  repeat: 60  },
  'snowball-game':    { full: 350,  repeat: 70  },
  'market-game':      { full: 400,  repeat: 80  }
};

const GRADES = [
  '1° Básico', '2° Básico', '3° Básico', '4° Básico',
  '5° Básico', '6° Básico', '7° Básico', '8° Básico'
];

let db;

// ── Middleware de autenticación ───────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId   = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Sin permiso para esta acción' });
    }
    next();
  };
}

// ── Inicio del servidor ───────────────────────────────────────────────────────
async function startServer() {
  db = await initDb();

  app.use(cors());
  app.use(express.json());

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

    try {
      const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
      if (!user || !user.password_hash)
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid)
        return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

      const token = jwt.sign(
        { userId: user.id, role: user.role, username: user.username },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      // Actualizar last_login en user_stats
      await db.run(
        `INSERT INTO user_stats (user_id, last_login) VALUES (?, date('now'))
         ON CONFLICT(user_id) DO UPDATE SET last_login = date('now')`,
        [user.id]
      );

      res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, grade: user.grade }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const user = await db.get(
        'SELECT id, username, role, grade FROM users WHERE id = ?',
        [req.userId]
      );
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Error interno' });
    }
  });

  // ── ADMIN ─────────────────────────────────────────────────────────────────────
  app.get('/api/admin/users', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      const users = await db.all(
        `SELECT u.id, u.username, u.role, u.grade, u.created_by,
                us.consecutive_days, us.achievements_count, us.last_login,
                (SELECT COUNT(*) FROM game_completions WHERE user_id = u.id) AS games_played
         FROM users u
         LEFT JOIN user_stats us ON u.id = us.user_id
         WHERE u.role != 'admin'
         ORDER BY u.role, u.grade, u.username`
      );
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener usuarios' });
    }
  });

  app.post('/api/admin/users', authMiddleware, requireRole('admin'), async (req, res) => {
    const { username, password, role, grade } = req.body;

    if (!username || !password || !role)
      return res.status(400).json({ error: 'Datos incompletos' });
    if (!['docente', 'alumno'].includes(role))
      return res.status(400).json({ error: 'Rol inválido' });
    if (role === 'alumno' && (!grade || grade < 1 || grade > 8))
      return res.status(400).json({ error: 'Grado inválido para alumno (1-8)' });

    try {
      const exists = await db.get('SELECT id FROM users WHERE username = ?', [username]);
      if (exists) return res.status(400).json({ error: 'El nombre de usuario ya existe' });

      const hash = await bcrypt.hash(password, 10);
      const result = await db.run(
        'INSERT INTO users (username, password_hash, role, grade, created_by) VALUES (?, ?, ?, ?, ?)',
        [username, hash, role, role === 'alumno' ? grade : null, req.userId]
      );
      res.json({ success: true, id: result.lastID, username, role, grade });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  });

  // ── CURSOS (admin) ────────────────────────────────────────────────────────────
  app.get('/api/admin/courses', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      const courses = await db.all(
        `SELECT c.id, c.name, c.grade, c.teacher_id, c.created_at,
                u.username AS teacher_name,
                COUNT(cs.student_id) AS student_count
         FROM courses c
         LEFT JOIN users u ON c.teacher_id = u.id
         LEFT JOIN course_students cs ON c.id = cs.course_id
         GROUP BY c.id
         ORDER BY c.grade, c.name`
      );
      res.json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener cursos' });
    }
  });

  app.post('/api/admin/courses', authMiddleware, requireRole('admin'), async (req, res) => {
    const { name, grade } = req.body;
    if (!name || !grade || grade < 1 || grade > 8)
      return res.status(400).json({ error: 'Nombre y grado válido son requeridos' });
    try {
      const result = await db.run('INSERT INTO courses (name, grade) VALUES (?, ?)', [name, grade]);
      res.json({ success: true, id: result.lastID, name, grade });
    } catch (error) {
      res.status(500).json({ error: 'Error al crear curso' });
    }
  });

  app.put('/api/admin/courses/:id/teacher', authMiddleware, requireRole('admin'), async (req, res) => {
    const { teacher_id } = req.body;
    const { id } = req.params;
    try {
      if (teacher_id) {
        const teacher = await db.get("SELECT id FROM users WHERE id = ? AND role = 'docente'", [teacher_id]);
        if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });
      }
      await db.run('UPDATE courses SET teacher_id = ? WHERE id = ?', [teacher_id || null, id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error al asignar docente' });
    }
  });

  app.post('/api/admin/courses/:id/assign-student', authMiddleware, requireRole('admin'), async (req, res) => {
    const { student_id } = req.body;
    const courseId = req.params.id;
    if (!student_id) return res.status(400).json({ error: 'student_id requerido' });
    try {
      const countRow = await db.get('SELECT COUNT(*) as cnt FROM course_students WHERE course_id = ?', [courseId]);
      if (countRow.cnt >= 20) return res.status(400).json({ error: 'El curso ya tiene 20 alumnos (máximo)' });
      await db.run('INSERT OR IGNORE INTO course_students (course_id, student_id) VALUES (?, ?)', [courseId, student_id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error al asignar alumno' });
    }
  });

  app.delete('/api/admin/courses/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      await db.run('DELETE FROM courses WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar curso' });
    }
  });

  app.get('/api/admin/courses/:id/students', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
      const students = await db.all(
        `SELECT u.id, u.username, u.grade,
                us.consecutive_days, us.achievements_count, us.last_login,
                (SELECT COUNT(*) FROM game_completions WHERE user_id = u.id) AS games_played
         FROM course_students cs
         JOIN users u ON cs.student_id = u.id
         LEFT JOIN user_stats us ON u.id = us.user_id
         WHERE cs.course_id = ?
         ORDER BY u.username`,
        [req.params.id]
      );
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener alumnos del curso' });
    }
  });

  // ── BULK IMPORT CSV ───────────────────────────────────────────────────────────
  app.post('/api/admin/bulk-import', authMiddleware, requireRole('admin'), async (req, res) => {
    const { rows } = req.body; // [{ username, password, grade, course_name }]
    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: 'No hay filas para importar' });

    const results = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const { username, password, grade, course_name } = rows[i];
      const lineNum = i + 2;
      if (!username || !password || !grade) {
        results.errors.push(`Fila ${lineNum}: username, password y grade son obligatorios`);
        results.skipped++;
        continue;
      }
      const gradeNum = parseInt(grade);
      if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 8) {
        results.errors.push(`Fila ${lineNum}: grado inválido "${grade}"`);
        results.skipped++;
        continue;
      }
      try {
        const exists = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (exists) {
          results.errors.push(`Fila ${lineNum}: usuario "${username}" ya existe`);
          results.skipped++;
          continue;
        }
        const hash = await bcrypt.hash(password, 10);
        const newUser = await db.run(
          'INSERT INTO users (username, password_hash, role, grade, created_by) VALUES (?, ?, ?, ?, ?)',
          [username, hash, 'alumno', gradeNum, req.userId]
        );
        if (course_name) {
          let course = await db.get('SELECT id FROM courses WHERE name = ?', [course_name]);
          if (!course) {
            const cr = await db.run('INSERT INTO courses (name, grade) VALUES (?, ?)', [course_name, gradeNum]);
            course = { id: cr.lastID };
          }
          const countRow = await db.get('SELECT COUNT(*) as cnt FROM course_students WHERE course_id = ?', [course.id]);
          if (countRow.cnt >= 20) {
            results.errors.push(`Fila ${lineNum}: curso "${course_name}" ya tiene 20 alumnos (máximo)`);
            results.skipped++;
            await db.run('DELETE FROM users WHERE id = ?', [newUser.lastID]);
            continue;
          }
          await db.run('INSERT OR IGNORE INTO course_students (course_id, student_id) VALUES (?, ?)', [course.id, newUser.lastID]);
        }
        results.created++;
      } catch (error) {
        results.errors.push(`Fila ${lineNum}: error interno - ${error.message}`);
        results.skipped++;
      }
    }
    res.json(results);
  });

  app.delete('/api/admin/users/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    try {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
      if (user.role === 'admin') return res.status(403).json({ error: 'No se puede eliminar al administrador' });

      await db.run('DELETE FROM users WHERE id = ?', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });

  // ── DOCENTE ───────────────────────────────────────────────────────────────────
  app.get('/api/teacher/courses', authMiddleware, requireRole('docente', 'admin'), async (req, res) => {
    try {
      const whereClause = req.userRole === 'admin' ? '' : 'WHERE c.teacher_id = ?';
      const params = req.userRole === 'admin' ? [] : [req.userId];
      const courses = await db.all(
        `SELECT c.id, c.name, c.grade, COUNT(cs.student_id) AS student_count
         FROM courses c
         LEFT JOIN course_students cs ON c.id = cs.course_id
         ${whereClause}
         GROUP BY c.id
         ORDER BY c.grade, c.name`,
        params
      );
      res.json(courses);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener cursos del docente' });
    }
  });

  app.get('/api/teacher/students', authMiddleware, requireRole('docente', 'admin'), async (req, res) => {
    try {
      if (req.userRole === 'admin') {
        const students = await db.all(
          `SELECT u.id, u.username, u.grade,
                  us.consecutive_days, us.achievements_count, us.last_login,
                  (SELECT COUNT(*) FROM game_completions WHERE user_id = u.id) AS games_played
           FROM users u
           LEFT JOIN user_stats us ON u.id = us.user_id
           WHERE u.role = 'alumno'
           ORDER BY u.grade, u.username`
        );
        return res.json(students);
      }
      // Docente: alumnos de sus cursos asignados
      const students = await db.all(
        `SELECT DISTINCT u.id, u.username, u.grade, c.id AS course_id, c.name AS course_name,
                us.consecutive_days, us.achievements_count, us.last_login,
                (SELECT COUNT(*) FROM game_completions WHERE user_id = u.id) AS games_played
         FROM users u
         JOIN course_students cs ON u.id = cs.student_id
         JOIN courses c ON cs.course_id = c.id
         LEFT JOIN user_stats us ON u.id = us.user_id
         WHERE c.teacher_id = ? AND u.role = 'alumno'
         ORDER BY c.grade, u.username`,
        [req.userId]
      );
      res.json(students);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener alumnos' });
    }
  });

  app.post('/api/teacher/students', authMiddleware, requireRole('docente'), async (req, res) => {
    const { username, password, grade } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: 'Datos incompletos' });
    if (!grade || grade < 1 || grade > 8)
      return res.status(400).json({ error: 'Grado inválido (1-8)' });

    try {
      const exists = await db.get('SELECT id FROM users WHERE username = ?', [username]);
      if (exists) return res.status(400).json({ error: 'El nombre de usuario ya existe' });

      const hash = await bcrypt.hash(password, 10);
      const result = await db.run(
        'INSERT INTO users (username, password_hash, role, grade, created_by) VALUES (?, ?, ?, ?, ?)',
        [username, hash, 'alumno', grade, req.userId]
      );
      res.json({ success: true, id: result.lastID, username, grade });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear alumno' });
    }
  });

  app.get('/api/teacher/kpis', authMiddleware, requireRole('docente', 'admin'), async (req, res) => {
    try {
      const isAdmin = req.userRole === 'admin';
      const courseFilter = isAdmin
        ? { join: '', where: "u.role = 'alumno'", params: [] }
        : {
            join: `JOIN course_students cs ON u.id = cs.student_id
                   JOIN courses c ON cs.course_id = c.id`,
            where: `c.teacher_id = ${req.userId} AND u.role = 'alumno'`,
            params: []
          };

      const { join, where } = courseFilter;

      const totalStudents = await db.get(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u ${join} WHERE ${where}`
      );

      const topParticipation = await db.all(
        `SELECT u.username, u.grade, COUNT(gc.id) AS games_played
         FROM users u ${join}
         LEFT JOIN game_completions gc ON u.id = gc.user_id
         WHERE ${where}
         GROUP BY u.id ORDER BY games_played DESC LIMIT 10`
      );

      const topStreak = await db.all(
        `SELECT u.username, u.grade, COALESCE(us.consecutive_days, 0) AS consecutive_days
         FROM users u ${join}
         LEFT JOIN user_stats us ON u.id = us.user_id
         WHERE ${where}
         ORDER BY consecutive_days DESC LIMIT 10`
      );

      const topAchievements = await db.all(
        `SELECT u.username, u.grade, COALESCE(us.achievements_count, 0) AS achievements_count
         FROM users u ${join}
         LEFT JOIN user_stats us ON u.id = us.user_id
         WHERE ${where}
         ORDER BY achievements_count DESC LIMIT 10`
      );

      res.json({
        totalStudents: totalStudents.count,
        topParticipation,
        topStreak,
        topAchievements
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener KPIs' });
    }
  });

  // ── PLAYER SYNC (alumno sincroniza stats al backend) ──────────────────────────
  app.post('/api/player/sync', authMiddleware, requireRole('alumno'), async (req, res) => {
    const { consecutive_days, achievements_count } = req.body;
    try {
      await db.run(
        `INSERT INTO user_stats (user_id, consecutive_days, achievements_count, last_login)
         VALUES (?, ?, ?, date('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           consecutive_days   = excluded.consecutive_days,
           achievements_count = excluded.achievements_count,
           last_login         = excluded.last_login`,
        [req.userId, consecutive_days ?? 0, achievements_count ?? 0]
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al sincronizar' });
    }
  });

  // ── WALLET ────────────────────────────────────────────────────────────────────
  app.get('/api/wallet', authMiddleware, async (req, res) => {
    try {
      const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.userId]);
      res.json({ balance: user?.balance ?? 0 });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener la billetera' });
    }
  });

  // ── INVERSIONES ───────────────────────────────────────────────────────────────
  app.get('/api/investments', authMiddleware, async (req, res) => {
    try {
      const investments = await db.all(
        'SELECT * FROM investments WHERE user_id = ? AND status = "active"',
        [req.userId]
      );
      res.json(investments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener inversiones' });
    }
  });

  app.post('/api/investments/create', authMiddleware, async (req, res) => {
    const { amount, interest_rate, games_required } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ error: 'Monto inválido' });

    try {
      const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.userId]);
      if (user.balance < amount)
        return res.status(400).json({ error: 'Saldo insuficiente' });

      await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, req.userId]);
      const result = await db.run(
        'INSERT INTO investments (user_id, amount, interest_rate, games_required) VALUES (?, ?, ?, ?)',
        [req.userId, amount, interest_rate, games_required]
      );
      const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [req.userId]);

      res.json({
        success: true,
        newBalance: updatedUser.balance,
        investment: {
          id: result.lastID, amount, interest_rate, games_required,
          games_played_since_investment: 0, status: 'active'
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear inversión' });
    }
  });

  // ── JUEGOS ────────────────────────────────────────────────────────────────────
  app.post('/api/games/complete', authMiddleware, async (req, res) => {
    const { gameId } = req.body;
    if (!GAME_REWARDS[gameId])
      return res.status(400).json({ error: 'Juego no encontrado' });

    try {
      const prevCompletions = await db.get(
        'SELECT COUNT(*) as count FROM game_completions WHERE user_id = ? AND game_id = ?',
        [req.userId, gameId]
      );
      const isFirstTime = prevCompletions.count === 0;
      const reward = isFirstTime ? GAME_REWARDS[gameId].full : GAME_REWARDS[gameId].repeat;

      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [reward, req.userId]);
      await db.run(
        'INSERT INTO game_completions (user_id, game_id) VALUES (?, ?)',
        [req.userId, gameId]
      );

      await db.run(
        'UPDATE investments SET games_played_since_investment = games_played_since_investment + 1 WHERE user_id = ? AND status = "active"',
        [req.userId]
      );

      const maturedInvestments = await db.all(
        'SELECT * FROM investments WHERE user_id = ? AND status = "active" AND games_played_since_investment >= games_required',
        [req.userId]
      );

      let investmentReturns = 0;
      for (const inv of maturedInvestments) {
        const returnAmount = Math.floor(inv.amount * (1 + inv.interest_rate));
        investmentReturns += returnAmount;
        await db.run('UPDATE investments SET status = "completed" WHERE id = ?', [inv.id]);
      }
      if (investmentReturns > 0) {
        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [investmentReturns, req.userId]);
      }

      const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [req.userId]);
      res.json({
        reward,
        isFirstTime,
        newBalance: updatedUser.balance,
        maturedInvestments: maturedInvestments.map(inv => ({
          ...inv,
          returnAmount: Math.floor(inv.amount * (1 + inv.interest_rate))
        }))
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al procesar la recompensa' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}

startServer();
