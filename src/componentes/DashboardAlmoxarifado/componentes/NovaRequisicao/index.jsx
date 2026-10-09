import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowUpRight, Save, Printer, Search, Plus, Trash2, ShoppingCart,
  MapPin, Tag, Calendar, AlertTriangle, CheckCircle2, Clock, Box, Info
} from 'lucide-react';
import styles from './NovaRequisicao.module.css';
import {
  obterBadgeInfo,
  obterRotuloUnidade,
  permiteDecimais,
  formatarQuantidade,
  formatarQuantidadeComUnidade
} from '../../../../utils/classificadorUnidades';

// Helpers para extração robusta de metadados do cadastro de produtos
const extrairEndereco = (prod) => {
  if (!prod) return '-';
  const c = prod.caracteristicas || [];
  const end = c.find(x => {
    const n = (x.cNomeCaract || x.nome || '').toUpperCase();
    return n === 'ENDEREÇO' || n === 'ENDERECO' || n === 'LOCALIZAÇÃO' || n === 'LOCALIZACAO';
  });
  if (end) return end.cConteudo || end.conteudo || '-';

  const corredor = c.find(x => (x.cNomeCaract || x.nome)?.toUpperCase() === 'CORREDOR');
  const prateleira = c.find(x => (x.cNomeCaract || x.nome)?.toUpperCase() === 'PRATELEIRA');
  if (corredor || prateleira) {
    const cVal = corredor?.cConteudo || corredor?.conteudo || '-';
    const pVal = prateleira?.cConteudo || prateleira?.conteudo || '-';
    return `Corr: ${cVal} / Prat: ${pVal}`;
  }

  return prod.endereco || prod.localizacao || '-';
};

const extrairMarca = (prod) => {
  if (!prod) return '-';
  const c = prod.caracteristicas || [];
  const m = c.find(x => (x.cNomeCaract || x.nome)?.toUpperCase() === 'MARCA');
  if (m) return m.cConteudo || m.conteudo || '-';
  return prod.marca || '-';
};

const extrairValidadeData = (prod) => {
  if (!prod) return null;
  if (prod.lotes && prod.lotes.length > 0) {
    const lotesAtivos = prod.lotes.filter(l => (Number(l.quantidade) || 0) > 0);
    const lotesParaOrdenar = lotesAtivos.length > 0 ? lotesAtivos : prod.lotes;
    const loteMaisAntigo = [...lotesParaOrdenar].sort((a, b) => new Date(a.validade) - new Date(b.validade))[0];
    return loteMaisAntigo?.validade || null;
  }
  return prod.data_validade || prod.validade || null;
};

const renderValidadeBadge = (dataString) => {
  if (!dataString) return <span style={{ color: 'var(--cor-texto-secundario)', fontSize: '0.8rem' }}>-</span>;

  const dataVal = new Date(dataString);
  const utcDate = new Date(dataVal.getTime() + dataVal.getTimezoneOffset() * 60000);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const limiteProximo = new Date();
  limiteProximo.setDate(limiteProximo.getDate() + 30);

  let corBase = '#10b981';
  let bgBase = 'rgba(16, 185, 129, 0.1)';
  let borderBase = 'rgba(16, 185, 129, 0.25)';
  let Icone = CheckCircle2;

  if (utcDate < hoje) {
    corBase = '#ef4444';
    bgBase = 'rgba(239, 68, 68, 0.1)';
    borderBase = 'rgba(239, 68, 68, 0.25)';
    Icone = AlertTriangle;
  } else if (utcDate <= limiteProximo) {
    corBase = '#f59e0b';
    bgBase = 'rgba(245, 158, 11, 0.1)';
    borderBase = 'rgba(245, 158, 11, 0.25)';
    Icone = Clock;
  }

  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: '600',
      color: corBase, backgroundColor: bgBase,
      padding: '2px 7px', borderRadius: '5px',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      whiteSpace: 'nowrap', border: `1px solid ${borderBase}`
    }}>
      <Icone size={12} />
      <span>{utcDate.toLocaleDateString('pt-BR')}</span>
    </span>
  );
};

