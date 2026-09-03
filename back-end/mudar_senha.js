import 'dotenv/config';
import bcrypt from 'bcryptjs';
import getDb from './src/config/database.js';

async function mudarSenha() {
  const username = process.argv[2];
  const novaSenha = process.argv[3];

  if (!username || !novaSenha) {
    console.log("Uso: node mudar_senha.js <username> <novaSenha>");
    console.log("Exemplo: node mudar_senha.js admin 123456");
    process.exit(1);
  }

  try {
    const db = await getDb();
    
    const user = await db.get(`SELECT * FROM usuarios WHERE username = ?`, [username]);
    if (!user) {
      console.error(`❌ Usuário '${username}' não encontrado.`);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(novaSenha, salt);

    if (db.driver === 'mysql') {
      await db.run(`UPDATE usuarios SET senha_hash = ? WHERE username = ?`, [hash, username]);
    } else {
      await db.run(`UPDATE usuarios SET senha_hash = ? WHERE username = ?`, [hash, username]);
    }

    console.log(`✅ Senha do usuário '${username}' alterada com sucesso!`);
  } catch (error) {
    console.error("❌ Erro ao alterar senha:", error);
  }
  process.exit(0);
}

mudarSenha();
