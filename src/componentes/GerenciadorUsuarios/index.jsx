import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Shield, X, Save, Search, UserCheck, Trash2,
  Users, Key, Info, CheckCircle2, ChevronDown, ChevronUp,
  Package, ShoppingCart, FileCheck, Settings, Wrench, Fuel, Plus
} from 'lucide-react';
import styles from './GerenciadorUsuarios.module.css';

// Definição dos Departamentos e seus respectivos cargos
const DEPARTAMENTOS_CONFIG = [
  {
    id: 'almoxarifado',
    nome: 'Almoxarifado',
    descricao: 'Expedição, separação, bipagem e estoque físico',
    roles: ['almoxarife', 'almoxarifado'],
    cor: 'var(--cor-destaque)',
    bgIcone: 'rgba(255, 107, 0, 0.12)',
    icone: Package,
    rolePadrao: 'almoxarife',
    setorPadrao: 'Almoxarifado'
  },
  {
    id: 'compras',
    nome: 'Compras',
    descricao: 'Cotações, orçamentos, IA e pedidos a fornecedores',
    roles: ['compras'],
    cor: '#0ea5e9',
    bgIcone: 'rgba(14, 165, 233, 0.12)',
    icone: ShoppingCart,
    rolePadrao: 'compras',
    setorPadrao: 'Compras'
  },
  {
    id: 'recebimento_fiscal',
    nome: 'Recebimento Fiscal',
    descricao: 'Conferência de NF-e, pareamento e Contas a Pagar Omie',
    roles: ['recebimento_fiscal', 'fiscal'],
    cor: 'var(--cor-sucesso)',
    bgIcone: 'rgba(16, 185, 129, 0.12)',
    icone: FileCheck,
    rolePadrao: 'recebimento_fiscal',
    setorPadrao: 'Fiscal / Contabilidade'
  },
  {
    id: 'os',
    nome: 'O.S / Controle Combustivel',
    descricao: 'Ordens de serviço, manutenção, controle de combustível e frotas',
    roles: ['os'],
    cor: '#3b82f6',
    bgIcone: 'rgba(59, 130, 246, 0.12)',
    icone: Settings,
    rolePadrao: 'os',
    setorPadrao: 'Transporte / Frota'
  },
  {
    id: 'oficina',
    nome: 'Oficina / Apontamento',
    descricao: 'Totem de apontamento de horas da mecânica e elétrica',
    roles: ['apontamento', 'oficina'],
    cor: '#14b8a6',
    bgIcone: 'rgba(20, 184, 166, 0.12)',
    icone: Wrench,
    rolePadrao: 'apontamento',
    setorPadrao: 'Mecânica'
  },
  {
    id: 'frota',
    nome: 'Frentista / Motorista',
    descricao: 'Frentistas do posto interno e motoristas com abastecimento externo',
    roles: ['frentista', 'motorista'],
    cor: '#a854f7',
    bgIcone: 'rgba(168, 85, 247, 0.12)',
    icone: Fuel,
    rolePadrao: 'frentista',
    setorPadrao: 'Combustível / Almoxarifado'
  },
  {
    id: 'chefes_tecnicos',
    nome: 'Chefe de Setor / Técnicos',
    descricao: 'Triagem de aprovações e execução técnica especializada',
    roles: ['chefe_setor', 'tecnico'],
    cor: '#eab308',
    bgIcone: 'rgba(234, 179, 8, 0.12)',
    icone: UserCheck,
    rolePadrao: 'chefe_setor',
    setorPadrao: 'Eletrônica'
  },
  {
    id: 'diretoria_admin',
    nome: 'Diretoria & Administradores',
    descricao: 'Administração geral e relatórios executivos',
    roles: ['admin', 'diretor'],
    cor: '#ef4444',
    bgIcone: 'rgba(239, 68, 68, 0.12)',
    icone: Shield,
    rolePadrao: 'admin',
    setorPadrao: 'Diretoria'
  },
  {
    id: 'outros',
    nome: 'Funcionários Comuns',
    descricao: 'Colaboradores com acesso apenas a requisições de materiais',
    roles: ['funcionario'],
    cor: 'var(--cor-texto-secundario)',
    bgIcone: 'var(--cor-fundo-sutil-forte)',
    icone: Users,
    rolePadrao: 'funcionario',
    setorPadrao: 'Outros'
  }
];