const NovaRequisicao = ({ produtos, itensIniciais = [], tipoInicial = 'saida', onVoltar }) => {
  const usuarioLogado = React.useMemo(() => {
    try {
      const u = localStorage.getItem('almoxarifado_user');
      return u ? JSON.parse(u) : {};
    } catch (e) {
      return {};
    }
  }, []);

  const [termoBusca, setTermoBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeItem, setQuantidadeItem] = useState(1);
  const [itensCarrinho, setItensCarrinho] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [locaisEstoque, setLocaisEstoque] = useState([]);

  const buscaInputRef = useRef(null);
  const qtdInputRef = useRef(null);

  // Estados do Modal de Cadastro Rápido
  const [modalCadastro, setModalCadastro] = useState({ aberto: false, tipo: null, titulo: '', campoTarget: '' });
  const [novoValorModal, setNovoValorModal] = useState('');

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await fetch('/api/fornecedores');
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
        const res = await fetch('/api/vendedores');
        if (res.ok) {
          const listaVends = await res.json();
          setVendedores(listaVends);

          const nomeLogin = (usuarioLogado.nome || '').trim().toUpperCase();
          if (nomeLogin) {
            // 1. Prioridade 1: Match 100% exato pelo nome completo
            let match = listaVends.find(v => {
              const vNome = (v.nome || '').trim().toUpperCase();
              const vFant = (v.nome_fantasia || '').trim().toUpperCase();
              return vNome === nomeLogin || vFant === nomeLogin;
            });

            // 2. Prioridade 2: Fallback por prefixo seguro (mínimo 4 caracteres)
            if (!match && nomeLogin.length >= 4) {
              const candidatos = listaVends.filter(v => {
                const vNome = (v.nome || '').trim().toUpperCase();
                return vNome.length >= 4 && (vNome.startsWith(nomeLogin) || nomeLogin.startsWith(vNome));
              });
              if (candidatos.length > 0) {
                candidatos.sort((a, b) => (b.nome || '').length - (a.nome || '').length);
                match = candidatos[0];
              }
            }

            if (match) {
              setFormulario(prev => ({
                ...prev,
                vendedor: prev.vendedor || match.nome,
                codigoVendedorOmie: match.codigoVendedorOmie || match.codigo || null
              }));
            }
          }
        }
      } catch (err) {
        console.error('Erro ao buscar vendedores:', err);
      }
    };
    fetchVendedores();

    const fetchDepartamentos = async () => {
      try {
        const res = await fetch('/api/departamentos');
        if (res.ok) {
          const deps = await res.json();
          setDepartamentos(deps);
          if (deps.length > 0) {
            setFormulario(prev => {
              if (prev.codigoDepartamentoOmie) return prev;
              const match = deps.find(d => (d.descricao || '').toUpperCase() === (prev.centroCusto || '').toUpperCase()) || deps[0];
              return {
                ...prev,
                centroCusto: match.descricao,
                codigoDepartamentoOmie: match.codigo
              };
            });
          }
        }
      } catch (err) { console.error('Erro ao buscar departamentos:', err); }
    };
    fetchDepartamentos();

    const fetchProjetos = async () => {
      try {
        const [resProj, resOs] = await Promise.all([
          fetch('/api/projetos'),
          fetch('/api/os')
        ]);

        let listaCombinada = [];

        if (resProj.ok) {
          const projs = await resProj.json();
          listaCombinada = projs.map(p => ({
            codigo: p.codigo,
            nome: p.nome,
            codigoOmie: p.codigo
          }));
        }

        if (resOs.ok) {
          const ordens = await resOs.json();
          ordens.forEach(os => {
            const veiculosStr = os.veiculos?.map(v => v.placa).filter(Boolean).join(', ');
            const infoVeiculos = veiculosStr ? ` (${veiculosStr})` : '';
            const labelOs = `${os.codigo}${infoVeiculos}`;

            // Tenta casar a OS com algum projeto já existente na Omie
            const osLimpa = String(os.codigo).replace(/\D/g, '');
            const matchOmie = listaCombinada.find(p => {
              const pLimpo = String(p.nome).replace(/\D/g, '');
              return (pLimpo && pLimpo === osLimpa) || p.nome === os.codigo;
            });

            listaCombinada.unshift({
              codigo: os.codigo,
              nome: labelOs,
              codigoOmie: matchOmie ? matchOmie.codigoOmie : null,
              osCodigo: os.codigo
            });
          });
        }

        setProjetos(listaCombinada);
      } catch (err) { console.error('Erro ao buscar projetos e O.S.:', err); }
    };
    fetchProjetos();

    const fetchLocaisEstoque = async () => {
      try {
        const res = await fetch('/api/locais-estoque');
        if (res.ok) setLocaisEstoque(await res.json());
      } catch (err) { console.error('Erro ao buscar locais de estoque:', err); }
    };
    fetchLocaisEstoque();

    if (itensIniciais && itensIniciais.length > 0) {
      const itensFormatados = itensIniciais.map(p => ({
        codigo: p.codigo,
        descricao: p.descricao,
        valor_unitario: p.valor_unitario,
        quantidade: Math.max(1, (p.estoque_minimo || 0) - (p.quantidade_estoque || 0)),
        unidade: p.unidade || 'UN',
        endereco: extrairEndereco(p),
        marca: extrairMarca(p),
        validade: extrairValidadeData(p)
      }));
      setItensCarrinho(itensFormatados);
    }
  }, [itensIniciais, usuarioLogado.nome]);

  const [formulario, setFormulario] = useState({
    dataLancamento: new Date().toISOString().split('T')[0],
    localEstoque: '01 - Almoxarifado',
    centroCusto: 'GRANJA',
    codigoDepartamentoOmie: null,
    contatoCliente: '',
    codigoClienteOmie: null,
    vendedor: usuarioLogado.nome || '',
    entregador: usuarioLogado.nome || '',
    codigoVendedorOmie: null,
    numeroOS: '',
    codigoProjetoOmie: null,
    concluirAutomaticamenteOmie: false
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
    }).slice(0, 15)
    : [];

  const handleSelecionarProduto = (prod) => {
    if (prod.lotes && prod.lotes.length > 0) {
      const loteMaisAntigo = [...prod.lotes].sort((a, b) => new Date(a.validade) - new Date(b.validade))[0];
      const dataVal = new Date(loteMaisAntigo.validade);
      const utcDate = new Date(dataVal.getTime() + dataVal.getTimezoneOffset() * 60000);
      alert(`⚠️ ALERTA FEFO ⚠️\n\nEste produto possui múltiplos lotes. Para evitar perdas, pegue OBRIGATORIAMENTE os itens do LOTE:\n\n👉 LOTE: ${loteMaisAntigo.numero}\n⏳ VENCE EM: ${utcDate.toLocaleDateString('pt-BR')}`);
    }
    setProdutoSelecionado(prod);
    setTermoBusca('');
    setQuantidadeItem(1);
    setTimeout(() => {
      if (qtdInputRef.current) {
        qtdInputRef.current.focus();
        qtdInputRef.current.select();
      }
    }, 100);
  };

  const handleKeyDownBusca = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const termo = termoBusca.trim().toLowerCase();
      if (!termo) return;

      const exato = produtos.find(p =>
        (p.codigo || '').toLowerCase() === termo ||
        (p.ean || '').toLowerCase() === termo ||
        p.lotes?.some(l => (l.ean || '').toLowerCase() === termo)
      );

      if (exato) {
        handleSelecionarProduto(exato);
        return;
      }

      if (produtosFiltrados.length === 1) {
        handleSelecionarProduto(produtosFiltrados[0]);
      }
    }
  };

  const handleChangeForm = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormulario(prev => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === 'centroCusto') {
      const matchDep = departamentos.find(d => String(d.codigo) === String(value) || (d.descricao || '').toUpperCase() === String(value).toUpperCase());
      if (matchDep) {
        setFormulario(prev => ({
          ...prev,
          centroCusto: matchDep.descricao,
          codigoDepartamentoOmie: matchDep.codigo
        }));
      } else {
        setFormulario(prev => ({
          ...prev,
          centroCusto: value,
          codigoDepartamentoOmie: null
        }));
      }
    } else if (name === 'localEstoque' || name === 'dataLancamento') {
      setFormulario(prev => ({ ...prev, [name]: value }));
    } else if (name === 'contatoCliente') {
      const valUpper = value.toUpperCase();
      const match = clientes.find(c =>
        (c.razao_social && c.razao_social.trim().toUpperCase() === valUpper.trim()) ||
        (c.nome_fantasia && c.nome_fantasia.trim().toUpperCase() === valUpper.trim()) ||
        String(c.codigo_cliente_omie) === valUpper.trim()
      );
      setFormulario(prev => ({
        ...prev,
        contatoCliente: valUpper,
        codigoClienteOmie: match ? match.codigo_cliente_omie : (prev.codigoClienteOmie || null)
      }));
    } else if (name === 'vendedor') {
      const valUpper = value.toUpperCase().trim();
      // 1. Prioridade 1: Match 100% exato
      let match = vendedores.find(v =>
        (v.nome && v.nome.trim().toUpperCase() === valUpper) ||
        (v.nome_fantasia && v.nome_fantasia.trim().toUpperCase() === valUpper) ||
        String(v.codigo) === valUpper ||
        String(v.codigoVendedorOmie) === valUpper
      );

      // 2. Prioridade 2: Fallback por prefixo seguro (mínimo 4 caracteres)
      if (!match && valUpper.length >= 4) {
        const candidatos = vendedores.filter(v => {
          const vNome = (v.nome || '').trim().toUpperCase();
          return vNome.length >= 4 && (vNome.startsWith(valUpper) || valUpper.startsWith(vNome));
        });
        if (candidatos.length > 0) {
          candidatos.sort((a, b) => (b.nome || '').length - (a.nome || '').length);
          match = candidatos[0];
        }
      }

      setFormulario(prev => ({
        ...prev,
        vendedor: value.toUpperCase(),
        entregador: value.toUpperCase(),
        codigoVendedorOmie: match ? (match.codigoVendedorOmie || match.codigo || null) : prev.codigoVendedorOmie
      }));
    } else if (name === 'numeroOS') {
      const valUpper = value.toUpperCase();
      const valLimpo = valUpper.replace(/\D/g, '');
      const match = projetos.find(p => {
        const pNomeUpper = (p.nome || '').toUpperCase();
        const pNomeLimpo = pNomeUpper.replace(/\D/g, '');
        return (
          pNomeUpper === valUpper ||
          (p.osCodigo && p.osCodigo.toUpperCase() === valUpper) ||
          (valLimpo && pNomeLimpo === valLimpo) ||
          pNomeUpper.startsWith(valUpper) ||
          valUpper.startsWith(pNomeUpper) ||
          String(p.codigo) === valUpper
        );
      });

      setFormulario(prev => ({
        ...prev,
        numeroOS: valUpper,
        codigoProjetoOmie: match?.codigoOmie || (match && typeof match.codigo === 'number' ? match.codigo : null) || prev.codigoProjetoOmie || null
      }));
    } else {
      setFormulario(prev => ({ ...prev, [name]: value.toUpperCase() }));
    }
  };

  const handleAbrirModalCadastro = (tipo, titulo, campoTarget) => {
    setModalCadastro({ aberto: true, tipo, titulo, campoTarget });
    setNovoValorModal('');
  };

  const handleSalvarModalCadastro = async () => {
    const valor = novoValorModal.trim();
    if (!valor) {
      setModalCadastro({ aberto: false, tipo: null, titulo: '', campoTarget: '' });
      return;
    }

    if (modalCadastro.tipo === 'departamento') {
      try {
        const resp = await fetch('/api/departamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descricao: valor })
        });
        if (resp.ok) {
          const dados = await resp.json();
          const novoDep = dados.departamento;
          setDepartamentos(prev => [...prev, novoDep]);
          setFormulario(prev => ({
            ...prev,
            centroCusto: novoDep.descricao,
            codigoDepartamentoOmie: novoDep.codigo
          }));
        }
      } catch (err) {
        console.error('Erro ao cadastrar departamento:', err);
      }
    } else {
      setFormulario(prev => ({ ...prev, [modalCadastro.campoTarget]: valor }));
    }
    setModalCadastro({ aberto: false, tipo: null, titulo: '', campoTarget: '' });
  };

  const handleAdicionarLista = () => {
    const qtdNum = parseFloat(String(quantidadeItem).replace(',', '.'));
    if (!produtoSelecionado || isNaN(qtdNum) || qtdNum <= 0) return;

    const endereco = extrairEndereco(produtoSelecionado);
    const marca = extrairMarca(produtoSelecionado);
    const validadeData = extrairValidadeData(produtoSelecionado);
    const unidade = produtoSelecionado.unidade || 'UN';

    // Verifica se já existe o item, se sim, soma a qtd
    const itemExistente = itensCarrinho.find(i => i.codigo === produtoSelecionado.codigo);

    if (itemExistente) {
      setItensCarrinho(itensCarrinho.map(i =>
        i.codigo === produtoSelecionado.codigo
          ? { ...i, quantidade: Number(i.quantidade) + qtdNum }
          : i
      ));
    } else {
      setItensCarrinho([...itensCarrinho, {
        codigo: produtoSelecionado.codigo,
        descricao: produtoSelecionado.descricao,
        valor_unitario: produtoSelecionado.valor_unitario,
        quantidade: qtdNum,
        unidade,
        endereco,
        marca,
        validade: validadeData
      }]);
    }

    // Limpa a seleção para bipar o próximo
    setProdutoSelecionado(null);
    setQuantidadeItem(1);
    setTimeout(() => {
      if (buscaInputRef.current) {
        buscaInputRef.current.focus();
      }
    }, 100);
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

    const vendedorFinal = (formulario.vendedor || usuarioLogado.nome || 'ALMOXARIFADO').trim().toUpperCase();

    const payload = {
      cfop: '5.949',
      icms: '40',
      origem: 'balcao_almoxarifado',
      status: tipoInicial === 'reposicao' ? 'pendente' : 'finalizado',
      tipo: tipoInicial,
      ...formulario,
      vendedor: vendedorFinal,
      entregador: vendedorFinal,
      itens: itensCarrinho.map(item => ({
        ...item,
        status: tipoInicial === 'reposicao' ? 'aguardando_cotacao' : 'entregue',
        quantidade_entregue: Number(item.quantidade),
        devolvido: 0
      }))
    };

    try {
      const response = await fetch('/api/requisicoes', {
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

      if (!printWindow) {
        alert('⚠️ O seu navegador bloqueou a janela de impressão! Por favor, libere os pop-ups para este site para imprimir o comprovante.');
        // Continua a execução normalmente (limpa o formulário, etc)
      } else {
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
                      <th style="text-align: left; width: 45px;">Qtd</th>
                      <th style="text-align: left;">Produto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${req.itens?.map(item => `
                      <tr>
                        <td style="padding-right: 4px; font-weight: bold;">${formatarQuantidadeComUnidade(item.quantidade, item.unidade)}</td>
                        <td><div style="font-weight:bold;">${item.codigo}</div><div style="font-size: 8px; line-height: 1.1;">${item.descricao}</div></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>

                <div class="recibo-divider"></div>
                <p style="text-align: right; margin: 4px 0;"><strong>Total de Itens: ${req.itens?.length || totalItens}</strong></p>
                
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
                      <th style="text-align: left; width: 45px;">Qtd</th>
                      <th style="text-align: left;">Produto</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${req.itens?.map(item => `
                      <tr>
                        <td style="padding-right: 4px; font-weight: bold;">${formatarQuantidadeComUnidade(item.quantidade, item.unidade)}</td>
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
      }

      setItensCarrinho([]);
      setFormulario(prev => ({
        ...prev,
        contatoCliente: '',
        numeroOS: '',
        codigoClienteOmie: null,
        codigoProjetoOmie: null
      }));

      setTimeout(() => {
        if (onVoltar) onVoltar();
      }, 1500);

    } catch (error) {
      setMensagem({ tipo: 'erro', texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onVoltar && (
            <button type="button" onClick={onVoltar} className={styles.btnVoltar} title="Voltar para a fila de pedidos">
              <ArrowLeft size={18} />
              <span>Voltar</span>
            </button>
          )}
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
              <label>Data</label>
              <input
                type="date"
                name="dataLancamento"
                value={formulario.dataLancamento}
                onChange={handleChangeForm}
              />
            </div>
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
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Centro de Custo / Depto
                <button type="button" onClick={() => handleAbrirModalCadastro('departamento', 'Cadastrar Novo Departamento (Omie)', 'centroCusto')} title="Novo Departamento" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-destaque)', padding: 0 }}>
                  <Plus size={16} />
                </button>
              </label>
              <select
                name="centroCusto"
                value={formulario.codigoDepartamentoOmie || formulario.centroCusto}
                onChange={handleChangeForm}
              >
                {departamentos.length > 0 ? (
                  departamentos.map(dep => (
                    <option key={dep.codigo} value={dep.codigo}>
                      {dep.descricao} {dep.estrutura ? `(${dep.estrutura})` : ''}
                    </option>
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
                    <option
                      key={c.codigo_cliente_omie}
                      value={c.razao_social}
                    >
                      {c.nome_fantasia && c.nome_fantasia !== c.razao_social ? `${c.nome_fantasia} (${c.razao_social})` : c.razao_social}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className={styles.formGroup}>
                <label>Vendedor / Estoquista (Login)</label>
                <input
                  id="input-vendedor"
                  type="text"
                  name="vendedor"
                  list="lista-vendedores"
                  placeholder="Selecione ou confirme o vendedor..."
                  value={formulario.vendedor}
                  onChange={handleChangeForm}
                />
                <datalist id="lista-vendedores">
                  {vendedores.filter(v => v.inativo !== 'S').map(v => (
                    <option key={v.codigo} value={v.nome}>
                      {v.nome_fantasia && v.nome_fantasia !== v.nome ? `${v.nome_fantasia} (${v.nome})` : v.nome}
                    </option>
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

          {tipoInicial !== 'reposicao' && (
            <div className={styles.boxIntegracaoOmie}>
              <label className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  name="concluirAutomaticamenteOmie"
                  checked={formulario.concluirAutomaticamenteOmie}
                  onChange={handleChangeForm}
                />
                <span className={styles.checkboxLabel}>
                  Concluir automaticamente na Omie (Faturar / Baixar direto)
                </span>
                {!formulario.concluirAutomaticamenteOmie && (
                  <span className={styles.badgePendenteAviso}>
                    Recomendado: Ficará Pendente na Omie
                  </span>
                )}
              </label>

              <div className={styles.alertaRateioOmie}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#f59e0b' }} />
                <div>
                  <strong>Aviso de Rateio de Departamentos:</strong> A API de Remessas da Omie não permite sincronizar a tabela de distribuição de rateio por departamentos via integração.
                  <br />
                  <span>
                    💡 <em>Ao deixar <strong>desmarcado</strong> (recomendado), a remessa é enviada como <strong>Pendente</strong> na Omie. Você poderá abrir a remessa no ERP, vincular o departamento na aba "Departamentos" e concluir por lá com segurança.</em>
                  </span>
                </div>
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
                      ref={buscaInputRef}
                      type="text"
                      placeholder="Bipe o código de barras ou digite o nome..."
                      value={termoBusca}
                      onChange={(e) => setTermoBusca(e.target.value)}
                      onKeyDown={handleKeyDownBusca}
                      autoFocus
                    />
                  </div>
                  {produtosFiltrados.length > 0 && (
                    <ul className={styles.listaResultados}>
                      {produtosFiltrados.map(p => {
                        const b = obterBadgeInfo(p.unidade);
                        const end = extrairEndereco(p);
                        const mrc = extrairMarca(p);
                        const valData = extrairValidadeData(p);

                        return (
                          <li key={p.codigo_produto || p.codigo} onClick={() => handleSelecionarProduto(p)}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div>
                                <strong style={{ color: 'var(--cor-destaque)' }}>{p.codigo}</strong>
                                <span style={{ margin: '0 6px', color: 'var(--cor-texto-secundario)' }}>—</span>
                                <strong style={{ color: 'var(--cor-texto-principal)' }}>{p.descricao}</strong>
                              </div>
                              <span style={{
                                fontSize: '0.68rem', fontWeight: 'bold',
                                color: b.cor, backgroundColor: b.bg,
                                border: `1px solid ${b.border}`,
                                padding: '1px 6px', borderRadius: '4px',
                                display: 'inline-flex', alignItems: 'center', gap: '3px'
                              }}>
                                <span>{b.icone}</span> {b.label}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: 'var(--cor-texto-secundario)', marginTop: '2px', flexWrap: 'wrap' }}>
                              <span>📍 <strong>Endereço:</strong> <span style={{ color: '#60a5fa' }}>{end}</span></span>
                              <span>🏷️ <strong>Marca:</strong> <span style={{ color: '#c084fc' }}>{mrc}</span></span>
                              <span>⏳ <strong>Validade:</strong> {valData ? new Date(valData).toLocaleDateString('pt-BR') : '-'}</span>
                              <span>📦 <strong>Estoque:</strong> <strong style={{ color: p.quantidade_estoque <= 0 ? 'var(--cor-erro)' : 'var(--cor-sucesso)' }}>{formatarQuantidadeComUnidade(p.quantidade_estoque, p.unidade)}</strong></span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <div className={styles.produtoSelecionado}>
                  <div className={styles.prodInfo}>
                    <div className={styles.prodHeader}>
                      <span className={styles.prodCode}>{produtoSelecionado.codigo}</span>
                      <span className={styles.prodName}>{produtoSelecionado.descricao}</span>
                      {(() => {
                        const b = obterBadgeInfo(produtoSelecionado.unidade);
                        return (
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 'bold',
                            color: b.cor, backgroundColor: b.bg,
                            border: `1px solid ${b.border}`,
                            padding: '2px 8px', borderRadius: '5px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <span>{b.icone}</span> {b.label}
                          </span>
                        );
                      })()}
                    </div>

                    <div className={styles.prodMetadados}>
                      <span className={`${styles.metaChip} ${styles.metaChipEndereco}`} title="Localização física no almoxarifado">
                        <MapPin size={13} />
                        <span>Endereço:</span>
                        <strong>{extrairEndereco(produtoSelecionado)}</strong>
                      </span>

                      <span className={`${styles.metaChip} ${styles.metaChipMarca}`} title="Marca / Fabricante">
                        <Tag size={13} />
                        <span>Marca:</span>
                        <strong>{extrairMarca(produtoSelecionado)}</strong>
                      </span>

                      <span className={styles.metaChip} title="Data de Validade / Lote">
                        <Calendar size={13} />
                        <span>Validade:</span>
                        {renderValidadeBadge(extrairValidadeData(produtoSelecionado))}
                      </span>

                      <span className={styles.metaChip} title="Saldo disponível no estoque">
                        <Box size={13} />
                        <span>Estoque:</span>
                        <strong style={{ color: produtoSelecionado.quantidade_estoque <= 0 ? 'var(--cor-erro)' : 'var(--cor-sucesso)' }}>
                          {formatarQuantidadeComUnidade(produtoSelecionado.quantidade_estoque, produtoSelecionado.unidade)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <button className={styles.btnLimparProd} onClick={() => { setProdutoSelecionado(null); setTimeout(() => buscaInputRef.current?.focus(), 50); }}>
                    Trocar
                  </button>
                </div>
              )}
            </div>

            <div className={styles.qtdWrapper}>
              <label>
                Qtd ({produtoSelecionado ? obterRotuloUnidade(produtoSelecionado.unidade) : 'un'})
              </label>
              <input
                ref={qtdInputRef}
                type="number"
                min={permiteDecimais(produtoSelecionado?.unidade) ? "0.01" : "1"}
                step={permiteDecimais(produtoSelecionado?.unidade) ? "0.01" : "1"}
                value={quantidadeItem}
                onChange={(e) => setQuantidadeItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdicionarLista();
                  }
                }}
                disabled={!produtoSelecionado}
              />
            </div>

            <button
              className={styles.btnAdicionarLista}
              onClick={handleAdicionarLista}
              disabled={!produtoSelecionado || Number(quantidadeItem) <= 0}
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
                    <th>Endereço</th>
                    <th>Marca</th>
                    <th>Validade</th>
                    <th style={{ textAlign: 'right' }}>Qtd</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensCarrinho.map((item) => (
                    <tr key={item.codigo}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ color: 'var(--cor-texto-principal)' }}>{item.codigo}</strong>
                          {(() => {
                            const b = obterBadgeInfo(item.unidade);
                            return (
                              <span style={{
                                fontSize: '0.65rem', fontWeight: 'bold',
                                color: b.cor, backgroundColor: b.bg,
                                padding: '1px 5px', borderRadius: '4px',
                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                                width: 'fit-content'
                              }}>
                                {b.icone} {b.label}
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td>{item.descricao}</td>
                      <td className={styles.colEndereco}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} color="#3b82f6" /> {item.endereco || '-'}
                        </span>
                      </td>
                      <td className={styles.colMarca}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Tag size={12} color="#a855f7" /> {item.marca || '-'}
                        </span>
                      </td>
                      <td className={styles.colValidade}>
                        {renderValidadeBadge(item.validade)}
                      </td>
                      <td className={styles.tdQtd} style={{ textAlign: 'right' }}>
                        {formatarQuantidadeComUnidade(item.quantidade, item.unidade)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
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
          <p>
            <strong>Automação Omie:</strong> CFOP 5.949 | ICMS 40 (Isenta) | Remessa:{' '}
            <span style={{ color: formulario.concluirAutomaticamenteOmie ? 'var(--cor-sucesso)' : '#f59e0b', fontWeight: 'bold' }}>
              {formulario.concluirAutomaticamenteOmie ? 'Conclusão Automática' : 'Pendente (Aguardando Rateio no ERP)'}
            </span>
          </p>
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
