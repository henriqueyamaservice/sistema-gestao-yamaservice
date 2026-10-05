import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, X, Save, Search, UserCheck, Trash2, Settings, Users, Key } from 'lucide-react';
import styles from './GerenciadorUsuarios.module.css';

// Componente genérico para Cadastro de Usuários baseado no papel de quem está logado
const GerenciadorUsuarios = ({ onClose }) => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [usuariosCadastrados, setUsuariosCadastrados] = useState([]);
  const [busca, setBusca] = useState('');
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: '',
    senha: '',
    role: '',
    setor: ''
  });

  const currentUser = JSON.parse(localStorage.getItem('almoxarifado_user') || '{}');
  const token = localStorage.getItem('almoxarifado_token');

  // Define quais cargos o usuário logado pode criar
  const rolesPermitidas = [];
  if (currentUser.role === 'admin') {
    rolesPermitidas.push({ value: 'admin', label: 'Administrador Geral' });
    rolesPermitidas.push({ value: 'diretor', label: 'Diretor' });
    rolesPermitidas.push({ value: 'os', label: 'Gestor de O.S. (Dashboard Geral)' });
    rolesPermitidas.push({ value: 'chefe_setor', label: 'Chefe de Setor' });
    rolesPermitidas.push({ value: 'almoxarife', label: 'Almoxarifado' });
    rolesPermitidas.push({ value: 'compras', label: 'Compras & Cotação' });
    rolesPermitidas.push({ value: 'recebimento_fiscal', label: 'Recebimento Fiscal (Notas / NF-e)' });
    rolesPermitidas.push({ value: 'apontamento', label: 'Colaborador / Apontamento de O.S. (Oficina)' });
    rolesPermitidas.push({ value: 'tecnico', label: 'Técnico' });
    rolesPermitidas.push({ value: 'motorista', label: '🚗 Motorista (Externo - Posto Oriente)' });
    rolesPermitidas.push({ value: 'frentista', label: '⛽ Frentista Yamaves (Interno - Posto Yamaves e Almoxarifado)' });
    rolesPermitidas.push({ value: 'funcionario', label: 'Funcionário Comum (Apenas Requisição)' });
  } else if (currentUser.role === 'os') {
    rolesPermitidas.push({ value: 'apontamento', label: 'Colaborador / Apontamento de O.S. (Oficina)' });
    rolesPermitidas.push({ value: 'chefe_setor', label: 'Chefe de Setor' });
    rolesPermitidas.push({ value: 'almoxarife', label: 'Almoxarifado' });
    rolesPermitidas.push({ value: 'compras', label: 'Compras' });
    rolesPermitidas.push({ value: 'motorista', label: '🚗 Motorista (Externo - Posto Oriente)' });
    rolesPermitidas.push({ value: 'frentista', label: '⛽ Frentista Yamaves (Interno - Posto Yamaves e Almoxarifado)' });
    rolesPermitidas.push({ value: 'tecnico', label: 'Técnico' });
    rolesPermitidas.push({ value: 'funcionario', label: 'Funcionário Comum (Apenas Requisição)' });
  } else if (currentUser.role === 'chefe_setor') {
    rolesPermitidas.push({ value: 'apontamento', label: 'Colaborador / Apontamento de O.S. (Oficina)' });
    rolesPermitidas.push({ value: 'tecnico', label: 'Técnico' });
    rolesPermitidas.push({ value: 'motorista', label: '🚗 Motorista (Externo - Posto Oriente)' });
    rolesPermitidas.push({ value: 'frentista', label: '⛽ Frentista Yamaves (Interno - Posto Yamaves e Almoxarifado)' });
  }

  // Lista de setores
  const setoresMapeados = [
    'Diretoria', 'Transporte / Frota', 'Combustível / Almoxarifado', 'Eletrônica', 'Mecânica', 'Lubrificação', 'Elétrica', 'Almoxarifado', 'Borracharia', 'Serragem', 'Outros'
  ];

  useEffect(() => {
    fetchFuncionarios();
    fetchUsuarios();
  }, []);

  const fetchFuncionarios = async () => {
    try {
      // Busca da omie (cadastrado como fornecedores/vendedores)
      // O endpoint /api/fornecedores retorna os dados (ou podemos usar /api/vendedores)
      const res = await fetch('/api/fornecedores');
      if (res.ok) {
        const data = await res.json();
        // Filtra só os que parecem ser pessoas físicas ou funcionários (ou lista tudo para ele achar)
        setFuncionarios(data);
      }
    } catch (e) {
      console.error('Erro ao buscar funcionários', e);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsuariosCadastrados(await res.json());
      }
    } catch (e) {
      console.error('Erro ao buscar usuários', e);
    }
  };

  const handleSelecionar = (func) => {
    setFuncionarioSelecionado(func);
    // Gera um username padrão com base no primeiro e último nome
    const partes = func.razao_social ? func.razao_social.toLowerCase().split(' ') : func.nome_fantasia?.toLowerCase().split(' ') || ['user'];
    const usernameSugerido = partes.length > 1 ? `${partes[0]}.${partes[partes.length - 1]}` : partes[0];

    setForm({
      ...form,
      username: usernameSugerido.replace(/[^a-z0-9.]/g, ''),
      role: rolesPermitidas.length === 1 ? rolesPermitidas[0].value : '' // Se só puder criar 1, auto-seleciona
    });
    setBusca('');
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!funcionarioSelecionado) return alert('Selecione um funcionário primeiro!');

    const payload = {
      nome: funcionarioSelecionado.razao_social || funcionarioSelecionado.nome_fantasia || 'Nome Indisponível',
      codigo_omie: funcionarioSelecionado.codigo_cliente_omie || funcionarioSelecionado.codigo,
      username: form.username,
      senha: form.senha,
      role: form.role,
      setor: form.setor || currentUser.setor // Se for chefe_setor, a API trava automaticamente pro setor dele
    };

    try {
      setLoading(true);
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('Usuário cadastrado com sucesso!');
      setFuncionarioSelecionado(null);
      setForm({ username: '', senha: '', role: '', setor: '' });
      fetchUsuarios();
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este acesso?')) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      fetchUsuarios();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditarSenha = async (id, nome) => {
    const novaSenha = window.prompt(`Digite a nova senha provisória para o usuário ${nome}:`);
    if (!novaSenha) return;

    if (novaSenha.length < 3) {
      alert('A senha deve ter pelo menos 3 caracteres.');
      return;
    }

    try {
      const res = await fetch(`/api/usuarios/${id}/senha`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ senha: novaSenha })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('Senha atualizada com sucesso!');
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  // Filtragem da busca
  const funcionariosFiltrados = busca.length >= 2
    ? funcionarios.filter(f =>
      (f.razao_social || '').toLowerCase().includes(busca.toLowerCase()) ||
      (f.nome_fantasia || '').toLowerCase().includes(busca.toLowerCase()) ||
      (f.cnpj_cpf || '').includes(busca)
    ).slice(0, 10)
    : [];

  const [abaConfig, setAbaConfig] = useState('acessos');

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2><Settings size={24} /> Configurações do Sistema</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.configContainer}>
          <div className={styles.configSidebar}>
            <button
              className={`${styles.configTab} ${abaConfig === 'acessos' ? styles.activeTab : ''}`}
              onClick={() => setAbaConfig('acessos')}
            >
              <Users size={20} /> Gerenciar Acessos
            </button>
            {/* Outras abas podem ser adicionadas aqui no futuro */}
          </div>

          <div className={styles.configContent}>
            {abaConfig === 'acessos' && (
              <div className={styles.content}>
                <div className={styles.leftPanel}>
                  <h3>1. Cadastrar Novo Usuário</h3>

                  {!funcionarioSelecionado ? (
                    <div className={styles.buscaContainer}>
                      <label>Busque o funcionário (Omie):</label>
                      <div className={styles.inputWithIcon}>
                        <Search size={18} />
                        <input
                          type="text"
                          placeholder="Digite o nome ou CPF..."
                          value={busca}
                          onChange={(e) => setBusca(e.target.value)}
                        />
                      </div>
                      {funcionariosFiltrados.length > 0 && (
                        <ul className={styles.listaResultados}>
                          {funcionariosFiltrados.map(f => (
                            <li key={f.codigo_cliente_omie || f.codigo} onClick={() => handleSelecionar(f)}>
                              <div className={styles.resultName}>{f.razao_social || f.nome_fantasia}</div>
                              <div className={styles.resultCpf}>CPF: {f.cnpj_cpf || 'N/A'}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleSalvar} className={styles.form}>
                      <div className={styles.funcionarioCard}>
                        <UserCheck size={20} color="var(--cor-sucesso)" />
                        <div>
                          <strong>{funcionarioSelecionado.razao_social || funcionarioSelecionado.nome_fantasia}</strong>
                          <br /><small>CPF: {funcionarioSelecionado.cnpj_cpf || 'N/A'}</small>
                        </div>
                        <button type="button" onClick={() => setFuncionarioSelecionado(null)} className={styles.changeBtn}>Trocar</button>
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Login de Acesso:</label>
                          <input required type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Senha:</label>
                          <input required type="text" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} placeholder="Defina uma senha provisória" />
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Cargo / Permissão:</label>
                          <select required value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} disabled={rolesPermitidas.length === 1}>
                            <option value="">Selecione...</option>
                            {rolesPermitidas.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>

                        {/* Se for Admin ou OS, permite escolher o setor para o novo funcionário */}
                        {currentUser.role !== 'chefe_setor' && (
                          <div className={styles.formGroup}>
                            <label>Setor da Empresa:</label>
                            <select required value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })}>
                              <option value="">Selecione o setor...</option>
                              {setoresMapeados.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      <button type="submit" disabled={loading} className={styles.btnSalvar}>
                        {loading ? 'Salvando...' : <><Save size={18} /> Cadastrar Acesso</>}
                      </button>
                    </form>
                  )}
                </div>

                <div className={styles.rightPanel}>
                  <h3>2. Usuários da Minha Equipe ({usuariosCadastrados.length})</h3>
                  <div className={styles.listaCadastrados}>
                    {usuariosCadastrados.map(user => (
                      <div key={user.id} className={styles.userCard}>
                        <div className={styles.userInfo}>
                          <div className={styles.userName}>{user.nome}</div>
                          <div className={styles.userRole}>
                            <Shield size={12} /> {user.role.toUpperCase()}
                            {user.setor && ` - ${user.setor}`}
                          </div>
                          <div className={styles.userLogin}>Login: {user.username}</div>
                        </div>
                        {user.username === 'admin' ? (
                          <button className={styles.btnExcluir} style={{ opacity: 0.3, cursor: 'not-allowed' }} title="O Administrador principal não pode ser excluído">
                            <Shield size={16} />
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleEditarSenha(user.id, user.nome)} className={styles.btnAcao} title="Redefinir Senha" style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}>
                              <Key size={16} />
                            </button>
                            <button onClick={() => handleExcluir(user.id)} className={styles.btnExcluir} title="Remover Acesso">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {usuariosCadastrados.length === 0 && (
                      <p style={{ color: 'var(--cor-texto-secundario)', fontSize: 14 }}>Nenhum usuário cadastrado ainda.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerenciadorUsuarios;
