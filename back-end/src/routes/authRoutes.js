import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import getDb from '../config/database.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ [AVISO DE SEGURANÇA] JWT_SECRET não configurado no .env! Utilizando fallback de desenvolvimento.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'almoxarifado_yama_secret_dev';

// Rate Limiter em memória para proteção contra ataques de força bruta no Login
const loginTentativas = new Map(); // IP -> { tentativas: number, primeiroErro: number }
const MAX_TENTATIVAS_FALHAS = 5;
const JANELA_BLOQUEIO_MS = 15 * 60 * 1000; // 15 minutos

// Limpeza automática periódica de registros expirados a cada 10 minutos
setInterval(() => {
  const agora = Date.now();
  for (const [ip, dado] of loginTentativas.entries()) {
    if (agora - dado.primeiroErro > JANELA_BLOQUEIO_MS) {
      loginTentativas.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// Helper para registrar falha
const registrarFalhaLogin = (clientIp) => {
  const agora = Date.now();
  const registro = loginTentativas.get(clientIp) || { tentativas: 0, primeiroErro: agora };
  registro.tentativas += 1;
  loginTentativas.set(clientIp, registro);
};

// Login route com proteção contra força bruta
router.post('/login', async (req, res) => {
  const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  const agora = Date.now();
  const registroIp = loginTentativas.get(clientIp);

  // Verifica se o IP está temporariamente bloqueado por excesso de tentativas incorretas
  if (registroIp && registroIp.tentativas >= MAX_TENTATIVAS_FALHAS) {
    if (agora - registroIp.primeiroErro < JANELA_BLOQUEIO_MS) {
      const minutosRestantes = Math.ceil((JANELA_BLOQUEIO_MS - (agora - registroIp.primeiroErro)) / 60000);
      return res.status(429).json({
        message: `Muitas tentativas incorretas consecutivas. Por segurança, tente novamente em ${minutosRestantes} minuto(s).`
      });
    } else {
      loginTentativas.delete(clientIp);
    }
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuário e senha são obrigatórios.' });
    }

    const db = await getDb();
    
    // Check if user exists (case-insensitive para tolerar maiúsculas/minúsculas no login)
    const user = await db.get(`SELECT * FROM usuarios WHERE LOWER(username) = LOWER(?)`, [username.trim()]);
    
    if (!user) {
      registrarFalhaLogin(clientIp);
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.senha_hash);
    if (!isMatch) {
      registrarFalhaLogin(clientIp);
      return res.status(401).json({ message: 'Usuário ou senha incorretos.' });
    }

    // Sucesso: remove o histórico de erros do IP
    loginTentativas.delete(clientIp);

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

// GET /api/auth/verificar - Validação de token ativo e retorno seguro de perfil
router.get('/verificar', authMiddleware, async (req, res) => {
  res.json({
    valido: true,
    user: req.user
  });
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