// Dica explicativa de permissão por cargo
const getDicaPermissao = (role) => {
  switch (role) {
    case 'admin':
      return 'Acesso total irrestrito a todos os módulos e configurações do sistema.';
    case 'diretor':
      return 'Acesso executivo para relatórios gerais e autorizações estratégicas.';
    case 'os':
      return 'Acesso completo ao Dashboard integrado de O.S. e Controle de Combustível (abastecimentos, frotas, geradores e manutenções).';
    case 'chefe_setor':
      return 'Acesso à triagem setorial, aprovação de O.S. adicionais e requisições da equipe.';
    case 'almoxarife':
      return 'Acesso ao Dashboard do Almoxarifado para expedição, bipagem, saídas de balcão e estoque.';
    case 'compras':
      return 'Acesso ao Dashboard de Compras para cotações, orçamentos, IA e pedidos a fornecedores.';
    case 'recebimento_fiscal':
      return 'Acesso ao Recebimento Fiscal para conferência de NF-e, pareamento e integração Contas a Pagar Omie.';
    case 'apontamento':
      return 'Acesso ao totem de apontamento de horas e tarefas da Oficina mecânica/elétrica.';
    case 'tecnico':
      return 'Acesso técnico para execução, atendimento e apontamentos de ordens de serviço.';
    case 'motorista':
      return 'Acesso ao registro de combustível em tempo real em abastecimentos externos (Posto Oriente).';
    case 'frentista':
      return 'Acesso ao controle de bombas e abastecimentos internos em tempo real (Posto Yamaves).';
    case 'funcionario':
      return 'Acesso simplificado apenas para criação de requisições de materiais.';
    default:
      return null;
  }
};

// Identificação visual rica e precisa de cada função/cargo
const getFuncaoCargoBadge = (role) => {
  const r = (role || '').toLowerCase();
  switch (r) {
    case 'chefe_setor':
      return {
        label: 'Chefe de Setor',
        bg: 'rgba(234, 179, 8, 0.16)',
        cor: '#facc15',
        borda: 'rgba(234, 179, 8, 0.35)',
        descricao: 'Responsável pela triagem e aprovação de O.S.'
      };
    case 'tecnico':
      return {
        label: 'Técnico',
        bg: 'rgba(59, 130, 246, 0.16)',
        cor: '#60a5fa',
        borda: 'rgba(59, 130, 246, 0.35)',
        descricao: 'Execução técnica de ordens de serviço'
      };
    case 'frentista':
      return {
        label: 'Frentista (Posto Interno)',
        bg: 'rgba(168, 85, 247, 0.16)',
        cor: '#c084fc',
        borda: 'rgba(168, 85, 247, 0.35)',
        descricao: 'Operador de bomba interna (Posto Yamaves)'
      };
    case 'motorista':
      return {
        label: 'Motorista (Posto Externo)',
        bg: 'rgba(14, 165, 233, 0.16)',
        cor: '#38bdf8',
        borda: 'rgba(14, 165, 233, 0.35)',
        descricao: 'Condutor da frota com abastecimento externo'
      };
    case 'almoxarife':
    case 'almoxarifado':
      return {
        label: 'Almoxarife',
        bg: 'rgba(255, 107, 0, 0.16)',
        cor: 'var(--cor-destaque)',
        borda: 'rgba(255, 107, 0, 0.35)',
        descricao: 'Expedição, separação e estoque físico'
      };
    case 'compras':
      return {
        label: 'Compras',
        bg: 'rgba(14, 165, 233, 0.16)',
        cor: '#0ea5e9',
        borda: 'rgba(14, 165, 233, 0.35)',
        descricao: 'Cotações, IA e pedidos a fornecedores'
      };
    case 'recebimento_fiscal':
    case 'fiscal':
      return {
        label: 'Recebimento Fiscal',
        bg: 'rgba(16, 185, 129, 0.16)',
        cor: 'var(--cor-sucesso)',
        borda: 'rgba(16, 185, 129, 0.35)',
        descricao: 'Conferência de NF-e e Contas a Pagar Omie'
      };
    case 'os':
      return {
        label: 'O.S / Controle Combustivel',
        bg: 'rgba(59, 130, 246, 0.2)',
        cor: '#93c5fd',
        borda: 'rgba(59, 130, 246, 0.45)',
        descricao: 'Gestão completa de O.S e Abastecimentos'
      };
    case 'apontamento':
    case 'oficina':
      return {
        label: 'Apontamento Oficina',
        bg: 'rgba(20, 184, 166, 0.16)',
        cor: '#2dd4bf',
        borda: 'rgba(20, 184, 166, 0.35)',
        descricao: 'Totem de horas oficina mecânica/elétrica'
      };
    case 'admin':
      return {
        label: 'Administrador',
        bg: 'rgba(239, 68, 68, 0.16)',
        cor: '#f87171',
        borda: 'rgba(239, 68, 68, 0.35)',
        descricao: 'Acesso total irrestrito'
      };
    case 'diretor':
      return {
        label: 'Diretor',
        bg: 'rgba(244, 63, 94, 0.16)',
        cor: '#fb7185',
        borda: 'rgba(244, 63, 94, 0.35)',
        descricao: 'Diretoria executiva'
      };
    default:
      return {
        label: 'Funcionário',
        bg: 'var(--cor-fundo-sutil-forte)',
        cor: 'var(--cor-texto-secundario)',
        borda: 'var(--cor-borda-cartao)',
        descricao: 'Requisição simples de materiais'
      };
  }
};

