import React, { useState, useEffect } from 'react';
import { Calculator, ChevronDown, ChevronUp, CheckCircle, PackageCheck, AlertTriangle, Truck, Link, Building, Copy, Check, Plus, X, RefreshCw, FileText, Image as ImageIcon, Download, Bot, Sparkles, Printer } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { deduplicarCotacoes } from '../../../../utils/cotacoesHelper';
import AssistenteIAOrcamento from '../AssistenteIAOrcamento';
import ChatConsultorGlobal from '../ChatIAOrcamento';
import styles from './Orcamentos.module.css';

// Sub-componente Autocomplete declarado FORA de Orcamentos para evitar perda de foco e re-montagem
const FornecedorAutocomplete = ({ reqId, fornecedores, valorSelecionado, setValorSelecionado, onOpenModal }) => {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (valorSelecionado) {
      const f = fornecedores.find(f => String(f.codigo_cliente_omie) === String(valorSelecionado));
      if (f) setBusca(f.nome_fantasia || f.razao_social);
    } else {
      setBusca('');
    }
  }, [valorSelecionado, fornecedores]);

  const filtrados = (fornecedores || []).filter(f => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      f.nome_fantasia?.toLowerCase().includes(termo) ||
      f.razao_social?.toLowerCase().includes(termo) ||
      f.cnpj_cpf?.includes(termo)
    );
  }).slice(0, 50);

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#94a3b8' }}>
          <Building size={16} />
        </div>
        <input
          type="text"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setAberto(true);
            if (!e.target.value) {
              setValorSelecionado('');
            }
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 250)}
          placeholder="Buscar Fornecedor (Nome ou CNPJ/CPF)..."
          style={{ width: '100%', padding: '8px 8px 8px 32px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '4px 0 0 4px', fontSize: '0.9rem', outline: 'none', background: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)' }}
        />
        {aberto && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--cor-fundo-cartao)', border: '1px solid var(--cor-borda-cartao)', zIndex: 100, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
            {filtrados.length > 0 ? filtrados.map(f => (
              <div
                key={f.codigo_cliente_omie}
                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--cor-borda-cartao)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setValorSelecionado(f.codigo_cliente_omie);
                  setBusca(f.nome_fantasia || f.razao_social);
                  setAberto(false);
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--cor-fundo-sutil)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--cor-texto-principal)' }}>{f.nome_fantasia || f.razao_social}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>CNPJ/CPF: {f.cnpj_cpf || 'Não informado'}</div>
              </div>
            )) : (
              <div style={{ padding: '10px 12px', fontSize: '0.9rem', color: 'var(--cor-texto-secundario)' }}>
                Nenhum fornecedor encontrado. Clique em + para cadastrar.
              </div>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenModal}
        style={{ background: 'var(--cor-fundo-secundario)', border: '1px solid var(--cor-borda-cartao)', borderLeft: 'none', padding: '0 15px', borderRadius: '0 4px 4px 0', cursor: 'pointer', color: 'var(--cor-destaque)' }}
        title="Cadastrar Novo Fornecedor (Mercado Livre / Balcão / CNPJ)"
      >
        <Plus size={18} />
      </button>
    </div>
  );
};

export const detectarMarca = (cot, item) => {
  // 1. Se a cotação já tem marca válida
  if (cot?.marca && cot.marca.trim() !== '' && cot.marca.trim() !== '-' && !/^(null|nulo|não informada|nao informada|n\/i)$/i.test(cot.marca.trim())) {
    return cot.marca.trim().toUpperCase();
  }

  // 2. Se o item da requisição tem marca válida
  if (item?.marca && item.marca.trim() !== '' && item.marca.trim() !== '-' && !/^(null|nulo|não informada|nao informada|n\/i)$/i.test(item.marca.trim())) {
    return item.marca.trim().toUpperCase();
  }

  // 3. Extrair da descrição da cotação ou do produto
  const textoParaBuscar = `${cot?.descricao || ''} ${item?.descricao || ''}`.toUpperCase();

  const marcasConhecidas = [
    'MANN-FILTER', 'MANN FILTER', 'MANN', 'TECFIL', 'BOSCH', 'MAHLE', 'FRAM', 'WEG', 
    'DONALDSON', 'VALEO', 'DELPHI', 'COFAP', 'SKF', 'NAKATA', 'FRAS-LE', 'FRASLE',
    'LONAFLEX', 'SACHS', 'LUK', 'GATES', 'CONTINENTAL', 'DAYCO', 'URBA', 'VOX', 
    'MOBIL', 'LUBRAX', 'IPIRANGA', 'SHELL', 'CASTROL', 'WURTH', '3M', 'PARKER', 
    'FLEETGUARD', 'HENGST', 'TURBO', 'SABO', 'TARANTO', 'SPAAL', 'BROSOL', 'SCHADEK', 
    'ZM', 'MARILIA', 'KOSTAL', 'DORMAN', 'TIMKEN', 'NSK', 'FAG', 'INA', 'MONROE', 
    'KYB', 'TRW', 'VARGA', 'FREMAX', 'HIPPER FREIOS', 'CINPAL', 'MWM', 'CUMMINS', 
    'SCANIA', 'VOLVO', 'MERCEDES', 'IVECO', 'FORD', 'VOLKSWAGEN', 'VW', 'TOYOTA', 
    'FIAT', 'GM', 'CHEVROLET', 'HONDA', 'HYUNDAI', 'RENAULT', 'NISSAN', 'JACTO', 
    'STARA', 'JOHN DEERE', 'CASE', 'NEW HOLLAND', 'MASSEY FERGUSON', 'VALTRA'
  ];

  for (const m of marcasConhecidas) {
    const regex = new RegExp(`\\b${m.replace('-', '[- ]?')}\\b`, 'i');
    if (regex.test(textoParaBuscar)) {
      return m === 'FRASLE' ? 'FRAS-LE' : m;
    }
  }

  // 4. Códigos específicos de filtros e peças comuns
  if (/\bW\s?68\/?80\b/i.test(textoParaBuscar) || /\bWK\s?940\/?7\b/i.test(textoParaBuscar) || /\bC\s?24\s?024\b/i.test(textoParaBuscar)) {
    return 'MANN';
  }
  if (/\bPSL\s?[0-9]+/i.test(textoParaBuscar) || /\bPSC\s?[0-9]+/i.test(textoParaBuscar)) {
    return 'TECFIL';
  }

  return '-';
};

