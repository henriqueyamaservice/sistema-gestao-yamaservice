import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, CheckCircle2, Send, RotateCcw } from 'lucide-react';
import styles from './RequisicaoMobile.module.css';

const RequisicaoMobile = ({ produtos = [] }) => {
  const [departamentos, setDepartamentos] = useState([]);
  const [locaisEstoque, setLocaisEstoque] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  const [formulario, setFormulario] = useState({
    localEstoque: 'PADRAO - Local de Estoque Padrão',
    centroCusto: 'GRANJA',
    numeroOS: '',
    contatoCliente: '',
    prioridade: 'normal'
  });

  const [termoBusca, setTermoBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeItem, setQuantidadeItem] = useState(1);
  const [itensCarrinho, setItensCarrinho] = useState([]);

  const [loading, setLoading] = useState(false);
  const [sucessoReqId, setSucessoReqId] = useState(null);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const [resDep, resLocais, resProj, resCli] = await Promise.all([
          fetch('http://localhost:3000/api/departamentos'),
          fetch('http://localhost:3000/api/locais-estoque'),
          fetch('http://localhost:3000/api/projetos'),
          fetch('http://localhost:3000/api/fornecedores')
        ]);
        if(resDep.ok) setDepartamentos(await resDep.json());
        if(resLocais.ok) setLocaisEstoque(await resLocais.json());
        if(resProj.ok) setProjetos(await resProj.json());
        if(resCli.ok) setClientes(await resCli.json());
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };
    fetchDados();
  }, []);

  const handleChangeForm = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value }));
  };

  const produtosFiltrados = termoBusca.length >= 2
    ? produtos.filter(p =>
      (p.descricao || '').toLowerCase().includes(termoBusca.toLowerCase()) ||
      (p.codigo || '').toLowerCase().includes(termoBusca.toLowerCase())
    ).slice(0, 5)
    : [];

  const handleSelecionarProduto = (prod) => {
    setProdutoSelecionado(prod);
    setTermoBusca('');
    setQuantidadeItem(1);
  };

  const handleAdicionarLista = () => {
    if (!produtoSelecionado || quantidadeItem <= 0) return;

    const itemExistente = itensCarrinho.find(i => i.codigo === produtoSelecionado.codigo);
    if (itemExistente) {
      setItensCarrinho(itensCarrinho.map(i =>
        i.codigo === produtoSelecionado.codigo
          ? { ...i, quantidade: Number(i.quantidade) + Number(quantidadeItem) }
          : i
      ));
    } else {
      setItensCarrinho([...itensCarrinho, {
        codigo: produtoSelecionado.codigo,
        descricao: produtoSelecionado.descricao,
        quantidade: Number(quantidadeItem)
      }]);
    }
    setProdutoSelecionado(null);
    setQuantidadeItem(1);
  };

  const handleRemoverItem = (codigo) => {
    setItensCarrinho(itensCarrinho.filter(i => i.codigo !== codigo));
  };

  const handleConcluir = async () => {
    if (!formulario.localEstoque || !formulario.centroCusto || !formulario.contatoCliente) {
      alert('Preencha o Local de Estoque, Centro de Custo e o Seu Nome!');
      return;
    }

    setLoading(true);
    
    // Simula a adição do nome do funcionário autenticado
    const payload = {
      cfop: '5.949',
      icms: '40',
      origem: 'app_funcionario',
      tipo: 'saida',
      ...formulario,
      itens: itensCarrinho
    };

    try {
      const response = await fetch('http://localhost:3000/api/requisicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao enviar requisição');
      const data = await response.json();
      
      const osOuId = data.requisicao.numeroOS || data.requisicao.id.slice(-6);
      setSucessoReqId(osOuId);
      
      // Limpa para a próxima
      setItensCarrinho([]);
      setFormulario({ ...formulario, numeroOS: '' });
      
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (sucessoReqId) {
    return (
      <div className={styles.sucessoBox}>
        <CheckCircle2 size={64} color="#f97316" />
        <h3>Pedido Enviado para o Diretor!</h3>
        <p>Seu pedido está aguardando a aprovação da Diretoria. Guarde seu protocolo:</p>
        
        <div className={styles.numProtocolo}>
          #{sucessoReqId}
        </div>

        <button 
          className={styles.btnConcluir}
          onClick={() => setSucessoReqId(null)}
          style={{ background: '#3b82f6' }}
        >
          <RotateCcw size={20} />
          Fazer Novo Pedido
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.formBlock}>
        <div className={styles.formGroup}>
          <label>Local de Estoque</label>
          <select name="localEstoque" value={formulario.localEstoque} onChange={handleChangeForm}>
            {locaisEstoque.length > 0 ? (
              locaisEstoque.map(l => <option key={l.codigo} value={l.descricao}>{l.descricao}</option>)
            ) : (
              <option value="PADRAO - Local de Estoque Padrão">PADRAO - Local de Estoque Padrão</option>
            )}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Centro de Custo (Departamento)</label>
          <select name="centroCusto" value={formulario.centroCusto} onChange={handleChangeForm}>
            {departamentos.length > 0 ? (
              departamentos.map(d => <option key={d.codigo} value={d.descricao}>{d.descricao}</option>)
            ) : (
              <option value="GRANJA">GRANJA</option>
            )}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Nº O.S ou Projeto (Opcional)</label>
          <input 
            type="text" 
            name="numeroOS" 
            list="lista-projetos-mobile"
            placeholder="Digite ou selecione..."
            value={formulario.numeroOS} 
            onChange={handleChangeForm} 
          />
          <datalist id="lista-projetos-mobile">
            {projetos.map(p => <option key={p.codigo} value={p.nome} />)}
          </datalist>
        </div>

        <div className={styles.formGroup}>
          <label>Seu Nome (Solicitante)</label>
          <input 
            type="text" 
            name="contatoCliente"
            list="lista-funcionarios-mobile"
            placeholder="Digite ou selecione..."
            value={formulario.contatoCliente} 
            onChange={handleChangeForm} 
          />
          <datalist id="lista-funcionarios-mobile">
            {clientes.map(c => (
              <option key={c.codigo_cliente_omie || c.nome_fantasia} value={c.nome_fantasia || c.razao_social} />
            ))}
          </datalist>
        </div>

        <div className={styles.formGroup}>
          <label>Nível de Prioridade</label>
          <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: formulario.prioridade === 'normal' ? 'bold' : 'normal' }}>
              <input 
                type="radio" 
                name="prioridade" 
                value="normal" 
                checked={formulario.prioridade === 'normal'} 
                onChange={handleChangeForm} 
              />
              Normal
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--cor-erro)', fontWeight: formulario.prioridade === 'urgente' ? 'bold' : 'normal' }}>
              <input 
                type="radio" 
                name="prioridade" 
                value="urgente" 
                checked={formulario.prioridade === 'urgente'} 
                onChange={handleChangeForm} 
              />
              Urgência
            </label>
          </div>
        </div>
      </div>

      <div className={styles.divider}></div>

      <h3 className={styles.sectionTitle}>Adicionar Peças</h3>

      <div className={styles.formBlock}>
        {!produtoSelecionado ? (
          <div style={{ position: 'relative' }}>
            <div className={styles.buscaProd}>
              <div className={styles.buscaIcon}><Search size={20} /></div>
              <input
                type="text"
                placeholder="Nome ou código..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
              />
            </div>
            {produtosFiltrados.length > 0 && (
              <ul className={styles.listaBusca}>
                {produtosFiltrados.map(p => (
                  <li key={p.codigo} onClick={() => handleSelecionarProduto(p)}>
                    <strong>{p.codigo}</strong><br/>
                    <span style={{color: '#64748b'}}>{p.descricao}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className={styles.prodSelecionadoBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className={styles.prodInfoName}>{produtoSelecionado.descricao}</span>
              <button className={styles.btnTrocar} onClick={() => setProdutoSelecionado(null)}>Trocar</button>
            </div>
            <div className={styles.qtdRow}>
              <div className={styles.formGroup} style={{ flex: '0 0 100px' }}>
                <label>Qtd.</label>
                <input 
                  type="number" 
                  min="1" 
                  value={quantidadeItem} 
                  onChange={(e) => setQuantidadeItem(e.target.value)} 
                />
              </div>
              <button className={styles.btnAdicionar} onClick={handleAdicionarLista}>
                <Plus size={20} /> Adicionar
              </button>
            </div>
          </div>
        )}
      </div>

      {itensCarrinho.length > 0 && (
        <div className={styles.carrinhoArea}>
          <div className={styles.carrinhoHeader}>
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Meu Pedido</h3>
            <span style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
              {itensCarrinho.length} Itens
            </span>
          </div>

          {itensCarrinho.map(item => (
            <div key={item.codigo} className={styles.carrinhoItem}>
              <div className={styles.itemInfo}>
                <h4>{item.codigo}</h4>
                <p>{item.descricao.substring(0, 40)}{item.descricao.length > 40 ? '...' : ''}</p>
                <div style={{ marginTop: '8px', fontWeight: 'bold', color: '#0f172a' }}>
                  Qtd: {item.quantidade}
                </div>
              </div>
              <button className={styles.btnLixeira} onClick={() => handleRemoverItem(item.codigo)}>
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {itensCarrinho.length > 0 && (
        <div className={styles.fixedFooter}>
          <button 
            className={styles.btnConcluir} 
            onClick={handleConcluir}
            disabled={loading}
          >
            {loading ? 'Enviando...' : <><Send size={20} /> Enviar para Aprovação</>}
          </button>
        </div>
      )}

    </div>
  );
};

export default RequisicaoMobile;