const GerenciadorUsuarios = ({ onClose }) => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [usuariosCadastrados, setUsuariosCadastrados] = useState([]);
  const [buscaOmie, setBuscaOmie] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos'); // 'todos' ou ID do depto
  const [expandidos, setExpandidos] = useState({
    almoxarifado: true,
    compras: true,
    recebimento_fiscal: true,
    os: true,
    oficina: true,
    frota: true,
    chefes_tecnicos: true,
    diretoria_admin: true,
    outros: true
  });

  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: '',
    senha: '',
    role: '',
    setor: ''
  });
  const [isOutroSetor, setIsOutroSetor] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('almoxarifado_user') || '{}');
  const token = localStorage.getItem('almoxarifado_token');

  // Define quais cargos o usuário logado pode criar
  const rolesPermitidas = useMemo(() => {
    const list = [];
    if (currentUser.role === 'admin') {
      list.push({ value: 'admin', label: 'Administrador Geral' });
      list.push({ value: 'diretor', label: 'Diretor' });
      list.push({ value: 'os', label: 'O.S / Controle Combustivel (Gestão)' });
      list.push({ value: 'chefe_setor', label: 'Chefe de Setor (Triagem & Aprovações)' });
      list.push({ value: 'tecnico', label: 'Técnico (Execução de O.S.)' });
      list.push({ value: 'frentista', label: 'Frentista (Posto Yamaves - Interno)' });
      list.push({ value: 'motorista', label: 'Motorista (Frota - Posto Externo)' });
      list.push({ value: 'almoxarife', label: 'Almoxarifado (Expedição & Estoque)' });
      list.push({ value: 'compras', label: 'Compras & Cotação' });
      list.push({ value: 'recebimento_fiscal', label: 'Recebimento Fiscal (Notas / NF-e)' });
      list.push({ value: 'apontamento', label: 'Colaborador / Apontamento de O.S. (Oficina)' });
      list.push({ value: 'funcionario', label: 'Funcionário Comum (Apenas Requisição)' });
    } else if (currentUser.role === 'os') {
      list.push({ value: 'chefe_setor', label: 'Chefe de Setor (Triagem & Aprovações)' });
      list.push({ value: 'tecnico', label: 'Técnico (Execução de O.S.)' });
      list.push({ value: 'frentista', label: 'Frentista (Posto Yamaves - Interno)' });
      list.push({ value: 'motorista', label: 'Motorista (Frota - Posto Externo)' });
      list.push({ value: 'almoxarife', label: 'Almoxarifado (Expedição & Estoque)' });
      list.push({ value: 'compras', label: 'Compras & Cotação' });
      list.push({ value: 'recebimento_fiscal', label: 'Recebimento Fiscal (Notas / NF-e)' });
      list.push({ value: 'apontamento', label: 'Colaborador / Apontamento de O.S. (Oficina)' });
      list.push({ value: 'funcionario', label: 'Funcionário Comum (Apenas Requisição)' });
    } else if (currentUser.role === 'chefe_setor') {
      list.push({ value: 'tecnico', label: 'Técnico (Execução de O.S.)' });
      list.push({ value: 'frentista', label: 'Frentista (Posto Yamaves - Interno)' });
      list.push({ value: 'motorista', label: 'Motorista (Frota - Posto Externo)' });
      list.push({ value: 'apontamento', label: 'Colaborador / Apontamento de O.S. (Oficina)' });
    }
    return list;
  }, [currentUser.role]);

  // Lista de setores padronizados
  const setoresMapeados = [
    'Diretoria',
    'Transporte / Frota',
    'Combustível / Almoxarifado',
    'Almoxarifado',
    'Compras',
    'Fiscal / Contabilidade',
    'Eletrônica',
    'Mecânica',
    'Lubrificação',
    'Elétrica',
    'Borracharia',
    'Serragem'
  ];

  useEffect(() => {
    fetchFuncionarios();
    fetchUsuarios();
  }, []);

  const fetchFuncionarios = async () => {
    try {
      const res = await fetch('/api/fornecedores');
      if (res.ok) {
        const data = await res.json();
        setFuncionarios(data || []);
      }
    } catch (e) {
      console.error('Erro ao buscar funcionários na Omie:', e);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const res = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuariosCadastrados(data || []);
      }
    } catch (e) {
      console.error('Erro ao buscar usuários cadastrados:', e);
    }
  };

  const sugerirSetorParaRole = (role) => {
    if (role === 'almoxarife' || role === 'almoxarifado') return 'Almoxarifado';
    if (role === 'compras') return 'Compras';
    if (role === 'recebimento_fiscal') return 'Fiscal / Contabilidade';
    if (role === 'motorista') return 'Transporte / Frota';
    if (role === 'frentista') return 'Combustível / Almoxarifado';
    if (role === 'apontamento') return 'Mecânica';
    if (role === 'tecnico') return 'Eletrônica';
    if (role === 'os') return 'Transporte / Frota';
    if (role === 'admin' || role === 'diretor') return 'Diretoria';
    return '';
  };

  const handleSelecionar = (func) => {
    setFuncionarioSelecionado(func);
    const partes = func.razao_social
      ? func.razao_social.toLowerCase().split(' ')
      : (func.nome_fantasia?.toLowerCase().split(' ') || ['user']);
    const usernameSugerido = partes.length > 1 ? `${partes[0]}.${partes[partes.length - 1]}` : partes[0];

    const roleInicial = rolesPermitidas.length === 1 ? rolesPermitidas[0].value : (form.role || '');

    setIsOutroSetor(false);
    setForm({
      ...form,
      username: usernameSugerido.replace(/[^a-z0-9.]/g, ''),
      role: roleInicial,
      setor: sugerirSetorParaRole(roleInicial) || form.setor || ''
    });
    setBuscaOmie('');
  };

  const handleRoleChange = (e) => {
    const novaRole = e.target.value;
    const setorSugerido = sugerirSetorParaRole(novaRole);
    setIsOutroSetor(false);
    setForm(prev => ({
      ...prev,
      role: novaRole,
      setor: setorSugerido || prev.setor
    }));
  };

  const handlePrepararNovoParaDepartamento = (dep) => {
    setIsOutroSetor(false);
    setForm(prev => ({
      ...prev,
      role: dep.rolePadrao,
      setor: dep.setorPadrao
    }));
    // Foca na busca se ainda não selecionou funcionário
    if (!funcionarioSelecionado) {
      const input = document.getElementById('inputBuscaOmie');
      if (input) input.focus();
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!funcionarioSelecionado) return alert('Selecione um funcionário da lista primeiro!');

    const payload = {
      nome: funcionarioSelecionado.razao_social || funcionarioSelecionado.nome_fantasia || 'Nome Indisponível',
      codigo_omie: funcionarioSelecionado.codigo_cliente_omie || funcionarioSelecionado.codigo,
      username: form.username.trim().toLowerCase(),
      senha: form.senha,
      role: form.role,
      setor: form.setor || currentUser.setor || 'Geral'
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
      if (!res.ok) throw new Error(data.message || 'Falha ao cadastrar usuário');

      alert(`Usuário "${payload.username}" cadastrado com sucesso!`);
      setFuncionarioSelecionado(null);
      setIsOutroSetor(false);
      setForm({ username: '', senha: '', role: '', setor: '' });
      fetchUsuarios();
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja remover o acesso de "${nome}"?`)) return;
    try {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erro ao excluir usuário');
      }
      fetchUsuarios();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEditarSenha = async (id, nome) => {
    const novaSenha = window.prompt(`Digite a nova senha provisória para o usuário "${nome}":`);
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
      if (!res.ok) throw new Error(data.message || 'Erro ao alterar senha');

      alert('Senha atualizada com sucesso!');
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  };

  const toggleExpandir = (depId) => {
    setExpandidos(prev => ({
      ...prev,
      [depId]: !prev[depId]
    }));
  };

  // Filtragem rápida de busca na lista de Omie
  const funcionariosFiltrados = buscaOmie.length >= 2
    ? funcionarios.filter(f =>
      (f.razao_social || '').toLowerCase().includes(buscaOmie.toLowerCase()) ||
      (f.nome_fantasia || '').toLowerCase().includes(buscaOmie.toLowerCase()) ||
      (f.cnpj_cpf || '').includes(buscaOmie)
    ).slice(0, 10)
    : [];

  // Mapeamento e Agrupamento dos Usuários por Departamento
  const departamentosAgrupados = useMemo(() => {
    const termo = filtroUsuario.trim().toLowerCase();

    return DEPARTAMENTOS_CONFIG.map(dep => {
      // Pega todos os usuários deste departamento
      const usuariosDoDepto = usuariosCadastrados.filter(u => {
        const role = (u.role || '').toLowerCase();
        return dep.roles.includes(role);
      });

      // Aplica busca por texto se houver
      const usuariosFiltrados = termo
        ? usuariosDoDepto.filter(u =>
            (u.nome || '').toLowerCase().includes(termo) ||
            (u.username || '').toLowerCase().includes(termo) ||
            (u.setor || '').toLowerCase().includes(termo) ||
            (u.role || '').toLowerCase().includes(termo)
          )
        : usuariosDoDepto;

      return {
        ...dep,
        totalUsuarios: usuariosDoDepto.length,
        usuarios: usuariosFiltrados
      };
    });
  }, [usuariosCadastrados, filtroUsuario]);

  // Departamentos visíveis conforme o filtro ativo de departamento
  const departamentosExibidos = useMemo(() => {
    if (filtroDepartamento === 'todos') {
      return departamentosAgrupados;
    }
    return departamentosAgrupados.filter(d => d.id === filtroDepartamento);
  }, [departamentosAgrupados, filtroDepartamento]);

  const totalUsuariosVisiveis = useMemo(() => {
    return departamentosExibidos.reduce((acc, d) => acc + d.usuarios.length, 0);
  }, [departamentosExibidos]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const p = name.split(' ');
    if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header Superior Moderno */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconBadge}>
              <Users size={24} />
            </div>
            <div>
              <h2>Gerenciador de Acessos & Usuários</h2>
              <p className={styles.headerSubtitle}>
                Cadastre e controle os níveis de permissão da equipe nos dashboards do sistema
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Fechar (ESC)">
            <X size={22} />
          </button>
        </div>

        {/* Container Principal */}
        <div className={styles.configContainer}>
          {/* 1. Painel Esquerdo: Formulário de Cadastro (Largura Fixa) */}
          <div className={styles.leftPanel}>
            <div className={styles.panelHeader}>
              <h3>
                <UserPlus size={19} color="var(--cor-destaque)" />
                1. Cadastrar Novo Acesso
              </h3>
            </div>

            {!funcionarioSelecionado ? (
              <div className={styles.buscaContainer}>
                <label className={styles.buscaLabel}>Buscar Colaborador Cadastrado na Omie:</label>
                <div className={styles.inputWithIcon}>
                  <Search size={18} />
                  <input
                    id="inputBuscaOmie"
                    type="text"
                    placeholder="Digite o nome ou CPF do colaborador..."
                    value={buscaOmie}
                    onChange={(e) => setBuscaOmie(e.target.value)}
                    autoFocus
                  />
                </div>
                {funcionariosFiltrados.length > 0 && (
                  <ul className={styles.listaResultados}>
                    {funcionariosFiltrados.map(f => (
                      <li
                        key={f.codigo_cliente_omie || f.codigo}
                        onClick={() => handleSelecionar(f)}
                        title="Clique para selecionar e vincular"
                      >
                        <div className={styles.resultName}>{f.razao_social || f.nome_fantasia}</div>
                        <div className={styles.resultCpf}>CPF: {f.cnpj_cpf || 'Não informado'}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <form onSubmit={handleSalvar} className={styles.form}>
                <div className={styles.funcionarioCard}>
                  <CheckCircle2 size={24} color="var(--cor-sucesso)" style={{ flexShrink: 0 }} />
                  <div>
                    <div className={styles.funcionarioNome}>
                      {funcionarioSelecionado.razao_social || funcionarioSelecionado.nome_fantasia}
                    </div>
                    <div className={styles.funcionarioCpf}>
                      CPF: {funcionarioSelecionado.cnpj_cpf || 'N/A'} • Cód. Omie: {funcionarioSelecionado.codigo_cliente_omie || funcionarioSelecionado.codigo || 'N/A'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFuncionarioSelecionado(null)}
                    className={styles.changeBtn}
                    title="Selecionar outro colaborador"
                  >
                    Trocar
                  </button>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Login de Acesso:</label>
                    <input
                      required
                      type="text"
                      value={form.username}
                      onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })}
                      placeholder="ex: joao.silva"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Senha Provisória:</label>
                    <input
                      required
                      type="text"
                      value={form.senha}
                      onChange={e => setForm({ ...form, senha: e.target.value })}
                      placeholder="Defina a senha inicial"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Cargo / Perfil de Acesso:</label>
                    <select
                      required
                      value={form.role}
                      onChange={handleRoleChange}
                      disabled={rolesPermitidas.length === 1}
                    >
                      <option value="">Selecione o cargo...</option>
                      {rolesPermitidas.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  {currentUser.role !== 'chefe_setor' && (
                    <div className={styles.formGroup}>
                      <div className={styles.labelRow}>
                        <label>Setor da Empresa:</label>
                        {isOutroSetor && (
                          <button
                            type="button"
                            className={styles.linkVoltarLista}
                            onClick={() => {
                              setIsOutroSetor(false);
                              setForm(prev => ({ ...prev, setor: sugerirSetorParaRole(prev.role) || '' }));
                            }}
                            title="Voltar para a seleção de setores padrões"
                          >
                            Escolher da lista
                          </button>
                        )}
                      </div>

                      {!isOutroSetor ? (
                        <select
                          required
                          value={form.setor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'Outros') {
                              setIsOutroSetor(true);
                              setForm(prev => ({ ...prev, setor: '' }));
                            } else {
                              setIsOutroSetor(false);
                              setForm(prev => ({ ...prev, setor: val }));
                            }
                          }}
                        >
                          <option value="">Selecione o setor...</option>
                          {setoresMapeados.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                          <option value="Outros">+ Outro setor (Digitar personalizado...)</option>
                        </select>
                      ) : (
                        <input
                          required
                          type="text"
                          autoFocus
                          value={form.setor}
                          onChange={e => setForm({ ...form, setor: e.target.value })}
                          placeholder="Digite o nome do novo setor..."
                        />
                      )}
                    </div>
                  )}
                </div>

                {form.role && getDicaPermissao(form.role) && (
                  <div className={styles.dicaCargoBox}>
                    <Info size={18} color="var(--cor-destaque)" style={{ flexShrink: 0 }} />
                    <span>{getDicaPermissao(form.role)}</span>
                  </div>
                )}

                <button type="submit" disabled={loading} className={styles.btnSalvar}>
                  {loading ? 'Cadastrando...' : <><Save size={18} /> Salvar & Conceder Acesso</>}
                </button>
              </form>
            )}
          </div>

          {/* 2. Painel Direito: Departamentos & Usuários (Expansivo) */}
          <div className={styles.rightPanel}>
            {/* Topo com Título e Barra de Busca Geral */}
            <div className={styles.rightPanelHeader}>
              <div className={styles.rightPanelTitle}>
                <Users size={20} color="var(--cor-destaque)" />
                <span>2. Usuários por Departamento</span>
                <span className={styles.panelBadge}>
                  {totalUsuariosVisiveis} usuário(s)
                </span>
              </div>

              <div className={styles.buscaDireitaContainer}>
                <div className={styles.inputWithIcon}>
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Filtrar por nome, login ou setor..."
                    value={filtroUsuario}
                    onChange={(e) => setFiltroUsuario(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Barra de Abas / Botões de Filtro Rápido por Departamento */}
            <div className={styles.deptPillsBar}>
              <button
                type="button"
                className={`${styles.deptPill} ${filtroDepartamento === 'todos' ? styles.deptPillAtivo : ''}`}
                onClick={() => setFiltroDepartamento('todos')}
              >
                <span>Todos os Setores</span>
                <span className={styles.deptPillCount}>{usuariosCadastrados.length}</span>
              </button>

              {departamentosAgrupados.map(dep => (
                <button
                  key={dep.id}
                  type="button"
                  className={`${styles.deptPill} ${filtroDepartamento === dep.id ? styles.deptPillAtivo : ''}`}
                  onClick={() => {
                    setFiltroDepartamento(dep.id);
                    setExpandidos(prev => ({ ...prev, [dep.id]: true }));
                  }}
                >
                  <dep.icone size={14} style={{ color: filtroDepartamento === dep.id ? '#fff' : dep.cor }} />
                  <span>{dep.nome}</span>
                  <span className={styles.deptPillCount}>{dep.totalUsuarios}</span>
                </button>
              ))}
            </div>

            {/* Lista de Grupos por Departamento (Accordion Interativo) */}
            <div className={styles.deptGruposLista}>
              {departamentosExibidos.map(dep => {
                const isAberto = expandidos[dep.id] !== false;
                const IconeComponente = dep.icone;

                return (
                  <div key={dep.id} className={styles.deptCard}>
                    {/* Cabeçalho Clicável do Departamento (Sanfona) */}
                    <div
                      className={styles.deptHeader}
                      onClick={() => toggleExpandir(dep.id)}
                      title={`Clique para ${isAberto ? 'recolher' : 'mostrar'} os usuários de ${dep.nome}`}
                    >
                      <div className={styles.deptHeaderMain}>
                        <div className={styles.deptIconBox} style={{ background: dep.bgIcone, color: dep.cor }}>
                          <IconeComponente size={22} />
                        </div>
                        <div className={styles.deptInfo}>
                          <div className={styles.deptNomeRow}>
                            <span className={styles.deptNome}>{dep.nome}</span>
                          </div>
                          <span className={styles.deptDescricao}>{dep.descricao}</span>
                        </div>
                      </div>

                      <div className={styles.deptHeaderRight}>
                        <span
                          className={styles.deptBadgeCount}
                          style={{
                            backgroundColor: dep.totalUsuarios > 0 ? dep.bgIcone : 'var(--cor-fundo-sutil)',
                            color: dep.totalUsuarios > 0 ? dep.cor : 'var(--cor-texto-secundario)'
                          }}
                        >
                          {dep.usuarios.length} usuário(s)
                        </span>

                        <div className={styles.deptChevron}>
                          {isAberto ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Corpo do Departamento Expandido (Lista de Usuários) */}
                    {isAberto && (
                      <div className={styles.deptBody}>
                        <div className={styles.deptToolbar}>
                          <span className={styles.deptToolbarTexto}>
                            {dep.usuarios.length > 0
                              ? `Colaboradores com acesso ao módulo ${dep.nome}:`
                              : `Nenhum usuário cadastrado em ${dep.nome} ainda.`}
                          </span>

                          <button
                            type="button"
                            className={styles.btnAddDeptUsuario}
                            onClick={() => handlePrepararNovoParaDepartamento(dep)}
                            title={`Preparar cadastro com cargo do ${dep.nome}`}
                          >
                            <Plus size={14} />
                            <span>+ Novo em {dep.nome}</span>
                          </button>
                        </div>

                        {dep.usuarios.length > 0 ? (
                          <div className={styles.tabelaContainer}>
                            <table className={styles.tabelaUsuarios}>
                              <thead>
                                <tr>
                                  <th style={{ width: '42%' }}>Colaborador</th>
                                  <th style={{ width: '25%' }}>Login de Acesso</th>
                                  <th style={{ width: '18%' }}>Setor</th>
                                  <th style={{ width: '15%', textAlign: 'right' }}>Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {dep.usuarios.map(user => {
                                  const isSuperAdmin = user.username === 'admin';

                                  return (
                                    <tr key={user.id} className={styles.tabelaLinha}>
                                      <td>
                                        <div className={styles.colaboradorCell}>
                                          <div className={styles.userAvatar}>
                                            {getInitials(user.nome)}
                                          </div>
                                          <div className={styles.colaboradorInfoTexto}>
                                            <span className={styles.userNameTexto} title={user.nome}>
                                              {user.nome}
                                            </span>
                                            {user.codigo_omie && (
                                              <span className={styles.userOmieCod}>
                                                Omie #{user.codigo_omie}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      <td>
                                        <span className={styles.userLoginBadge}>@{user.username}</span>
                                      </td>

                                      <td>
                                        <span className={styles.userSetorBadge}>• {user.setor || dep.nome}</span>
                                      </td>

                                      <td style={{ textAlign: 'right' }}>
                                        <div className={styles.acoesLinha}>
                                          {isSuperAdmin ? (
                                            <span title="Administrador Raiz Protegido" className={styles.badgeAdminProtegido}>
                                              <Shield size={15} />
                                              <span>Protegido</span>
                                            </span>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleEditarSenha(user.id, user.nome)}
                                                className={styles.btnAcaoLinha}
                                                title="Redefinir senha de acesso"
                                              >
                                                <Key size={14} />
                                                <span>Senha</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleExcluir(user.id, user.nome)}
                                                className={styles.btnExcluirLinha}
                                                title="Remover acesso do usuário"
                                              >
                                                <Trash2 size={14} />
                                                <span>Remover</span>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className={styles.emptyDeptState}>
                            <p>Nenhum colaborador encontrado com permissão para este setor.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {departamentosExibidos.length === 0 && (
                <div className={styles.emptyState}>
                  <Users size={40} />
                  <p>Nenhum departamento ou usuário corresponde aos filtros.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerenciadorUsuarios;
