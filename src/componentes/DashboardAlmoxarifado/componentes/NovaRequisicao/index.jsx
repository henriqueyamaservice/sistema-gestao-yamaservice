import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Save, Printer, Search, Plus, Trash2, ShoppingCart } from 'lucide-react';
import styles from './NovaRequisicao.module.css';

const NovaRequisicao = ({ produtos, itensIniciais = [], tipoInicial = 'saida', onVoltar }) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeItem, setQuantidadeItem] = useState(1);
  const [itensCarrinho, setItensCarrinho] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [locaisEstoque, setLocaisEstoque] = useState([]);

  // Estados do Modal de Cadastro Rápido
  const [modalCadastro, setModalCadastro] = useState({ aberto: false, tipo: null, titulo: '', campoTarget: '' });
  const [novoValorModal, setNovoValorModal] = useState('');

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/fornecedores');
        if (res.ok) {
          const data = await res.json();
          setClientes(data);
        }
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
      }
    };
    fetchClientes();

    const fetchVendedores = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/vendedores');
        if (res.ok) {
          const data = await res.json();
          setVendedores(data);
        }
      } catch (err) {
        console.error('Erro ao buscar vendedores:', err);
      }
    };
    fetchVendedores();

    const fetchDepartamentos = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/departamentos');
        if (res.ok) setDepartamentos(await res.json());
      } catch (err) { console.error('Erro ao buscar departamentos:', err); }
    };
    fetchDepartamentos();

    const fetchProjetos = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/projetos');
        if (res.ok) setProjetos(await res.json());
      } catch (err) { console.error('Erro ao buscar projetos:', err); }
    };
    fetchProjetos();

    const fetchLocaisEstoque = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/locais-estoque');
        if (res.ok) setLocaisEstoque(await res.json());
      } catch (err) { console.error('Erro ao buscar locais de estoque:', err); }
    };
    fetchLocaisEstoque();

    if (itensIniciais && itensIniciais.length > 0) {
      const itensFormatados = itensIniciais.map(p => ({
        codigo: p.codigo,
        descricao: p.descricao,
        valor_unitario: p.valor_unitario,
        quantidade: Math.max(1, (p.estoque_minimo || 0) - (p.quantidade_estoque || 0))
      }));
      setItensCarrinho(itensFormatados);
    }
  }, [itensIniciais]);

  const [formulario, setFormulario] = useState({
    localEstoque: '01 - Almoxarifado',
    centroCusto: 'GRANJA',
    contatoCliente: '',
    vendedor: '',
    numeroOS: ''
  });

  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [reciboImpressao, setReciboImpressao] = useState(null);

  // Filtragem rápida de produtos
  const produtosFiltrados = termoBusca.length >= 2
    ? produtos.filter(p => {
        const termo = termoBusca.toLowerCase();
        const nome = (p.descricao || '').toLowerCase();
        const codigo = (p.codigo || '').toLowerCase();
        const ean = (p.ean || '').toLowerCase();
        const bateLote = p.lotes?.some(l => (l.ean || '').toLowerCase().includes(termo));
        return nome.includes(termo) || codigo.includes(termo) || ean.includes(termo) || bateLote;
      }).slice(0, 5)
    : [];

  const handleSelecionarProduto = (prod) => {
    if (prod.lotes && prod.lotes.length > 0) {
      const loteMaisAntigo = [...prod.lotes].sort((a, b) => new Date(a.validade) - new Date(b.validade))[0];
      // Ajuste de fuso horário para bater o dia exato
      const dataVal = new Date(loteMaisAntigo.validade);
      const utcDate = new Date(dataVal.getTime() + dataVal.getTimezoneOffset() * 60000);
      alert(`⚠️ ALERTA FEFO ⚠️\n\nEste produto possui múltiplos lotes. Para evitar perdas, pegue OBRIGATORIAMENTE os itens do LOTE:\n\n👉 LOTE: ${loteMaisAntigo.numero}\n⏳ VENCE EM: ${utcDate.toLocaleDateString('pt-BR')}`);
    }
    setProdutoSelecionado(prod);
    setTermoBusca('');
    setQuantidadeItem(1);
  };

  const handleChangeForm = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value.toUpperCase() }));
  };

  const handleAbrirModalCadastro = (tipo, titulo, campoTarget) => {
    setModalCadastro({ aberto: true, tipo, titulo, campoTarget });
    setNovoValorModal('');
  };

  const handleSalvarModalCadastro = () => {
    if (novoValorModal.trim()) {
      setFormulario(prev => ({ ...prev, [modalCadastro.campoTarget]: novoValorModal.trim() }));
    }
    setModalCadastro({ aberto: false, tipo: null, titulo: '', campoTarget: '' });
  };

  const handleAdicionarLista = () => {
    if (!produtoSelecionado || quantidadeItem <= 0) return;

    // Verifica se já existe o item, se sim, soma a qtd
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
        valor_unitario: produtoSelecionado.valor_unitario,
        quantidade: Number(quantidadeItem)
      }]);
    }

    // Limpa a seleção para bipar o próximo
    setProdutoSelecionado(null);
    setQuantidadeItem(1);
  };

  const handleRemoverItem = (codigo) => {
    setItensCarrinho(itensCarrinho.filter(i => i.codigo !== codigo));
  };

  const handleConcluir = async () => {
    if (itensCarrinho.length === 0) {
      alert('Adicione pelo menos um produto à lista antes de concluir.');
      return;
    }

    setLoading(true);
    setMensagem(null);

    const payload = {
      cfop: '5.949',
      icms: '40',
      origem: 'Padrao Empresa',
      tipo: tipoInicial,
      ...formulario,
      itens: itensCarrinho
    };

    try {
      const response = await fetch('http://localhost:3000/api/requisicao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao salvar no servidor local.');

      const data = await response.json();
      setMensagem({ tipo: 'sucesso', texto: data.message });

      const req = data.requisicao;
      const totalItens = req.itens?.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0) || 0;

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      printWindow.document.write(`
        <html>
          <head>
            <title>Comprovante - OS ${req.numeroOS || req.id.slice(-6)}</title>
            <style>
              body { margin: 0; padding: 0; background: white; color: black; font-family: 'Courier New', Courier, monospace; }
              .area-impressao { width: 80mm; margin: 0 auto; padding: 0; }
              .recibo-termico { width: 100%; font-size: 10px; padding: 3mm; box-sizing: border-box; }
              .recibo-titulo { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 4px; }
              .recibo-data { text-align: center; font-size: 9px; margin-bottom: 8px; }
              .recibo-divider { border-bottom: 1px dashed black; margin: 8px 0; }
              .recibo-info p { margin: 4px 0; }
              .recibo-itens { width: 100%; border-collapse: collapse; }
              .recibo-itens th, .recibo-itens td { padding: 4px 0; vertical-align: top; }
              .recibo-via { text-align: center; font-weight: bold; margin: 12px 0; }
              .recibo-assinatura { margin-top: 20px; text-align: center; }
              .linha-assinatura { border-bottom: 1px solid black; width: 80%; margin: 20px auto 5px auto; }
              .recibo-cortar { text-align: center; margin: 20px 0; font-size: 9px; }
              @media print {
                @page { margin: 0; }
                body { margin: 0; }
                .area-impressao { width: 80mm; margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="area-impressao">
              <div class="recibo-termico">
                <!-- VIA ALMOXARIFADO -->
                <h2 class="recibo-titulo">YAMASERVICE - ALMOXARIFADO</h2>
                <h2 class="recibo-titulo">COMPROVANTE DE ENTREGA</h2>
                <p class="recibo-data">${new Date(req.dataCriacao).toLocaleDateString('pt-BR')} ${new Date(req.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                <div class="recibo-divider"></div>
                
                <div class="recibo-info">
                  <p><strong>Depto:</strong> ${req.centroCusto || 'N/A'}</p>
                  <p><strong>O.S:</strong> ${req.numeroOS || 'N/A'}</p>
                  <p><strong>Cliente:</strong> ${req.contatoCliente || 'Não informado'}</p>
                  <p><strong>Vendedor:</strong> ${req.vendedor || 'Não informado'}</p>
                </div>
                <div class="recibo-divider"></div>
                
                <table class="recibo-itens">
                  <thead>
                    <tr>
                      <th style="text-align: left; width: 30px;">Qtd</th>
                      <th style="text-align: left;">Produto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${req.itens?.map(item => `
                      <tr>
                        <td style="padding-right: 4px;">${item.quantidade}</td>
                        <td><div style="font-weight:bold;">${item.codigo}</div><div style="font-size: 8px; line-height: 1.1;">${item.descricao}</div></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                <div class="recibo-divider"></div>
                <p style="text-align: right; margin: 4px 0;"><strong>Total de Itens: ${totalItens}</strong></p>
                
                <div class="recibo-divider"></div>
                <p class="recibo-via">VIA DO ALMOXARIFADO</p>
                <div class="recibo-assinatura">
                  <p>Assinatura do Recebedor:</p>
                  <div class="linha-assinatura"></div>
                  <p>${req.contatoCliente || 'Colaborador'}</p>
                </div>
                
                <div class="recibo-cortar">✂-------------------------------</div>
                
                <!-- VIA COLABORADOR -->
                <h2 class="recibo-titulo">YAMASERVICE - ALMOXARIFADO</h2>
                <h2 class="recibo-titulo">COMPROVANTE DE ENTREGA</h2>
                <p class="recibo-data">${new Date(req.dataCriacao).toLocaleDateString('pt-BR')} ${new Date(req.dataCriacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                <div class="recibo-divider"></div>
                
                <div class="recibo-info">
                  <p><strong>Depto:</strong> ${req.centroCusto || 'N/A'}</p>
                  <p><strong>O.S:</strong> ${req.numeroOS || 'N/A'}</p>
                  <p><strong>Cliente:</strong> ${req.contatoCliente || 'Não informado'}</p>
                  <p><strong>Vendedor:</strong> ${req.vendedor || 'Não informado'}</p>
                </div>
                <div class="recibo-divider"></div>

                <table class="recibo-itens">
                  <thead>
                    <tr>
                      <th style="text-align: left; width: 30px;">Qtd</th>
                      <th style="text-align: left;">Produto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${req.itens?.map(item => `
                      <tr>
                        <td style="padding-right: 4px;">${item.quantidade}</td>
                        <td><div style="font-weight:bold;">${item.codigo}</div><div style="font-size: 8px; line-height: 1.1;">${item.descricao}</div></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                <div class="recibo-divider"></div>
                <p style="text-align: right; margin: 4px 0;"><strong>Total de Itens: ${totalItens}</strong></p>

                <div class="recibo-divider"></div>
                <p class="recibo-via">VIA DO COLABORADOR</p>
                <br/><br/>
              </div>
            </div>
            <script>
              setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

      setItensCarrinho([]);
      setFormulario({ ...formulario, contatoCliente: '', vendedor: '', numeroOS: '' });

    } catch (error) {
      setMensagem({ tipo: 'erro', texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: 'var(--cor-destaque)', background: 'rgba(249, 115, 22, 0.1)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
            {tipoInicial === 'reposicao' ? <ShoppingCart size={24} /> : <ArrowUpRight size={24} />}
          </div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            {tipoInicial === 'reposicao' ? 'Nova Solicitação de Compras' : 'Nova Saída de Produtos'}
          </h2>
        </div>
      </div>

      {mensagem && (
        <div className={`${styles.alerta} ${styles[mensagem.tipo]}`}>
          {mensagem.texto}
        </div>
      )}

      <div className={styles.formGrid}>

        {/* Bloco Geral (Cabeçalho da Requisição) */}
        <div className={styles.cardSection}>
          <h3>1. Dados Gerais da {tipoInicial === 'reposicao' ? 'Solicitação' : 'Saída'}</h3>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Local de Estoque</label>
              <select name="localEstoque" value={formulario.localEstoque} onChange={handleChangeForm}>
                {locaisEstoque.length > 0 ? (
                  locaisEstoque.map(local => (
                    <option key={local.codigo} value={local.descricao}>{local.descricao}</option>
                  ))
                ) : (
                  <>
                    <option value="PADRAO - Local de Estoque Padrão">PADRAO - Local de Estoque Padrão</option>
                    <option value="01 - Almoxarifado">01 - Almoxarifado</option>
                  </>
                )}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Centro de Custo</label>
              <select name="centroCusto" value={formulario.centroCusto} onChange={handleChangeForm}>
                {departamentos.length > 0 ? (
                  departamentos.map(dep => (
                    <option key={dep.codigo} value={dep.descricao}>{dep.descricao}</option>
                  ))
                ) : (
                  <>
                    <option value="GRANJA">GRANJA</option>
                    <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                  </>
                )}
              </select>
            </div>
          </div>
          {tipoInicial !== 'reposicao' && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Cliente/Destinatário
                  <button type="button" onClick={() => handleAbrirModalCadastro('cliente', 'Cadastrar Novo Cliente', 'contatoCliente')} title="Novo Cliente" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-destaque)', padding: 0 }}>
                    <Plus size={16} />
                  </button>
                </label>
                <input
                  id="input-cliente"
                  type="text"
                  name="contatoCliente"
                  list="lista-clientes"
                  placeholder="Selecione ou digite um novo..."
                  value={formulario.contatoCliente}
                  onChange={handleChangeForm}
                />
                <datalist id="lista-clientes">
                  {clientes.map(c => (
                    <option key={c.codigo_cliente_omie} value={c.razao_social || c.nome_fantasia} />
                  ))}
                </datalist>
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Vendedor
                  <button type="button" onClick={() => handleAbrirModalCadastro('vendedor', 'Cadastrar Novo Vendedor', 'vendedor')} title="Novo Vendedor" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-destaque)', padding: 0 }}>
                    <Plus size={16} />
                  </button>
                </label>
                <input
                  id="input-vendedor"
                  type="text"
                  name="vendedor"
                  list="lista-vendedores"
                  placeholder="Selecione ou digite um novo..."
                  value={formulario.vendedor}
                  onChange={handleChangeForm}
                />
                <datalist id="lista-vendedores">
                  {vendedores.map(v => (
                    <option key={v.codigo} value={v.nome} />
                  ))}
                </datalist>
              </div>
              <div className={styles.formGroup}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Nº O.S / Projeto
                  <button type="button" onClick={() => handleAbrirModalCadastro('projeto', 'Cadastrar Novo Projeto', 'numeroOS')} title="Novo Projeto" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-destaque)', padding: 0 }}>
                    <Plus size={16} />
                  </button>
                </label>
                <input
                  id="input-projeto"
                  type="text"
                  name="numeroOS"
                  list="lista-projetos"
                  placeholder="Selecione ou digite um novo..."
                  value={formulario.numeroOS}
                  onChange={handleChangeForm}
                />
                <datalist id="lista-projetos">
                  {projetos.map(p => (
                    <option key={p.codigo} value={p.nome} />
                  ))}
                </datalist>
              </div>
            </div>
          )}
        </div>

        {/* Bloco de Adição de Produtos */}
        <div className={styles.cardSection}>
          <h3>2. Adicionar Produtos</h3>

          <div className={styles.buscaContainer}>
            <div className={styles.buscaWrapper}>
              {!produtoSelecionado ? (
                <div className={styles.buscaProduto}>
                  <div className={styles.inputIcon}>
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Bipe o código ou digite o nome do produto..."
                      value={termoBusca}
                      onChange={(e) => setTermoBusca(e.target.value)}
                    />
                  </div>
                  {produtosFiltrados.length > 0 && (
                    <ul className={styles.listaResultados}>
                      {produtosFiltrados.map(p => (
                        <li key={p.codigo_produto} onClick={() => handleSelecionarProduto(p)}>
                          <strong>{p.codigo}</strong> - {p.descricao}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className={styles.produtoSelecionado}>
                  <div className={styles.prodInfo}>
                    <span className={styles.prodCode}>{produtoSelecionado.codigo}</span>
                    <span className={styles.prodName} title={produtoSelecionado.descricao}>{produtoSelecionado.descricao}</span>
                  </div>
                  <button className={styles.btnLimparProd} onClick={() => setProdutoSelecionado(null)}>
                    Trocar
                  </button>
                </div>
              )}
            </div>

            <div className={styles.qtdWrapper}>
              <label>Qtd</label>
              <input
                type="number"
                min="1"
                value={quantidadeItem}
                onChange={(e) => setQuantidadeItem(e.target.value)}
                disabled={!produtoSelecionado}
              />
            </div>

            <button
              className={styles.btnAdicionarLista}
              onClick={handleAdicionarLista}
              disabled={!produtoSelecionado || quantidadeItem <= 0}
            >
              <Plus size={20} /> Adicionar
            </button>
          </div>

          {/* Carrinho de Produtos */}
          {itensCarrinho.length > 0 && (
            <div className={styles.carrinhoContainer}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0 }}>Itens na Lista ({itensCarrinho.length})</h4>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--cor-destaque)' }}>
                  Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    itensCarrinho.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valor_unitario || 0)), 0)
                  )}
                </div>
              </div>
              <table className={styles.tabelaCarrinho}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Qtd</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensCarrinho.map((item) => (
                    <tr key={item.codigo}>
                      <td>{item.codigo}</td>
                      <td>{item.descricao}</td>
                      <td className={styles.tdQtd}>{item.quantidade}</td>
                      <td>
                        <button className={styles.btnRemover} onClick={() => handleRemoverItem(item.codigo)} title="Remover item">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.cardAutomacao}>
          <p><strong>Automação Omie:</strong> CFOP 5.949 | ICMS 40 (Isenta)</p>
        </div>
        <button
          className={styles.btnConcluir}
          onClick={handleConcluir}
          disabled={loading || itensCarrinho.length === 0}
        >
          {loading ? 'Processando...' : (
            <>
              <Printer size={20} />
              {tipoInicial === 'reposicao' ? 'Enviar para Compras e Imprimir Comprovante' : 'Concluir Entrega e Imprimir'}
            </>
          )}
        </button>
      </div>

      {/* Modal de Cadastro Rápido */}
      {modalCadastro.aberto && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{modalCadastro.titulo}</h3>
            <input
              autoFocus
              type="text"
              placeholder="Digite o nome..."
              value={novoValorModal}
              onChange={(e) => setNovoValorModal(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSalvarModalCadastro()}
            />
            <div className={styles.modalActions}>
              <button className={styles.btnCancelar} onClick={() => setModalCadastro({ aberto: false, tipo: null, titulo: '', campoTarget: '' })}>Cancelar</button>
              <button className={styles.btnSalvarModal} onClick={handleSalvarModalCadastro}>Salvar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NovaRequisicao;
