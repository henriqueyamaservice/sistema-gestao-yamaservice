import express from 'express';
import bcrypt from 'bcryptjs';
import getDb from '../config/database.js';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Função auxiliar para verificar permissão de criação
const podeCriarRole = (criadorRole, novoRole) => {
  if (criadorRole === 'admin') return true;
  if (criadorRole === 'os' && ['chefe_setor', 'almoxarifado', 'compras', 'os'].includes(novoRole)) return true;
  if (criadorRole === 'chefe_setor' && novoRole === 'tecnico') return true;
  return false;
};

// GET /api/usuarios - Lista usuários baseado no papel de quem pede
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { role, setor } = req.query;
    
    let query = 'SELECT id, nome, username, role, setor, codigo_omie, criado_em FROM usuarios WHERE 1=1';
    const params = [];

    // Se houver filtros na URL (ex: ?role=tecnico&setor=Eletronica)
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    if (setor) {
      query += ' AND setor = ?';
      params.push(setor);
    }

    // Regras de visualização (Segurança):
    // Chefe só vê seus técnicos e outros membros do seu setor
    if (req.user.role === 'chefe_setor') {
      query += ' AND setor = ? AND role = ?';
      params.push(req.user.setor, 'tecnico');
    }

    const usuarios = await db.all(query, params);
    res.json(usuarios);

  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários', error: error.message });
  }
});

// POST /api/usuarios - Cria um novo usuário (Requer permissão)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { nome, username, senha, role, setor, codigo_omie } = req.body;

    if (!nome || !username || !senha || !role) {
      return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
    }

    // Verifica se quem está chamando tem permissão para criar esta role
    if (!podeCriarRole(req.user.role, role)) {
      return res.status(403).json({ message: `Você (${req.user.role}) não tem permissão para criar usuários do tipo ${role}.` });
    }

    // Se for chefe criando técnico, força o setor a ser o mesmo do chefe
    let setorFinal = setor;
    if (req.user.role === 'chefe_setor') {
      setorFinal = req.user.setor;
    }

    const db = await getDb();
    
    // Verifica se username já existe
    const existe = await db.get(`SELECT id FROM usuarios WHERE username = ?`, [username]);
    if (existe) {
      return res.status(400).json({ message: 'Este nome de usuário (login) já está em uso.' });
    }

    const id = Date.now().toString();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    if (db.driver === 'mysql') {
      await db.run(
        `INSERT INTO usuarios (id, nome, username, senha_hash, role, setor, codigo_omie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, nome, username, hash, role, setorFinal || null, codigo_omie || null]
      );
    } else {
      await db.run(
        `INSERT INTO usuarios (id, nome, username, senha_hash, role, setor, codigo_omie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, nome, username, hash, role, setorFinal || null, codigo_omie || null]
      );
    }

    res.status(201).json({ message: 'Usuário criado com sucesso!', id });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar usuário', error: error.message });
  }
});

// DELETE /api/usuarios/:id - Exclui usuário
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const alvo = await db.get('SELECT role, setor FROM usuarios WHERE id = ?', [req.params.id]);
    
    if (!alvo) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Permissão de exclusão
    if (!podeCriarRole(req.user.role, alvo.role)) {
      return res.status(403).json({ message: 'Sem permissão para excluir este usuário.' });
    }

    // Chefe só apaga os SEUS técnicos
    if (req.user.role === 'chefe_setor' && alvo.setor !== req.user.setor) {
      return res.status(403).json({ message: 'Você só pode excluir técnicos do seu próprio setor.' });
    }

    await db.run('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
    res.json({ message: 'Usuário excluído com sucesso.' });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir usuário', error: error.message });
  }
});

// PUT /api/usuarios/:id/senha - Redefine a senha de um usuário
router.put('/:id/senha', authMiddleware, async (req, res) => {
  try {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ message: 'A nova senha é obrigatória.' });

    const db = await getDb();
    const alvo = await db.get('SELECT role, setor FROM usuarios WHERE id = ?', [req.params.id]);
    
    if (!alvo) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Permissão de edição (usando a mesma regra de exclusão/criação)
    if (!podeCriarRole(req.user.role, alvo.role)) {
      return res.status(403).json({ message: 'Sem permissão para alterar a senha deste usuário.' });
    }

    // Chefe só altera senha dos SEUS técnicos
    if (req.user.role === 'chefe_setor' && alvo.setor !== req.user.setor) {
      return res.status(403).json({ message: 'Você só pode alterar senhas de técnicos do seu próprio setor.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(senha, salt);

    await db.run('UPDATE usuarios SET senha_hash = ? WHERE id = ?', [hash, req.params.id]);
    res.json({ message: 'Senha atualizada com sucesso.' });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar senha', error: error.message });
  }
});

export default router;
