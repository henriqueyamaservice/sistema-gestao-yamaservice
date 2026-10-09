import React, { useState, useEffect } from 'react';
import {
  FileCheck, Clock, CheckCircle2, AlertTriangle, Search,
  Barcode, ArrowRight, ExternalLink, Package, ShieldAlert,
  FileText, CloudDownload, PackageCheck, RefreshCw, Building2,
  ShieldCheck, UploadCloud
} from 'lucide-react';
import MenuRecebimentoFiscal from './componentes/MenuRecebimentoFiscal';
import ModalBiparChaveNFe from './componentes/ModalBiparChaveNFe';
import ModalConferenciaNFe from './componentes/ModalConferenciaNFe';
import ModalConfigCertificadoSefaz from './componentes/ModalConfigCertificadoSefaz';
import styles from './DashboardRecebimentoFiscal.module.css';

const DashboardRecebimentoFiscal = () => {
  const [abaAtiva, setAbaAtiva] = useState('aguardando'); // 'aguardando' | 'recebidos' | 'finalizados'
  const [pendentes, setPendentes] = useState([]);
  const [concluidas, setConcluidas] = useState([]);
  const [finalizadas, setFinalizadas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recarregando, setRecarregando] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [sincronizandoOmie, setSincronizandoOmie] = useState(false);
  const [sincronizandoSefaz, setSincronizandoSefaz] = useState(false);
  const [chavesInput, setChavesInput] = useState({});
  const [salvandoChaveId, setSalvandoChaveId] = useState(null);

  // Modais
  const [modalBipagemAberto, setModalBipagemAberto] = useState(false);
  const [modalConferenciaAberto, setModalConferenciaAberto] = useState(false);
  const [modalCertificadoAberto, setModalCertificadoAberto] = useState(false);
  const [notaEmConferencia, setNotaEmConferencia] = useState(null);

  useEffect(() => {
    carregarDados();
    const interval = setInterval(() => {
      // Não re-renderiza nem busca em segundo plano enquanto um modal de conferência, bipagem ou certificado estiver em uso
      if (!modalConferenciaAberto && !modalBipagemAberto && !modalCertificadoAberto) {
        carregarDados();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [modalConferenciaAberto, modalBipagemAberto, modalCertificadoAberto]);

  const carregarDados = async () => {
    try {
      const [resPend, resConc, resFin, resProd, resForn] = await Promise.all([
        fetch('/api/recebimento-fiscal/pendentes'),
        fetch('/api/recebimento-fiscal/concluidas'),
        fetch('/api/recebimento-fiscal/finalizadas'),
        fetch('/api/produtos'),
        fetch('/api/fornecedores')
      ]);

      const dataPend = await resPend.json();
      const dataConc = await resConc.json();
      const dataFin = await resFin.json();
      const dataProd = await resProd.json();
      const dataForn = await resForn.json();

      setPendentes(dataPend.requisicoes || []);
      setConcluidas(dataConc.requisicoes || []);
      setFinalizadas(dataFin.requisicoes || []);
      setProdutos(dataProd || []);
      setFornecedores(dataForn || []);
      setLoading(false);
      setRecarregando(false);
    } catch (err) {
      console.error('Erro ao buscar dados do Recebimento Fiscal:', err);
      setLoading(false);
      setRecarregando(false);
    }
  };

  const extrairValorFalta = (req) => {
    if (req?.divergencia?.valorDivergencia > 0) return req.divergencia.valorDivergencia;
    if (!req?.divergencia?.itensFaltantes?.length) return 0;
    let soma = 0;
    for (const it of req.divergencia.itensFaltantes) {
      let vUnit = Number(it.valorUnitario || it.precoUnitario || 0);
      if (vUnit <= 0) {
        const match = req.itens?.find(p => (p.codigo && p.codigo === it.codigo) || (p.id && p.id === it.id) || p.descricao === it.descricao);
        vUnit = Number(match?.valorUnitario || match?.precoUnitario || 0);
      }
      if (vUnit <= 0 && req.valor_total_final && it.esperado > 0) {
        vUnit = req.valor_total_final / it.esperado;
      }
      soma += (it.faltou || it.falta || 0) * vUnit;
    }
    return soma;
  };

  const handleRecarregar = () => {
    setRecarregando(true);
    carregarDados();
  };

  const handleSincronizarOmie = async () => {
    setSincronizandoOmie(true);
    try {
      const res = await fetch('/api/recebimento-fiscal/sincronizar-omie', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || data.erro) {
        throw new Error(data.mensagem || 'Falha ao sincronizar com a Omie.');
      }
      alert(data.mensagem || 'Notas consultadas e sincronizadas com sucesso!');
      carregarDados();
    } catch (err) {
      console.error(err);
      alert('Erro na sincronização: ' + err.message);
    } finally {
      setSincronizandoOmie(false);
    }
  };


  // Salvar/vincular chave de acesso diretamente pelo card em Aguardando Almoxarifado
  const handleSalvarChaveCard = async (reqId) => {
    const chave = chavesInput[reqId];
    if (chave === undefined || !String(chave).trim()) {
      alert('Informe ou bipe a chave de acesso da NF-e (44 dígitos).');
      return;
    }
    const chaveLimpa = String(chave).trim();
    if (chaveLimpa.length !== 44) {
      if (!window.confirm(`A chave digitada tem ${chaveLimpa.length} dígitos (o padrão da SEFAZ é 44 dígitos). Deseja salvar assim mesmo?`)) {
        return;
      }
    }

    setSalvandoChaveId(reqId);
    try {
      const res = await fetch('/api/recebimento-fiscal/atualizar-chave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqId, chaveNfe: chaveLimpa })
      });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.mensagem || 'Falha ao salvar chave');

      alert('Chave da NF-e vinculada com sucesso! O Almoxarifado já recebeu esta chave.');
      carregarDados();
    } catch(err) {
      alert('Erro ao salvar chave: ' + err.message);
    } finally {
      setSalvandoChaveId(null);
    }
  };

  // Helper para buscar informações completas do fornecedor
  const getFornecedorInfo = (id) => {
    const f = fornecedores.find(item => String(item.codigo_cliente_omie || item.codigo) === String(id));
    return {
      nome: f ? (f.nome_fantasia || f.razao_social) : 'Fornecedor',
      doc: f?.cnpj_cpf || ''
    };
  };

  const getNomeFornecedor = (id) => getFornecedorInfo(id).nome;

  const formatarCpfCnpj = (doc) => {
    if (!doc) return 'CNPJ / CPF não informado';
    const limpo = String(doc).replace(/\D/g, '');
    if (limpo.length === 11) {
      return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (limpo.length === 14) {
      return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  // Abertura do modal de conferência para um pedido específico
  const abrirConferenciaParaPedido = (req) => {
    const pedido = req.pedidos_omie?.[0];
    const fornId = pedido?.fornecedorId || req.fornecedorEscolhidoId;
    const forn = fornecedores.find(f => String(f.codigo_cliente_omie || f.codigo) === String(fornId));

    const notaExistente = pedido?.nota_fiscal_vinculada || req.nota_fiscal_vinculada;
    const chaveBruta = req.chaveNfe || notaExistente?.chaveAcesso || '';
    const chaveReal = chaveBruta && !chaveBruta.startsWith('352609') && chaveBruta.length === 44 ? chaveBruta : '';
    const numeroNF = req.nota_fiscal || req.numeroNF || notaExistente?.numeroNF || (chaveReal ? String(parseInt(chaveReal.substring(25, 34), 10)) : null) || String(req.id).slice(-6);

    const notaFormatada = {
      ...notaExistente,
      chaveAcesso: chaveReal,
      numeroNF: numeroNF,
      serie: notaExistente?.serie || '1',
      dataEmissao: notaExistente?.dataEmissao || req.dataCriacao || new Date().toISOString(),
      valorTotal: notaExistente?.valorTotal || pedido?.valorTotal || req.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0,
      emitente: {
        nome: forn?.nome_fantasia || forn?.razao_social || 'Fornecedor',
        cnpj_cpf: forn?.cnpj_cpf || 'Não informado',
        codigo_cliente_omie: fornId
      },
      itens: (pedido?.itens || req.itens || []).map(i => ({
        codigo: i.codigo || i.codigo_item || 'PRD001',
        descricao: i.descricao,
        quantidade: Number(i.quantidade || 1),
        valorUnitario: Number(i.valor_unitario || 0),
        valorTotal: (Number(i.quantidade || 1)) * (Number(i.valor_unitario || 0))
      })),
      parcelas: req.parcelas_financeiro || [
        {
          nParcela: 1,
          nNumTitulo: `${numeroNF || '1'}/1`,
          dDtVenc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          nValor: pedido?.valorTotal || req.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0
        }
      ],
      requisicaoId: req.id,
      requisicaoSugeridaId: req.id,
      requisicaoObj: req,
      vinculoFixo: true
    };

    setNotaEmConferencia({
      ...notaFormatada,
      requisicaoId: req.id,
      requisicaoSugeridaId: req.id,
      vinculoFixo: true
    });
    setModalConferenciaAberto(true);
  };

  // Quando o usuário bipa a chave ou sobe o XML no ModalBiparChaveNFe
  const handleNotaCarregada = (dadosNota) => {
    setNotaEmConferencia(dadosNota);
    setModalConferenciaAberto(true);
  };

  const handleUploadXmlParaPedido = async (e, req) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      alert('Por favor, selecione um arquivo no formato .XML.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const xmlString = event.target.result;
        const res = await fetch('/api/recebimento-fiscal/upload-xml', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xmlString })
        });

        const data = await res.json();
        if (!res.ok || data.erro) {
          throw new Error(data.mensagem || 'Falha ao processar arquivo XML.');
        }

        // Incorpora o ID da requisição para que o modal saiba qual é o pedido
        const notaComReq = { ...data.dados, requisicaoSugeridaId: req.id, requisicaoObj: req, requisicaoId: req.id, vinculoFixo: true };
        setNotaEmConferencia(notaComReq);
        setModalConferenciaAberto(true);
      } catch (err) {
        console.error(err);
        alert(err.message || 'Erro ao ler arquivo XML.');
      }
    };
    reader.readAsText(file);
    e.target.value = null; // Reseta o input
  };

  // Filtragem de texto
  const aplicarFiltro = (lista) => {
    if (!filtroTexto.trim()) return lista;
    const termo = filtroTexto.toLowerCase().trim();
    return lista.filter(item => {
      const idMatch = String(item.id || '').toLowerCase().includes(termo);
      const osMatch = String(item.numeroOS || item.codigo_os || '').toLowerCase().includes(termo);
      const fornMatch = getNomeFornecedor(item.pedidos_omie?.[0]?.fornecedorId || item.fornecedorEscolhidoId).toLowerCase().includes(termo);
      const chaveMatch = String(item.nota_fiscal_vinculada?.chaveAcesso || '').includes(termo);
      const nfMatch = String(item.nota_fiscal_vinculada?.numeroNF || item.nota_fiscal || '').includes(termo);
      return idMatch || osMatch || fornMatch || chaveMatch || nfMatch;
    });
  };

  const isAbaAguardando = abaAtiva === 'aguardando' || abaAtiva === 'aguardando_almoxarifado';
  const isAbaRecebidos = abaAtiva === 'recebidos' || abaAtiva === 'recebidos_almoxarifado';
  const isAbaFinalizadas = abaAtiva === 'finalizados';

  return (
    <div className={styles.dashboardContainer}>
      <MenuRecebimentoFiscal
        view={abaAtiva}
        setView={(v) => setAbaAtiva(v)}
        pendentesCount={pendentes.length}
        concluidasCount={concluidas.length}
        finalizadasCount={finalizadas.length}
        onAbrirConfigCertificado={() => setModalCertificadoAberto(true)}
      />

      <main className={styles.mainContent}>
        {/* Header Superior Moderno */}
        <div className={styles.headerTopBar}>
          <div className={styles.headerInfo}>
            <div className={styles.headerIconHighlight}>
              <FileCheck size={28} />
            </div>
            <div className={styles.headerTitles}>
              <h1>Recebimento Fiscal</h1>
              <p>Conferência de NF-e, pareamento de produtos e integração com Contas a Pagar Omie</p>
            </div>
          </div>

          <div className={styles.headerKpis}>
            <div className={styles.kpiCard} title="Notas enviadas por Compras aguardando conferência e entrada física pelo Almoxarife">
              <div className={styles.kpiIconOrange}>
                <Clock size={26} />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Aguardando Almox.</span>
                <span className={styles.kpiValue}>{pendentes.length}</span>
              </div>
            </div>

            <div className={styles.kpiCard} title="Notas que já foram recebidas e estocadas no Almoxarifado">
              <div className={styles.kpiIconGreen}>
                <CheckCircle2 size={26} />
              </div>
              <div className={styles.kpiInfo}>
                <span className={styles.kpiLabel}>Recebidas no Almox.</span>
                <span className={styles.kpiValue}>{concluidas.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Busca e Ações Rápidas */}
        <div className={styles.searchFilterBar}>
          <div className={styles.searchBox}>
            <Search size={16} color="var(--cor-texto-secundario)" />
            <input
              type="text"
              placeholder="Buscar por NF-e, Fornecedor ou O.S..."
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
            />
          </div>

          <div className={styles.actionsGroup}>
            <button
              type="button"
              onClick={() => setModalBipagemAberto(true)}
              className={styles.btnActionDestaque}
              title="Bipar código de barras do DANFE (44 dígitos), carregar XML ou recibo"
            >
              <Barcode size={18} />
              <span>+ Bipar / Carregar NF-e</span>
            </button>

            <button
              type="button"
              onClick={handleSincronizarOmie}
              disabled={sincronizandoOmie}
              className={styles.btnActionSecundario}
              title="Consultar notas fiscais cadastradas no CNPJ da empresa na Omie"
            >
              <CloudDownload size={18} className={sincronizandoOmie ? styles.spin : ''} />
              <span>{sincronizandoOmie ? 'Consultando Omie...' : 'Buscar na Omie (CNPJ)'}</span>
            </button>


            <button
              type="button"
              onClick={handleRecarregar}
              disabled={recarregando}
              className={styles.btnActionSecundario}
              title="Atualizar lista de notas"
            >
              <RefreshCw size={16} className={recarregando ? styles.spin : ''} />
            </button>
          </div>
        </div>

        {/* Sub-header de Navegação de Abas */}
        <div className={styles.subHeaderAbas}>
          <button
            type="button"
            className={`${styles.abaTituloBtn} ${isAbaAguardando ? styles.abaTituloBtnAtiva : ''}`}
            onClick={() => setAbaAtiva('aguardando')}
          >
            <Clock size={16} />
            <span>Aguardando Almoxarifado</span>
            <span className={styles.tabBadgeAguardando}>{pendentes.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.abaTituloBtn} ${isAbaRecebidos ? styles.abaTituloBtnAtiva : ''}`}
            onClick={() => setAbaAtiva('recebidos')}
          >
            <CheckCircle2 size={16} />
            <span>Recebidos no Almoxarifado</span>
            <span className={styles.tabBadgeConcluidas}>{concluidas.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.abaTituloBtn} ${isAbaFinalizadas ? styles.abaTituloBtnAtiva : ''}`}
            onClick={() => setAbaAtiva('finalizados')}
          >
            <ShieldCheck size={16} />
            <span>Faturados / Concluídos</span>
            <span className={styles.tabBadgeConcluidas}>{finalizadas.length}</span>
          </button>
        </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className={styles.loading}>Carregando dados fiscais...</div>
      ) : (
        <>
          {/* ABA 1: PENDENTES DE CONFERÊNCIA (Já possuem NF-e bipada ou pareada) */}
          {isAbaAguardando && (
            aplicarFiltro(pendentes).length === 0 ? (
              <div className={styles.emptyState}>
                <CheckCircle2 size={54} color="var(--cor-sucesso)" />
                <h3>Nenhuma nota aguardando o Almoxarifado</h3>
                <p>Assim que o setor de Compras despachar um pedido com nota mapeada, ele aparecerá aqui com status Aguardando Almoxarifado.</p>
              </div>
            ) : (
              <div className={styles.listaGrid}>
                {aplicarFiltro(pendentes).map(req => {
                  const fornId = req.pedidos_omie?.[0]?.fornecedorId || req.fornecedorEscolhidoId;
                  const fornInfo = getFornecedorInfo(fornId);
                  const nota = req.nota_fiscal_vinculada || req.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada;
                  const fornNome = nota?.emitente?.nome || fornInfo.nome;
                  const fornDoc = formatarCpfCnpj(nota?.emitente?.cnpj_cpf || fornInfo.doc);
                  const chaveAtual = req.chaveNfe || nota?.chaveAcesso || '';
                  const chaveReal = chaveAtual && !chaveAtual.startsWith('352609') && chaveAtual.length === 44 ? chaveAtual : '';
                  const numeroNF = nota?.numeroNF || req.nota_fiscal || (chaveReal ? String(parseInt(chaveReal.substring(25, 34), 10)) : null) || req.id.split('-')[0];
                  const valorTotal = nota?.valorTotal || req.pedidos_omie?.[0]?.valorTotal || req.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0;

                  const valorFaltaItem = extrairValorFalta(req);

                  return (
                    <div key={req.id} className={`${styles.cardItem} ${styles.cardItemPendente}`}>
                      {/* 1. Status */}
                      <div className={styles.colStatus}>
                        <span className={styles.labelPequeno}>Status</span>
                        {req.status_compras === 'entregue_parcial' || req.divergencia?.status === 'pendente_compras' ? (
                          <>
                            <span className={styles.badgeStatusErro}>
                              <AlertTriangle size={14} /> Falta Física
                            </span>
                            <span className={styles.subStatusTexto}>
                              {valorFaltaItem > 0 
                                ? `Falta: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFaltaItem)}` 
                                : 'Entrada Parcial'}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={styles.badgeStatusAguardando}>
                              <Clock size={14} /> Aguardando Almox.
                            </span>
                            <span className={styles.subStatusTexto}>
                              Despachado por Compras
                            </span>
                          </>
                        )}
                      </div>

                      {/* 2. Nota Fiscal */}
                      <div className={styles.colNfe}>
                        <span className={styles.labelPequeno}>Nota Fiscal</span>
                        <div className={styles.nfeTituloRow}>
                          <FileText size={15} color="var(--cor-destaque)" />
                          <span className={styles.nfeNumero}>NF-e Nº {numeroNF}</span>
                        </div>
                        <div className={styles.subRequisicao}>
                          <span>Req. #{req.id.split('-')[0]}</span>
                          {req.numeroOS && <span className={styles.osTag}>• O.S. #{req.numeroOS}</span>}
                        </div>
                      </div>

                      {/* 3. Fornecedor */}
                      <div className={styles.colFornecedor}>
                        <span className={styles.labelPequeno}>Fornecedor</span>
                        <span className={styles.nomeFornecedor} title={fornNome}>{fornNome}</span>
                        <span className={styles.docFornecedor}>{fornDoc}</span>
                      </div>

                      {/* 4. Valor da Nota */}
                      <div className={styles.colValores}>
                        <span className={styles.labelPequeno}>Valor da Nota</span>
                        <span className={styles.valorTotal}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                        </span>
                        <span className={styles.qtdItens}>{nota?.itens?.length || req.pedidos_omie?.[0]?.itens?.length || req.itens?.length || 1} item(ns)</span>
                      </div>

                      {/* 5. Ações */}
                      <div className={styles.acoesCard} style={{ flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
                        <label className={styles.btnUploadXmlCard} title="Carregar XML desta nota fiscal">
                          <UploadCloud size={16} />
                          <span>XML</span>
                          <input 
                            type="file" 
                            accept=".xml" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleUploadXmlParaPedido(e, req)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => abrirConferenciaParaPedido(req)}
                          className={styles.btnConferir}
                          title="Visualizar dados da nota, itens e pareamento prévio"
                        >
                          <FileCheck size={16} />
                          <span>Ver Detalhes</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ABA 2: RECEBIDOS NO ALMOXARIFADO (Notas já conferidas e recebidas pelo almoxarife) */}
          {isAbaRecebidos && (
            aplicarFiltro(concluidas).length === 0 ? (
              <div className={styles.emptyState}>
                <Package size={54} color="var(--cor-texto-secundario)" />
                <h3>Nenhuma nota recebida no almoxarifado ainda</h3>
                <p>Assim que o almoxarife bipar e confirmar a contagem no módulo Recebimento, as notas aparecerão aqui com status Nota Recebida.</p>
              </div>
            ) : (
              <div className={styles.listaGrid}>
                {aplicarFiltro(concluidas).map(req => {
                  const fornId = req.pedidos_omie?.[0]?.fornecedorId || req.fornecedorEscolhidoId;
                  const fornInfo = getFornecedorInfo(fornId);
                  const nota = req.nota_fiscal_vinculada || req.pedidos_omie?.[0]?.nota_fiscal_vinculada;
                  const fornNome = nota?.emitente?.nome || fornInfo.nome;
                  const fornDoc = formatarCpfCnpj(nota?.emitente?.cnpj_cpf || fornInfo.doc);
                  const chave = req.chaveNfe || nota?.chaveAcesso || '';
                  const chaveReal = chave && !chave.startsWith('352609') && chave.length === 44 ? chave : '';
                  const numeroNF = nota?.numeroNF || req.nota_fiscal || (chaveReal ? String(parseInt(chaveReal.substring(25, 34), 10)) : null) || req.id.split('-')[0];
                  const valorTotal = nota?.valorTotal || req.pedidos_omie?.[0]?.valorTotal || req.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0;

                  const valorFaltaItem = extrairValorFalta(req);

                  return (
                    <div key={req.id} className={`${styles.cardItem} ${styles.cardItemConcluido}`}>
                      {/* 1. Status */}
                      <div className={styles.colStatus}>
                        <span className={styles.labelPequeno}>Status</span>
                        {req.divergencia && (req.divergencia.valorDivergencia > 0 || valorFaltaItem > 0 || req.divergencia.itensFaltantes?.length > 0) ? (
                          req.divergencia.status === 'resolvido' ? (
                            req.divergencia.resolucao?.acao === 'abatimento_boleto' ? (
                              <>
                                <span className={styles.badgeStatusSucesso}>
                                  <CheckCircle2 size={14} /> Abatimento
                                </span>
                                <span className={styles.subStatusTexto}>
                                  -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(req.divergencia.resolucao.valorAbatimento || valorFaltaItem || req.divergencia.valorDivergencia)} (Resolvido)
                                </span>
                              </>
                            ) : req.divergencia.resolucao?.acao === 'nota_devolucao' ? (
                              <>
                                <span className={styles.badgeStatusDestaque}>
                                  <FileText size={14} /> Devolução
                                </span>
                                <span className={styles.subStatusTexto}>
                                  NF-e {req.divergencia.resolucao.notaDevolucao}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className={styles.badgeStatusAlerta}>
                                  <Clock size={14} /> Complemento
                                </span>
                                <span className={styles.subStatusTexto}>
                                  Aguardando entrega
                                </span>
                              </>
                            )
                          ) : (
                            <>
                              <span className={styles.badgeStatusErro}>
                                <AlertTriangle size={14} /> Falta Física
                              </span>
                              <span className={styles.subStatusTexto}>
                                {valorFaltaItem > 0 
                                  ? `Falta: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFaltaItem)} (Compras)`
                                  : 'Falta Física (Compras)'}
                              </span>
                            </>
                          )
                        ) : (
                          <>
                            <span className={styles.badgeStatusSucesso}>
                              <CheckCircle2 size={14} /> Nota Recebida
                            </span>
                            <span className={styles.subStatusTextoSucesso}>
                              Estoque Atualizado
                            </span>
                          </>
                        )}
                      </div>

                      {/* 2. Nota Fiscal */}
                      <div className={styles.colNfe}>
                        <span className={styles.labelPequeno}>Nota Fiscal</span>
                        <div className={styles.nfeTituloRow}>
                          <FileText size={15} color="var(--cor-destaque)" />
                          <span className={styles.nfeNumero}>NF-e Nº {numeroNF}</span>
                        </div>
                        <div className={styles.subRequisicao}>
                          <span>Req. #{req.id.split('-')[0]}</span>
                          {req.numeroOS && <span className={styles.osTag}>• O.S. #{req.numeroOS}</span>}
                        </div>
                      </div>

                      {/* 3. Fornecedor */}
                      <div className={styles.colFornecedor}>
                        <span className={styles.labelPequeno}>Fornecedor</span>
                        <span className={styles.nomeFornecedor} title={fornNome}>{fornNome}</span>
                        <span className={styles.docFornecedor}>{fornDoc}</span>
                      </div>

                      {/* 4. Valor da Nota */}
                      <div className={styles.colValores}>
                        <span className={styles.labelPequeno}>Valor da Nota</span>
                        <span className={styles.valorTotal}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                        </span>
                        <span className={styles.qtdItens}>{nota?.itens?.length || req.pedidos_omie?.[0]?.itens?.length || req.itens?.length || 1} item(ns)</span>
                      </div>

                      {/* 5. Ações */}
                      <div className={styles.acoesCard}>
                        <label className={styles.btnUploadXmlCard} title="Carregar XML desta nota fiscal">
                          <UploadCloud size={16} />
                          <span>XML</span>
                          <input 
                            type="file" 
                            accept=".xml" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleUploadXmlParaPedido(e, req)}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => abrirConferenciaParaPedido(req)}
                          className={styles.btnConferir}
                          title="Visualizar dados da nota, itens e parcelas financeiras (Contas a Pagar)"
                        >
                          <FileCheck size={16} />
                          <span>Ver Detalhes / Financeiro</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ABA 3: FATURADOS / CONCLUÍDOS (Notas já faturadas no Omie) */}
          {isAbaFinalizadas && (
            aplicarFiltro(finalizadas).length === 0 ? (
              <div className={styles.emptyState}>
                <ShieldCheck size={54} color="var(--cor-sucesso)" />
                <h3>Nenhuma nota faturada ainda</h3>
                <p>Notas que já foram integradas e finalizadas com sucesso no Omie aparecerão aqui.</p>
              </div>
            ) : (
              <div className={styles.listaGrid}>
                {aplicarFiltro(finalizadas).map(req => {
                  const fornId = req.pedidos_omie?.[0]?.fornecedorId || req.fornecedorEscolhidoId;
                  const fornInfo = getFornecedorInfo(fornId);
                  const nota = req.nota_fiscal_vinculada || req.pedidos_omie?.[0]?.nota_fiscal_vinculada;
                  const fornNome = nota?.emitente?.nome || fornInfo.nome;
                  const fornDoc = formatarCpfCnpj(nota?.emitente?.cnpj_cpf || fornInfo.doc);
                  const chave = req.chaveNfe || nota?.chaveAcesso || '';
                  const chaveReal = chave && !chave.startsWith('352609') && chave.length === 44 ? chave : '';
                  const numeroNF = nota?.numeroNF || req.nota_fiscal || (chaveReal ? String(parseInt(chaveReal.substring(25, 34), 10)) : null) || req.id.split('-')[0];
                  const valorTotal = nota?.valorTotal || req.pedidos_omie?.[0]?.valorTotal || req.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0;

                  return (
                    <div key={req.id} className={`${styles.cardItem} ${styles.cardItemConcluido}`}>
                      {/* 1. Status */}
                      <div className={styles.colStatus}>
                        <span className={styles.labelPequeno}>Status</span>
                        <span className={styles.badgeStatusSucesso}>
                          <ShieldCheck size={14} /> Faturado
                        </span>
                        <span className={styles.subStatusTextoSucesso}>
                          Integrado Omie
                        </span>
                      </div>

                      {/* 2. Nota Fiscal */}
                      <div className={styles.colNfe}>
                        <span className={styles.labelPequeno}>Nota Fiscal</span>
                        <div className={styles.nfeTituloRow}>
                          <FileText size={15} color="var(--cor-destaque)" />
                          <span className={styles.nfeNumero}>NF-e Nº {numeroNF}</span>
                        </div>
                        <div className={styles.subRequisicao}>
                          <span>Req. #{req.id.split('-')[0]}</span>
                          {req.numeroOS && <span className={styles.osTag}>• O.S. #{req.numeroOS}</span>}
                        </div>
                      </div>

                      {/* 3. Fornecedor */}
                      <div className={styles.colFornecedor}>
                        <span className={styles.labelPequeno}>Fornecedor</span>
                        <span className={styles.nomeFornecedor} title={fornNome}>{fornNome}</span>
                        <span className={styles.docFornecedor}>{fornDoc}</span>
                      </div>

                      {/* 4. Valor da Nota */}
                      <div className={styles.colValores}>
                        <span className={styles.labelPequeno}>Valor da Nota</span>
                        <span className={styles.valorTotal}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                        </span>
                        <span className={styles.qtdItens}>{nota?.itens?.length || req.pedidos_omie?.[0]?.itens?.length || req.itens?.length || 1} item(ns)</span>
                      </div>

                      {/* 5. Ações */}
                      <div className={styles.acoesCard}>
                        <button
                          type="button"
                          onClick={() => abrirConferenciaParaPedido(req)}
                          className={styles.btnConferir}
                          title="Visualizar dados da nota e faturamento"
                        >
                          <FileCheck size={16} />
                          <span>Ver Histórico</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}
      </main>

      {/* Modal 1: Bipagem de Chave / Upload XML / Lançamento Manual */}
      <ModalBiparChaveNFe
        isOpen={modalBipagemAberto}
        onClose={() => setModalBipagemAberto(false)}
        onNotaCarregada={handleNotaCarregada}
      />

      {/* Modal 2: Conferência Detalhada de Itens e Contas a Pagar */}
      <ModalConferenciaNFe
        isOpen={modalConferenciaAberto}
        onClose={() => {
          setModalConferenciaAberto(false);
          setNotaEmConferencia(null);
        }}
        nota={notaEmConferencia}
        produtos={produtos}
        requisicoes={[...concluidas, ...pendentes]}
        onConcluido={carregarDados}
      />

      {/* Modal 3: Configuração e Instalação de Certificado Digital A1 da SEFAZ */}
      <ModalConfigCertificadoSefaz
        isOpen={modalCertificadoAberto}
        onClose={() => setModalCertificadoAberto(false)}
        onCertificadoAtualizado={carregarDados}
      />
    </div>
  );
};

export default DashboardRecebimentoFiscal;
