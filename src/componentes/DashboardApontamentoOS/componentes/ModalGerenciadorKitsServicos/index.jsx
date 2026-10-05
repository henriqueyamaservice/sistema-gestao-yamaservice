import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Search, Wrench, Truck, Car, Droplet, Plus, Trash2, Edit,
  Copy, Save, Layers, Clock, Users, Package, AlertCircle, CheckCircle,
  Sparkles, Check, Tag, Settings, ShieldCheck, FileText, Bus, ChevronDown
} from 'lucide-react';
import styles from './ModalGerenciadorKitsServicos.module.css';

const CATEGORIAS = [
  { id: 'TODOS', label: 'Todos os Kits', icone: Layers },
  { id: 'CAMINHAO', label: 'Caminhões & Ônibus', icone: Truck },
  { id: 'CARRO', label: 'Carros Leves', icone: Car },
  { id: 'MAQUINA', label: 'Máquinas & Tratores', icone: Wrench }
];

const estadoInicialForm = {
  id: '',
  nome: '',
  areaManutencao: 'MECANICA',
  categoria: 'CAMINHAO',
  aplicabilidade: {
    tipoAlvo: 'MODELO', // 'TODOS' | 'MODELO' | 'PLACA'
    modelo: '',
    placa: ''
  },
  quantidadeMembros: 2,
  precisaMecanico: false,
  precisaBorracheiro: false,
  descricaoPadrao: '',
  trocouOleo: false,
  fezRevisao: false,
  pecas: [
    { codigo: '', descricao: '', quantidade: 1, unidade: 'UN', tipo: 'ESTOQUE', valor_unitario: 0 }
  ]
};

