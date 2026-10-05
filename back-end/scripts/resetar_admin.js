import 'dotenv/config';
import bcrypt from 'bcryptjs';
import getDb from '../src/config/database.js';

async function resetarAdmin() {
  const novaSenha = process.argv[2];

  if (!novaSenha) {
    console.error('❌ Erro: Você deve informar a nova senha!');
    console.log('📌 Exemplo de uso:');
    console.log('   node scripts/resetar_admin.js MinhaNovaSenha123');
    console.log('   ou no Docker da VPS:');
    console.log('   docker exec -it almoxarifado_app node scripts/resetar_admin.js MinhaNovaSenha123');
    process.exit(1);
  }

  if (novaSenha.length < 3) {
    console.error('❌ Erro: A senha deve ter pelo menos 3 caracteres.');
    process.exit(1);
  }

  try {
    const db = await getDb();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(novaSenha, salt);
    const id = Date.now().toString();

    const existe = await db.get('SELECT id, nome, username FROM usuarios WHERE username = ?', ['admin']);

    if (existe) {
      await db.run(
        'UPDATE usuarios SET senha_hash = ?, role = ?, nome = ? WHERE username = ?',
        [hash, 'admin', 'Administrador Geral', 'admin']
      );
      console.log('====================================================');
      console.log('✅ SENHA DO ADMIN ATUALIZADA COM SUCESSO!');
      console.log(`👤 Usuário: admin`);
      console.log(`🔑 Nova Senha: ${novaSenha}`);
      console.log(`🛡️  Role: admin`);
      console.log('====================================================');
    } else {
      await db.run(
        `INSERT INTO usuarios (id, nome, username, senha_hash, role, setor, codigo_omie) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, 'Administrador Geral', 'admin', hash, 'admin', 'Diretoria', null]
      );
      console.log('====================================================');
      console.log('✅ NOVO USUÁRIO ADMIN CRIADO COM SUCESSO!');
      console.log(`👤 Usuário: admin`);
      console.log(`🔑 Senha: ${novaSenha}`);
      console.log(`🛡️  Role: admin`);
      console.log('====================================================');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao resetar usuário admin:', err.message);
    process.exit(1);
  }
}

resetarAdmin();
