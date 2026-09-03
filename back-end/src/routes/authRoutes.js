import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import getDb from '../config/database.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'almoxarifado_yama_secret_dev';

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    const db = await getDb();
    
    // Check if user exists
    const user = await db.get(`SELECT * FROM usuarios WHERE username = ?`, [username]);
    
    if (!user) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.senha_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        username: user.username,
        role: user.role,
        setor: user.setor,
        codigo_omie: user.codigo_omie
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login bem-sucedido',
      token,
      user: {
        id: user.id,
        nome: user.nome,
        username: user.username,
        role: user.role,
        setor: user.setor,
        codigo_omie: user.codigo_omie
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno no servidor.', error: error.message });
  }
});

// Setup admin if not exists
router.all('/setup-admin', async (req, res) => {
  try {
    const db = await getDb();
    const count = await db.get('SELECT COUNT(*) as total FROM usuarios');
    const total = count.total || count['COUNT(*)'];

    if (total > 0) {
      return res.status(400).json({ message: 'O banco já possui usuários cadastrados. Setup bloqueado.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    const id = Date.now().toString();

    if (db.driver === 'mysql') {
      await db.run(
        `INSERT INTO usuarios (id, nome, username, senha_hash, role, setor, codigo_omie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, 'Administrador Geral', 'admin', hash, 'admin', 'Diretoria', null]
      );
    } else {
      await db.run(
        `INSERT INTO usuarios (id, nome, username, senha_hash, role, setor, codigo_omie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, 'Administrador Geral', 'admin', hash, 'admin', 'Diretoria', null]
      );
    }

    res.status(201).json({ message: 'Usuário admin criado com sucesso. (username: admin, senha: admin123)' });
  } catch (error) {
    console.error('Erro no setup:', error);
    res.status(500).json({ message: 'Erro ao criar admin.', error: error.message });
  }
});

export default router;