const ModalGerenciadorKitsServicos = ({
  kits = [],
  onSalvarKit,
  onExcluirKit,
  onClose,
  produtosEstoque = [],
  veiculosConfig = []
}) => {
  const [categoriaAtiva, setCategoriaAtiva] = useState('TODOS');
  const [busca, setBusca] = useState('');
  const [editandoKit, setEditandoKit] = useState(null); // null quando em modo lista, objeto quando criando/editando
  const [salvando, setSalvando] = useState(false);
  const [expandedKits, setExpandedKits] = useState({});

  const toggleKitExpand = (kitId) => {
    setExpandedKits(prev => ({
      ...prev,
      [kitId]: !prev[kitId]
    }));
  };
  const [activePecaSearch, setActivePecaSearch] = useState({ pecaIdx: null, query: '' });

  // Fechar dropdown de busca de peças ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activePecaSearch.pecaIdx !== null && !e.target.closest(`.${styles.buscaPecaWrapper}`)) {
        setActivePecaSearch({ pecaIdx: null, query: '' });
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activePecaSearch.pecaIdx]);

  // Lista de produtos filtrados dinamicamente do estoque Omie
  const produtosFiltrados = useMemo(() => {
    if (activePecaSearch.pecaIdx === null) return [];
    const q = (activePecaSearch.query || '').trim().toLowerCase();
    if (!q) return (produtosEstoque || []).slice(0, 25);

    const termos = q.split(/\s+/).filter(Boolean);
    return (produtosEstoque || []).filter(p => {
      const desc = (p.descricao || '').toLowerCase();
      const cod = (p.codigo || '').toLowerCase();
      return termos.every(t => desc.includes(t) || cod.includes(t));
    }).slice(0, 30);
  }, [produtosEstoque, activePecaSearch.pecaIdx, activePecaSearch.query]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editandoKit) {
          if (window.confirm('Deseja descartar as alterações do kit?')) {
            setEditandoKit(null);
          }
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editandoKit, onClose]);

  // Lista única de modelos existentes na frota para sugestão
  const modelosExistentes = useMemo(() => {
    const set = new Set();
    (veiculosConfig || []).forEach(v => {
      if (v.modelo && v.modelo.trim()) set.add(v.modelo.trim().toUpperCase());
      if (v.subtipoMaquina && v.subtipoMaquina.trim()) set.add(v.subtipoMaquina.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [veiculosConfig]);

  // Filtragem dos kits
  const kitsFiltrados = useMemo(() => {
    return (kits || []).filter(k => {
      if (categoriaAtiva !== 'TODOS' && k.categoria !== categoriaAtiva) {
        return false;
      }
      if (busca && busca.trim()) {
        const termo = busca.trim().toLowerCase();
        const nome = (k.nome || '').toLowerCase();
        const modelo = (k.aplicabilidade?.modelo || '').toLowerCase();
        const placa = (k.aplicabilidade?.placa || '').toLowerCase();
        const desc = (k.descricaoPadrao || '').toLowerCase();
        const temPeca = (k.pecas || []).some(p => (p.descricao || '').toLowerCase().includes(termo) || (p.codigo || '').toLowerCase().includes(termo));
        return nome.includes(termo) || modelo.includes(termo) || placa.includes(termo) || desc.includes(termo) || temPeca;
      }
      return true;
    });
  }, [kits, categoriaAtiva, busca]);

  // Agrupamento Visual dos Kits
  const gruposKits = useMemo(() => {
    const mapa = new Map();

    kitsFiltrados.forEach(k => {
      let chave = '';
      let titulo = '';
      let subtitulo = '';
      let foto = null;
      let tipoGrupo = k.aplicabilidade?.tipoAlvo || 'TODOS';

      if (tipoGrupo === 'PLACA' && k.aplicabilidade?.placa) {
        chave = `PLACA_${k.aplicabilidade.placa}`;
        const veiculo = (veiculosConfig || []).find(v => (v.placa || '').toUpperCase() === k.aplicabilidade.placa.toUpperCase());
        if (veiculo) {
          titulo = veiculo.modelo || veiculo.subtipoMaquina || veiculo.marca || k.aplicabilidade.placa;
          subtitulo = `Placa / Prefixo: ${k.aplicabilidade.placa}`;
          foto = veiculo.foto || null;
        } else {
          titulo = `Identificação ${k.aplicabilidade.placa}`;
          subtitulo = `Placa / Prefixo não encontrado na frota`;
        }
      } else if (tipoGrupo === 'MODELO' && k.aplicabilidade?.modelo) {
        chave = `MODELO_${k.aplicabilidade.modelo}`;
        titulo = `Modelo: ${k.aplicabilidade.modelo}`;
        subtitulo = 'Kits aplicáveis a este modelo';
      } else {
        chave = `UNIVERSAL`;
        titulo = 'Serviços Universais / Gerais';
        subtitulo = 'Aplicável a qualquer veículo / máquina';
      }

      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          titulo,
          subtitulo,
          foto,
          tipoGrupo,
          kits: []
        });
      }
      mapa.get(chave).kits.push(k);
    });

    return Array.from(mapa.values()).sort((a, b) => {
      if (a.chave === 'UNIVERSAL') return 1;
      if (b.chave === 'UNIVERSAL') return -1;
      if (a.tipoGrupo === 'PLACA' && b.tipoGrupo !== 'PLACA') return -1;
      if (a.tipoGrupo !== 'PLACA' && b.tipoGrupo === 'PLACA') return 1;
      return a.titulo.localeCompare(b.titulo);
    });
  }, [kitsFiltrados, veiculosConfig]);

  const [gruposExpandidos, setGruposExpandidos] = useState({});

  const toggleGrupo = (chave) => {
    setGruposExpandidos(prev => ({
      ...prev,
      [chave]: prev[chave] === undefined ? false : !prev[chave] // Por padrão vamos considerar expandido, então se for undefined, colapsa
    }));
  };

  // Abrir criação de novo kit
  const handleNovoKit = () => {
    setEditandoKit({
      ...estadoInicialForm,
      categoria: categoriaAtiva !== 'TODOS' ? categoriaAtiva : 'CAMINHAO',
      pecas: [
        { codigo: '', descricao: '', quantidade: 1, unidade: 'UN', tipo: 'ESTOQUE', valor_unitario: 0 }
      ]
    });
  };

  // Abrir edição
  const handleEditarKit = (kit) => {
    setEditandoKit(JSON.parse(JSON.stringify(kit)));
  };

  // Duplicar kit (clonar para agilizar)
  const handleDuplicarKit = (kit) => {
    const clone = JSON.parse(JSON.stringify(kit));
    clone.id = '';
    clone.nome = `${kit.nome} (Cópia)`;
    setEditandoKit(clone);
  };

  // Manipulação de Peças no Formulário
  const handleAddPecaRow = () => {
    setEditandoKit(prev => {
      const novasPecas = [
        ...(prev.pecas || []),
        { codigo: '', descricao: '', quantidade: 1, unidade: 'UN', tipo: 'ESTOQUE', valor_unitario: 0 }
      ];
      return { ...prev, pecas: novasPecas };
    });
  };

  const handleRemovePecaRow = (index) => {
    setEditandoKit(prev => ({
      ...prev,
      pecas: (prev.pecas || []).filter((_, i) => i !== index)
    }));
    if (activePecaSearch.pecaIdx === index) {
      setActivePecaSearch({ pecaIdx: null, query: '' });
    }
  };

  const handlePecaChange = (index, campo, valor) => {
    setEditandoKit(prev => {
      const copy = [...(prev.pecas || [])];
      copy[index] = { ...copy[index], [campo]: valor };

      // Se digitou código diretamente e houver correspondência exata no estoque
      if (campo === 'codigo' && valor) {
        const prod = (produtosEstoque || []).find(p =>
          p.codigo && p.codigo.trim().toUpperCase() === valor.trim().toUpperCase()
        );
        if (prod) {
          const desc = prod.descricao || copy[index].descricao;
          const isOleo = /óleo|oleo|lubrificante/i.test(desc);
          copy[index].codigo = prod.codigo;
          copy[index].descricao = desc;
          copy[index].unidade = prod.unidade || (isOleo ? 'L' : 'UN');
          copy[index].valor_unitario = Number(prod.valor_unitario || prod.preco_venda || prod.preco_unitario || 0);
        }
      }

      return { ...prev, pecas: copy };
    });
  };

  const handleSelectProduto = (pecaIdx, prod) => {
    setEditandoKit(prev => {
      const copy = [...(prev.pecas || [])];
      const desc = prod.descricao || '';
      const isOleo = /óleo|oleo|lubrificante/i.test(desc);
      const unidadeAuto = prod.unidade || (isOleo ? 'L' : 'UN');

      copy[pecaIdx] = {
        ...copy[pecaIdx],
        codigo: prod.codigo || '',
        descricao: desc,
        unidade: unidadeAuto,
        valor_unitario: Number(prod.valor_unitario || prod.preco_venda || prod.preco_unitario || prod.preco || 0),
        tipo: 'ESTOQUE'
      };

      // Se for óleo e o kit não estiver marcado com trocouOleo, sugere marcação
      const trocouOleo = isOleo ? true : prev.trocouOleo;

      return { ...prev, pecas: copy, trocouOleo };
    });
    setActivePecaSearch({ pecaIdx: null, query: '' });
  };

  // Salvar Kit
  const handleSubmitKit = async (e) => {
    e.preventDefault();
    if (!editandoKit.nome || !editandoKit.nome.trim()) {
      return alert('Por favor, informe o Nome do Serviço / Kit.');
    }

    // Filtrar peças vazias
    const pecasValidas = (editandoKit.pecas || []).filter(p => p.descricao && p.descricao.trim());

    const kitFinal = {
      ...editandoKit,
      nome: editandoKit.nome.trim().toUpperCase(),
      tempoEstimadoHoras: parseFloat(editandoKit.tempoEstimadoHoras) || 1.0,
      quantidadeMembros: parseInt(editandoKit.quantidadeMembros, 10) || 1,
      pecas: pecasValidas
    };

    setSalvando(true);
    try {
      if (onSalvarKit) {
        await onSalvarKit(kitFinal);
      }
      setEditandoKit(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar kit de serviço: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>

        {/* Cabeçalho do Modal */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconBubble}>
              <Wrench size={22} />
            </div>
            <div className={styles.titleArea}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className={styles.modalTitle}>Catálogo de Kits de Serviços da Oficina</h3>
                <span style={{
                  backgroundColor: 'rgba(255, 107, 0, 0.15)',
                  color: 'var(--cor-destaque)',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {kits.length} Cadastrados
                </span>
              </div>
              <p className={styles.modalSubtitle}>
                Padronize meterial, mão de obra e tempo para preenchimento rápido
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.btnClose}
            onClick={onClose}
            title="Fechar (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar de Filtros, Busca e Botão Novo */}
        {!editandoKit && (
          <div className={styles.toolbar}>
            <div className={styles.tabsGroup}>
              {CATEGORIAS.map(cat => {
                const Icone = cat.icone;
                const isActive = categoriaAtiva === cat.id;
                const count = cat.id === 'TODOS'
                  ? kits.length
                  : kits.filter(k => k.categoria === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`${styles.tabBtn} ${isActive ? styles.active : ''}`}
                    onClick={() => setCategoriaAtiva(cat.id)}
                  >
                    <Icone size={14} />
                    <span>{cat.label}</span>
                    <span style={{
                      fontSize: '0.68rem',
                      opacity: 0.8,
                      backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : 'var(--cor-fundo-sutil-forte)',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.toolbarRight}>
              <div className={styles.searchBox}>
                <Search size={15} color="var(--cor-texto-secundario)" />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Buscar kit, modelo, peça..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-secundario)', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className={styles.btnNovoKit}
                onClick={handleNovoKit}
              >
                <Plus size={16} />
                <span>Novo Kit de Serviço</span>
              </button>
            </div>
          </div>
        )}

        {/* Corpo do Modal: Lista ou Formulário */}
        <div className={styles.modalBody}>
          {editandoKit ? (
            /* ========================================================= */
            /* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO DE KIT                     */
            /* ========================================================= */
            <form onSubmit={handleSubmitKit} className={styles.formContainer}>
              <div className={styles.formHeader}>
                <h4 className={styles.formTitle}>
                  <Sparkles size={18} color="var(--cor-destaque)" />
                  <span>{editandoKit.id ? 'Editar Kit de Serviço' : 'Cadastrar Novo Kit de Serviço'}</span>
                </h4>
                <button
                  type="button"
                  className={styles.btnCancelar}
                  onClick={() => setEditandoKit(null)}
                >
                  <X size={16} /> Voltar à lista
                </button>
              </div>

              {/* Linha 1: Nome */}
              <div className={styles.formGroup} style={{ marginBottom: '15px' }}>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} color="var(--cor-destaque)" /> Nome do Serviço / Kit *
                </label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  placeholder="Ex: Troca de Óleo e Filtros - VW 24.280"
                  value={editandoKit.nome}
                  onChange={(e) => setEditandoKit(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
                  style={{ fontWeight: '800' }}
                />
              </div>

              {/* Linha 1.5: Área e Categoria */}
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={14} color="var(--cor-destaque)" /> Área de Manutenção *
                  </label>
                  <select
                    className={styles.select}
                    value={editandoKit.areaManutencao || 'MECANICA'}
                    onChange={(e) => setEditandoKit(prev => ({ ...prev, areaManutencao: e.target.value }))}
                  >
                    <option value="MECANICA">Oficina / Mecânica</option>
                    <option value="BORRACHARIA">Borracharia</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="var(--cor-destaque)" /> Categoria do Serviço *
                  </label>
                  <select
                    className={styles.select}
                    value={editandoKit.categoria}
                    onChange={(e) => setEditandoKit(prev => ({ ...prev, categoria: e.target.value }))}
                  >
                    <option value="CAMINHAO">Caminhões & Ônibus (Pesados)</option>
                    <option value="CARRO">Carros Leves / Vans</option>
                    <option value="MAQUINA">Máquinas / Tratores Agrícolas</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: Aplicabilidade ao Veículo */}
              <div className={styles.grid3}>
                <div className={styles.formGroup}>
                  <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={14} color="var(--cor-destaque)" /> Regra de Aplicação
                  </label>
                  <select
                    className={styles.select}
                    value={editandoKit.aplicabilidade?.tipoAlvo || 'TODOS'}
                    onChange={(e) => setEditandoKit(prev => ({
                      ...prev,
                      aplicabilidade: { ...prev.aplicabilidade, tipoAlvo: e.target.value }
                    }))}
                  >
                    <option value="TODOS">Todos os Veículos desta Categoria</option>
                    <option value="PLACA">Por Placa ou Prefixo (ex: TRA 0010)</option>
                  </select>
                </div>


                {editandoKit.aplicabilidade?.tipoAlvo === 'PLACA' && (
                  <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                    <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Car size={14} color="var(--cor-destaque)" /> Placa / Prefixo da Máquina
                    </label>
                    <input
                      type="text"
                      list="listaPlacasKits"
                      className={styles.input}
                      placeholder="Ex: ABC-1234 ou TRA 0010"
                      value={editandoKit.aplicabilidade?.placa || ''}
                      onChange={(e) => setEditandoKit(prev => ({
                        ...prev,
                        aplicabilidade: { ...prev.aplicabilidade, placa: e.target.value.toUpperCase() }
                      }))}
                    />
                    <datalist id="listaPlacasKits">
                      {(veiculosConfig || []).map((v, i) => (
                        <option key={i} value={v.placa}>{v.placa} — {v.modelo || v.marca}</option>
                      ))}
                    </datalist>
                  </div>
                )}
              </div>

              {/* Linha 3: Horas, Membros e Flags Preventivas */}
              <div className={styles.grid3}>
                {/* Removido o campo Tempo Estimado conforme solicitado */}

                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="var(--cor-destaque)" /> Equipe / Especialidade
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      className={styles.input}
                      style={{ width: '60px', textAlign: 'center' }}
                      value={editandoKit.quantidadeMembros || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditandoKit(prev => {
                          const q = parseInt(val) || 1;
                          let newMec = prev.precisaMecanico;
                          let newBorr = prev.precisaBorracheiro;
                          if (q === 1 && newMec && newBorr) newBorr = false;
                          return { ...prev, quantidadeMembros: val, precisaMecanico: newMec, precisaBorracheiro: newBorr };
                        });
                      }}
                      title="Quantidade de Profissionais"
                    />

                    <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                      <div
                        onClick={() => {
                          setEditandoKit(prev => {
                            const q = parseInt(prev.quantidadeMembros) || 1;
                            let newMec = !prev.precisaMecanico;
                            let newBorr = prev.precisaBorracheiro;
                            if (q === 1 && newMec) newBorr = false;
                            return { ...prev, precisaMecanico: newMec, precisaBorracheiro: newBorr };
                          });
                        }}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '6px',
                          border: `1.5px solid ${editandoKit.precisaMecanico ? 'var(--cor-destaque)' : 'var(--cor-borda-cartao)'}`,
                          backgroundColor: editandoKit.precisaMecanico ? 'rgba(255, 107, 0, 0.1)' : 'var(--cor-fundo-cartao)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          fontSize: '0.78rem', fontWeight: '800',
                          color: editandoKit.precisaMecanico ? 'var(--cor-destaque)' : 'var(--cor-texto-secundario)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <CheckCircle size={14} /> Mecânico
                      </div>

                      <div
                        onClick={() => {
                          setEditandoKit(prev => {
                            const q = parseInt(prev.quantidadeMembros) || 1;
                            let newMec = prev.precisaMecanico;
                            let newBorr = !prev.precisaBorracheiro;
                            if (q === 1 && newBorr) newMec = false;
                            return { ...prev, precisaMecanico: newMec, precisaBorracheiro: newBorr };
                          });
                        }}
                        style={{
                          flex: 1, padding: '8px', borderRadius: '6px',
                          border: `1.5px solid ${editandoKit.precisaBorracheiro ? 'var(--cor-destaque)' : 'var(--cor-borda-cartao)'}`,
                          backgroundColor: editandoKit.precisaBorracheiro ? 'rgba(255, 107, 0, 0.1)' : 'var(--cor-fundo-cartao)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          fontSize: '0.78rem', fontWeight: '800',
                          color: editandoKit.precisaBorracheiro ? 'var(--cor-destaque)' : 'var(--cor-texto-secundario)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <CheckCircle size={14} /> Borracheiro
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup} style={{ justifyContent: 'flex-start', gap: '8px' }}>
                  <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="var(--cor-destaque)" /> Flags Preventivas na O.S.
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      onClick={() => setEditandoKit(prev => ({ ...prev, trocouOleo: !prev.trocouOleo }))}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: `1.5px solid ${editandoKit.trocouOleo ? 'var(--cor-destaque)' : 'var(--cor-borda-cartao)'}`,
                        backgroundColor: editandoKit.trocouOleo ? 'rgba(255, 107, 0, 0.1)' : 'var(--cor-fundo-cartao)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: editandoKit.trocouOleo ? 'var(--cor-destaque)' : 'var(--cor-texto-secundario)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Droplet size={14} /> Troca de Óleo
                    </div>

                    <div
                      onClick={() => setEditandoKit(prev => ({ ...prev, fezRevisao: !prev.fezRevisao }))}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: `1.5px solid ${editandoKit.fezRevisao ? '#10b981' : 'var(--cor-borda-cartao)'}`,
                        backgroundColor: editandoKit.fezRevisao ? 'rgba(16, 185, 129, 0.1)' : 'var(--cor-fundo-cartao)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: editandoKit.fezRevisao ? '#10b981' : 'var(--cor-texto-secundario)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <CheckCircle size={14} /> Revisão Geral
                    </div>
                  </div>
                </div>
              </div>

              {/* Descrição Padrão */}
              <div className={styles.formGroup}>
                <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} color="var(--cor-destaque)" /> Descrição Padrão das Atividades Executadas
                </label>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  placeholder="Ex: Troca de óleo lubrificante do motor, substituição do filtro de óleo e combustível, conferência de níveis e reapertos."
                  value={editandoKit.descricaoPadrao || ''}
                  onChange={(e) => setEditandoKit(prev => ({ ...prev, descricaoPadrao: e.target.value.toUpperCase() }))}
                />
              </div>

              {/* Tabela de Insumos e Peças Padrão do Kit */}
              <div className={styles.formGroup} style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--cor-fundo-cartao)', padding: '10px 14px', borderRadius: '8px 8px 0 0', border: '1px solid var(--cor-borda-cartao)', borderBottom: 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <Package size={15} color="var(--cor-destaque)" /> Peças e Insumos Pré-Configurados (Kit)
                    </label>
                    <span style={{ fontSize: '0.73rem', color: 'var(--cor-texto-secundario)' }}>
                      O mecânico poderá alterar quantidades durante o apontamento
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.73rem', color: 'var(--cor-texto-secundario)', display: 'block' }}>Custo Previsto (Peças)</span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--cor-texto-principal)' }}>
                      R$ {((editandoKit.pecas || []).reduce((acc, p) => acc + ((parseFloat(p.quantidade) || 0) * (parseFloat(p.valor_unitario) || 0)), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                <table className={styles.tablePecasForm} style={{ border: '1px solid var(--cor-borda-cartao)', borderRadius: '0 0 8px 8px' }}>
                  <thead style={{ backgroundColor: 'var(--cor-fundo-secundario)' }}>
                    <tr>
                      <th style={{ width: '63%', padding: '12px 10px' }}>Código / Descrição do Produto / Insumo *</th>
                      <th style={{ width: '15%', padding: '12px 10px' }}>Qtd Padrão</th>
                      <th style={{ width: '14%', padding: '12px 10px' }}>Unidade</th>
                      <th style={{ width: '8%', textAlign: 'center', padding: '12px 10px' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editandoKit.pecas || []).map((peca, pIdx) => {
                      const isLinhaAtiva = activePecaSearch.pecaIdx === pIdx;
                      return (
                        <tr key={pIdx} style={{ backgroundColor: 'var(--cor-fundo-cartao)' }}>
                          <td style={isLinhaAtiva ? { position: 'relative', zIndex: 1000, padding: '8px 10px' } : { position: 'relative', padding: '8px 10px' }}>
                            <div className={styles.buscaPecaWrapper}>
                              <input
                                type="text"
                                required
                                className={styles.input}
                                placeholder="Digite para buscar material do estoque..."
                                value={isLinhaAtiva ? activePecaSearch.query : (peca.codigo ? `[${peca.codigo}] ${peca.descricao}` : (peca.descricao || ''))}
                                onFocus={() => setActivePecaSearch({ pecaIdx: pIdx, query: peca.codigo ? `[${peca.codigo}] ${peca.descricao}` : (peca.descricao || '') })}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setActivePecaSearch({ pecaIdx: pIdx, query: val });
                                  handlePecaChange(pIdx, 'descricao', val);
                                }}
                                autoComplete="off"
                                style={{ padding: '8px 10px', fontSize: '0.8rem', fontWeight: '700', width: '100%' }}
                              />
                              {isLinhaAtiva && produtosFiltrados.length > 0 && (
                                <ul className={styles.dropdownPecasLista}>
                                  {produtosFiltrados.map((prod, fIdx) => (
                                    <li
                                      key={prod.codigo ? `${prod.codigo}-${fIdx}` : fIdx}
                                      className={styles.itemPecaOpcao}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectProduto(pIdx, prod);
                                      }}
                                    >
                                      <div className={styles.pecaInfoText}>
                                        <span className={styles.pecaDescricaoText}>{prod.descricao}</span>
                                        <span className={styles.pecaCodigoText}>
                                          {prod.codigo ? `[${prod.codigo}] ` : ''}
                                          {prod.unidade ? `• Unidade: ${prod.unidade} ` : ''}
                                          {prod.localizacao ? `• Local: ${prod.localizacao}` : ''}
                                        </span>
                                      </div>
                                      {(prod.saldoEstoque !== undefined || prod.saldo !== undefined || prod.estoque !== undefined) && (
                                        <span className={styles.pecaSaldoBadge}>
                                          Saldo: {prod.saldoEstoque ?? prod.saldo ?? prod.estoque ?? 0} {prod.unidade || ''}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              className={styles.input}
                              value={peca.quantidade === '' ? '' : peca.quantidade}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                handlePecaChange(pIdx, 'quantidade', val);
                              }}
                              style={{ padding: '8px 10px', fontSize: '0.8rem', width: '100%', fontWeight: '800' }}
                            />
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <select
                              className={styles.select}
                              value={peca.unidade || 'UN'}
                              onChange={(e) => handlePecaChange(pIdx, 'unidade', e.target.value)}
                              style={{ padding: '8px 10px', fontSize: '0.8rem', width: '100%' }}
                            >
                              <option value="L">L (Litros)</option>
                              <option value="UN">UN (Unidade)</option>
                              <option value="KG">KG (Quilos)</option>
                              <option value="M">M (Metros)</option>
                              <option value="CX">CX (Caixa)</option>
                              <option value="PAR">PAR (Par)</option>
                              <option value="JG">JG (Jogo)</option>
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={styles.btnActionKit}
                              onClick={() => handleRemovePecaRow(pIdx)}
                              title="Remover peça do kit"
                              style={{ padding: '4px 6px', color: '#ef4444' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ marginBottom: activePecaSearch.pecaIdx !== null ? '180px' : '0px', transition: 'margin-bottom 0.2s ease', marginTop: '8px' }}>
                  <button
                    type="button"
                    className={styles.btnAddPecaRow}
                    onClick={handleAddPecaRow}
                  >
                    <Plus size={15} /> Adicionar Insumo ao Kit
                  </button>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnCancelar}
                  onClick={() => setEditandoKit(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className={styles.btnSalvar}
                >
                  <Save size={16} />
                  <span>{salvando ? 'Salvando Kit...' : 'Salvar Kit de Serviço'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================= */
            /* LISTA DE CARDS DE KITS CADASTRADOS                        */
            /* ========================================================= */
            kitsFiltrados.length === 0 ? (
              <div className={styles.emptyState}>
                <Package size={40} color="var(--cor-texto-secundario)" />
                <h4 style={{ margin: 0, color: 'var(--cor-texto-principal)' }}>
                  {busca ? 'Nenhum kit encontrado para essa busca.' : 'Nenhum kit cadastrado nesta categoria.'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>
                  Clique em "+ Novo Kit de Serviço" para cadastrar um modelo padronizado.
                </p>
                <button
                  type="button"
                  className={styles.btnNovoKit}
                  onClick={handleNovoKit}
                  style={{ marginTop: '8px' }}
                >
                  <Plus size={15} /> Cadastrar Primeiro Kit
                </button>
              </div>
            ) : (
              <div className={styles.kitsGrid} style={{ display: 'flex', flexDirection: 'column' }}>
                {gruposKits.map((grupo) => {
                  const expandido = gruposExpandidos[grupo.chave];

                  return (
                    <div key={grupo.chave} className={styles.vehicleGroup}>
                      <div className={styles.vehicleGroupHeader} onClick={() => toggleGrupo(grupo.chave)}>
                        <div className={styles.vehicleInfo}>
                          {grupo.foto ? (
                            <img src={grupo.foto} alt={grupo.titulo} className={styles.vehiclePhoto} />
                          ) : (
                            <div className={styles.vehicleIconPlaceholder}>
                              {grupo.tipoGrupo === 'PLACA' ? <Truck size={24} /> : (grupo.tipoGrupo === 'MODELO' ? <Car size={24} /> : <Wrench size={24} />)}
                            </div>
                          )}
                          <div className={styles.vehicleTexts}>
                            <h4 className={styles.vehicleTitle}>{grupo.titulo}</h4>
                            <p className={styles.vehicleSubtitle}>{grupo.subtitulo}</p>
                          </div>
                        </div>
                        <div className={styles.vehicleInfo}>
                          <span className={styles.badgeCount}>{grupo.kits.length} {grupo.kits.length === 1 ? 'Serviço' : 'Serviços'}</span>
                          <div style={{ transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex' }}>
                            <ChevronDown size={18} color="var(--cor-texto-secundario)" />
                          </div>
                        </div>
                      </div>

                      {expandido && (
                        <div className={styles.vehicleGroupBody}>
                          <div className={styles.kitsGrid}>
                            {grupo.kits.map(k => {
                              const cat = CATEGORIAS.find(c => c.id === k.categoria) || CATEGORIAS[0];
                              const IconeCat = cat.icone;

                              return (
                                <div key={k.id} className={styles.kitCard}>
                                  <div className={styles.kitCardHeader} onClick={() => toggleKitExpand(k.id)} style={{ cursor: 'pointer', alignItems: 'center' }}>
                                    <div className={styles.kitTitleGroup}>
                                      <h4 className={styles.kitNome} style={{ margin: 0 }}>
                                        {k.nome}
                                      </h4>
                                      <div className={styles.kitBadgesRow}>
                                        <span className={`${styles.badgeCategoria} ${styles[k.categoria?.toLowerCase()] || ''}`}>
                                          <IconeCat size={11} />
                                          <span>{cat.label}</span>
                                        </span>

                                        {k.trocouOleo && (
                                          <span className={styles.badgePreventiva}>
                                            <Droplet size={10} /> Troca de Óleo
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ícone de Expandir isolado à direita */}
                                    <div style={{ 
                                      transform: expandedKits[k.id] ? 'rotate(180deg)' : 'none', 
                                      transition: 'transform 0.2s ease', 
                                      display: 'flex', 
                                      color: expandedKits[k.id] ? 'var(--cor-destaque)' : 'var(--cor-texto-secundario)',
                                      backgroundColor: expandedKits[k.id] ? 'rgba(255, 107, 0, 0.1)' : 'var(--cor-fundo-sutil)',
                                      padding: '6px',
                                      borderRadius: '50%'
                                    }}>
                                      <ChevronDown size={18} />
                                    </div>
                                  </div>

                                  {/* Exibir Detalhes Apenas se Expandido */}
                                  {expandedKits[k.id] && (
                                    <>
                                      {/* Especificações de Tempo e Equipe */}
                                      <div className={styles.kitSpecs} style={{ marginTop: '12px' }}>
                                        {/* Campo Tempo removido */}
                                        <div className={styles.specItem}>
                                          <Users size={13} color="var(--cor-destaque)" />
                                          <span>
                                            Equipe: <strong>{k.quantidadeMembros} {k.quantidadeMembros == 1 ? 'colab.' : 'colabs.'}</strong>
                                            {k.precisaMecanico && k.precisaBorracheiro ? ' (Mec. + Borr.)' : (k.precisaMecanico ? ' (Mecânico)' : (k.precisaBorracheiro ? ' (Borracheiro)' : ''))}
                                          </span>
                                        </div>
                                        <div className={styles.specItem} style={{ marginLeft: 'auto' }}>
                                          <Package size={13} color="var(--cor-destaque)" />
                                          <span>Insumos: <strong>{(k.pecas || []).length}</strong></span>
                                        </div>
                                      </div>

                                      {/* Descrição resumida */}
                                      {k.descricaoPadrao && (
                                        <p className={styles.kitDescricaoText} title={k.descricaoPadrao}>
                                          {k.descricaoPadrao}
                                        </p>
                                      )}

                                      {/* Lista de Insumos / Peças Pré-configuradas */}
                                      <div className={styles.pecasBox}>
                                        <div className={styles.pecasBoxHeader}>
                                          <span>Insumos Pré-Configurados ({(k.pecas || []).length})</span>
                                        </div>
                                        <div className={styles.pecasPillList}>
                                          {(k.pecas || []).length === 0 ? (
                                            <span style={{ fontSize: '0.72rem', color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>
                                              Apenas mão de obra (sem peças vinculadas)
                                            </span>
                                          ) : (
                                            (k.pecas || []).slice(0, 4).map((p, pIdx) => (
                                              <div key={pIdx} className={styles.pecaPill}>
                                                <span style={{ fontWeight: '600', color: 'var(--cor-texto-principal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                  {p.descricao}
                                                </span>
                                                <span className={styles.pecaQtdBadge}>
                                                  {p.quantidade} {p.unidade || 'UN'}
                                                </span>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                      {/* Botões de Ação do Card (Movidos para dentro do expandir) */}
                                      <div className={styles.kitCardActions} style={{ marginTop: '12px', borderTop: '1px dashed var(--cor-borda-cartao)', paddingTop: '12px' }}>
                                        <button
                                          type="button"
                                          className={styles.btnActionKit}
                                          onClick={() => handleDuplicarKit(k)}
                                          title="Duplicar este kit para criar uma variação"
                                        >
                                          <Copy size={13} /> Duplicar
                                        </button>

                                        <button
                                          type="button"
                                          className={styles.btnActionKit}
                                          onClick={() => handleEditarKit(k)}
                                          title="Editar detalhes do kit"
                                        >
                                          <Edit size={13} /> Editar
                                        </button>

                                        <button
                                          type="button"
                                          className={`${styles.btnActionKit} ${styles.delete}`}
                                          onClick={() => {
                                            if (window.confirm(`Tem certeza que deseja excluir o kit "${k.nome}"?`)) {
                                              if (onExcluirKit) onExcluirKit(k.id);
                                            }
                                          }}
                                          title="Excluir kit"
                                        >
                                          <Trash2 size={13} /> Excluir
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className={styles.modalFooter}>
          <span>Exibindo {kitsFiltrados.length} kits de serviço cadastrados</span>
          <button
            type="button"
            className={styles.btnCancelar}
            onClick={onClose}
          >
            Fechar Catálogo
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalGerenciadorKitsServicos;
