import 'dotenv/config';
import bcrypt from 'bcryptjs';
import getDb from '../src/config/database.js';

async function criarUsuarioOficina() {
  const db = await getDb();

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('yamaservice123', salt);
  const id = Date.now().toString();

  // Verificar se já existe
  const existe = await db.get('SELECT * FROM usuarios WHERE username = ?', ['oficina']);
  if (existe) {
    await db.run('UPDATE usuarios SET senha_hash = ?, role = ? WHERE username = ?', [hash, 'apontamento', 'oficina']);
    console.log('✅ Usuário "oficina" atualizado com sucesso! (Role: apontamento, Senha: yamaservice123)');
  } else {
    await db.run(
      `INSERT INTO usuarios (id, nome, username, senha_hash, role, setor, codigo_omie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, 'Terminal Oficina / Apontamento', 'oficina', hash, 'apontamento', 'Oficina Geral', null]
    );
    console.log('✅ Usuário "oficina" criado com sucesso! (Username: oficina, Senha: yamaservice123, Role: apontamento)');
  }

  process.exit(0);
}

criarUsuarioOficina();
