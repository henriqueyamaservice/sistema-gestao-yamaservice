import React, { useState, useEffect, useRef } from 'react';
import {
  X, FileText, CheckCircle2, AlertCircle, Plus, Trash2,
  DollarSign, PackageCheck, Building2, Calendar, Link, Ban, PlusCircle, ArrowRight,
  AlertTriangle, ShieldAlert, ArrowDownRight, Tag, Info, Clock, Truck, Zap,
  ExternalLink, Warehouse, ChevronLeft, ChevronRight, Edit3, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import styles from './ModalConferenciaNFe.module.css';

const formatarNomeLocal = (loc) => {
  if (!loc) return '01 - Almoxarifado';
  const cod = String(loc.codigo || loc.codigo_local_estoque || '').trim();
  const desc = String(loc.descricao || '').trim();
  if (!desc) return cod;
  if (!cod) return desc;
  if (desc.startsWith(cod)) return desc;
  return `${cod} - ${desc}`;
};

const ModalConferenciaNFe = ({
  isOpen,
  onClose,
  nota,
  produtos = [],
  requisicoes = [],
  onConcluido
}) => {
  // 7 Abas Oficiais da Omie: 'itens' | 'transporte' | 'totais' | 'parcelas' | 'departamentos' | 'info_adicionais' | 'observacoes'
  const [abaAtiva, setAbaAtiva] = useState('itens');
  const bodyRef = useRef(null);
  const [dadosGeraisAberto, setDadosGeraisAberto] = useState(true);

  const mudarAba = (novaAba) => {
    setAbaAtiva(novaAba);
    if (bodyRef.current) {
      bodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [reqId, setReqId] = useState('');
  const [mapeamentos, setMapeamentos] = useState({});
  const [cfops, setCfops] = useState({});
  const [locaisEstoque, setLocaisEstoque] = useState({});
  const [quantidadesRecebidas, setQuantidadesRecebidas] = useState({});
  const [unidadesEstoque, setUnidadesEstoque] = useState({});
  const [ncms, setNcms] = useState({});
  const [eans, setEans] = useState({});
  const [naoGerarContaPagarItem, setNaoGerarContaPagarItem] = useState({});
  const [naoMovimentarEstoqueItem, setNaoMovimentarEstoqueItem] = useState({});
  const [itemIndexEdicao, setItemIndexEdicao] = useState(null); // Índice do item aberto no submodal
  const [abaTributoItem, setAbaTributoItem] = useState('icms'); // Sub-aba do item: 'icms' | 'st' | 'ipi' | 'pis' | 'cofins' | 'info' | 'preco_venda' | 'custo'
  const [tributosItens, setTributosItens] = useState({});

  // Cabeçalho e Dados Gerais da Nota (Totalmente editáveis para manual e XML)
  const [emitenteNome, setEmitenteNome] = useState('');
  const [emitenteCnpjCpf, setEmitenteCnpjCpf] = useState('');
  const [emitenteIe, setEmitenteIe] = useState('');
  const [emitenteUf, setEmitenteUf] = useState('PA');
  const [numeroNF, setNumeroNF] = useState('');
  const [serieNF, setSerieNF] = useState('1');
  const [modeloNF, setModeloNF] = useState('55');
  const [dataEmissaoNF, setDataEmissaoNF] = useState('');
  const [valorTotalNF, setValorTotalNF] = useState(0);
  const [chaveAcessoNF, setChaveAcessoNF] = useState('');
  const [itensDaNota, setItensDaNota] = useState([]);

  // Transporte
  const [tipoFrete, setTipoFrete] = useState('0 - Contratação do Frete por conta do Remetente (CIF)');
  const [previsaoEntrega, setPrevisaoEntrega] = useState('');
  const [transportador, setTransportador] = useState({
    nome: '',
    cnpj_cpf: '',
    ie: '',
    uf: 'PA'
  });
  const [veiculo, setVeiculo] = useState({
    placa: '',
    uf: 'PA',
    rntrc: ''
  });
  const [volumes, setVolumes] = useState({
    qVol: 0,
    esp: 'VOLUMES',
    marca: '',
    nVol: '',
    pesoL: 0,
    pesoB: 0,
    nLacre: ''
  });

  // Totais Tributários
  const [totaisTributos, setTotaisTributos] = useState({
    vBC: 0,
    vICMS: 0,
    vICMSDeson: 0,
    vBCST: 0,
    vST: 0,
    vProd: 0,
    vFrete: 0,
    vSeg: 0,
    vDesc: 0,
    vIPI: 0,
    vPIS: 0,
    vCOFINS: 0,
    vTotTrib: 0,
    vNF: 0,
    vIS: 0,
    vIBS: 0,
    vCBS: 0
  });

  // Departamentos (Rateio)
  const [listaDepartamentos, setListaDepartamentos] = useState([]);
  const [departamentosRateio, setDepartamentosRateio] = useState([]);
  const [deptSelecionadoParaAdicionar, setDeptSelecionadoParaAdicionar] = useState('');

  // Locais de Estoque Omie (locais_estoque_omie)
  const [listaLocaisEstoque, setListaLocaisEstoque] = useState([]);

  // Informações Adicionais
  const [listaProjetos, setListaProjetos] = useState([]);
  const [infoAdicionais, setInfoAdicionais] = useState({
    categoriaCompra: 'Compra de Material para Uso e Consumo',
    contaCorrente: '01 - Banco Principal',
    dataRegistro: new Date().toLocaleDateString('pt-BR'),
    comprador: 'Setor de Compras',
    projeto: 'ALMOXARIFADO',
    infCpl: '',
    infAdFisco: ''
  });

  // Observações
  const [observacoes, setObservacoes] = useState('');

  const [parcelas, setParcelas] = useState([]);
  const [gerarContasPagar, setGerarContasPagar] = useState(true);
  const [liberarAlmoxarifado, setLiberarAlmoxarifado] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const notaKey = nota ? (nota.chaveAcesso || nota.numeroNF || nota.id || 'nota_ativa') : null;

  useEffect(() => {
    if (isOpen) {
      fetch('/api/departamentos')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setListaDepartamentos(d); })
        .catch(() => {});

      fetch('/api/projetos')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setListaProjetos(d); })
        .catch(() => {});

      fetch('/api/locais-estoque')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setListaLocaisEstoque(d); })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (nota && isOpen) {
      setAbaAtiva('itens');
      setErro('');
      setItemIndexEdicao(null);
      setAbaTributoItem('icms');
      const targetReqId = nota.requisicaoSugeridaId || nota.requisicaoId || (requisicoes[0]?.id || '');
      setReqId(targetReqId);

      setEmitenteNome(nota.emitente?.nome || nota.emitente?.xNome || '');
      setEmitenteCnpjCpf(nota.emitente?.cnpj_cpf || nota.emitente?.cnpj || nota.emitente?.cpf || '');
      setEmitenteIe(nota.emitente?.inscrEstadual || nota.emitente?.inscricaoEstadual || nota.emitente?.ie || '');
      setEmitenteUf(nota.emitente?.uf || nota.emitente?.UF || 'PA');
      setNumeroNF(nota.numeroNF || '');
      setSerieNF(nota.serie || '1');
      setModeloNF(nota.modelo || '55');
      setDataEmissaoNF(nota.dataEmissao ? (nota.dataEmissao.includes('-') ? (nota.dataEmissao.includes('T') ? nota.dataEmissao.split('T')[0] : nota.dataEmissao) : nota.dataEmissao) : new Date().toISOString().split('T')[0]);
      setValorTotalNF(Number(nota.valorTotal || 0));
      setChaveAcessoNF(nota.chaveAcesso || '');

      const initialItens = (nota.itens && nota.itens.length > 0) ? [...nota.itens] : [
        { codigo: '', descricao: '', quantidade: 1, unidade: 'UN', valorUnitario: 0, valorTotal: 0, cfop: '1.556', codigo_local_estoque: '01' }
      ];
      setItensDaNota(initialItens);

      // Inicializa mapeamento com auto-match inteligente por código ou descrição, além de CFOP, Local de Estoque e Quantidades
      const initialMap = {};
      const initialCfops = {};
      const initialLocais = {};
      const initialQtds = {};
      const initialUnidades = {};
      const initialNcms = {};
      const initialEans = {};
      const initialNaoConta = {};
      const initialNaoEstoque = {};
      const initialTributos = {};

      initialItens.forEach((item, idx) => {
        const itemKey = item.codigo || `item_${idx}`;
        const match = produtos.find(p =>
          (item.codigo && p.codigo === item.codigo) ||
          (p.descricao && item.descricao && p.descricao.toLowerCase().trim() === item.descricao.toLowerCase().trim())
        );
        if (match) {
          initialMap[itemKey] = match.codigo;
        } else {
          initialMap[itemKey] = '';
        }
        initialCfops[itemKey] = item.cfop || item.cCFOP || '1.556';
        let rawLoc = item.codigo_local_estoque || '01';
        if (typeof rawLoc === 'string' && rawLoc.includes(' - ')) {
          rawLoc = rawLoc.split(' - ')[0];
        }
        initialLocais[itemKey] = rawLoc;
        initialQtds[itemKey] = item.quantidadeRecebida !== undefined ? item.quantidadeRecebida : item.quantidade;
        initialUnidades[itemKey] = item.unidadeEstoque || item.unidade || 'UN';
        initialNcms[itemKey] = item.ncm || '';
        initialEans[itemKey] = item.ean || item.gtin || 'SEM GTIN';
        initialNaoConta[itemKey] = Boolean(item.naoGerarContaPagar);
        initialNaoEstoque[itemKey] = Boolean(item.naoMovimentarEstoque);

        initialTributos[itemKey] = item.tributos || {
          icms: { cst: '00', origem: '0', modalidadeBc: '3', reducaoBcPerc: 0, baseCalculo: Number(item.valorTotal || (item.quantidade * (item.valorUnitario || 0))), aliquotaPerc: 0, valor: 0 },
          st: { baseCalculo: 0, aliquotaPerc: 0, valor: 0 },
          ipi: { aliquotaPerc: 0, valor: 0 },
          pis: { aliquotaPerc: 0, valor: 0 },
          cofins: { aliquotaPerc: 0, valor: 0 },
          info: { texto: '' },
          precoVenda: { margemPerc: 30, precoSugerido: Number((item.valorUnitario || 0) * 1.3).toFixed(2) },
          custo: { custoMedio: Number(item.valorUnitario || 0), custoUltimaEntrada: Number(item.valorUnitario || 0), atualizarCustoEstoque: true }
        };
      });

      setMapeamentos(initialMap);
      setCfops(initialCfops);
      setLocaisEstoque(initialLocais);
      setQuantidadesRecebidas(initialQtds);
      setUnidadesEstoque(initialUnidades);
      setNcms(initialNcms);
      setEans(initialEans);
      setNaoGerarContaPagarItem(initialNaoConta);
      setNaoMovimentarEstoqueItem(initialNaoEstoque);
      setTributosItens(initialTributos);

      // Inicializa Transporte
      if (nota.transporte) {
        setTipoFrete(nota.transporte.tipoFrete || '0 - Contratação do Frete por conta do Remetente (CIF)');
        setPrevisaoEntrega(nota.transporte.previsaoEntrega || '');
        if (nota.transporte.transportador) {
          setTransportador({
            nome: nota.transporte.transportador.xNome || nota.transporte.transportador.nome || '',
            cnpj_cpf: nota.transporte.transportador.cnpj_cpf || '',
            ie: nota.transporte.transportador.ie || '',
            uf: nota.transporte.transportador.uf || 'PA'
          });
        }
        if (nota.transporte.veiculo) {
          setVeiculo({
            placa: nota.transporte.veiculo.placa || '',
            uf: nota.transporte.veiculo.uf || 'PA',
            rntrc: nota.transporte.veiculo.rntrc || ''
          });
        }
        if (nota.transporte.volumes) {
          setVolumes({
            qVol: nota.transporte.volumes.qVol || 0,
            esp: nota.transporte.volumes.esp || '',
            marca: nota.transporte.volumes.marca || '',
            nVol: nota.transporte.volumes.nVol || '',
            pesoL: nota.transporte.volumes.pesoL || 0,
            pesoB: nota.transporte.volumes.pesoB || 0,
            nLacre: nota.transporte.volumes.nLacre || ''
          });
        }
      } else {
        setTipoFrete('0 - Contratação do Frete por conta do Remetente (CIF)');
        setPrevisaoEntrega('');
        setTransportador({ nome: '', cnpj_cpf: '', ie: '', uf: 'PA' });
        setVeiculo({ placa: '', uf: 'PA', rntrc: '' });
        setVolumes({ qVol: 0, esp: '', marca: '', nVol: '', pesoL: 0, pesoB: 0, nLacre: '' });
      }

      // Inicializa Totais Tributários
      if (nota.totaisTributos) {
        setTotaisTributos(nota.totaisTributos);
      } else {
        setTotaisTributos({
          vBC: 0,
          vICMS: 0,
          vICMSDeson: 0,
          vBCST: 0,
          vST: 0,
          vProd: Number(nota.valorTotal || 0),
          vFrete: 0,
          vSeg: 0,
          vDesc: 0,
          vIPI: 0,
          vPIS: 0,
          vCOFINS: 0,
          vTotTrib: 0,
          vNF: Number(nota.valorTotal || 0),
          vIS: 0,
          vIBS: 0,
          vCBS: 0
        });
      }

      // Inicializa Departamentos (Rateio)
      if (Array.isArray(nota.departamentosRateio) && nota.departamentosRateio.length > 0) {
        setDepartamentosRateio(nota.departamentosRateio);
      } else {
        setDepartamentosRateio([
          {
            codigo: 'ALMOXARIFADO',
            descricao: 'ALMOXARIFADO',
            valor: Number(nota.valorTotal || 0),
            percentual: 100
          }
        ]);
      }

      // Inicializa Informações Adicionais e Observações
      if (nota.informacoesAdicionais) {
        setInfoAdicionais(nota.informacoesAdicionais);
      }
      setObservacoes(nota.observacoes || nota.informacoesAdicionais?.infCpl || '');

      // Inicializa parcelas (priorizando dados já conciliados da requisição se existirem)
      const reqAtual = requisicoes.find(r => String(r.id) === String(targetReqId));
      if (reqAtual?.parcelas_financeiro && reqAtual.parcelas_financeiro.length > 0) {
        setParcelas(reqAtual.parcelas_financeiro);
      } else if (nota.parcelas && nota.parcelas.length > 0) {
        setParcelas(nota.parcelas);
      } else {
        setParcelas([
          {
            nParcela: 1,
            nNumTitulo: `${nota.numeroNF || '1'}/001`,
            dDtVenc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
            nValor: Number(nota.valorTotal || 0),
            percentual: 100
          }
        ]);
      }
    }
  }, [notaKey, isOpen]);

  if (!isOpen || !nota) return null;

  const reqVinculada = nota.requisicaoObj ||
                       requisicoes.find(r => String(r.id) === String(reqId)) ||
                       requisicoes.find(r => String(r.id) === String(nota.requisicaoId));
  const divergencia = reqVinculada?.divergencia;

  // Calcula o valor total faltante considerando se o backend já tinha ou se veio zerado
  const calcularValorFaltaReal = () => {
    if (divergencia?.resolucao?.valorAbatimento && Number(divergencia.resolucao.valorAbatimento) > 0) {
      return Number(divergencia.resolucao.valorAbatimento);
    }
    if (divergencia?.valorDivergencia && Number(divergencia.valorDivergencia) > 0) {
      return Number(divergencia.valorDivergencia);
    }
    if (divergencia?.itensFaltantes && divergencia.itensFaltantes.length > 0) {
      return divergencia.itensFaltantes.reduce((acc, item) => {
        let vUnit = Number(item.valorUnitario || 0);
        if (vUnit <= 0) {
          const match = (nota?.itens || reqVinculada?.itens || []).find(i => 
            String(i.codigo) === String(item.codigo) || 
            String(i.codigo_item) === String(item.codigo) ||
            String(i.codigo) === String(item.codigoNfeOriginal) ||
            String(i.descricao).toLowerCase() === String(item.descricao).toLowerCase()
          );
          vUnit = Number(match?.valorUnitario || match?.valor_unitario || 0);
        }
        if (vUnit <= 0 && (nota?.valorTotal || reqVinculada?.valor) && item.esperado) {
          vUnit = Number(((nota?.valorTotal || reqVinculada?.valor) / item.esperado).toFixed(2));
        }
        const faltaQtd = Number(item.falta || (item.esperado - item.recebido) || 0);
        return acc + (item.valorFalta && item.valorFalta > 0 ? Number(item.valorFalta) : (faltaQtd * vUnit));
      }, 0);
    }
    return 0;
  };

  const valorAbatimentoSugerido = Number(calcularValorFaltaReal().toFixed(2));
  const isAbatimentoAplicado = parcelas.length > 0 && Boolean(parcelas[0].descontoAbatimento && parcelas[0].descontoAbatimento > 0);

  const handleSelectReq = (novoReqId) => {
    setReqId(novoReqId);
    const reqSel = requisicoes.find(r => String(r.id) === String(novoReqId));
    if (reqSel?.parcelas_financeiro && reqSel.parcelas_financeiro.length > 0) {
      setParcelas(reqSel.parcelas_financeiro);
    }
  };

  const handleAplicarAbatimento = () => {
    if (parcelas.length === 0 || valorAbatimentoSugerido <= 0) return;
    const novasParcelas = [...parcelas];
    const parc0 = { ...novasParcelas[0] };
    const valorOriginal = parc0.nValorOriginal !== undefined ? Number(parc0.nValorOriginal) : Number(parc0.nValor);
    const novoValor = Math.max(0, valorOriginal - valorAbatimentoSugerido);

    novasParcelas[0] = {
      ...parc0,
      nValorOriginal: valorOriginal,
      nValor: Number(novoValor.toFixed(2)),
      descontoAbatimento: valorAbatimentoSugerido,
      motivoDesconto: `Abatimento comercial por falta física de R$ ${valorAbatimentoSugerido.toFixed(2)}`
    };
    setParcelas(novasParcelas);
  };

  const handleDesfazerAbatimento = () => {
    if (parcelas.length === 0) return;
    const novasParcelas = [...parcelas];
    const parc0 = { ...novasParcelas[0] };
    if (parc0.nValorOriginal !== undefined) {
      novasParcelas[0] = {
        ...parc0,
        nValor: parc0.nValorOriginal,
        descontoAbatimento: 0
      };
      setParcelas(novasParcelas);
    }
  };

  const handleMapeamentoChange = (codigoItem, valor) => {
    setMapeamentos(prev => ({
      ...prev,
      [codigoItem]: valor
    }));
  };

  const handleCfopChange = (codigoItem, valor) => {
    setCfops(prev => ({
      ...prev,
      [codigoItem]: valor
    }));
  };

  const handleLocalEstoqueChange = (codigoItem, valor) => {
    setLocaisEstoque(prev => ({
      ...prev,
      [codigoItem]: valor
    }));
  };

  const handleQuantidadeRecebidaChange = (codigoItem, valor) => {
    setQuantidadesRecebidas(prev => ({ ...prev, [codigoItem]: valor }));
  };

  const handleUnidadeEstoqueChange = (codigoItem, valor) => {
    setUnidadesEstoque(prev => ({ ...prev, [codigoItem]: valor }));
  };

  const handleNcmChange = (codigoItem, valor) => {
    setNcms(prev => ({ ...prev, [codigoItem]: valor }));
  };

  const handleEanChange = (codigoItem, valor) => {
    setEans(prev => ({ ...prev, [codigoItem]: valor }));
  };

  const handleNaoGerarContaChange = (codigoItem, valor) => {
    setNaoGerarContaPagarItem(prev => ({ ...prev, [codigoItem]: valor }));
  };

  const handleNaoMovimentarEstoqueChange = (codigoItem, valor) => {
    setNaoMovimentarEstoqueItem(prev => ({ ...prev, [codigoItem]: valor }));
  };

  const handleParcelaChange = (index, campo, valor) => {
    setParcelas(prev => {
      const novas = [...prev];
      novas[index] = { ...novas[index], [campo]: valor };
      return novas;
    });
  };

  const handleAdicionarParcela = () => {
    const proxima = parcelas.length + 1;
    setParcelas(prev => [
      ...prev,
      {
        nParcela: proxima,
        nNumTitulo: `${nota.numeroNF || '1'}/${proxima}`,
        dDtVenc: new Date(Date.now() + proxima * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        nValor: 0
      }
    ]);
  };

  const handleRemoverParcela = (index) => {
    if (parcelas.length <= 1) {
      alert('A nota precisa ter pelo menos 1 parcela de faturamento.');
      return;
    }
    setParcelas(prev => prev.filter((_, i) => i !== index));
  };

  const handleRateioChange = (index, campo, valor) => {
    setDepartamentosRateio(prev => {
      const novos = [...prev];
      novos[index] = { ...novos[index], [campo]: valor };
      if (campo === 'percentual') {
        const perc = parseFloat(valor) || 0;
        novos[index].valor = Number(((perc / 100) * (nota.valorTotal || 0)).toFixed(2));
      } else if (campo === 'valor') {
        const v = parseFloat(valor) || 0;
        const total = Number(nota.valorTotal || 0);
        novos[index].percentual = total > 0 ? Number(((v / total) * 100).toFixed(2)) : 0;
      }
      return novos;
    });
  };

  const handleAdicionarRateio = () => {
    if (!deptSelecionadoParaAdicionar) return;
    const deptObj = listaDepartamentos.find(d => String(d.codigo || d.cCodigo || d.id) === String(deptSelecionadoParaAdicionar));
    const nomeDept = deptObj ? (deptObj.descricao || deptObj.xDescricao || deptObj.nome || deptObj.codigo) : deptSelecionadoParaAdicionar;
    const percAtualTotal = departamentosRateio.reduce((acc, r) => acc + (Number(r.percentual) || 0), 0);
    const sobraPerc = Math.max(0, Number((100 - percAtualTotal).toFixed(2)));
    const sobraValor = Number(((sobraPerc / 100) * (nota.valorTotal || 0)).toFixed(2));

    setDepartamentosRateio(prev => [
      ...prev,
      {
        codigo: deptSelecionadoParaAdicionar,
        descricao: nomeDept,
        percentual: sobraPerc,
        valor: sobraValor
      }
    ]);
    setDeptSelecionadoParaAdicionar('');
  };

  const handleRemoverRateio = (index) => {
    if (departamentosRateio.length <= 1) {
      alert('É necessário ter pelo menos um departamento no rateio.');
      return;
    }
    setDepartamentosRateio(prev => prev.filter((_, i) => i !== index));
  };

  const handleTributoItemChange = (codigoItem, aba, campo, valor) => {
    setTributosItens(prev => {
      const itemTrib = prev[codigoItem] || {};
      const abaTrib = itemTrib[aba] || {};
      return {
        ...prev,
        [codigoItem]: {
          ...itemTrib,
          [aba]: {
            ...abaTrib,
            [campo]: valor
          }
        }
      };
    });
  };

  const handleAdicionarItem = () => {
    const novoIdx = itensDaNota.length + 1;
    const novoCodigo = `ITEM-${String(novoIdx).padStart(2, '0')}`;
    const defaultLocal = listaLocaisEstoque[0]?.codigo || '01';
    const novoItem = {
      codigo: novoCodigo,
      descricao: '',
      quantidade: 1,
      unidade: 'UN',
      valorUnitario: 0,
      valorTotal: 0,
      cfop: '1.556',
      codigo_local_estoque: defaultLocal
    };

    setItensDaNota(prev => [...prev, novoItem]);
    setCfops(prev => ({ ...prev, [novoCodigo]: '1.556' }));
    setLocaisEstoque(prev => ({ ...prev, [novoCodigo]: defaultLocal }));
    setQuantidadesRecebidas(prev => ({ ...prev, [novoCodigo]: 1 }));
    setUnidadesEstoque(prev => ({ ...prev, [novoCodigo]: 'UN' }));
    setNcms(prev => ({ ...prev, [novoCodigo]: '' }));
    setEans(prev => ({ ...prev, [novoCodigo]: 'SEM GTIN' }));
    setTributosItens(prev => ({
      ...prev,
      [novoCodigo]: {
        icms: { cst: '00', origem: '0', modalidadeBc: '3', reducaoBcPerc: 0, baseCalculo: 0, aliquotaPerc: 0, valor: 0 },
        st: { baseCalculo: 0, aliquotaPerc: 0, valor: 0 },
        ipi: { aliquotaPerc: 0, valor: 0 },
        pis: { aliquotaPerc: 0, valor: 0 },
        cofins: { aliquotaPerc: 0, valor: 0 },
        info: { texto: '' },
        precoVenda: { margemPerc: 30, precoSugerido: 0 },
        custo: { custoMedio: 0, custoUltimaEntrada: 0, atualizarCustoEstoque: true }
      }
    }));
  };

  const handleRemoverItem = (idx, codigoItem) => {
    if (itensDaNota.length <= 1) {
      alert('A nota precisa ter pelo menos 1 item.');
      return;
    }
    const cod = codigoItem || `item_${idx}`;
    setItensDaNota(prev => prev.filter((_, i) => i !== idx));
    setMapeamentos(prev => { const n = { ...prev }; delete n[cod]; return n; });
    setCfops(prev => { const n = { ...prev }; delete n[cod]; return n; });
    setLocaisEstoque(prev => { const n = { ...prev }; delete n[cod]; return n; });
    setQuantidadesRecebidas(prev => { const n = { ...prev }; delete n[cod]; return n; });
    setUnidadesEstoque(prev => { const n = { ...prev }; delete n[cod]; return n; });
    setNcms(prev => { const n = { ...prev }; delete n[cod]; return n; });
    setEans(prev => { const n = { ...prev }; delete n[cod]; return n; });
    setTributosItens(prev => { const n = { ...prev }; delete n[cod]; return n; });
  };

  const handleItemPropChange = (idx, campo, valor) => {
    setItensDaNota(prev => {
      const novos = [...prev];
      const itemAntigo = novos[idx];
      const item = { ...itemAntigo, [campo]: valor };
      const oldCod = itemAntigo.codigo || `item_${idx}`;

      if (campo === 'codigo' && itemAntigo.codigo !== valor) {
        const newCod = valor || `item_${idx}`;
        setMapeamentos(m => { const c = { ...m, [newCod]: m[oldCod] || '' }; if (oldCod !== newCod) delete c[oldCod]; return c; });
        setCfops(c => { const n = { ...c, [newCod]: c[oldCod] || '1.556' }; if (oldCod !== newCod) delete n[oldCod]; return n; });
        setLocaisEstoque(l => { const n = { ...l, [newCod]: l[oldCod] || '01' }; if (oldCod !== newCod) delete n[oldCod]; return n; });
        setQuantidadesRecebidas(q => { const n = { ...q, [newCod]: q[oldCod] || item.quantidade }; if (oldCod !== newCod) delete n[oldCod]; return n; });
        setUnidadesEstoque(u => { const n = { ...u, [newCod]: u[oldCod] || item.unidade || 'UN' }; if (oldCod !== newCod) delete n[oldCod]; return n; });
        setNcms(nc => { const n = { ...nc, [newCod]: nc[oldCod] || '' }; if (oldCod !== newCod) delete n[oldCod]; return n; });
        setEans(e => { const n = { ...e, [newCod]: e[oldCod] || 'SEM GTIN' }; if (oldCod !== newCod) delete n[oldCod]; return n; });
      }

      if (campo === 'quantidade' || campo === 'valorUnitario' || campo === 'valorDesconto') {
        const q = campo === 'quantidade' ? (parseFloat(valor) || 0) : (Number(item.quantidade) || 0);
        const u = campo === 'valorUnitario' ? (parseFloat(valor) || 0) : (Number(item.valorUnitario) || 0);
        const d = campo === 'valorDesconto' ? (parseFloat(valor) || 0) : (Number(item.valorDesconto) || 0);
        item.valorTotal = Math.max(0, Number(((q * u) - d).toFixed(2)));
        if (campo === 'quantidade') {
          const cod = item.codigo || `item_${idx}`;
          setQuantidadesRecebidas(qPrev => ({ ...qPrev, [cod]: q }));
        }
      }
      novos[idx] = item;

      // Recalcula total dos produtos e atualiza o total da NF
      const somaProdutos = novos.reduce((acc, it) => acc + (Number(it.valorTotal) || 0), 0);
      setTotaisTributos(tPrev => {
        const calcNF = Number((somaProdutos + (Number(tPrev.vFrete) || 0) + (Number(tPrev.vSeg) || 0) + (Number(tPrev.vIPI) || 0) + (Number(tPrev.vST) || 0) + (Number(tPrev.vOutro) || 0) - (Number(tPrev.vDesc) || 0)).toFixed(2));
        setValorTotalNF(calcNF);
        return {
          ...tPrev,
          vProd: somaProdutos,
          vNF: calcNF
        };
      });

      return novos;
    });
  };

  const handleTotaisTributosChange = (campo, valor) => {
    setTotaisTributos(prev => {
      const novosTotais = { ...prev, [campo]: valor };
      if (['vProd', 'vFrete', 'vSeg', 'vDesc', 'vIPI', 'vST', 'vOutro'].includes(campo)) {
        const vProd = campo === 'vProd' ? valor : (Number(novosTotais.vProd) || 0);
        const vFrete = campo === 'vFrete' ? valor : (Number(novosTotais.vFrete) || 0);
        const vSeg = campo === 'vSeg' ? valor : (Number(novosTotais.vSeg) || 0);
        const vDesc = campo === 'vDesc' ? valor : (Number(novosTotais.vDesc) || 0);
        const vIPI = campo === 'vIPI' ? valor : (Number(novosTotais.vIPI) || 0);
        const vST = campo === 'vST' ? valor : (Number(novosTotais.vST) || 0);
        const vOutro = campo === 'vOutro' ? valor : (Number(novosTotais.vOutro) || 0);
        const calcNF = Number((vProd + vFrete + vSeg + vIPI + vST + vOutro - vDesc).toFixed(2));
        novosTotais.vNF = calcNF;
        setValorTotalNF(calcNF);
      } else if (campo === 'vNF') {
        setValorTotalNF(valor);
      }
      return novosTotais;
    });
  };

  const isTudoMapeado = () => {
    return (itensDaNota || []).every((item, idx) => {
      const cod = item.codigo || `item_${idx}`;
      return Boolean(mapeamentos[cod]);
    });
  };

  const handleSalvarRascunho = async () => {
    if (!reqId) {
      setErro('Selecione ou vincule o pedido de compras correspondente.');
      return;
    }
    setSalvando(true);
    setErro('');

    try {
      const notaAtualizada = {
        ...nota,
        numeroNF,
        serie: serieNF,
        modelo: modeloNF,
        dataEmissao: dataEmissaoNF,
        valorTotal: valorTotalNF,
        chaveAcesso: chaveAcessoNF,
        emitente: {
          ...(nota.emitente || {}),
          nome: emitenteNome,
          cnpj_cpf: emitenteCnpjCpf,
          cnpj: emitenteCnpjCpf,
          ie: emitenteIe,
          inscrEstadual: emitenteIe,
          uf: emitenteUf
        },
        transporte: {
          tipoFrete,
          previsaoEntrega,
          transportador,
          veiculo,
          volumes
        },
        totaisTributos,
        departamentosRateio,
        informacoesAdicionais: infoAdicionais,
        observacoes,
        itens: (itensDaNota || []).map((i, idx) => {
          const cod = i.codigo || `item_${idx}`;
          return {
            ...i,
            codigo: cod,
            cfop: cfops[cod] || '1.556',
            codigo_local_estoque: locaisEstoque[cod] || '01',
            quantidadeRecebida: quantidadesRecebidas[cod] !== undefined ? Number(quantidadesRecebidas[cod]) : i.quantidade,
            unidadeEstoque: unidadesEstoque[cod] || i.unidade || 'UN',
            ncm: ncms[cod] || i.ncm || '',
            ean: eans[cod] || i.ean || '',
            naoGerarContaPagar: Boolean(naoGerarContaPagarItem[cod]),
            naoMovimentarEstoque: Boolean(naoMovimentarEstoqueItem[cod]),
            tributos: tributosItens[cod] || {}
          };
        })
      };

      const res = await fetch('/api/recebimento-fiscal/salvar-conferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId,
          nota: notaAtualizada,
          mapeamentoItens: mapeamentos,
          parcelas
        })
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.mensagem || 'Erro ao salvar rascunho.');

      alert('Rascunho fiscal salvo com sucesso!');
      if (onConcluido) onConcluido();
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleConcluirFiscal = async () => {
    if (!reqId) {
      setErro('Vincule o pedido de compra correspondente antes de concluir.');
      return;
    }

    if (!isTudoMapeado()) {
      setErro('Defina a situação (associar, novo produto ou ignorar) para todos os itens da nota.');
      setAbaAtiva('itens');
      return;
    }

    setSalvando(true);
    setErro('');

    try {
      const notaAtualizada = {
        ...nota,
        numeroNF,
        serie: serieNF,
        modelo: modeloNF,
        dataEmissao: dataEmissaoNF,
        valorTotal: valorTotalNF,
        chaveAcesso: chaveAcessoNF,
        emitente: {
          ...(nota.emitente || {}),
          nome: emitenteNome,
          cnpj_cpf: emitenteCnpjCpf,
          cnpj: emitenteCnpjCpf,
          ie: emitenteIe,
          inscrEstadual: emitenteIe,
          uf: emitenteUf
        },
        transporte: {
          tipoFrete,
          previsaoEntrega,
          transportador,
          veiculo,
          volumes
        },
        totaisTributos,
        departamentosRateio,
        informacoesAdicionais: infoAdicionais,
        observacoes,
        itens: (itensDaNota || []).map((i, idx) => {
          const cod = i.codigo || `item_${idx}`;
          return {
            ...i,
            codigo: cod,
            cfop: cfops[cod] || '1.556',
            codigo_local_estoque: locaisEstoque[cod] || '01',
            quantidadeRecebida: quantidadesRecebidas[cod] !== undefined ? Number(quantidadesRecebidas[cod]) : i.quantidade,
            unidadeEstoque: unidadesEstoque[cod] || i.unidade || 'UN',
            ncm: ncms[cod] || i.ncm || '',
            ean: eans[cod] || i.ean || '',
            naoGerarContaPagar: Boolean(naoGerarContaPagarItem[cod]),
            naoMovimentarEstoque: Boolean(naoMovimentarEstoqueItem[cod]),
            tributos: tributosItens[cod] || {}
          };
        })
      };

      const res = await fetch('/api/recebimento-fiscal/concluir-omie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId,
          nota: notaAtualizada,
          mapeamentoItens: mapeamentos,
          parcelas,
          gerarContasPagar,
          liberarAlmoxarifado
        })
      });

      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.mensagem || 'Falha ao concluir recebimento fiscal.');

      alert(`Recebimento Fiscal Concluído com Sucesso!\n\n${data.mensagem}\nStatus Omie: ${data.statusOmie || 'Processado'}`);
      if (onConcluido) onConcluido();
      onClose();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho do Modal */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconWrapper}>
              <FileText size={24} />
            </div>
            <div>
              <h3>Conferência Fiscal de NF-e</h3>
              <p>Validação da nota, de-para dos itens e conciliação de parcelas</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className={styles.btnClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.body} ref={bodyRef}>
          {erro && (
            <div style={{ color: 'var(--cor-erro)', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--cor-erro)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              <span>{erro}</span>
            </div>
          )}

          {/* Cartão de Dados Gerais */}
          <div className={styles.dadosGeraisCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: dadosGeraisAberto ? '1px solid var(--cor-borda-cartao)' : 'none', paddingBottom: dadosGeraisAberto ? '8px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cor-destaque)', letterSpacing: '0.5px' }}>
                  Dados da NF-e e Fornecedor
                </span>
                {!dadosGeraisAberto && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--cor-texto-secundario)', fontWeight: '600' }}>
                    {emitenteNome || 'Fornecedor'} • NF #{numeroNF || 'S/N'} (Série {serieNF || '1'}) • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalNF || 0)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDadosGeraisAberto(!dadosGeraisAberto)}
                style={{
                  background: 'var(--cor-fundo-cartao)',
                  border: '1px solid var(--cor-borda-cartao)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  color: 'var(--cor-texto-principal)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '600'
                }}
              >
                <span>{dadosGeraisAberto ? 'Recolher Dados' : 'Expandir Dados'}</span>
                {dadosGeraisAberto ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            </div>

            {dadosGeraisAberto && (
              <>
                <div className={styles.dadosGeraisGrid}>
              <div className={styles.dadoItem}>
                <span className={styles.dadoLabel}>Fornecedor / Emitente *</span>
                <input
                  type="text"
                  value={emitenteNome}
                  onChange={(e) => setEmitenteNome(e.target.value)}
                  placeholder="Razão Social / Nome do Fornecedor"
                  className={styles.campoInput}
                />
              </div>
              <div className={styles.dadoItem}>
                <span className={styles.dadoLabel}>CNPJ / CPF</span>
                <input
                  type="text"
                  value={emitenteCnpjCpf}
                  onChange={(e) => setEmitenteCnpjCpf(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className={styles.campoInput}
                />
              </div>
              <div className={styles.dadoItem}>
                <span className={styles.dadoLabel}>Inscr. Estadual</span>
                <input
                  type="text"
                  value={emitenteIe}
                  onChange={(e) => setEmitenteIe(e.target.value)}
                  placeholder="Inscrição Estadual ou Isento"
                  className={styles.campoInput}
                />
              </div>
              <div className={styles.dadoItem} style={{ maxWidth: '80px' }}>
                <span className={styles.dadoLabel}>UF</span>
                <input
                  type="text"
                  value={emitenteUf}
                  onChange={(e) => setEmitenteUf(e.target.value.toUpperCase())}
                  placeholder="PA"
                  maxLength={2}
                  className={styles.campoInput}
                />
              </div>
              <div className={styles.dadoItem}>
                <span className={styles.dadoLabel}>NF-e Nº / Série *</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={numeroNF}
                    onChange={(e) => setNumeroNF(e.target.value)}
                    placeholder="Número"
                    className={styles.campoInput}
                    style={{ flex: 2 }}
                  />
                  <input
                    type="text"
                    value={serieNF}
                    onChange={(e) => setSerieNF(e.target.value)}
                    placeholder="Série"
                    className={styles.campoInput}
                    style={{ flex: 1, minWidth: '45px' }}
                  />
                </div>
              </div>
              <div className={styles.dadoItem}>
                <span className={styles.dadoLabel}>Data de Emissão</span>
                <input
                  type="text"
                  value={dataEmissaoNF}
                  onChange={(e) => setDataEmissaoNF(e.target.value)}
                  placeholder="DD/MM/AAAA ou AAAA-MM-DD"
                  className={styles.campoInput}
                />
              </div>
              <div className={styles.dadoItem}>
                <span className={styles.dadoLabel}>Valor Total da Nota (R$) *</span>
                <input
                  type="number"
                  step="0.01"
                  value={valorTotalNF}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setValorTotalNF(val);
                    setTotaisTributos(prev => ({ ...prev, vNF: val, vProd: prev.vProd || val }));
                  }}
                  className={`${styles.campoInput} ${styles.campoInputDestaque}`}
                />
              </div>
            </div>

            {chaveAcessoNF ? (
              <div className={styles.chaveBox} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <strong>Chave da NF-e (44 dígitos):</strong>
                  <input
                    type="text"
                    maxLength={44}
                    value={chaveAcessoNF}
                    onChange={(e) => setChaveAcessoNF(e.target.value)}
                    className={styles.campoInput}
                    style={{ flex: 1, fontFamily: 'monospace' }}
                  />
                </div>
                <a
                  href="https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g="
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkSefaz}
                  title="Consultar no Portal Nacional da SEFAZ"
                >
                  <ExternalLink size={14} />
                  <span>Consultar na SEFAZ</span>
                </a>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '4px 0' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--cor-texto-secundario)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={14} style={{ flexShrink: 0 }} />
                  <span>Nota Fiscal Manual (sem chave eletrônica SEFAZ)</span>
                </div>
                <input
                  type="text"
                  maxLength={44}
                  value={chaveAcessoNF}
                  onChange={(e) => setChaveAcessoNF(e.target.value)}
                  placeholder="Caso possua a chave de 44 dígitos, digite aqui..."
                  className={styles.campoInput}
                  style={{ maxWidth: '380px', fontSize: '0.78rem' }}
                />
              </div>
            )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--cor-borda-cartao)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cor-texto-secundario)' }}>
                    Pedido de Compra Vinculado:
                  </span>
                  {nota.vinculoFixo ? (
                    <span style={{
                      background: 'var(--cor-fundo-sutil)',
                      border: '1px solid var(--cor-borda-cartao)',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      color: 'var(--cor-destaque)',
                      fontSize: '0.88rem'
                    }}>
                      Requisição #{String(reqVinculada?.id || nota.requisicaoId || '').split('-')[0]} — {reqVinculada?.projetoDestino || reqVinculada?.projeto || 'Almoxarifado'} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reqVinculada?.pedidos_omie?.[0]?.valorTotal || reqVinculada?.valorTotal || nota.valorTotal || 0)})
                    </span>
                  ) : (
                    <select
                      value={reqId}
                      onChange={(e) => handleSelectReq(e.target.value)}
                      style={{
                        background: 'var(--cor-fundo-cartao)',
                        color: 'var(--cor-texto-principal)',
                        border: '1px solid var(--cor-borda-cartao)',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                      }}
                    >
                      <option value="">-- Selecione o Pedido de Compra --</option>
                      {requisicoes.map(r => (
                        <option key={r.id} value={r.id}>
                          Requisição #{r.id.split('-')[0]} - {r.projetoDestino || r.projeto || 'Almoxarifado'} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.pedidos_omie?.[0]?.valorTotal || r.valorTotal || 0)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Card de Divergência Físico-Fiscal (se houver falta reportada pelo Almoxarifado) */}
          {divergencia && (divergencia.itensFaltantes?.length > 0 || divergencia.valorDivergencia > 0 || reqVinculada?.status_compras === 'entregue_parcial') && (
            <div className={styles.alertaDivergenciaBox}>
              <div className={styles.alertaDivergenciaHeader}>
                <div className={styles.alertaDivergenciaTitulo}>
                  <AlertTriangle size={18} />
                  <span>Divergência no Recebimento Físico (Falta de Mercadoria)</span>
                </div>
                {divergencia.status === 'resolvido' ? (
                  <span className={styles.badgeStatusDivergenciaResolvido}>
                    <CheckCircle2 size={13} />
                    <span>Acordo Concluído no Compras</span>
                  </span>
                ) : divergencia.status === 'aguardando_entrega' ? (
                  <span className={styles.badgeStatusDivergenciaPendente}>
                    <Truck size={13} />
                    <span>Aguardando Entrega Complementar</span>
                  </span>
                ) : (
                  <span className={styles.badgeStatusDivergenciaPendente}>
                    <Clock size={13} />
                    <span>Pendente no Setor de Compras</span>
                  </span>
                )}
              </div>

              {divergencia.observacao && (
                <div className={styles.divergenciaObsAlmoxarife}>
                  <strong>Observação do Almoxarife:</strong> "{divergencia.observacao}"
                </div>
              )}

              {/* Tabela de itens que vieram faltando */}
              {divergencia.itensFaltantes && divergencia.itensFaltantes.length > 0 && (() => {
                const itensComFalta = divergencia.itensFaltantes.map(item => {
                  let vUnit = Number(item.valorUnitario || 0);
                  if (vUnit <= 0) {
                    const match = (nota?.itens || reqVinculada?.itens || []).find(i => 
                      String(i.codigo) === String(item.codigo) || 
                      String(i.codigo_item) === String(item.codigo) ||
                      String(i.codigo) === String(item.codigoNfeOriginal) ||
                      String(i.descricao).toLowerCase() === String(item.descricao).toLowerCase()
                    );
                    vUnit = Number(match?.valorUnitario || match?.valor_unitario || 0);
                  }
                  if (vUnit <= 0 && (nota?.valorTotal || reqVinculada?.valor) && item.esperado) {
                    vUnit = Number(((nota?.valorTotal || reqVinculada?.valor) / item.esperado).toFixed(2));
                  }
                  const faltaQtd = Number(item.falta || (item.esperado - item.recebido) || 0);
                  const valorFaltaItem = (item.valorFalta && item.valorFalta > 0) ? Number(item.valorFalta) : Number((faltaQtd * vUnit).toFixed(2));
                  return {
                    ...item,
                    valorUnitario: vUnit,
                    valorFalta: valorFaltaItem
                  };
                });

                const totalFaltaCalculado = (divergencia.valorDivergencia && divergencia.valorDivergencia > 0)
                  ? divergencia.valorDivergencia
                  : itensComFalta.reduce((acc, curr) => acc + curr.valorFalta, 0);

                return (
                  <div>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cor-texto-secundario)' }}>
                      Itens Não Entregues Fisicamente (Total Falta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFaltaCalculado)}):
                    </span>
                    <table className={styles.itensFaltantesMiniTabela}>
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th style={{ textAlign: 'center' }}>Esperado</th>
                          <th style={{ textAlign: 'center' }}>Recebido</th>
                          <th style={{ textAlign: 'center', color: 'var(--cor-erro)' }}>Faltou</th>
                          <th style={{ textAlign: 'right', color: 'var(--cor-erro)' }}>Total Falta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensComFalta.map(item => (
                          <tr key={item.codigo}>
                            <td>{item.descricao}</td>
                            <td style={{ textAlign: 'center' }}>{item.esperado}</td>
                            <td style={{ textAlign: 'center' }}>{item.recebido}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-erro)' }}>{item.falta}</td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--cor-erro)' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorFalta || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Resolução do setor de compras */}
              {divergencia.resolucao ? (
                <div className={styles.divergenciaResolucaoComprasBox}>
                  <div>
                    <strong>Resolução Comercial de Compras:</strong>{' '}
                    {divergencia.resolucao.acao === 'abatimento_boleto' && (
                      <span style={{ color: 'var(--cor-sucesso)', fontWeight: 'bold' }}>
                        Abatimento no Boleto de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(divergencia.resolucao.valorAbatimento || divergencia.valorDivergencia || 0)}
                      </span>
                    )}
                    {divergencia.resolucao.acao === 'nota_devolucao' && (
                      <span style={{ color: 'var(--cor-destaque)', fontWeight: 'bold' }}>
                        Nota de Devolução nº {divergencia.resolucao.notaDevolucao || 'Informada'}
                      </span>
                    )}
                    {divergencia.resolucao.acao === 'aguardar_entrega' && (
                      <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>
                        Aguardando fornecedor entregar as peças faltantes
                      </span>
                    )}
                  </div>
                  {divergencia.resolucao.observacaoResolucao && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                      <em>"{divergencia.resolucao.observacaoResolucao}"</em>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'var(--cor-texto-secundario)', background: 'var(--cor-fundo-sutil)', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <span>O Almoxarifado deu entrada física apenas no que foi entregue. Você pode conciliar e abater o valor correspondente na aba de Parcelas abaixo.</span>
                </div>
              )}
            </div>
          )}

          {/* 7 Abas Internas Oficiais Omie */}
          <div className={styles.tabsNav}>
            <button
              type="button"
              className={`${styles.tabBtn} ${abaAtiva === 'itens' ? styles.tabBtnActive : ''}`}
              onClick={() => mudarAba('itens')}
            >
              <PackageCheck size={18} />
              <span>Itens da NF-e ({itensDaNota?.length || 0})</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${abaAtiva === 'transporte' ? styles.tabBtnActive : ''}`}
              onClick={() => mudarAba('transporte')}
            >
              <Truck size={18} />
              <span>Transporte</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${abaAtiva === 'totais' ? styles.tabBtnActive : ''}`}
              onClick={() => mudarAba('totais')}
            >
              <DollarSign size={18} />
              <span>Totais</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${abaAtiva === 'parcelas' ? styles.tabBtnActive : ''}`}
              onClick={() => mudarAba('parcelas')}
            >
              <Calendar size={18} />
              <span>Parcelas ({parcelas.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${abaAtiva === 'departamentos' ? styles.tabBtnActive : ''}`}
              onClick={() => mudarAba('departamentos')}
            >
              <Building2 size={18} />
              <span>Departamentos ({departamentosRateio.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${abaAtiva === 'info_adicionais' ? styles.tabBtnActive : ''}`}
              onClick={() => mudarAba('info_adicionais')}
            >
              <Info size={18} />
              <span>Informações Adicionais</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${abaAtiva === 'observacoes' ? styles.tabBtnActive : ''}`}
              onClick={() => mudarAba('observacoes')}
            >
              <FileText size={18} />
              <span>Observações</span>
            </button>
          </div>

          {/* Conteúdo da Aba 1: Itens */}
          {abaAtiva === 'itens' && (
            <div className={styles.tabelaContainer}>
              <datalist id="produtos-almoxarifado-fiscal">
                {produtos.map(p => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} - {p.descricao}
                  </option>
                ))}
              </datalist>

              {/* Barra de Ações e Legenda no estilo Omie */}
              <div className={styles.barraAcoesTabela}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={16} color="var(--cor-destaque)" />
                  <span>Selecione abaixo de que forma deseja importar cada um dos itens da NF-e:</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div className={styles.barraAcoesLegenda}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--cor-sucesso)' }}>
                      <CheckCircle2 size={13} /> Itens associados
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                      <PlusCircle size={13} /> Cadastrar novo produto
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--cor-erro)' }}>
                      <Ban size={13} /> Ignorar importação
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdicionarItem}
                    className={styles.btnAdicionarParcela}
                    title="Adicionar mais um item à nota fiscal"
                  >
                    <Plus size={15} />
                    <span>+ Adicionar Item</span>
                  </button>
                </div>
              </div>

              <table className={styles.tabela}>
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>Item</th>
                    <th style={{ width: '110px' }}>Código Forn.</th>
                    <th style={{ minWidth: '220px' }}>Descrição na Nota</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Qtd</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>V. Unit.</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Total</th>
                    <th style={{ width: '190px' }}>CFOP Entrada</th>
                    <th style={{ width: '220px' }}>Local Estoque</th>
                    <th style={{ minWidth: '320px' }}>Situação / Produto no Estoque</th>
                    <th style={{ width: '50px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(itensDaNota || []).map((item, idx) => {
                    const cod = item.codigo || `item_${idx}`;
                    const selected = mapeamentos[cod] || '';
                    const matchedProd = produtos.find(p => p.codigo === selected);
                    const qtdRecebida = quantidadesRecebidas[cod] !== undefined ? quantidadesRecebidas[cod] : item.quantidade;

                    return (
                      <tr key={idx}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--cor-destaque)', fontSize: '0.95rem' }}>{idx + 1}</span>
                            <button
                              type="button"
                              className={styles.btnPreencherItemOmie}
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemIndexEdicao(idx);
                              }}
                              title="Preencher a CFOP de Entrada, Quantidade Recebida e demais informações"
                            >
                              <Edit3 size={11} />
                              <span>Preencher CFOP, Tributos e Dados</span>
                            </button>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>
                          <input
                            type="text"
                            value={item.codigo || ''}
                            onChange={(e) => handleItemPropChange(idx, 'codigo', e.target.value)}
                            placeholder="Cód."
                            className={styles.campoInput}
                            style={{ width: '85px', fontFamily: 'monospace', fontSize: '0.8rem', padding: '4px 6px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.descricao || ''}
                            onChange={(e) => handleItemPropChange(idx, 'descricao', e.target.value)}
                            placeholder="Descrição do produto na nota..."
                            className={styles.campoInput}
                            style={{ minWidth: '170px', fontWeight: '600', fontSize: '0.85rem', padding: '4px 6px' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantidade}
                            onChange={(e) => handleItemPropChange(idx, 'quantidade', e.target.value)}
                            className={styles.campoInput}
                            style={{ width: '65px', textAlign: 'center', fontWeight: 'bold', padding: '4px 4px' }}
                          />
                          {qtdRecebida !== item.quantidade && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--cor-erro)', fontWeight: 'bold', marginTop: '2px' }}>
                              NF: {item.quantidade}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.valorUnitario || 0}
                            onChange={(e) => handleItemPropChange(idx, 'valorUnitario', e.target.value)}
                            className={styles.campoInput}
                            style={{ width: '85px', textAlign: 'right', padding: '4px 6px' }}
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal || (item.quantidade * (item.valorUnitario || 0)))}
                        </td>
                        <td>
                          <select
                            className={styles.selectCfop}
                            value={cfops[cod] || '1.556'}
                            onChange={(e) => handleCfopChange(cod, e.target.value)}
                            title="CFOP de Entrada no Omie"
                          >
                            <option value="1.556">1.556 - Uso/Consumo</option>
                            <option value="1.102">1.102 - Comercialização</option>
                            <option value="1.403">1.403 - Revenda c/ ST</option>
                            <option value="1.551">1.551 - Ativo Imobilizado</option>
                            <option value="2.556">2.556 - Uso/Consumo (Inter.)</option>
                            <option value="2.102">2.102 - Revenda (Inter.)</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className={styles.selectCfop}
                            value={locaisEstoque[cod] || '01'}
                            onChange={(e) => handleLocalEstoqueChange(cod, e.target.value)}
                            title="Local de Estoque Omie (locais_estoque_omie)"
                          >
                            {listaLocaisEstoque && listaLocaisEstoque.length > 0 ? (
                              listaLocaisEstoque.map(loc => {
                                const codVal = loc.codigo || loc.codigo_local_estoque;
                                const label = formatarNomeLocal(loc);
                                return (
                                  <option key={loc.codigo_local_estoque || loc.codigo} value={codVal}>
                                    {label}
                                  </option>
                                );
                              })
                            ) : (
                              <>
                                <option value="01">01 - Almoxarifado</option>
                                <option value="PADRAO">PADRAO - Local de Estoque Padrão</option>
                                <option value="02">02 - Armazém de Matéria Prima</option>
                                <option value="03">03 - Armazém de Serragem</option>
                                <option value="04">04 - Armazém de Cama de Frango</option>
                                <option value="05">05 - Armazém de Insumos para Construção Civil</option>
                                <option value="06">06 - Armazém Fabrica de Ração</option>
                                <option value="Posto de Combustivel">Posto de Combustivel</option>
                              </>
                            )}
                          </select>
                        </td>
                        <td>
                          {!selected ? (
                            <div className={styles.acoesItemWrapper}>
                              <button
                                type="button"
                                onClick={() => handleMapeamentoChange(cod, 'ASSOCIAR:')}
                                className={`${styles.btnAcaoItem} ${styles.btnAssociar}`}
                              >
                                <Link size={14} /> Associar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMapeamentoChange(cod, `NOVO:${item.descricao || cod}`)}
                                className={`${styles.btnAcaoItem} ${styles.btnNovo}`}
                              >
                                <PlusCircle size={14} /> Novo Produto
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMapeamentoChange(cod, 'ignorar')}
                                className={`${styles.btnAcaoItem} ${styles.btnIgnorar}`}
                              >
                                <Ban size={14} /> Ignorar
                              </button>
                            </div>
                          ) : selected === 'ignorar' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--cor-erro)', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Ban size={14} /> Ignorado na importação
                              </span>
                              <button type="button" onClick={() => handleMapeamentoChange(cod, '')} style={{ background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>Alterar</button>
                            </div>
                          ) : selected.startsWith('NOVO:') ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <PlusCircle size={14} /> Novo: {selected.substring(5)}
                              </span>
                              <button type="button" onClick={() => handleMapeamentoChange(cod, '')} style={{ background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>Alterar</button>
                            </div>
                          ) : selected === 'ASSOCIAR:' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                list="produtos-almoxarifado-fiscal"
                                autoFocus
                                value=""
                                onChange={(e) => handleMapeamentoChange(cod, e.target.value)}
                                placeholder="Digite código ou descrição..."
                                className={styles.inputAssociar}
                              />
                              <button type="button" onClick={() => handleMapeamentoChange(cod, '')} style={{ background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }} title="Cancelar">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                color: 'var(--cor-sucesso)',
                                fontWeight: '600',
                                fontSize: '0.82rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                padding: '4px 10px',
                                borderRadius: '6px'
                              }}>
                                <CheckCircle2 size={14} />
                                <span>Associado com o produto <strong>{matchedProd ? `${matchedProd.codigo} - ${matchedProd.descricao}` : selected}</strong></span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleMapeamentoChange(cod, 'ASSOCIAR:')}
                                style={{ background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                                title="Alterar produto associado"
                              >
                                Alterar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMapeamentoChange(cod, '')}
                                style={{ background: 'transparent', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                                title="Desvincular"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {itensDaNota.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoverItem(idx, cod)}
                              className={styles.btnRemoverLinha}
                              title="Remover este item da nota"
                              style={{ background: 'transparent', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Conteúdo da Aba 2: Parcelas / Financeiro */}
          {abaAtiva === 'parcelas' && (
            <div className={styles.parcelasSecao}>
              <div className={styles.parcelasHeader}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--cor-texto-principal)' }}>Vencimentos do Contas a Pagar</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                    Estes valores serão lançados no Financeiro da Omie para agendamento do pagamento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAdicionarParcela}
                  className={styles.btnAdicionarParcela}
                >
                  <Plus size={16} />
                  <span>+ Adicionar Parcela</span>
                </button>
              </div>

              {/* Painel de Abatimento se houver divergência */}
              {divergencia && (divergencia.valorDivergencia > 0 || divergencia.resolucao?.valorAbatimento > 0) && (
                <div className={styles.painelAbatimentoParcelas}>
                  <div className={styles.painelAbatimentoTexto}>
                    <div className={styles.painelAbatimentoTitulo}>
                      <DollarSign size={18} color="var(--cor-sucesso)" />
                      <span>Conciliação Financeira de Falta Física</span>
                    </div>
                    <span className={styles.painelAbatimentoSub}>
                      Falta apontada no almoxarifado: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAbatimentoSugerido)}</strong>.
                      {isAbatimentoAplicado
                        ? ' O abatimento já foi descontado do valor do título a pagar.'
                        : ' Clique no botão para abater este valor do título a pagar antes de integrar à Omie.'}
                    </span>
                  </div>

                  <div>
                    {!isAbatimentoAplicado ? (
                      <button
                        type="button"
                        onClick={handleAplicarAbatimento}
                        className={styles.btnAplicarAbatimento}
                        title="Descontar o valor da falta na primeira parcela do Contas a Pagar"
                      >
                        <Zap size={14} />
                        <span>Aplicar Abatimento de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAbatimentoSugerido)}</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={styles.badgeAbatimentoAplicado}>
                          <CheckCircle2 size={14} />
                          <span>Desconto de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelas[0].descontoAbatimento)} Aplicado</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleDesfazerAbatimento}
                          className={styles.btnDesfazerAbatimento}
                          title="Voltar ao valor integral da nota"
                        >
                          Desfazer Desconto
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={styles.tabelaContainer}>
                <table className={styles.tabelaParcelas}>
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>Parcela</th>
                      <th style={{ width: '150px' }}>Número do Título</th>
                      <th>Data de Vencimento</th>
                      <th style={{ width: '180px' }}>Valor (R$)</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelas.map((parc, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{idx + 1}ª</td>
                        <td>
                          <input
                            type="text"
                            value={parc.nNumTitulo || `${nota.numeroNF || '1'}/${idx + 1}`}
                            onChange={(e) => handleParcelaChange(idx, 'nNumTitulo', e.target.value)}
                            className={styles.inputTabela}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={parc.dDtVenc || ''}
                            onChange={(e) => handleParcelaChange(idx, 'dDtVenc', e.target.value)}
                            placeholder="DD/MM/AAAA"
                            className={styles.inputTabela}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={parc.nValor || 0}
                            onChange={(e) => handleParcelaChange(idx, 'nValor', parseFloat(e.target.value) || 0)}
                            className={styles.inputTabela}
                          />
                          {parc.descontoAbatimento > 0 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--cor-sucesso)', fontWeight: 'bold', marginTop: '3px' }}>
                              - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parc.descontoAbatimento)} (Abatimento por falta)
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoverParcela(idx)}
                            className={styles.btnRemoverLinha}
                            title="Remover parcela"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba Transporte */}
          {abaAtiva === 'transporte' && (
            <div className={styles.secaoAba}>
              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <Truck size={16} /> Modalidade do Frete e Previsão de Entrega
                </h5>
                <div className={styles.gridCampos2}>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Modalidade do Frete</label>
                    <select
                      value={tipoFrete}
                      onChange={(e) => setTipoFrete(e.target.value)}
                      className={styles.campoInput}
                    >
                      <option value="0 - Contratação do Frete por conta do Remetente (CIF)">0 - Contratação do Frete por conta do Remetente (CIF)</option>
                      <option value="1 - Contratação do Frete por conta do Destinatário (FOB)">1 - Contratação do Frete por conta do Destinatário (FOB)</option>
                      <option value="2 - Contratação do Frete por conta de Terceiros">2 - Contratação do Frete por conta de Terceiros</option>
                      <option value="3 - Transporte Próprio por conta do Remetente">3 - Transporte Próprio por conta do Remetente</option>
                      <option value="4 - Transporte Próprio por conta do Destinatário">4 - Transporte Próprio por conta do Destinatário</option>
                      <option value="9 - Sem Ocorrência de Transporte">9 - Sem Ocorrência de Transporte</option>
                    </select>
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Previsão de Entrega</label>
                    <input
                      type="text"
                      value={previsaoEntrega}
                      onChange={(e) => setPrevisaoEntrega(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className={styles.campoInput}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <Building2 size={16} /> Dados do Transportador
                </h5>
                <div className={styles.gridCampos2}>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Razão Social / Nome</label>
                    <input
                      type="text"
                      value={transportador.nome}
                      onChange={(e) => setTransportador({ ...transportador, nome: e.target.value })}
                      placeholder="Nome da transportadora"
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>CNPJ / CPF</label>
                    <input
                      type="text"
                      value={transportador.cnpj_cpf}
                      onChange={(e) => setTransportador({ ...transportador, cnpj_cpf: e.target.value })}
                      placeholder="CNPJ ou CPF do transportador"
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Inscrição Estadual</label>
                    <input
                      type="text"
                      value={transportador.ie}
                      onChange={(e) => setTransportador({ ...transportador, ie: e.target.value })}
                      placeholder="Inscrição Estadual"
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>UF do Transportador</label>
                    <input
                      type="text"
                      value={transportador.uf}
                      onChange={(e) => setTransportador({ ...transportador, uf: e.target.value })}
                      placeholder="UF (ex: PA)"
                      maxLength={2}
                      className={styles.campoInput}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <Truck size={16} /> Veículo de Transporte
                </h5>
                <div className={styles.gridCampos3}>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Placa do Veículo</label>
                    <input
                      type="text"
                      value={veiculo.placa}
                      onChange={(e) => setVeiculo({ ...veiculo, placa: e.target.value })}
                      placeholder="ABC-1234"
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>UF do Veículo</label>
                    <input
                      type="text"
                      value={veiculo.uf}
                      onChange={(e) => setVeiculo({ ...veiculo, uf: e.target.value })}
                      placeholder="PA"
                      maxLength={2}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>RNTRC</label>
                    <input
                      type="text"
                      value={veiculo.rntrc}
                      onChange={(e) => setVeiculo({ ...veiculo, rntrc: e.target.value })}
                      placeholder="Registro Nacional"
                      className={styles.campoInput}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <PackageCheck size={16} /> Volumes Transportados
                </h5>
                <div className={styles.gridCampos4}>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Qtd Volumes</label>
                    <input
                      type="number"
                      value={volumes.qVol}
                      onChange={(e) => setVolumes({ ...volumes, qVol: parseFloat(e.target.value) || 0 })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Espécie</label>
                    <input
                      type="text"
                      value={volumes.esp}
                      onChange={(e) => setVolumes({ ...volumes, esp: e.target.value })}
                      placeholder="VOLUMES"
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Marca</label>
                    <input
                      type="text"
                      value={volumes.marca}
                      onChange={(e) => setVolumes({ ...volumes, marca: e.target.value })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Numeração</label>
                    <input
                      type="text"
                      value={volumes.nVol}
                      onChange={(e) => setVolumes({ ...volumes, nVol: e.target.value })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Peso Líquido (kg)</label>
                    <input
                      type="number"
                      step="any"
                      value={volumes.pesoL}
                      onChange={(e) => setVolumes({ ...volumes, pesoL: parseFloat(e.target.value) || 0 })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Peso Bruto (kg)</label>
                    <input
                      type="number"
                      step="any"
                      value={volumes.pesoB}
                      onChange={(e) => setVolumes({ ...volumes, pesoB: parseFloat(e.target.value) || 0 })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Nº Lacre</label>
                    <input
                      type="text"
                      value={volumes.nLacre}
                      onChange={(e) => setVolumes({ ...volumes, nLacre: e.target.value })}
                      className={styles.campoInput}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba Totais */}
          {abaAtiva === 'totais' && (
            <div className={styles.secaoAba}>
              <div className={styles.cardTotalDestaque}>
                <div>
                  <div className={styles.cardTotalDestaqueLabel}>Valor Total da Nota Fiscal (NF-e)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)', marginTop: '2px' }}>
                    Soma de produtos, frete, impostos e acréscimos subtraídos os descontos
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem', color: 'var(--cor-destaque)', fontWeight: 'bold' }}>R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={totaisTributos.vNF !== undefined ? totaisTributos.vNF : (valorTotalNF || 0)}
                    onChange={(e) => handleTotaisTributosChange('vNF', parseFloat(e.target.value) || 0)}
                    className={`${styles.campoInput} ${styles.campoInputDestaque}`}
                    style={{ fontSize: '1.35rem', fontWeight: '800', width: '190px', textAlign: 'right' }}
                  />
                </div>
              </div>

              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <DollarSign size={16} /> Bases de Cálculo e Impostos Principais
                </h5>
                <div className={styles.gridCampos4}>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Base de Cálculo ICMS</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vBC ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vBC', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Valor do ICMS</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vICMS ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vICMS', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>ICMS Desonerado</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vICMSDeson ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vICMSDeson', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Base de Cálculo ICMS ST</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vBCST ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vBCST', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Valor do ICMS ST</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vST ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vST', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Total dos Produtos</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vProd ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vProd', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Valor do Frete</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vFrete ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vFrete', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Valor do Seguro</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vSeg ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vSeg', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Desconto Total</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vDesc ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vDesc', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Total do IPI</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vIPI ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vIPI', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Total do PIS</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vPIS ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vPIS', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Total da COFINS</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vCOFINS ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vCOFINS', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Valor Aprox. Tributos (IBPT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vTotTrib ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vTotTrib', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <Info size={16} /> Reforma Tributária (Emenda Constitucional 132/2023)
                </h5>
                <div className={styles.gridCampos3}>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Valor de IS (Imposto Seletivo)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vIS ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vIS', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Valor de IBS (Bens e Serviços)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vIBS ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vIBS', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Valor de CBS (Bens e Serviços)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totaisTributos.vCBS ?? 0}
                      onChange={(e) => handleTotaisTributosChange('vCBS', parseFloat(e.target.value) || 0)}
                      className={styles.campoInput}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba Departamentos (Rateio) */}
          {abaAtiva === 'departamentos' && (
            <div className={styles.secaoAba}>
              <div className={styles.secaoBloco}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h5 className={styles.secaoBlocoTitulo} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                      <Building2 size={16} /> Rateio de Custos por Departamento (Omie)
                    </h5>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                      Distribua o custo total da nota entre os centros de custo cadastrados no ERP Omie.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={deptSelecionadoParaAdicionar}
                      onChange={(e) => setDeptSelecionadoParaAdicionar(e.target.value)}
                      className={styles.campoInput}
                      style={{ minWidth: '220px' }}
                    >
                      <option value="">-- Selecione o Departamento --</option>
                      {listaDepartamentos.map(d => (
                        <option key={d.codigo || d.cCodigo || d.id} value={d.codigo || d.cCodigo || d.id}>
                          {d.descricao || d.xDescricao || d.nome || d.codigo}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAdicionarRateio}
                      disabled={!deptSelecionadoParaAdicionar}
                      className={styles.btnSubmodalSalvar}
                      style={{ padding: '7px 14px' }}
                    >
                      <Plus size={16} />
                      <span>Adicionar Rateio</span>
                    </button>
                  </div>
                </div>

                <div className={styles.tabelaContainer} style={{ marginTop: '1rem' }}>
                  <table className={styles.tabelaDepartamentos}>
                    <thead>
                      <tr>
                        <th style={{ width: '120px' }}>Código</th>
                        <th>Departamento / Centro de Custo</th>
                        <th style={{ width: '160px' }}>Percentual (%)</th>
                        <th style={{ width: '200px' }}>Valor Rateado (R$)</th>
                        <th style={{ width: '60px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {departamentosRateio.map((rateio, idx) => (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{rateio.codigo}</td>
                          <td style={{ fontWeight: '600' }}>{rateio.descricao}</td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={rateio.percentual}
                              onChange={(e) => handleRateioChange(idx, 'percentual', e.target.value)}
                              className={styles.campoInput}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={rateio.valor}
                              onChange={(e) => handleRateioChange(idx, 'valor', e.target.value)}
                              className={styles.campoInput}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoverRateio(idx)}
                              className={styles.btnRemoverLinha}
                              title="Remover departamento"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {(() => {
                        const totalPerc = departamentosRateio.reduce((acc, r) => acc + (Number(r.percentual) || 0), 0);
                        const totalVal = departamentosRateio.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
                        const isEquilibrado = Math.abs(totalPerc - 100) < 0.05;

                        return (
                          <tr style={{ background: 'var(--cor-fundo-sutil)', fontWeight: 'bold' }}>
                            <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px' }}>Totais do Rateio:</td>
                            <td style={{ color: isEquilibrado ? 'var(--cor-sucesso)' : 'var(--cor-erro)', padding: '10px 12px' }}>
                              {totalPerc.toFixed(2)}%
                            </td>
                            <td style={{ color: 'var(--cor-destaque)', padding: '10px 12px' }}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVal)}
                            </td>
                            <td></td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba Informações Adicionais */}
          {abaAtiva === 'info_adicionais' && (
            <div className={styles.secaoAba}>
              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <Info size={16} /> Classificação e Dados Adicionais da Operação
                </h5>
                <div className={styles.gridCampos2}>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Categoria da Compra (Omie)</label>
                    <input
                      type="text"
                      value={infoAdicionais.categoriaCompra || 'Compra de Material para Uso e Consumo'}
                      onChange={(e) => setInfoAdicionais({ ...infoAdicionais, categoriaCompra: e.target.value })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Conta Corrente</label>
                    <input
                      type="text"
                      value={infoAdicionais.contaCorrente || '01 - Banco Principal'}
                      onChange={(e) => setInfoAdicionais({ ...infoAdicionais, contaCorrente: e.target.value })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Data de Registro</label>
                    <input
                      type="text"
                      value={infoAdicionais.dataRegistro || ''}
                      onChange={(e) => setInfoAdicionais({ ...infoAdicionais, dataRegistro: e.target.value })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Comprador Responsável</label>
                    <input
                      type="text"
                      value={infoAdicionais.comprador || ''}
                      onChange={(e) => setInfoAdicionais({ ...infoAdicionais, comprador: e.target.value })}
                      className={styles.campoInput}
                    />
                  </div>
                  <div className={styles.campoGrupo}>
                    <label className={styles.campoLabel}>Projeto / Obra (Omie)</label>
                    <select
                      value={infoAdicionais.projeto || ''}
                      onChange={(e) => setInfoAdicionais({ ...infoAdicionais, projeto: e.target.value })}
                      className={styles.campoInput}
                    >
                      <option value="ALMOXARIFADO">ALMOXARIFADO CENTRAL</option>
                      {listaProjetos.map(proj => (
                        <option key={proj.codigo || proj.id} value={proj.nome || proj.descricao || proj.codigo}>
                          {proj.nome || proj.descricao || proj.codigo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <FileText size={16} /> Informações Complementares da Nota (infCpl)
                </h5>
                <div className={styles.campoGrupo}>
                  <label className={styles.campoLabel}>Texto gravado pelo emissor no XML</label>
                  <textarea
                    rows={4}
                    value={infoAdicionais.infCpl || ''}
                    onChange={(e) => setInfoAdicionais({ ...infoAdicionais, infCpl: e.target.value })}
                    className={styles.campoTextarea}
                    placeholder="Informações complementares de interesse do contribuinte constantes no XML..."
                  />
                </div>
              </div>

              {infoAdicionais.infAdFisco && (
                <div className={styles.secaoBloco}>
                  <h5 className={styles.secaoBlocoTitulo}>
                    <FileText size={16} /> Informações de Interesse do Fisco (infAdFisco)
                  </h5>
                  <div className={styles.campoGrupo}>
                    <textarea
                      rows={3}
                      readOnly
                      value={infoAdicionais.infAdFisco}
                      className={`${styles.campoTextarea} ${styles.campoInputDisabled}`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conteúdo da Aba Observações */}
          {abaAtiva === 'observacoes' && (
            <div className={styles.secaoAba}>
              <div className={styles.secaoBloco}>
                <h5 className={styles.secaoBlocoTitulo}>
                  <FileText size={16} /> Observações Internas do Recebimento Fiscal
                </h5>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                  Estas anotações são armazenadas no sistema para histórico de conferência, justificativas de divergência ou instruções para a equipe.
                </p>
                <div className={styles.campoGrupo} style={{ marginTop: '0.5rem' }}>
                  <textarea
                    rows={6}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Digite observações sobre esta nota fiscal, fornecedor ou conferência física..."
                    className={styles.campoTextarea}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Opções de Integração */}
          <div className={styles.opcoesFinais}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={gerarContasPagar}
                onChange={(e) => setGerarContasPagar(e.target.checked)}
              />
              <span>Integrar Contas a Pagar na Omie (Financeiro)</span>
            </label>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={liberarAlmoxarifado}
                onChange={(e) => setLiberarAlmoxarifado(e.target.checked)}
              />
              <span>Liberar mercadorias para conferência física no Almoxarifado</span>
            </label>
          </div>
        </div>

        {/* Rodapé do Modal com Ações */}
        <div className={styles.footer}>
          <div>
            <span style={{ fontSize: '0.85rem', color: isTudoMapeado() ? 'var(--cor-sucesso)' : 'var(--cor-destaque)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isTudoMapeado() ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Todos os itens mapeados com sucesso</span>
                </>
              ) : (
                <>
                  <Clock size={16} />
                  <span>Mapeamento de itens pendente</span>
                </>
              )}
            </span>
          </div>

          <div className={styles.footerBtns}>
            <button
              type="button"
              onClick={handleSalvarRascunho}
              disabled={salvando}
              className={styles.btnSalvarRascunho}
            >
              Salvar Rascunho
            </button>

            <button
              type="button"
              onClick={handleConcluirFiscal}
              disabled={salvando || !isTudoMapeado()}
              className={styles.btnConcluir}
            >
              <CheckCircle2 size={18} />
              <span>{salvando ? 'Processando na Omie...' : 'Concluir Recebimento Fiscal'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submodal: Itens da NF-e Recebida (Estilo Oficial Omie) */}
      {itemIndexEdicao !== null && (() => {
        const itemEd = (itensDaNota || [])[itemIndexEdicao];
        if (!itemEd) return null;

        const totalItens = (itensDaNota || []).length;
        const cod = itemEd.codigo || `item_${itemIndexEdicao}`;
        const selectedProdCod = mapeamentos[cod] || '';
        const matchedProd = produtos.find(p => p.codigo === selectedProdCod);
        const vUnit = Number(itemEd.valorUnitario || 0);
        const vTotal = Number(itemEd.valorTotal || (itemEd.quantidade * vUnit));
        const vDesc = Number(itemEd.valorDesconto || 0);
        const qtdRec = quantidadesRecebidas[cod] !== undefined ? quantidadesRecebidas[cod] : itemEd.quantidade;

        const isAssociar = Boolean(selectedProdCod && !selectedProdCod.startsWith('NOVO:') && selectedProdCod !== 'ignorar');
        const isNovo = Boolean(selectedProdCod.startsWith('NOVO:'));
        const isIgnorar = Boolean(selectedProdCod === 'ignorar');

        return (
          <div
            className={styles.submodalOverlay}
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) {
                setItemIndexEdicao(null);
              }
            }}
          >
            <div className={styles.submodal} onClick={(e) => e.stopPropagation()}>
              {/* Cabeçalho Oficial Omie */}
              <div className={styles.submodalHeader}>
                <div className={styles.submodalHeaderLeft}>
                  <div className={styles.iconWrapper}>
                    <PackageCheck size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 className={styles.submodalHeaderTitle}>
                        Itens da NF-e Recebida
                      </h4>
                      <span className={styles.submodalHeaderBadge}>
                        Item {itemIndexEdicao + 1} de {totalItens}
                      </span>
                    </div>
                    <p className={styles.submodalHeaderSubtitle}>
                      Código Fornecedor: <strong>{cod}</strong>
                      {matchedProd && (
                        <span> • Produto Associado: <strong>{matchedProd.descricao} ({matchedProd.codigo})</strong></span>
                      )}
                    </p>
                  </div>
                </div>

                <div className={styles.submodalHeaderActions}>
                  <button
                    type="button"
                    className={styles.btnSubmodalNav}
                    disabled={itemIndexEdicao <= 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemIndexEdicao(prev => prev - 1);
                    }}
                    title="Item Anterior"
                  >
                    <ChevronLeft size={16} />
                    <span>Item Anterior</span>
                  </button>
                  <button
                    type="button"
                    className={styles.btnSubmodalNav}
                    disabled={itemIndexEdicao >= totalItens - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemIndexEdicao(prev => prev + 1);
                    }}
                    title="Próximo Item"
                  >
                    <span>Próximo Item</span>
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.btnSubmodalSalvar}
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemIndexEdicao(null);
                    }}
                    title="Salvar alterações do item"
                  >
                    <Check size={16} />
                    <span>Salvar e Fechar</span>
                  </button>
                  <button
                    type="button"
                    className={styles.btnSubmodalClose}
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemIndexEdicao(null);
                    }}
                    title="Fechar"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Corpo do Submodal */}
              <div className={styles.submodalBody}>
                {/* Banner de Descrição do Item na Nota */}
                <div className={styles.submodalDescricaoBanner}>
                  <div className={styles.submodalDescricaoInputWrapper}>
                    <label className={styles.campoLabel}>
                      <Edit3 size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      Descrição do Produto na Nota Fiscal
                    </label>
                    <input
                      type="text"
                      value={itemEd.descricao || ''}
                      onChange={(e) => handleItemPropChange(itemIndexEdicao, 'descricao', e.target.value)}
                      placeholder="Descrição do item na nota fiscal..."
                      className={styles.submodalDescricaoInput}
                    />
                  </div>

                  <div className={styles.submodalDescricaoPills}>
                    <div className={styles.submodalPill}>
                      <span className={styles.submodalPillLabel}>Qtd NF-e</span>
                      <span className={styles.submodalPillValor}>{itemEd.quantidade} {itemEd.unidade || 'UN'}</span>
                    </div>
                    <div className={styles.submodalPill}>
                      <span className={styles.submodalPillLabel}>Valor Unitário</span>
                      <span className={styles.submodalPillValor}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vUnit)}
                      </span>
                    </div>
                    <div className={styles.submodalPill}>
                      <span className={styles.submodalPillLabel}>Valor Total Item</span>
                      <span className={styles.submodalPillValor} style={{ color: 'var(--cor-destaque)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Grid Superior de 2 Colunas Amplas */}
                <div className={styles.submodalTopGrid}>
                  {/* Card 1: Associação com Produto do Estoque */}
                  <div className={styles.submodalSecao}>
                    <h5 className={styles.submodalSecaoTitulo}>
                      <Link size={16} /> Associação com Produto do Estoque
                    </h5>

                    <div className={styles.campoGrupo}>
                      <label className={styles.campoLabel}>Situação do Item na Importação</label>
                      <div className={styles.btnSituacaoGrupo}>
                        <button
                          type="button"
                          onClick={() => handleMapeamentoChange(cod, 'ASSOCIAR:')}
                          className={`${styles.btnSituacaoItem} ${isAssociar ? styles.btnSituacaoAssociarAtivo : ''}`}
                        >
                          <Link size={14} /> Associar Existente
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMapeamentoChange(cod, `NOVO:${itemEd.descricao || cod}`)}
                          className={`${styles.btnSituacaoItem} ${isNovo ? styles.btnSituacaoNovoAtivo : ''}`}
                        >
                          <PlusCircle size={14} /> Cadastrar Novo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMapeamentoChange(cod, 'ignorar')}
                          className={`${styles.btnSituacaoItem} ${isIgnorar ? styles.btnSituacaoIgnorarAtivo : ''}`}
                        >
                          <Ban size={14} /> Ignorar
                        </button>
                      </div>
                    </div>

                    <div className={styles.campoGrupo}>
                      <label className={styles.campoLabel}>Código do Produto Associado no Almoxarifado</label>
                      <input
                        list="produtos-almoxarifado-fiscal"
                        value={selectedProdCod.startsWith('ASSOCIAR:') ? '' : (isNovo ? `NOVO: ${itemEd.descricao || cod}` : (isIgnorar ? 'IGNORAR' : selectedProdCod))}
                        onChange={(e) => handleMapeamentoChange(cod, e.target.value)}
                        placeholder="Buscar por código ou descrição do produto no almoxarifado..."
                        className={styles.campoInput}
                        disabled={isIgnorar}
                      />
                    </div>

                    {/* Preview do produto associado */}
                    {matchedProd && (
                      <div className={styles.cardProdutoAssociado}>
                        <div className={styles.cardProdutoAssociadoInfo}>
                          <Warehouse size={22} color="var(--cor-sucesso)" />
                          <div className={styles.cardProdutoAssociadoTextos}>
                            <span className={styles.cardProdutoAssociadoNome}>{matchedProd.descricao}</span>
                            <span className={styles.cardProdutoAssociadoDetalhes}>
                              Cód: <strong>{matchedProd.codigo}</strong> • Unidade: <strong>{matchedProd.unidade || 'UN'}</strong> • Estoque Atual: <strong>{matchedProd.quantidade ?? matchedProd.saldo ?? 0} {matchedProd.unidade || 'UN'}</strong>
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--cor-sucesso)', fontWeight: '700', background: 'rgba(34, 197, 94, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                          Associado
                        </span>
                      </div>
                    )}

                    {isNovo && (
                      <div className={styles.cardProdutoAssociado} style={{ borderColor: 'rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className={styles.cardProdutoAssociadoInfo}>
                          <PlusCircle size={22} color="#3b82f6" />
                          <div className={styles.cardProdutoAssociadoTextos}>
                            <span className={styles.cardProdutoAssociadoNome} style={{ color: '#3b82f6' }}>Cadastrar como Novo Produto na Omie</span>
                            <span className={styles.cardProdutoAssociadoDetalhes}>
                              Será criado automaticamente no ERP Omie e sincronizado com o Almoxarifado Central.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {isIgnorar && (
                      <div className={styles.cardProdutoAssociado} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                        <div className={styles.cardProdutoAssociadoInfo}>
                          <Ban size={22} color="var(--cor-erro)" />
                          <div className={styles.cardProdutoAssociadoTextos}>
                            <span className={styles.cardProdutoAssociadoNome} style={{ color: 'var(--cor-erro)' }}>Item Desconsiderado na Importação</span>
                            <span className={styles.cardProdutoAssociadoDetalhes}>
                              Este item não movimentará estoque e não gerará lançamento de contas a pagar.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Classificação Fiscal e Identificação */}
                    <div className={styles.gridCampos2} style={{ marginTop: '0.25rem' }}>
                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>Código NCM</label>
                        <input
                          type="text"
                          value={ncms[cod] !== undefined ? ncms[cod] : (itemEd.ncm || '')}
                          onChange={(e) => handleNcmChange(cod, e.target.value)}
                          placeholder="Ex: 27111910"
                          className={styles.campoInput}
                        />
                      </div>

                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>Código EAN (GTIN)</label>
                        <input
                          type="text"
                          value={eans[cod] !== undefined ? eans[cod] : (itemEd.ean || itemEd.gtin || 'SEM GTIN')}
                          onChange={(e) => handleEanChange(cod, e.target.value)}
                          placeholder="SEM GTIN ou Código de Barras"
                          className={styles.campoInput}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Operação Fiscal, Armazenamento, Quantidades e Valores */}
                  <div className={styles.submodalSecao}>
                    <h5 className={styles.submodalSecaoTitulo}>
                      <FileText size={16} /> Operação Fiscal, Armazenamento e Quantidades
                    </h5>

                    {/* CFOP e Local de Estoque */}
                    <div className={styles.gridCampos3}>
                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>CFOP na Nota (Emitente)</label>
                        <input
                          type="text"
                          value={itemEd.cfopNota || itemEd.cfop || '5.656'}
                          onChange={(e) => handleItemPropChange(itemIndexEdicao, 'cfopNota', e.target.value)}
                          className={styles.campoInput}
                        />
                      </div>

                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel} style={{ color: 'var(--cor-destaque)' }}>
                          CFOP de Entrada *
                        </label>
                        <select
                          value={cfops[cod] || '1.556'}
                          onChange={(e) => handleCfopChange(cod, e.target.value)}
                          className={`${styles.campoInput} ${styles.campoInputDestaque}`}
                        >
                          <option value="1.556">1.556 - Compra para uso ou consumo</option>
                          <option value="1.102">1.102 - Compra para comercialização</option>
                          <option value="1.403">1.403 - Compra comercialização com ST</option>
                          <option value="1.551">1.551 - Compra para ativo imobilizado</option>
                          <option value="2.556">2.556 - Compra uso ou consumo (Interestadual)</option>
                          <option value="2.102">2.102 - Compra comercialização (Interestadual)</option>
                        </select>
                      </div>

                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>Local de Estoque</label>
                        <select
                          value={locaisEstoque[cod] || '01'}
                          onChange={(e) => handleLocalEstoqueChange(cod, e.target.value)}
                          className={styles.campoInput}
                        >
                          {listaLocaisEstoque && listaLocaisEstoque.length > 0 ? (
                            listaLocaisEstoque.map(loc => {
                              const codVal = loc.codigo || loc.codigo_local_estoque;
                              const label = formatarNomeLocal(loc);
                              return (
                                <option key={loc.codigo_local_estoque || loc.codigo} value={codVal}>
                                  {label}
                                </option>
                              );
                            })
                          ) : (
                            <>
                              <option value="01">01 - Almoxarifado Central</option>
                              <option value="PADRAO">PADRAO - Local de Estoque Padrão</option>
                              <option value="02">02 - Armazém de Matéria Prima</option>
                              <option value="03">03 - Armazém de Serragem</option>
                              <option value="04">04 - Armazém de Cama de Frango</option>
                              <option value="05">05 - Armazém de Insumos para Construção Civil</option>
                              <option value="06">06 - Armazém Fabrica de Ração</option>
                              <option value="Posto de Combustivel">Posto de Combustivel</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Quantidades e Unidades */}
                    <div className={styles.gridCampos4}>
                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>Quantidade NF</label>
                        <input
                          type="number"
                          step="any"
                          value={itemEd.quantidade}
                          onChange={(e) => handleItemPropChange(itemIndexEdicao, 'quantidade', e.target.value)}
                          className={styles.campoInput}
                        />
                      </div>

                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>Unidade NF</label>
                        <input
                          type="text"
                          value={itemEd.unidade || 'UN'}
                          onChange={(e) => handleItemPropChange(itemIndexEdicao, 'unidade', e.target.value)}
                          className={styles.campoInput}
                        />
                      </div>

                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel} style={{ color: 'var(--cor-destaque)' }}>
                          Qtd Recebida (Física) *
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={qtdRec}
                          onChange={(e) => handleQuantidadeRecebidaChange(cod, e.target.value)}
                          className={`${styles.campoInput} ${styles.campoInputDestaque}`}
                        />
                      </div>

                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>Unidade no Estoque</label>
                        <input
                          type="text"
                          value={unidadesEstoque[cod] || itemEd.unidade || 'UN'}
                          onChange={(e) => handleUnidadeEstoqueChange(cod, e.target.value)}
                          placeholder="UN"
                          className={styles.campoInput}
                        />
                      </div>
                    </div>

                    {/* Preços e Total */}
                    <div className={styles.gridCampos3}>
                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>Preço Unitário (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={itemEd.valorUnitario || 0}
                          onChange={(e) => handleItemPropChange(itemIndexEdicao, 'valorUnitario', e.target.value)}
                          className={styles.campoInput}
                        />
                      </div>

                      <div className={styles.campoGrupo}>
                        <label className={styles.campoLabel}>Valor do Desconto (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={itemEd.valorDesconto || 0}
                          onChange={(e) => handleItemPropChange(itemIndexEdicao, 'valorDesconto', e.target.value)}
                          className={styles.campoInput}
                        />
                      </div>

                      <div className={styles.cardTotalItemHighlight}>
                        <span className={styles.cardTotalItemLabel}>Valor Total:</span>
                        <span className={styles.cardTotalItemValor}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Checkboxes de Controle Omie */}
                    <div className={styles.submodalCheckboxRow}>
                      <label className={styles.submodalCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={Boolean(naoGerarContaPagarItem[cod])}
                          onChange={(e) => handleNaoGerarContaChange(cod, e.target.checked)}
                        />
                        <span>Não deve gerar uma conta a pagar</span>
                      </label>

                      <label className={styles.submodalCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={Boolean(naoMovimentarEstoqueItem[cod])}
                          onChange={(e) => handleNaoMovimentarEstoqueChange(cod, e.target.checked)}
                        />
                        <span>Não deve movimentar o estoque</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Seção 4: Tributação, Preço de Venda e Custos do Item (Oficial Omie) */}
                <div className={styles.submodalSecao}>
                  <h5 className={styles.submodalSecaoTitulo}>
                    <DollarSign size={16} /> Tributação, Preço de Venda e Custos do Item (Oficial Omie)
                  </h5>

                  <div className={styles.subtabsBar}>
                    <button
                      type="button"
                      className={`${styles.subtabBtn} ${abaTributoItem === 'icms' ? styles.subtabBtnActive : ''}`}
                      onClick={() => setAbaTributoItem('icms')}
                    >
                      ICMS
                    </button>
                    <button
                      type="button"
                      className={`${styles.subtabBtn} ${abaTributoItem === 'st' ? styles.subtabBtnActive : ''}`}
                      onClick={() => setAbaTributoItem('st')}
                    >
                      ICMS ST
                    </button>
                    <button
                      type="button"
                      className={`${styles.subtabBtn} ${abaTributoItem === 'ipi' ? styles.subtabBtnActive : ''}`}
                      onClick={() => setAbaTributoItem('ipi')}
                    >
                      IPI
                    </button>
                    <button
                      type="button"
                      className={`${styles.subtabBtn} ${abaTributoItem === 'pis' ? styles.subtabBtnActive : ''}`}
                      onClick={() => setAbaTributoItem('pis')}
                    >
                      PIS
                    </button>
                    <button
                      type="button"
                      className={`${styles.subtabBtn} ${abaTributoItem === 'cofins' ? styles.subtabBtnActive : ''}`}
                      onClick={() => setAbaTributoItem('cofins')}
                    >
                      COFINS
                    </button>
                    <button
                      type="button"
                      className={`${styles.subtabBtn} ${abaTributoItem === 'info' ? styles.subtabBtnActive : ''}`}
                      onClick={() => setAbaTributoItem('info')}
                    >
                      Informações Adicionais
                    </button>
                    <button
                      type="button"
                      className={`${styles.subtabBtn} ${abaTributoItem === 'preco_venda' ? styles.subtabBtnActive : ''}`}
                      onClick={() => setAbaTributoItem('preco_venda')}
                    >
                      Atualização do Preço de Venda
                    </button>
                    <button
                      type="button"
                      className={`${styles.subtabBtn} ${abaTributoItem === 'custo' ? styles.subtabBtnActive : ''}`}
                      onClick={() => setAbaTributoItem('custo')}
                    >
                      Custo de Estoque
                    </button>
                  </div>

                  {(() => {
                    const itemTrib = tributosItens[cod] || {};
                    const tribIcms = itemTrib.icms || { cst: '00', origem: '0', modalidadeBc: '3', reducaoBcPerc: 0, baseCalculo: vTotal, aliquotaPerc: 0, valor: 0 };
                    const tribSt = itemTrib.st || { baseCalculo: 0, aliquotaPerc: 0, valor: 0 };
                    const tribIpi = itemTrib.ipi || { aliquotaPerc: 0, valor: 0 };
                    const tribPis = itemTrib.pis || { aliquotaPerc: 0, valor: 0 };
                    const tribCofins = itemTrib.cofins || { aliquotaPerc: 0, valor: 0 };
                    const tribInfo = itemTrib.info || { texto: '' };
                    const tribPreco = itemTrib.precoVenda || { margemPerc: 30, precoSugerido: Number(vUnit * 1.3).toFixed(2) };
                    const tribCusto = itemTrib.custo || { custoMedio: vUnit, custoUltimaEntrada: vUnit, atualizarCustoEstoque: true };

                    return (
                      <div style={{ marginTop: '0.75rem' }}>
                        {/* Sub-aba ICMS */}
                        {abaTributoItem === 'icms' && (
                          <div className={styles.gridCampos4}>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>CST / Situação Tributária</label>
                              <input
                                type="text"
                                value={tribIcms.cst || '00'}
                                onChange={(e) => handleTributoItemChange(cod, 'icms', 'cst', e.target.value)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Origem da Mercadoria</label>
                              <select
                                value={tribIcms.origem || '0'}
                                onChange={(e) => handleTributoItemChange(cod, 'icms', 'origem', e.target.value)}
                                className={styles.campoInput}
                              >
                                <option value="0">0 - Nacional</option>
                                <option value="1">1 - Estrangeira - Importação direta</option>
                                <option value="2">2 - Estrangeira - Adquirida no mercado interno</option>
                              </select>
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Modalidade da BC do ICMS</label>
                              <select
                                value={tribIcms.modalidadeBc || '3'}
                                onChange={(e) => handleTributoItemChange(cod, 'icms', 'modalidadeBc', e.target.value)}
                                className={styles.campoInput}
                              >
                                <option value="0">0 - Margem Valor Agregado (%)</option>
                                <option value="1">1 - Pauta (Valor)</option>
                                <option value="2">2 - Preço Tabelado Máx. (valor)</option>
                                <option value="3">3 - Valor da Operação</option>
                              </select>
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>% Redução Base ICMS</label>
                              <input
                                type="number"
                                step="any"
                                value={tribIcms.reducaoBcPerc || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'icms', 'reducaoBcPerc', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Base de Cálculo ICMS (R$)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribIcms.baseCalculo !== undefined ? tribIcms.baseCalculo : vTotal}
                                onChange={(e) => handleTributoItemChange(cod, 'icms', 'baseCalculo', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Alíquota do ICMS (%)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribIcms.aliquotaPerc || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'icms', 'aliquotaPerc', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Valor do ICMS (R$)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribIcms.valor || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'icms', 'valor', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                          </div>
                        )}

                        {/* Sub-aba ICMS ST */}
                        {abaTributoItem === 'st' && (
                          <div className={styles.gridCampos3}>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Base de Cálculo ICMS ST (R$)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribSt.baseCalculo || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'st', 'baseCalculo', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Alíquota ICMS ST (%)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribSt.aliquotaPerc || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'st', 'aliquotaPerc', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Valor do ICMS ST (R$)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribSt.valor || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'st', 'valor', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                          </div>
                        )}

                        {/* Sub-aba IPI */}
                        {abaTributoItem === 'ipi' && (
                          <div className={styles.gridCampos2}>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Alíquota do IPI (%)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribIpi.aliquotaPerc || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'ipi', 'aliquotaPerc', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Valor do IPI (R$)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribIpi.valor || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'ipi', 'valor', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                          </div>
                        )}

                        {/* Sub-aba PIS */}
                        {abaTributoItem === 'pis' && (
                          <div className={styles.gridCampos2}>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Alíquota do PIS (%)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribPis.aliquotaPerc || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'pis', 'aliquotaPerc', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Valor do PIS (R$)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribPis.valor || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'pis', 'valor', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                          </div>
                        )}

                        {/* Sub-aba COFINS */}
                        {abaTributoItem === 'cofins' && (
                          <div className={styles.gridCampos2}>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Alíquota da COFINS (%)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribCofins.aliquotaPerc || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'cofins', 'aliquotaPerc', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Valor da COFINS (R$)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribCofins.valor || 0}
                                onChange={(e) => handleTributoItemChange(cod, 'cofins', 'valor', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                          </div>
                        )}

                        {/* Sub-aba Informações Adicionais */}
                        {abaTributoItem === 'info' && (
                          <div className={styles.campoGrupo}>
                            <label className={styles.campoLabel}>Observações e Informações Adicionais do Item</label>
                            <textarea
                              rows={4}
                              value={tribInfo.texto || ''}
                              onChange={(e) => handleTributoItemChange(cod, 'info', 'texto', e.target.value)}
                              placeholder="Dados complementares ou especificações técnicas do item..."
                              className={styles.campoTextarea}
                            />
                          </div>
                        )}

                        {/* Sub-aba Atualização do Preço de Venda */}
                        {abaTributoItem === 'preco_venda' && (
                          <div className={styles.gridCampos2}>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Margem de Lucro Sugerida (%)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribPreco.margemPerc || 30}
                                onChange={(e) => {
                                  const margem = parseFloat(e.target.value) || 0;
                                  const novoPreco = Number((vUnit * (1 + margem / 100)).toFixed(2));
                                  handleTributoItemChange(cod, 'precoVenda', 'margemPerc', margem);
                                  handleTributoItemChange(cod, 'precoVenda', 'precoSugerido', novoPreco);
                                }}
                                className={styles.campoInput}
                              />
                            </div>
                            <div className={styles.campoGrupo}>
                              <label className={styles.campoLabel}>Preço de Venda Sugerido (R$)</label>
                              <input
                                type="number"
                                step="any"
                                value={tribPreco.precoSugerido || Number(vUnit * 1.3).toFixed(2)}
                                onChange={(e) => handleTributoItemChange(cod, 'precoVenda', 'precoSugerido', parseFloat(e.target.value) || 0)}
                                className={styles.campoInput}
                              />
                            </div>
                          </div>
                        )}

                        {/* Sub-aba Custo de Estoque */}
                        {abaTributoItem === 'custo' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className={styles.gridCampos2}>
                              <div className={styles.campoGrupo}>
                                <label className={styles.campoLabel}>Custo Médio Atual (R$)</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={tribCusto.custoMedio || vUnit}
                                  onChange={(e) => handleTributoItemChange(cod, 'custo', 'custoMedio', parseFloat(e.target.value) || 0)}
                                  className={styles.campoInput}
                                />
                              </div>
                              <div className={styles.campoGrupo}>
                                <label className={styles.campoLabel}>Custo da Última Entrada (R$)</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={tribCusto.custoUltimaEntrada || vUnit}
                                  onChange={(e) => handleTributoItemChange(cod, 'custo', 'custoUltimaEntrada', parseFloat(e.target.value) || 0)}
                                  className={styles.campoInput}
                                />
                              </div>
                            </div>
                            <label className={styles.submodalCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={tribCusto.atualizarCustoEstoque !== false}
                                onChange={(e) => handleTributoItemChange(cod, 'custo', 'atualizarCustoEstoque', e.target.checked)}
                              />
                              <span>Atualizar preço de custo no estoque do produto</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Rodapé do Submodal */}
              <div className={styles.submodalFooter}>
                <div className={styles.submodalTotais}>
                  <div className={styles.submodalTotalPill}>
                    Total Mercadoria: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vTotal)}</strong>
                  </div>
                  <div className={styles.submodalTotalPill}>
                    Desconto: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(vDesc)}</strong>
                  </div>
                  <div className={styles.submodalTotalPill}>
                    Total da NF: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotal || vTotal)}</strong>
                  </div>
                  {Number(qtdRec) !== Number(itemEd.quantidade) && (
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: Number(qtdRec) < Number(itemEd.quantidade) ? 'var(--cor-erro)' : 'var(--cor-destaque)',
                      background: Number(qtdRec) < Number(itemEd.quantidade) ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 107, 0, 0.12)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {Number(qtdRec) < Number(itemEd.quantidade)
                        ? `Falta Física: -${(Number(itemEd.quantidade) - Number(qtdRec)).toFixed(2)} ${itemEd.unidade || 'UN'}`
                        : `Excedente Físico: +${(Number(qtdRec) - Number(itemEd.quantidade)).toFixed(2)} ${itemEd.unidade || 'UN'}`
                      }
                    </span>
                  )}
                </div>

                <div className={styles.submodalNavCenter}>
                  <button
                    type="button"
                    className={styles.btnSubmodalNav}
                    disabled={itemIndexEdicao <= 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemIndexEdicao(prev => prev - 1);
                    }}
                    title="Item Anterior"
                  >
                    <ChevronLeft size={16} />
                    <span>Item Anterior</span>
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--cor-texto-principal)', padding: '0 6px' }}>
                    Item {itemIndexEdicao + 1} de {totalItens}
                  </span>
                  <button
                    type="button"
                    className={styles.btnSubmodalNav}
                    disabled={itemIndexEdicao >= totalItens - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemIndexEdicao(prev => prev + 1);
                    }}
                    title="Próximo Item"
                  >
                    <span>Próximo Item</span>
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    className={styles.btnSubmodalSalvar}
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemIndexEdicao(null);
                    }}
                    title="Salvar e fechar detalhes do item"
                  >
                    <Check size={16} />
                    <span>Salvar e Fechar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ModalConferenciaNFe;