const Orcamentos = ({ setView }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vencedoresItem, setVencedoresItem] = useState({}); // { reqId: { itemCodigo: cotacaoId } }

  // States para gerador de link externo
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState({});
  const [linksGerados, setLinksGerados] = useState({});
  const [gerandoLink, setGerandoLink] = useState(false);

  // State para o Modal da Planilha Detalhada do Fornecedor
  const [modalPlanilha, setModalPlanilha] = useState(null);

  // States para Cadastro de Novo Fornecedor
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [novoForn, setNovoForn] = useState({ razao_social: '', nome_fantasia: '', cnpj_cpf: '' });
  const [salvandoFornecedor, setSalvandoFornecedor] = useState(false);
  const [reqIdParaNovoFornecedor, setReqIdParaNovoFornecedor] = useState(null);

  const [gerandoPedidoId, setGerandoPedidoId] = useState(null);

  // States para o Assistente de IA
  const [modalIAAberto, setModalIAAberto] = useState(false);
  const [dadosModalIA, setDadosModalIA] = useState({ reqId: null, fornId: null, fornNome: '', tipo: 'pdf' });
  const [textosCotacoes, setTextosCotacoes] = useState({}); // { "reqId_fornId": "texto..." }
  
  // State para o Chat Global
  const [modalChatGlobalAberto, setModalChatGlobalAberto] = useState(false);
  const [reqIdChatGlobal, setReqIdChatGlobal] = useState(null);

  const handleTextSaved = async (reqId, fornId, texto) => {
    setTextosCotacoes(prev => {
      const novos = {
        ...prev,
        [`${reqId}_${fornId}`]: texto
      };
      
      salvarTextosCotacoesNoBanco(reqId, novos);
      return novos;
    });
  };

  const handlePrecosExtraidos = (reqId, fornId, itensExtraidos) => {
    // Clona o array original para consumirmos no fallback
    const itensPendentes = [...itensExtraidos];

    setRequisicoes(prevReqs => prevReqs.map(r => {
      if (r.id !== reqId) return r;

      let mudouAlgum = false;
      const novosItens = r.itens.map(itemReq => {
        if (itensPendentes.length === 0) return itemReq;

        // Tenta achar match exato/parcial
        let matchIdx = itensPendentes.findIndex(ie => 
          itemReq.descricao.toLowerCase().includes(ie.descricao?.toLowerCase() || '') ||
          ie.descricao?.toLowerCase().includes(itemReq.descricao.toLowerCase())
        );

        // Se não achou, pega o primeiro da lista
        if (matchIdx === -1) matchIdx = 0;

        const itemEncontrado = itensPendentes.splice(matchIdx, 1)[0];

        if (itemEncontrado && itemEncontrado.valorUnitario) {
          mudouAlgum = true;
          const novasCotacoes = [...(itemReq.cotacoes || [])];
          const cotExistente = novasCotacoes.findIndex(c => String(c.fornecedorId) === String(fornId));
          
          const marcaFinal = detectarMarca(itemEncontrado, itemReq);

          if (cotExistente >= 0) {
            novasCotacoes[cotExistente].valorUnitario = itemEncontrado.valorUnitario;
            if (itemEncontrado.previsaoDias) novasCotacoes[cotExistente].previsaoDias = itemEncontrado.previsaoDias;
            novasCotacoes[cotExistente].marca = marcaFinal !== '-' ? marcaFinal : (novasCotacoes[cotExistente].marca || '');
          } else {
            novasCotacoes.push({
              fornecedorId: String(fornId),
              valorUnitario: itemEncontrado.valorUnitario,
              frete: 0,
              previsaoDias: itemEncontrado.previsaoDias || 0,
              condicaoPagamento: '',
              marca: marcaFinal !== '-' ? marcaFinal : ''
            });
          }
          return { ...itemReq, cotacoes: novasCotacoes };
        }
        return itemReq;
      });

      if (mudouAlgum) {
        // Atualiza silenciosamente no backend
        fetch(`/api/requisicoes/${r.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itens: novosItens })
        }).catch(err => console.error("Erro ao salvar cotações da IA no DB:", err));
      }

      return { ...r, itens: novosItens };
    }));
  };

  const handleAtualizaPrecoManualPlanilha = async (reqId, fornId, itemCodigo, novoValorNum) => {
    if (isNaN(novoValorNum) || novoValorNum <= 0) return;

    setRequisicoes(prevReqs => prevReqs.map(r => {
      if (r.id !== reqId) return r;
      
      const novosItens = r.itens.map(item => {
        if (item.codigo !== itemCodigo) return item;
        
        const novasCotacoes = [...(item.cotacoes || [])];
        const idx = novasCotacoes.findIndex(c => String(c.fornecedorId) === String(fornId));
        if (idx >= 0) {
           novasCotacoes[idx].valorUnitario = novoValorNum;
        } else {
           novasCotacoes.push({
             fornecedorId: String(fornId),
             valorUnitario: novoValorNum,
             frete: 0, previsaoDias: 0, marca: ''
           });
        }
        return { ...item, cotacoes: novasCotacoes };
      });
      
      // Update backend silently
      fetch(`/api/requisicoes/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: novosItens })
      }).catch(err => console.error(err));
      
      return { ...r, itens: novosItens };
    }));

    setModalPlanilha(prev => {
       if (!prev || prev.req.id !== reqId) return prev;
       
       const reqAtualizada = { ...prev.req };
       let novoTotalCalculado = 0;

       reqAtualizada.itens = reqAtualizada.itens.map(item => {
          let cotCopy = item.cotacoes ? [...item.cotacoes] : [];
          if (item.codigo === itemCodigo) {
             const idx = cotCopy.findIndex(c => String(c.fornecedorId) === String(fornId));
             if (idx >= 0) cotCopy[idx] = { ...cotCopy[idx], valorUnitario: novoValorNum };
             else cotCopy.push({ fornecedorId: String(fornId), valorUnitario: novoValorNum, frete: 0, previsaoDias: 0, marca: '' });
          }

          // Recalcula o total (mesma lógica usada originalmente)
          const cAt = cotCopy.find(c => String(c.fornecedorId) === String(fornId));
          if (cAt && cAt.valorUnitario > 0) {
             const tipo = cAt.tipoUnidade || 'Unidade';
             const qtdInterna = Number(cAt.quantidadePacote) || 1;
             let qtdComprar = item.quantidade;
             if (tipo === 'Pacote' || tipo === 'Caixa') {
               qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
             }
             const descItem = Number(cAt.desconto) || 0;
             novoTotalCalculado += (Number(cAt.valorUnitario) * qtdComprar) * (1 - descItem / 100);
          }
          return { ...item, cotacoes: cotCopy };
       });
       
       return { 
         ...prev, 
         req: reqAtualizada, 
         resumo: { 
           ...prev.resumo, 
           valorTotal: novoTotalCalculado,
           valorSemDescontoGeral: novoTotalCalculado 
         } 
       };
    });
  };

  const salvarTextosCotacoesNoBanco = async (reqId, todosTextos) => {
    try {
      const reqAtual = requisicoes.find(r => r.id === reqId);
      if (!reqAtual) return;

      const textosDestaReq = {};
      Object.keys(todosTextos).forEach(key => {
        if (key.startsWith(`${reqId}_`)) {
          textosDestaReq[key] = todosTextos[key];
        }
      });

      const reqAtualizada = { ...reqAtual, textosCotacoes: textosDestaReq };
      
      await fetch(`/api/requisicoes/${reqId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqAtualizada)
      });
    } catch (e) {
      console.error('Erro ao salvar rascunho dos PDFs', e);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const [resReq, resForn, resProd] = await Promise.all([
        fetch('/api/requisicoes'),
        fetch('/api/fornecedores'),
        fetch('/api/produtos')
      ]);

      const reqs = await resReq.json();
      const forns = await resForn.json();
      let prods = [];
      try {
        prods = await resProd.json();
      } catch (errP) {
        console.warn('Erro ao carregar /api/produtos:', errP);
      }

      setFornecedores(forns);
      setProdutos(Array.isArray(prods) ? prods : []);

      // Filtrar apenas requisições que estão em "em_orcamento"
      const orcamentos = reqs.filter(r => r.status_compras === 'em_orcamento').map(req => ({
        ...req,
        itens: (req.itens || []).map(item => ({
          ...item,
          cotacoes: deduplicarCotacoes(item.cotacoes || [])
        }))
      }));
      setRequisicoes(orcamentos);

      // Carregar rascunhos de textos da IA que foram salvos previamente no BD
      const textosIniciais = {};
      orcamentos.forEach(req => {
        if (req.textosCotacoes) {
          Object.assign(textosIniciais, req.textosCotacoes);
        }
      });
      setTextosCotacoes(textosIniciais);

      // Auto-selecionar o menor preço para cada item (Mastigado)
      const autoSelecionados = {};
      orcamentos.forEach(req => {
        autoSelecionados[req.id] = {};
        req.itens?.forEach(item => {
          const cotacoesLimpos = deduplicarCotacoes(item.cotacoes || []);
          if (cotacoesLimpos.length > 0) {
            // Acha o menor valorUnitario
            const cotacaoVencedora = cotacoesLimpos.reduce((min, atual) => {
              return Number(atual.valorUnitario) < Number(min.valorUnitario) ? atual : min;
            });
            autoSelecionados[req.id][item.codigo] = cotacaoVencedora.id;
          }
        });
      });
      setVencedoresItem(autoSelecionados);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getNomeFornecedor = (fornId) => {
    const f = fornecedores.find(x => x.codigo_cliente_omie == fornId);
    return f ? (f.nome_fantasia || f.razao_social) : 'Fornecedor Desconhecido';
  };

  const getPrecoHistoricoOmie = (item) => {
    if (!item) return 0;
    
    // 1. Prioridade: campos de histórico ou preço já salvos no item
    if (Number(item.ultimo_preco_pago) > 0) return Number(item.ultimo_preco_pago);
    if (Number(item.preco_medio_historico) > 0) return Number(item.preco_medio_historico);
    if (Number(item.valor_unitario) > 0) return Number(item.valor_unitario);
    if (Number(item.valorUnitario) > 0) return Number(item.valorUnitario);
    if (Number(item.preco) > 0) return Number(item.preco);

    // 2. Busca na lista de produtos sincronizados do Omie (produtos_omie)
    const cod = (item.codigo || '').trim().toUpperCase();
    const desc = (item.descricao || '').trim().toUpperCase();

    if (Array.isArray(produtos) && produtos.length > 0) {
      const prod = produtos.find(p => {
        const pCod = (p.codigo || '').trim().toUpperCase();
        const pDesc = (p.descricao || '').trim().toUpperCase();
        if (cod && pCod && cod === pCod) return true;
        if (desc && pDesc && desc === pDesc) return true;
        if (desc && pDesc && (desc.includes(pDesc) || pDesc.includes(desc))) return true;
        return false;
      });

      if (prod) {
        return Number(prod.ultimo_preco_pago || prod.preco_medio_historico || prod.valor_unitario || prod.preco_venda || prod.preco_unitario || 0);
      }
    }

    return 0;
  };

  const toggleExpand = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  const selecionarVencedorGlobal = (reqId, fornId) => {
    const req = requisicoes.find(r => r.id === reqId);
    if (!req) return;
    const novasSelecoes = { ...vencedoresItem[reqId] };

    req.itens.forEach(item => {
      const cotacoesUnicas = deduplicarCotacoes(item.cotacoes || []);
      const cotFornecedor = cotacoesUnicas.find(c => String(c.fornecedorId) === String(fornId));
      if (cotFornecedor) {
        novasSelecoes[item.codigo] = cotFornecedor.id;
      }
    });

    setVencedoresItem({
      ...vencedoresItem,
      [reqId]: novasSelecoes
    });
  };

  const handleAprovarOrcamento = async (reqId) => {
    const vencedores = vencedoresItem[reqId];
    if (!vencedores || Object.keys(vencedores).length === 0) {
      alert('Nenhum vencedor selecionado para gerar o pedido.');
      return;
    }

    setGerandoPedidoId(reqId);
    try {
      const response = await fetch(`/api/requisicoes/${reqId}/gerar-pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vencedores })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao aprovar orçamento e gerar pedidos');

      alert(`Sucesso! ${data.pedidosGerados?.length || 0} pedido(s) gerado(s) na Omie.`);
      if (setView) {
        setView('compras');
      } else {
        fetchDados();
        setExpandido(null);
      }
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao gerar o pedido: ' + error.message);
    } finally {
      setGerandoPedidoId(null);
    }
  };

  // ----- Gerador de Link Externo -----
  const gerarLinkFornecedor = async (reqId) => {
    const fornId = fornecedorSelecionado[reqId];
    if (!fornId) {
      alert('Selecione um fornecedor para gerar o link.');
      return;
    }

    setGerandoLink(true);
    try {
      const response = await fetch('/api/cotacao-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisicaoId: reqId, fornecedorId: fornId })
      });

      if (!response.ok) throw new Error('Falha ao gerar link');

      const data = await response.json();
      const urlCompleta = `${window.location.origin}${data.link}`;

      setLinksGerados(prev => ({
        ...prev,
        [reqId]: {
          ...prev[reqId],
          [fornId]: { url: urlCompleta, copiado: false }
        }
      }));
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar o link.');
    } finally {
      setGerandoLink(false);
    }
  };

  const copiarLink = (reqId, fornId, url) => {
    navigator.clipboard.writeText(url);
    setLinksGerados(prev => ({
      ...prev,
      [reqId]: {
        ...prev[reqId],
        [fornId]: { ...prev[reqId]?.[fornId], url, copiado: true }
      }
    }));
    setTimeout(() => {
      setLinksGerados(prev => ({
        ...prev,
        [reqId]: {
          ...prev[reqId],
          [fornId]: { ...prev[reqId][fornId], copiado: false }
        }
      }));
    }, 2000);
  };

  const gerarOuCopiarLinkEspecifico = async (reqId, fornId) => {
    // Se o link já foi gerado, apenas copia novamente
    if (linksGerados[reqId]?.[fornId]?.url) {
      copiarLink(reqId, fornId, linksGerados[reqId][fornId].url);
      return;
    }

    setGerandoLink(fornId);
    try {
      const response = await fetch('/api/cotacao-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisicaoId: reqId, fornecedorId: fornId })
      });

      if (!response.ok) throw new Error('Falha ao gerar link');

      const data = await response.json();
      const urlCompleta = `${window.location.origin}${data.link}`;

      copiarLink(reqId, fornId, urlCompleta);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar o link.');
    } finally {
      setGerandoLink(null);
    }
  };

  const baixarCartaCotacaoPDF = (reqId) => {
    const req = requisicoes.find(r => r.id === reqId);
    if (!req) return;
    
    const fornId = fornecedorSelecionado[reqId];
    
    let fornNome = "_________________________________________";
    let cnpj = "____________________";

    if (fornId) {
      fornNome = getNomeFornecedor(fornId);
      const fornecedorObj = fornecedores.find(f => String(f.codigo_cliente_omie) === String(fornId));
      cnpj = fornecedorObj?.cnpj_cpf || 'Não informado';
    }

    const opt = {
      margin:       15,
      filename:     `Cotacao_Req_${req.id}_${fornNome.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const element = document.createElement('div');
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #000; padding: 20px; font-size: 11px;">
        
        <!-- Cabeçalho -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <path d="M50 0 C22.4 0 0 22.4 0 50 C0 77.6 22.4 100 50 100 C77.6 100 100 77.6 100 50 C100 22.4 77.6 0 50 0 Z" fill="#84cc16"/>
              <path d="M50 20 C33.4 20 20 33.4 20 50 C20 66.6 33.4 80 50 80 C66.6 80 80 66.6 80 50 C80 33.4 66.6 20 50 20 Z" fill="#0ea5e9"/>
            </svg>
          </div>
          <div style="text-align: right; line-height: 1.4;">
            <strong style="font-size: 16px;">KAZUNORI YAMAGUCHI</strong><br/>
            <span style="font-weight: bold;">www.yamaves.com</span><br/>
            CNPJ: 042.033.722/0001-91<br/>
            Inscrição Estadual: 151832340<br/>
            RODOVIA PA-140 KM-19, 0 - FAB. DE RAÇÃO YAMAVES<br/>
            ZONA RURAL<br/>
            Santo Antônio do Taua - PA - CEP: 68786-000<br/>
            Telefone: (91) 3775-1499
          </div>
        </div>

        <h1 style="font-size: 20px; margin-bottom: 25px;">Carta de Cotação Nº ${req.id}</h1>

        <h2 style="font-size: 14px; margin-bottom: 10px;">Relação de Produtos</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #fca5a5; color: #fff;">
              <th style="padding: 6px; text-align: center;" width="5%">Item</th>
              <th style="padding: 6px; text-align: left;" width="15%">Código</th>
              <th style="padding: 6px; text-align: left;" width="40%">Descrição</th>
              <th style="padding: 6px; text-align: center;" width="10%">Quantidade</th>
              <th style="padding: 6px; text-align: center;" width="10%">Preço Unit.</th>
              <th style="padding: 6px; text-align: center;" width="10%">Marca</th>
              <th style="padding: 6px; text-align: center;" width="10%">Prazo</th>
            </tr>
          </thead>
          <tbody>
            ${req.itens.map((item, index) => `
              <tr style="background-color: ${index % 2 === 0 ? '#fff' : '#fef2f2'};">
                <td style="padding: 6px; text-align: center;">${index + 1}</td>
                <td style="padding: 6px;">${item.codigo || '-'}</td>
                <td style="padding: 6px;">${item.descricao}</td>
                <td style="padding: 6px; text-align: center;">${item.quantidade} UN</td>
                <td style="padding: 6px; border-bottom: 1px dotted #ccc;"></td>
                <td style="padding: 6px; border-bottom: 1px dotted #ccc;"></td>
                <td style="padding: 6px; border-bottom: 1px dotted #ccc;"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2 style="font-size: 14px; margin-bottom: 10px;">Outras Informações</h2>
        <div style="line-height: 1.6;">
          <strong>Fornecedor Selecionado:</strong> ${fornNome} (CNPJ: ${cnpj})<br/>
          <strong>Categoria:</strong> ${req.categoriaCompra || 'Compra de Material Para Uso e Consumo'}<br/>
          <strong>Carta de Cotação - incluído em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br/>
        </div>

        <div style="text-align: center; margin-top: 60px; font-size: 10px; color: #666;">
          Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} pelo Sistema Almoxarifado<br/>
          Página 1 de 1
        </div>
      </div>
    `;

    html2pdf().set(opt).from(element).save();
  };

  const abrirIA = (reqId, fornId, tipo) => {
    const fornNome = getNomeFornecedor(fornId);
    setDadosModalIA({ reqId, fornId, fornNome, tipo });
    setModalIAAberto(true);
  };

  const solicitarAnaliseGlobalIA = (req) => {
    setReqIdChatGlobal(req);
    setModalChatGlobalAberto(true);
  };

  const gerarResumoFornecedores = (req) => {
    const resumo = {}; // { fornId: { totalItens: 0, valorTotal: 0, prazos: [], cotacoes: [], descontoGeral: 0 } }

    req.itens?.forEach(item => {
      // Garante que cada fornecedor só conte 1 vez por item
      const cotacoesUnicas = deduplicarCotacoes(item.cotacoes || []);

      cotacoesUnicas.forEach(cot => {
        if (!cot || !cot.fornecedorId) return;
        const fornKey = String(cot.fornecedorId);

        if (!resumo[fornKey]) {
          resumo[fornKey] = { totalItens: 0, valorTotal: 0, prazos: [], cotacoes: [], origem: 'sistema', descontoGeral: cot.descontoGeral || 0 };
        }
        if (cot.origem === 'portal') {
          resumo[fornKey].origem = 'portal';
        }
        resumo[fornKey].totalItens += 1;

        // Calculo real do subtotal
        const tipo = cot.tipoUnidade || 'Unidade';
        const qtdInterna = Number(cot.quantidadePacote) || 1;
        let qtdComprar = item.quantidade;
        if (tipo === 'Pacote' || tipo === 'Caixa') {
          qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
        }
        const descItem = Number(cot.desconto) || 0;
        const subtotalBase = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100);

        resumo[fornKey].valorTotal += subtotalBase;

        if (cot.previsaoDias) {
          resumo[fornKey].prazos.push(cot.previsaoDias);
        }
        resumo[fornKey].cotacoes.push(cot);
      });
    });

    return Object.entries(resumo).map(([fornId, dados]) => {
      const prazosUnicos = [...new Set(dados.prazos)];
      const prazoExibicao = prazosUnicos.join(' / ') || 'Não informado';

      const valorComDescontoGeral = dados.valorTotal * (1 - (Number(dados.descontoGeral) / 100));

      return {
        fornId,
        ...dados,
        valorTotal: valorComDescontoGeral,
        valorSemDescontoGeral: dados.valorTotal,
        prazoFormatado: prazoExibicao
      };
    }).sort((a, b) => {
      // Prioriza quem tem todos os itens, e depois menor valor
      if (b.totalItens !== a.totalItens) return b.totalItens - a.totalItens;
      return a.valorTotal - b.valorTotal;
    });
  };

  const calcularTotalAprovado = (reqId) => {
    const req = requisicoes.find(r => r.id === reqId);
    if (!req) return 0;

    let totalPorFornecedor = {};

    req.itens?.forEach(item => {
      const vencedorId = vencedoresItem[reqId]?.[item.codigo];
      const cotacoesUnicas = deduplicarCotacoes(item.cotacoes || []);
      if (vencedorId && cotacoesUnicas.length > 0) {
        const cot = cotacoesUnicas.find(c => c.id === vencedorId);
        if (cot) {
          const fornKey = String(cot.fornecedorId);
          if (!totalPorFornecedor[fornKey]) {
            totalPorFornecedor[fornKey] = { soma: 0, descontoGeral: Number(cot.descontoGeral) || 0 };
          }
          const tipo = cot.tipoUnidade || 'Unidade';
          const qtdInterna = Number(cot.quantidadePacote) || 1;
          let qtdComprar = item.quantidade;
          if (tipo === 'Pacote' || tipo === 'Caixa') {
            qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
          }
          const descItem = Number(cot.desconto) || 0;
          const subtotalBase = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100);

          totalPorFornecedor[fornKey].soma += subtotalBase;
        }
      }
    });

    let totalFinal = 0;
    Object.values(totalPorFornecedor).forEach(forn => {
      totalFinal += forn.soma * (1 - forn.descontoGeral / 100);
    });
    return totalFinal;
  };

  const imprimirSelecaoManual = (req) => {
    const printWindow = window.open('', '', 'height=700,width=900');
    printWindow.document.write('<html><head><title>Carta de Cotação - Manual</title>');
    printWindow.document.write(`
      <style>
        @media print {
          @page { margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { color: #000 !important; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; font-size: 11px; line-height: 1.3; background: #fff !important; }
        h2 { margin: 0 0 5px 0 !important; font-size: 16px !important; text-transform: uppercase; }
        h4 { margin: 10px 0 4px 0 !important; font-size: 12px !important; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        p, div { margin-bottom: 2px; }
        .total { font-size: 16px !important; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px !important; font-size: 11px !important; }
        th, td { border: 1px solid #aaa !important; padding: 4px 6px !important; text-align: left; }
        th { background-color: #eee !important; font-weight: bold; }
      </style>
    `);
    printWindow.document.write('</head><body>');
    let htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #000; padding: 20px; font-size: 11px;">
        <!-- Cabeçalho -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
          <div style="width: 100px; height: 100px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 100 100" width="80" height="80">
              <path d="M50 0 C22.4 0 0 22.4 0 50 C0 77.6 22.4 100 50 100 C77.6 100 100 77.6 100 50 C100 22.4 77.6 0 50 0 Z" fill="#84cc16"/>
              <path d="M50 20 C33.4 20 20 33.4 20 50 C20 66.6 33.4 80 50 80 C66.6 80 80 66.6 80 50 C80 33.4 66.6 20 50 20 Z" fill="#0ea5e9"/>
            </svg>
          </div>
          <div style="text-align: right; line-height: 1.4;">
            <strong style="font-size: 16px;">KAZUNORI YAMAGUCHI</strong><br/>
            <span style="font-weight: bold;">www.yamaves.com</span><br/>
            CNPJ: 042.033.722/0001-91<br/>
            Inscrição Estadual: 151832340<br/>
            RODOVIA PA-140 KM-19, 0 - FAB. DE RAÇÃO YAMAVES<br/>
            ZONA RURAL<br/>
            Santo Antônio do Taua - PA - CEP: 68786-000<br/>
            Telefone: (91) 3775-1499
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 25px;">
          <h1 style="font-size: 20px; margin: 0;">Carta de Cotação Nº ${req.numero_requisicao || req.id}</h1>
          <div style="text-align: right;">
            <div style="font-size: 12px; font-weight: bold; text-transform: uppercase;">Investimento Total</div>
            <div class="total" style="font-size: 18px; color: #10b981;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calcularTotalAprovado(req.id))}</div>
          </div>
        </div>

        <h2 style="font-size: 14px; margin-bottom: 10px;">Relação de Produtos (Montagem Manual)</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #fca5a5; color: #fff;">
              <th style="padding: 6px; text-align: left;" width="20%">Fornecedor</th>
              <th style="padding: 6px; text-align: left;" width="35%">Produto</th>
              <th style="padding: 6px; text-align: center;" width="5%">Qtd</th>
              <th style="padding: 6px; text-align: right;" width="15%">R$ Unit</th>
              <th style="padding: 6px; text-align: right;" width="15%">R$ Total</th>
              <th style="padding: 6px; text-align: right;" width="10%">Prazo</th>
            </tr>
          </thead>
          <tbody>
    `;

    req.itens?.forEach((item, idx) => {
      const vencedorId = vencedoresItem[req.id]?.[item.codigo];
      const cotacoesUnicas = deduplicarCotacoes(item.cotacoes || []);
      if (vencedorId && cotacoesUnicas.length > 0) {
        const cot = cotacoesUnicas.find(c => c.id === vencedorId);
        if (cot) {
          const tipo = cot.tipoUnidade || 'Unidade';
          const qtdInterna = Number(cot.quantidadePacote) || 1;
          let qtdComprar = item.quantidade;
          if (tipo === 'Pacote' || tipo === 'Caixa') {
            qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
          }
          const descItem = Number(cot.desconto) || 0;
          const descGeral = Number(cot.descontoGeral) || 0;
          const valorUnitFinal = Number(cot.valorUnitario) * (1 - descItem / 100);
          const subtotalBase = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100) * (1 - descGeral / 100);
          
          htmlContent += `
            <tr style="background: ${idx % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td>${getNomeFornecedor(cot.fornecedorId)}</td>
              <td>${item.descricao}</td>
              <td style="text-align: center;">${item.quantidade}</td>
              <td style="text-align: right;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorUnitFinal)}</td>
              <td style="text-align: right; font-weight: bold;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalBase)}</td>
              <td style="text-align: right;">${cot.previsaoDias || '-'}d</td>
            </tr>
          `;
        }
      }
    });

    htmlContent += `
        </tbody>
      </table>

      <h2 style="font-size: 14px; margin-bottom: 10px;">Outras Informações</h2>
      <div style="line-height: 1.6;">
        <strong>Categoria:</strong> ${req.categoriaCompra || 'Compra de Material Para Uso e Consumo'}<br/>
        <strong>Carta de Cotação - incluído em:</strong> ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br/>
      </div>

      <div style="text-align: center; margin-top: 60px; font-size: 10px; color: #666;">
        Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} pelo Sistema Almoxarifado<br/>
        Página 1 de 1
      </div>
    </div>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.write('</body></html>');
    printWindow.document.documentMode ? printWindow.document.execCommand('print') : printWindow.print();
    printWindow.close();
  };

  const salvarNovoFornecedor = async () => {
    setSalvandoFornecedor(true);
    try {
      const res = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoForn)
      });
      if (!res.ok) throw new Error('Erro ao salvar fornecedor');
      const fornecedorCriado = await res.json();

      // Atualiza a lista
      setFornecedores([...fornecedores, fornecedorCriado]);

      // Auto-seleciona para a requisição que estava aberta
      if (reqIdParaNovoFornecedor) {
        setFornecedorSelecionado(prev => ({
          ...prev,
          [reqIdParaNovoFornecedor]: fornecedorCriado.codigo_cliente_omie
        }));
      }

      setModalFornecedorAberto(false);
      setNovoForn({ razao_social: '', nome_fantasia: '', cnpj_cpf: '' });
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  if (loading) return <div className={styles.loading}>Carregando orçamentos...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight}>
            <Calculator size={28} />
          </div>
          <div>
            <h2>Aprovação de Orçamentos</h2>
            <p>Análise inteligente de cotações para tomada de decisão de compra</p>
          </div>
        </div>

        {requisicoes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (expandido) {
                const reqAtual = requisicoes.find(r => r.id === expandido);
                if (reqAtual) setReqIdChatGlobal(reqAtual);
                else setReqIdChatGlobal(requisicoes[0]);
              } else if (!reqIdChatGlobal && requisicoes.length > 0) {
                setReqIdChatGlobal(requisicoes[0]);
              }
              setModalChatGlobalAberto(true);
            }}
            className={styles.btnIaGlobal}
            title="Abrir Assistente de Inteligência Artificial para análise estratégica de cotações"
          >
            <Sparkles size={18} />
            Agente Compras (IA)
          </button>
        )}
      </header>

      <div className={styles.content}>
        {requisicoes.length === 0 ? (
          <div className={styles.empty}>
            <PackageCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.5, color: 'var(--cor-destaque)' }} />
            <h3>Nenhum Orçamento Pendente</h3>
            <p>Não há nenhuma requisição aguardando aprovação de cotações no momento.</p>
          </div>
        ) : (
          <div className={styles.lista}>
            {requisicoes.map((req) => {
              const isExpanded = expandido === req.id;
              const fornecedoresResumo = gerarResumoFornecedores(req);
              const totalAprovado = calcularTotalAprovado(req.id);

              return (
                <div key={req.id} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>
                  <div className={styles.cardHeader} onClick={() => toggleExpand(req.id)}>
                    <div className={styles.cardInfo}>
                      <div className={styles.idBox}>
                        <span className={styles.label}>Requisição</span>
                        <span className={styles.value}>#{req.id.slice(-6)}</span>
                      </div>
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Itens Solicitados</span>
                        <span className={styles.value}>{req.itens?.length || 0}</span>
                      </div>
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Fornecedores Participantes</span>
                        <span className={styles.value}>{fornecedoresResumo.length}</span>
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.cardBody}>

                      {/* Painel de Geração de Link */}
                      <div style={{ background: 'var(--cor-fundo-secundario)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--cor-borda-cartao)', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link size={16} color="var(--cor-destaque)" /> Enviar para Fornecedor Externo
                          </h4>
                          <FornecedorAutocomplete
                            reqId={req.id}
                            fornecedores={fornecedores}
                            valorSelecionado={fornecedorSelecionado[req.id]}
                            setValorSelecionado={(valor) => setFornecedorSelecionado({ ...fornecedorSelecionado, [req.id]: valor })}
                            onOpenModal={() => {
                              setReqIdParaNovoFornecedor(req.id);
                              setModalFornecedorAberto(true);
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => gerarLinkFornecedor(req.id)}
                            disabled={gerandoLink || !fornecedorSelecionado[req.id]}
                            style={{ height: '38px', padding: '0 14px', background: 'var(--cor-destaque)', color: 'var(--cor-texto-inverso)', border: 'none', borderRadius: '4px', cursor: (gerandoLink || !fornecedorSelecionado[req.id]) ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}
                            title="Gerar link web para enviar ao fornecedor responder online"
                          >
                            <Link size={16} /> {gerandoLink ? 'Gerando...' : 'Gerar Link Seguro'}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => baixarCartaCotacaoPDF(req.id)}
                            style={{ height: '38px', padding: '0 14px', background: 'var(--cor-fundo-cartao)', color: 'var(--cor-destaque)', border: '1px solid var(--cor-destaque)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}
                            title="Baixar Cotação em PDF para enviar aos fornecedores"
                          >
                            <Download size={16} /> Cotação em PDF
                          </button>
                        </div>

                        {fornecedorSelecionado[req.id] && linksGerados[req.id]?.[fornecedorSelecionado[req.id]] && (
                          <div style={{ width: '100%', background: 'var(--cor-fundo-cartao)', border: '1px dashed var(--cor-borda-cartao)', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', wordBreak: 'break-all' }}>
                              {linksGerados[req.id][fornecedorSelecionado[req.id]].url}
                            </span>
                            <button
                              onClick={() => copiarLink(req.id, fornecedorSelecionado[req.id], linksGerados[req.id][fornecedorSelecionado[req.id]].url)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
                            >
                              {linksGerados[req.id][fornecedorSelecionado[req.id]].copiado ? <><Check size={16} color="var(--cor-sucesso)" /> Copiado!</> : <><Copy size={16} /> Copiar</>}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Resumo Mastigado */}
                      <div style={{ marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                          <h4 style={{ color: 'var(--cor-texto-principal)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={18} color="var(--cor-sucesso)" />
                            Resumo por Fornecedor (Oportunidades de Compra Única)
                          </h4>
                          
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={fetchDados}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--cor-fundo-cartao)', border: '1px solid var(--cor-borda-cartao)', borderRadius: '4px', cursor: 'pointer', color: 'var(--cor-texto-principal)', fontWeight: 'bold', fontSize: '0.8rem', transition: 'all 0.2s' }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'var(--cor-fundo-sutil)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'var(--cor-fundo-cartao)'}
                              title="Buscar novas respostas dos fornecedores"
                            >
                              <RefreshCw size={14} /> Atualizar Cotações
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {fornecedoresResumo.map((resumo, idx) => {
                            const temTudo = resumo.totalItens === req.itens.length;
                            return (
                              <div key={resumo.fornId}
                                onClick={() => setModalPlanilha({ req, fornId: resumo.fornId, resumo })}
                                style={{
                                  background: resumo.origem === 'portal' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 107, 0, 0.08)',
                                  border: `1px solid ${resumo.origem === 'portal' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 107, 0, 0.35)'}`,
                                  borderLeft: `4px solid ${idx === 0 ? 'var(--cor-destaque)' : (resumo.origem === 'portal' ? 'var(--cor-sucesso)' : '#f97316')}`,
                                  padding: '8px 14px', borderRadius: '6px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--cor-fundo-sutil-forte)'}
                                onMouseOut={(e) => e.currentTarget.style.background = resumo.origem === 'portal' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 107, 0, 0.08)'}
                                title={idx === 0 ? "Melhor Opção Geral" : ""}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                  <strong style={{ fontSize: '0.9rem', color: 'var(--cor-texto-principal)', minWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {getNomeFornecedor(resumo.fornId)}
                                  </strong>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                                    Itens: <strong style={{ color: temTudo ? 'var(--cor-sucesso)' : '#f59e0b' }}>{resumo.totalItens}/{req.itens.length}</strong>
                                  </span>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                                    Prazo: <strong>{resumo.prazoFormatado} {resumo.prazoFormatado.match(/^[0-9 \/]+$/) ? 'dias' : ''}</strong>
                                  </span>
                                  <strong style={{ fontSize: '1rem', color: idx === 0 ? 'var(--cor-destaque)' : 'var(--cor-texto-principal)', marginLeft: 'auto' }}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.valorTotal)}
                                  </strong>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '20px' }} onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => gerarOuCopiarLinkEspecifico(req.id, resumo.fornId)}
                                    title="Copiar Link para este fornecedor"
                                    style={{
                                      padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                      background: resumo.origem === 'portal' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.15)', 
                                      border: `1px solid ${resumo.origem === 'portal' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(14, 165, 233, 0.4)'}`, 
                                      color: resumo.origem === 'portal' ? 'var(--cor-sucesso)' : '#0ea5e9',
                                      display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', fontSize: '0.75rem'
                                    }}
                                  >
                                    {gerandoLink === resumo.fornId ? 'Gerando...' : linksGerados[req.id]?.[resumo.fornId]?.copiado ? <><Check size={14} color="var(--cor-sucesso)" /> Copiado</> : resumo.origem === 'portal' ? <><Check size={14} /> Link OK</> : <><Link size={14} /> Link</>}
                                  </button>

                                  <button
                                    onClick={() => abrirIA(req.id, resumo.fornId, 'pdf')}
                                    title="Ler Orçamento em PDF"
                                    style={{
                                      padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                      background: textosCotacoes[`${req.id}_${resumo.fornId}`] ? 'rgba(16, 185, 129, 0.15)' : 'rgba(192, 38, 211, 0.15)', 
                                      border: `1px solid ${textosCotacoes[`${req.id}_${resumo.fornId}`] ? 'rgba(16, 185, 129, 0.4)' : 'rgba(192, 38, 211, 0.4)'}`, 
                                      color: textosCotacoes[`${req.id}_${resumo.fornId}`] ? 'var(--cor-sucesso)' : '#c026d3',
                                      display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', fontSize: '0.75rem'
                                    }}
                                  >
                                    {textosCotacoes[`${req.id}_${resumo.fornId}`] ? <><Check size={14} /> PDF OK</> : <><FileText size={14} /> IA PDF</>}
                                  </button>

                                  <button
                                    onClick={() => selecionarVencedorGlobal(req.id, resumo.fornId)}
                                    style={{
                                      padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600',
                                      background: 'var(--cor-fundo-cartao)', border: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)', transition: 'all 0.2s',
                                      fontSize: '0.75rem'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--cor-fundo-sutil)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--cor-fundo-cartao)'}
                                  >
                                    Selecionar principal
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Análise Detalhada (Item a Item) */}
                      <div>
                        <h4 style={{ color: 'var(--cor-texto-principal)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--cor-borda-cartao)', paddingTop: '20px' }}>
                          <Calculator size={18} color="var(--cor-destaque)" />
                          Análise Detalhada por Item
                        </h4>

                        <div style={{ overflowX: 'auto' }}>
                          <table className={styles.tabelaCotacoes} style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Produto</th>
                                <th style={{ textAlign: 'center' }}>Qtd.</th>
                                <th>Opções de Compra (Cotações Recebidas)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {req.itens?.map(item => {
                                const cotacoes = deduplicarCotacoes(item.cotacoes || []);
                                const vencedorAtual = vencedoresItem[req.id]?.[item.codigo];

                                return (
                                  <tr key={item.codigo}>
                                    <td style={{ verticalAlign: 'top', width: '30%' }}>
                                      <span style={{ fontSize: '0.8rem', background: 'var(--cor-fundo-sutil-forte)', color: 'var(--cor-texto-principal)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--cor-borda-cartao)' }}>{item.codigo}</span>
                                      <p style={{ margin: '8px 0 0', fontWeight: '600', fontSize: '0.95rem', color: 'var(--cor-texto-principal)' }}>{item.descricao}</p>
                                    </td>
                                    <td style={{ verticalAlign: 'top', textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>
                                      {item.quantidade}
                                    </td>
                                    <td style={{ verticalAlign: 'top' }}>
                                      {cotacoes.length === 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--cor-erro)', fontSize: '0.9rem' }}>
                                          <AlertTriangle size={16} /> Nenhuma cotação recebida
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          {cotacoes.map(cot => {
                                            const isVencedor = vencedorAtual === cot.id;

                                            // Cálculo do subtotal desta opção
                                            const tipo = cot.tipoUnidade || 'Unidade';
                                            const qtdInterna = Number(cot.quantidadePacote) || 1;
                                            let qtdComprar = item.quantidade;
                                            if (tipo === 'Pacote' || tipo === 'Caixa') {
                                              qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
                                            }
                                            const descItem = Number(cot.desconto) || 0;
                                            const descGeral = Number(cot.descontoGeral) || 0;
                                            const subtotalDaOpcao = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100) * (1 - descGeral / 100);

                                            return (
                                              <label key={cot.id} style={{
                                                display: 'flex', alignItems: 'center', gap: '15px', padding: '6px 10px',
                                                border: `1px solid ${isVencedor ? 'var(--cor-destaque)' : (cot.origem === 'portal' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 107, 0, 0.4)')}`,
                                                borderLeft: `4px solid ${isVencedor ? 'var(--cor-destaque)' : (cot.origem === 'portal' ? 'var(--cor-sucesso)' : 'var(--cor-destaque)')}`,
                                                background: isVencedor ? 'rgba(255, 107, 0, 0.12)' : (cot.origem === 'portal' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 107, 0, 0.06)'),
                                                borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s'
                                              }}>
                                                <input
                                                  type="radio"
                                                  name={`vencedor-${req.id}-${item.codigo}`}
                                                  checked={isVencedor}
                                                  onChange={() => setVencedoresItem(prev => ({
                                                    ...prev, [req.id]: { ...prev[req.id], [item.codigo]: cot.id }
                                                  }))}
                                                />
                                                <strong style={{ fontSize: '0.85rem', color: 'var(--cor-texto-principal)', minWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                  {getNomeFornecedor(cot.fornecedorId)}
                                                </strong>
                                                
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--cor-texto-secundario)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                                                  <Truck size={12} /> {cot.previsaoDias}d
                                                </span>

                                                <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', whiteSpace: 'nowrap' }}>
                                                  Unit: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cot.valorUnitario)}
                                                  {cot.tipoUnidade && cot.tipoUnidade !== 'Unidade' && ` / ${cot.tipoUnidade}`}
                                                </span>

                                                <strong style={{ color: isVencedor ? 'var(--cor-destaque)' : 'var(--cor-texto-principal)', fontSize: '0.9rem', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                                  Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalDaOpcao)}
                                                </strong>

                                                <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem', color: 'var(--cor-texto-secundario)', marginLeft: '10px' }}>
                                                  {cot.marca && <span style={{ background: 'var(--cor-fundo-sutil-forte)', color: 'var(--cor-texto-principal)', padding: '2px 4px', borderRadius: '4px', border: '1px solid var(--cor-borda-cartao)' }}>Marca: {cot.marca}</span>}
                                                  {Number(cot.desconto) > 0 && <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--cor-sucesso)', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold' }}>-{cot.desconto}%</span>}
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer de Aprovação */}
                      <div style={{ marginTop: '20px', padding: '20px', background: 'var(--cor-fundo-secundario)', borderTop: '1px solid var(--cor-borda-cartao)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 8px 8px' }}>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: 'var(--cor-texto-secundario)', fontSize: '0.9rem' }}>Valor Total Aprovado:</p>
                          <h3 style={{ margin: 0, color: 'var(--cor-destaque)', fontSize: '1.5rem', fontWeight: '800' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAprovado)}
                          </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <button
                            onClick={() => imprimirSelecaoManual(req)}
                            style={{
                              background: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda-cartao)', padding: '12px 18px',
                              borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--cor-fundo-sutil)'}
                            onMouseOut={e => e.currentTarget.style.background = 'var(--cor-fundo-cartao)'}
                            title="Imprimir as cotações manualmente selecionadas acima"
                          >
                            <Printer size={20} />
                            Imprimir Manual
                          </button>
                          
                          <button
                            onClick={() => handleAprovarOrcamento(req.id)}
                            disabled={gerandoPedidoId === req.id}
                            style={{
                              background: gerandoPedidoId === req.id ? 'var(--cor-fundo-sutil-forte)' : 'var(--cor-sucesso)', color: 'var(--cor-texto-inverso)', border: 'none', padding: '12px 24px',
                              borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: gerandoPedidoId === req.id ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', gap: '8px', boxShadow: gerandoPedidoId === req.id ? 'none' : '0 4px 10px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <CheckCircle size={20} />
                            {gerandoPedidoId === req.id ? 'Gerando Pedido Omie...' : 'Aprovar Orçamento e Gerar Pedido'}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Fornecedor */}
      {modalFornecedorAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--cor-fundo-cartao)', padding: '24px', borderRadius: '12px', width: '450px', maxWidth: '95%', border: '1px solid var(--cor-borda-cartao)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={20} color="var(--cor-destaque)" /> Novo Fornecedor
              </h3>
              <button onClick={() => setModalFornecedorAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-secundario)' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-secundario)' }}>Razão Social *</label>
              <input
                type="text"
                value={novoForn.razao_social}
                onChange={e => setNovoForn({ ...novoForn, razao_social: e.target.value })}
                placeholder="Nome oficial da empresa"
                style={{ width: '100%', padding: '10px', background: 'var(--cor-fundo-principal)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-secundario)' }}>Nome Fantasia</label>
              <input
                type="text"
                value={novoForn.nome_fantasia}
                onChange={e => setNovoForn({ ...novoForn, nome_fantasia: e.target.value })}
                placeholder="Como a empresa é conhecida (Opcional)"
                style={{ width: '100%', padding: '10px', background: 'var(--cor-fundo-principal)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-secundario)' }}>CNPJ ou CPF *</label>
              <input
                type="text"
                value={novoForn.cnpj_cpf}
                onChange={e => setNovoForn({ ...novoForn, cnpj_cpf: e.target.value })}
                placeholder="Somente números ou com pontuação"
                style={{ width: '100%', padding: '10px', background: 'var(--cor-fundo-principal)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <button
              onClick={salvarNovoFornecedor}
              disabled={salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf}
              style={{
                width: '100%', padding: '12px', background: 'var(--cor-destaque)', color: 'var(--cor-texto-inverso)', border: 'none',
                borderRadius: '6px', cursor: (salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s',
                opacity: (salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf) ? 0.6 : 1
              }}
            >
              {salvandoFornecedor ? 'Salvando...' : 'Cadastrar Fornecedor'}
            </button>
          </div>
        </div>
      )}

      {/* Modal da Planilha Detalhada */}
      {modalPlanilha && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setModalPlanilha(null)}>
          <div style={{ background: 'var(--cor-fundo-cartao)', borderRadius: '12px', width: '1200px', maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--cor-borda-cartao)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--cor-borda-cartao)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--cor-fundo-secundario)', borderRadius: '12px 12px 0 0' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PackageCheck size={20} color="var(--cor-destaque)" /> Planilha de Cotação: {getNomeFornecedor(modalPlanilha.fornId)}
                  </h3>
                  {modalPlanilha.resumo.origem === 'portal' ? (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--cor-sucesso)', padding: '3px 8px', borderRadius: '4px', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                      Preço do Link
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(192, 38, 211, 0.2)', color: '#c026d3', padding: '3px 8px', borderRadius: '4px', fontWeight: '700', border: '1px solid rgba(192, 38, 211, 0.4)' }}>
                      Preço do PDF
                    </span>
                  )}
                </div>
                <p style={{ margin: '5px 0 0', color: 'var(--cor-texto-secundario)', fontSize: '0.9rem' }}>Requisição #{modalPlanilha.req.numero_requisicao || String(modalPlanilha.req.id).slice(-6)}</p>
              </div>
              <button onClick={() => setModalPlanilha(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-secundario)', padding: '5px' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: 'var(--cor-fundo-principal)' }}>
              <table className={styles.tabelaCotacoes} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--cor-fundo-secundario)', textAlign: 'left' }}>
                    <th style={{ padding: '10px', borderBottom: '2px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)' }}>Produto</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)', textAlign: 'center' }}>Qtd. Pedida</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)' }}>Marca</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)' }}>Emb.</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)' }}>Prazo</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)', textAlign: 'right' }}>Preço Unit. (Antes / Depois)</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {modalPlanilha.req.itens?.map(item => {
                    const cotacoesUnicas = deduplicarCotacoes(item.cotacoes || []);
                    const cot = cotacoesUnicas.find(c => String(c.fornecedorId) === String(modalPlanilha.fornId));
                    const precoOmie = getPrecoHistoricoOmie(item);

                    if (!cot) {
                      return (
                        <tr key={item.codigo} style={{ borderBottom: '1px solid var(--cor-borda-cartao)', opacity: 0.7, background: 'var(--cor-fundo-cartao)' }}>
                          <td style={{ padding: '10px' }}>
                            <div style={{ fontWeight: '500', color: 'var(--cor-texto-principal)' }}>{item.descricao}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              {item.codigo && <span>Cód: <strong>{item.codigo}</strong></span>}
                              {precoOmie > 0 && (
                                <span style={{ color: 'var(--cor-destaque)' }}>
                                  Ref. Omie: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoOmie)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', color: 'var(--cor-texto-principal)' }}>{item.quantidade}</td>
                          <td style={{ padding: '10px', color: 'var(--cor-texto-secundario)', fontWeight: '500' }}>{detectarMarca(null, item)}</td>
                          <td colSpan={4} style={{ padding: '10px', textAlign: 'center', color: 'var(--cor-erro)', fontWeight: '500' }}>Não ofertado</td>
                        </tr>
                      );
                    }

                    const tipo = cot.tipoUnidade || 'Unidade';
                    const qtdInterna = Number(cot.quantidadePacote) || 1;
                    let qtdComprar = item.quantidade;
                    if (tipo === 'Pacote' || tipo === 'Caixa') {
                      qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
                    }
                    const descItem = Number(cot.desconto) || 0;
                    const subtotal = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100);

                    return (
                      <tr key={item.codigo} style={{ borderBottom: '1px solid var(--cor-borda-cartao)', background: 'var(--cor-fundo-cartao)' }}>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: '600', color: 'var(--cor-texto-principal)' }}>{item.descricao}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', marginTop: '3px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {item.codigo && <span>Cód: <strong>{item.codigo}</strong></span>}
                            {precoOmie > 0 && (
                              <span style={{ color: 'var(--cor-destaque)', background: 'var(--cor-fundo-sutil)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--cor-borda-cartao)', fontWeight: '500' }}>
                                Ref. Omie: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoOmie)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>{item.quantidade}</td>
                        <td style={{ padding: '10px', fontWeight: '600', color: 'var(--cor-texto-principal)' }}>{detectarMarca(cot, item)}</td>
                        <td style={{ padding: '10px', color: 'var(--cor-texto-principal)' }}>
                          {tipo === 'Unidade' ? 'Unid.' : `${tipo} c/${qtdInterna}`}
                        </td>
                        <td style={{ padding: '10px', color: 'var(--cor-texto-principal)' }}>{cot.previsaoDias} d</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                            {/* ANTES: Histórico / Venda Omie */}
                            {precoOmie > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--cor-texto-secundario)' }}>
                                <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--cor-texto-secundario)', textTransform: 'uppercase' }}>Antes (Omie):</span>
                                <span style={{ textDecoration: 'line-through', fontWeight: '500' }}>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoOmie)}
                                </span>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.72rem', color: 'var(--cor-texto-secundario)' }}>
                                <span>Antes (Omie): S/ histórico</span>
                              </div>
                            )}

                            {/* DEPOIS: Preço Atual Ofertado */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {precoOmie > 0 && (
                                <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--cor-destaque)', textTransform: 'uppercase' }}>Depois:</span>
                              )}
                              <span style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--cor-texto-principal)' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cot.valorUnitario)}
                              </span>
                            </div>

                            {/* Variação Percentual (Economia ou Aumento) */}
                            {precoOmie > 0 && cot.valorUnitario > 0 && (() => {
                              const diff = Number(cot.valorUnitario) - precoOmie;
                              const perc = ((diff / precoOmie) * 100).toFixed(1);
                              if (diff < 0) {
                                return (
                                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--cor-sucesso)', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                                    📉 Economia: {Math.abs(perc)}% (-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(diff))})
                                  </span>
                                );
                              } else if (diff > 0) {
                                return (
                                  <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--cor-erro)', background: 'rgba(239, 68, 68, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                                    📈 Variação: +{perc}% (+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(diff)})
                                  </span>
                                );
                              } else {
                                return (
                                  <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--cor-texto-secundario)', background: 'var(--cor-fundo-sutil)', padding: '1px 6px', borderRadius: '4px' }}>
                                    Mesmo valor Omie
                                  </span>
                                );
                              }
                            })()}

                            {/* Badges de Origem */}
                            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                              {(cot.origem === 'portal' || modalPlanilha.resumo.origem === 'portal') ? (
                                <span style={{ fontSize: '0.68rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--cor-sucesso)', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                  Preço do Link
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', background: 'rgba(192, 38, 211, 0.15)', color: '#c026d3', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', border: '1px solid rgba(192, 38, 211, 0.3)' }}>
                                  Preço do PDF
                                </span>
                              )}
                            </div>

                            {descItem > 0 && <div style={{ fontSize: '0.75rem', color: 'var(--cor-sucesso)' }}>-{descItem}% Desc</div>}
                          </div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '20px', background: 'var(--cor-fundo-secundario)', borderTop: '1px solid var(--cor-borda-cartao)', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right', background: 'var(--cor-fundo-cartao)', padding: '15px 25px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--cor-texto-secundario)', marginBottom: '5px' }}>Total Calculado:</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--cor-destaque)' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(modalPlanilha.resumo.valorSemDescontoGeral || modalPlanilha.resumo.valorTotal)}
                </div>
                {Number(modalPlanilha.resumo.descontoGeral) > 0 && (
                  <>
                    <div style={{ fontSize: '0.9rem', color: 'var(--cor-sucesso)', marginTop: '5px' }}>Desconto Geral: -{modalPlanilha.resumo.descontoGeral}%</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--cor-sucesso)', marginTop: '5px', borderTop: '1px solid var(--cor-borda-cartao)', paddingTop: '5px' }}>
                      Valor Final Ofertado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(modalPlanilha.resumo.valorTotal)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assistente de IA Modal */}
      <AssistenteIAOrcamento 
        isOpen={modalIAAberto}
        onClose={() => setModalIAAberto(false)}
        reqId={dadosModalIA.reqId}
        fornId={dadosModalIA.fornId}
        fornNome={dadosModalIA.fornNome}
        tipo={dadosModalIA.tipo}
        onTextSaved={handleTextSaved}
        onPrecosExtraidos={handlePrecosExtraidos}
      />

      <ChatConsultorGlobal 
        isOpen={modalChatGlobalAberto}
        onClose={() => setModalChatGlobalAberto(false)}
        req={reqIdChatGlobal}
        requisicoes={requisicoes}
        onMudarReq={(novaReq) => setReqIdChatGlobal(novaReq)}
        textosCotacoes={textosCotacoes}
        fornecedores={fornecedores}
        onSelecionarVencedor={(fornId) => selecionarVencedorGlobal(reqIdChatGlobal?.id, fornId)}
        onAprovar={() => {
          handleAprovarOrcamento(reqIdChatGlobal?.id);
          setModalChatGlobalAberto(false);
        }}
      />

    </div>
  );
};

export default Orcamentos;
