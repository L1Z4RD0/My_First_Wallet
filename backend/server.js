const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const GAME_REWARDS = {
  'math-game': { full: 500, repeat: 100 },
  'fauna-game': { full: 1000, repeat: 200 }
};

let db;

async function startServer() {
  db = await initDb();

  app.get('/api/wallet', async (req, res) => {
    try {
      // Usaremos el ID de usuario 1 por defecto por ahora
      const user = await db.get('SELECT * FROM users WHERE id = 1');
      res.json({ balance: user.balance });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener la billetera' });
    }
  });

  app.get('/api/investments', async (req, res) => {
    try {
      const userId = 1; // Default user
      const investments = await db.all('SELECT * FROM investments WHERE user_id = ? AND status = "active"', [userId]);
      res.json(investments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al obtener inversiones' });
    }
  });

  app.post('/api/investments/create', async (req, res) => {
    try {
      const userId = 1;
      const { amount, interest_rate, games_required } = req.body;
      
      if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto inválido' });
      
      const user = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
      if (user.balance < amount) {
        return res.status(400).json({ error: 'Saldo insuficiente' });
      }

      // Restar balance
      await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, userId]);
      
      // Crear inversión
      const result = await db.run(
        'INSERT INTO investments (user_id, amount, interest_rate, games_required) VALUES (?, ?, ?, ?)',
        [userId, amount, interest_rate, games_required]
      );

      const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);
      
      res.json({ 
        success: true, 
        newBalance: updatedUser.balance,
        investment: {
          id: result.lastID,
          amount,
          interest_rate,
          games_required,
          games_played_since_investment: 0,
          status: 'active'
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al crear inversión' });
    }
  });

  app.post('/api/games/complete', async (req, res) => {
    const { gameId } = req.body;
    
    if (!GAME_REWARDS[gameId]) {
      return res.status(400).json({ error: 'Juego no encontrado' });
    }

    try {
      const userId = 1; // Usuario por defecto

      // Verificar si ya ha jugado este juego antes
      const prevCompletions = await db.get(
        'SELECT COUNT(*) as count FROM game_completions WHERE user_id = ? AND game_id = ?',
        [userId, gameId]
      );

      const isFirstTime = prevCompletions.count === 0;
      const reward = isFirstTime ? GAME_REWARDS[gameId].full : GAME_REWARDS[gameId].repeat;

      // Actualizar balance con la recompensa del juego
      await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [reward, userId]);
      
      // Registrar victoria
      await db.run('INSERT INTO game_completions (user_id, game_id) VALUES (?, ?)', [userId, gameId]);

      // Procesar maduración de inversiones
      await db.run('UPDATE investments SET games_played_since_investment = games_played_since_investment + 1 WHERE user_id = ? AND status = "active"', [userId]);
      
      // Encontrar inversiones que acaban de madurar
      const maturedInvestments = await db.all('SELECT * FROM investments WHERE user_id = ? AND status = "active" AND games_played_since_investment >= games_required', [userId]);
      
      let investmentReturns = 0;
      for (const inv of maturedInvestments) {
        const returnAmount = Math.floor(inv.amount * (1 + inv.interest_rate));
        investmentReturns += returnAmount;
        // Marcar como completada
        await db.run('UPDATE investments SET status = "completed" WHERE id = ?', [inv.id]);
      }

      if (investmentReturns > 0) {
        await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [investmentReturns, userId]);
      }

      const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [userId]);

      res.json({ 
        reward: reward, 
        isFirstTime: isFirstTime,
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

  app.listen(PORT, () => {
    console.log(`Backend de Billetera corriendo en http://localhost:${PORT}`);
  });
}

startServer();
