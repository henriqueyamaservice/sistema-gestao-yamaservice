import React, { useState, useEffect } from 'react';
import styles from './index.module.css';
import { Edit2, Printer, X } from 'lucide-react';
import logoYamaservice from '../../../../assets/YAMASERVICE.jpeg';
import { calcularHorasUteisPeriodo } from '../../utils/horasUteis';

const RelatorioCustoMensal = ({
  relatoriosSalvos: relatoriosSalvosProp,
  feriadosCustomizados = [],
  onNavigateToLancamento
}) => {
  const [relatoriosSalvos, setRelatoriosSalvos] = useState(relatoriosSalvosProp || []);
  const [relatorioSelecionadoId, setRelatorioSelecionadoId] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [anoFiltro, setAnoFiltro] = useState('TODOS');

  // Atualiza relatoriosSalvos se recebido via props
  useEffect(() => {
    if (relatoriosSalvosProp) {
      setRelatoriosSalvos(relatoriosSalvosProp);
    }
  }, [relatoriosSalvosProp]);

  // Se não recebeu via props, carrega do backend
  const carregarCustos = async () => {
    if (relatoriosSalvosProp && relatoriosSalvosProp.length > 0) return;
    try {
      const response = await fetch(`/api/custos-funcionarios`);
      if (response.ok) {
        const data = await response.json();
        const listaRelatorios = Array.isArray(data) ? data : [];
        setRelatoriosSalvos(listaRelatorios);
        if (listaRelatorios.length > 0) {
          setRelatorioSelecionadoId(listaRelatorios[listaRelatorios.length - 1].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar custos:', error);
    }
  };

  useEffect(() => {
    carregarCustos();
  }, []);

  // Extrair anos únicos dos relatórios salvos
  const anosDisponiveis = Array.from(
    new Set(
      relatoriosSalvos.flatMap(r => [
        r.dataInicio ? r.dataInicio.substring(0, 4) : null,
        r.dataFim ? r.dataFim.substring(0, 4) : null
      ]).filter(Boolean)
    )
  ).sort((a, b) => b - a);

  // Filtrar relatórios fechados por ano selecionado
  const relatoriosFiltrados = relatoriosSalvos.filter(r => {
    if (anoFiltro === 'TODOS') return true;
    const anoInicio = r.dataInicio ? r.dataInicio.substring(0, 4) : '';
    const anoFim = r.dataFim ? r.dataFim.substring(0, 4) : '';
    return anoInicio === anoFiltro || anoFim === anoFiltro;
  });

  // DG (Despesa Geral do Colaborador)
  const calcularTotalDG = (func) => {
    return (parseFloat(func.folhaMensal) || 0) +
      (parseFloat(func.ferias) || 0) +
      (parseFloat(func.desligado) || 0) +
      (parseFloat(func.fgts) || 0);
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const formatarDataBR = (dataStr) => {
    if (!dataStr) return '--/--/----';
    const parts = dataStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dataStr;
  };

  // Dados do relatório selecionado para o Modal de impressão
  const relatorioExibido = relatoriosSalvos.find(r => r.id === relatorioSelecionadoId) || relatoriosSalvos[relatoriosSalvos.length - 1];
  const listaExibicaoModal = relatorioExibido?.funcionarios || [];

  // Horas Úteis do relatório exibido (persultadas ou calculadas na hora)
  const horasUteisRelatorio = relatorioExibido?.horasUteis
    || calcularHorasUteisPeriodo(relatorioExibido?.dataInicio, relatorioExibido?.dataFim, feriadosCustomizados).totalHorasUteis;

  // Totais gerais do relatório para o rodapé do Modal
  const totalTEModal = listaExibicaoModal.reduce((acc, f) => acc + (parseFloat(f.horasTrabalhadas) || 0), 0);
  const totalFolhaModal = listaExibicaoModal.reduce((acc, f) => acc + (parseFloat(f.folhaMensal) || 0), 0);
  const totalFeriasModal = listaExibicaoModal.reduce((acc, f) => acc + (parseFloat(f.ferias) || 0), 0);
  const totalDesligadoModal = listaExibicaoModal.reduce((acc, f) => acc + (parseFloat(f.desligado) || 0), 0);
  const totalFgtsModal = listaExibicaoModal.reduce((acc, f) => acc + (parseFloat(f.fgts) || 0), 0);
  const totalDGModal = listaExibicaoModal.reduce((acc, f) => acc + calcularTotalDG(f), 0);

  const totalCustoHoraUtilModal = horasUteisRelatorio > 0 ? (totalDGModal / horasUteisRelatorio) : 0;
  const totalCustoHoraRealModal = totalTEModal > 0 ? (totalDGModal / totalTEModal) : 0;

  // Função dedicada para abrir janela de impressão A4 com dados limpos
  const imprimirRelatorio = () => {
    if (!relatorioExibido) return;

    const logoUrl = new URL(logoYamaservice, window.location.origin).href;
    const printWindow = window.open('', '_blank', 'width=1150,height=800');

    const linhasFuncionarios = (relatorioExibido.funcionarios || []).map(func => {
      const dg = calcularTotalDG(func);
      const te = parseFloat(func.horasTrabalhadas) || 0;
      const custoHoraUtil = horasUteisRelatorio > 0 ? (dg / horasUteisRelatorio) : 0;
      const custoHoraReal = te > 0 ? (dg / te) : 0;

      return `
        <tr>
          <td style="white-space: nowrap;">${func.cpf || '-'}</td>
          <td style="white-space: nowrap;"><strong>${func.nome || '-'}</strong></td>
          <td>${func.cargo || '-'}</td>
          <td style="text-align: center; font-weight: bold; color: #d97706;">${te}h</td>
          <td style="text-align: right;">${formatarMoeda(func.folhaMensal)}</td>
          <td style="text-align: right;">${formatarMoeda(func.ferias)}</td>
          <td style="text-align: right;">${formatarMoeda(func.desligado)}</td>
          <td style="text-align: right;">${formatarMoeda(func.fgts)}</td>
          <td style="text-align: right; font-weight: bold; color: #d97706;">${formatarMoeda(dg)}</td>
          <td style="text-align: right; font-weight: bold; color: #2563eb;">${formatarMoeda(custoHoraUtil)} /h</td>
          <td style="text-align: right; font-weight: bold; color: #059669;">${formatarMoeda(custoHoraReal)} /h</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>YAMASERVICE - Relatório de Custo</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 12px;
              background-color: #ffffff;
              color: #000000;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 20px;
              border-bottom: 2px solid #000000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .logo {
              height: 55px;
              object-fit: contain;
            }
            .title-area h1 {
              font-size: 14px;
              margin: 0;
              font-weight: 700;
              text-transform: uppercase;
              color: #000000;
            }
            .title-area h3 {
              font-size: 11px;
              margin: 4px 0 0 0;
              color: #d97706;
              font-weight: 600;
            }
            .info-bar {
              background-color: #f3f4f6;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              padding: 8px 12px;
              margin-bottom: 12px;
              font-size: 11px;
              display: flex;
              justify-content: space-between;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 5px;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #444444;
              padding: 4px 6px;
              text-align: left;
            }
            th {
              background-color: #f3f4f6;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 8.5px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .total-row td {
              background-color: #f9fafb;
              border-top: 2px solid #000000;
              font-weight: bold;
              font-size: 9.5px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoUrl}" class="logo" alt="Logo Yamaservice" />
            <div class="title-area">
              <h1>YAMASERVICE - RELATÓRIO DE CUSTO (MÃO DE OBRA / PERÍODO E ANO)</h1>
              <h3>PERÍODO: ${formatarDataBR(relatorioExibido?.dataInicio)} ATÉ ${formatarDataBR(relatorioExibido?.dataFim)}</h3>
            </div>
          </div>

          <div class="info-bar">
            <span><strong>HORAS ÚTEIS DO MÊS (HU):</strong> ${horasUteisRelatorio} hrs</span>
            <span><strong>FÓRMULA CUSTO HORA ÚTIL:</strong> DG / HU</span>
            <span><strong>FÓRMULA CUSTO HORA REAL:</strong> DG / TE</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>CÓDIGO (CPF)</th>
                <th>NOME DO FUNCIONÁRIO</th>
                <th>CARGO</th>
                <th style="text-align: center;">TE (TEMPO EXEC.)</th>
                <th style="text-align: right;">FOLHA MENSAL</th>
                <th style="text-align: right;">FÉRIAS</th>
                <th style="text-align: right;">DESLIGADO</th>
                <th style="text-align: right;">FGTS</th>
                <th style="text-align: right;">DG (DESPESA GERAL)</th>
                <th style="text-align: right;">CUSTO HORA ÚTIL</th>
                <th style="text-align: right;">CUSTO HORA REAL</th>
              </tr>
            </thead>
            <tbody>
              ${linhasFuncionarios}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colSpan="3" style="text-align: right; font-weight: bold;">TOTAL GERAL DO PERÍODO:</td>
                <td style="text-align: center; font-weight: bold; color: #d97706;">${totalTEModal}h</td>
                <td style="text-align: right;">${formatarMoeda(totalFolhaModal)}</td>
                <td style="text-align: right;">${formatarMoeda(totalFeriasModal)}</td>
                <td style="text-align: right;">${formatarMoeda(totalDesligadoModal)}</td>
                <td style="text-align: right;">${formatarMoeda(totalFgtsModal)}</td>
                <td style="text-align: right; font-size: 10px; font-weight: bold; color: #d97706;">${formatarMoeda(totalDGModal)}</td>
                <td style="text-align: right; font-weight: bold; color: #2563eb; white-space: nowrap;">${formatarMoeda(totalCustoHoraUtilModal)} /h</td>
                <td style="text-align: right; font-weight: bold; color: #059669; white-space: nowrap;">${formatarMoeda(totalCustoHoraRealModal)} /h</td>
              </tr>
            </tfoot>
          </table>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Histórico de Relatórios Fechados</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>
            Consulta de fechamentos mensais com apuração de Horas Úteis (HU), Tempo de Execução (TE) e Despesa Geral (DG)
          </p>
        </div>

        <div className={styles.headerControls}>
          {/* FILTRO POR ANO */}
          <div className={styles.periodoSelector}>
            <label>Filtrar por Ano:</label>
            <select
              value={anoFiltro}
              onChange={(e) => setAnoFiltro(e.target.value)}
              className={styles.selectAno}
            >
              <option value="TODOS">Todos os Anos</option>
              {anosDisponiveis.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>

          {/* BOTÃO NAVEGAR DE VOLTA PARA LANÇAMENTO DE CUSTO */}
          {onNavigateToLancamento && (
            <button
              className={styles.viewReportButton}
              onClick={onNavigateToLancamento}
            >
              <Edit2 size={18} />
              Voltar ao Lançamento
            </button>
          )}
        </div>
      </div>

      {/* GRADE DE CARDS DOS RELATÓRIOS FECHADOS */}
      <div className={styles.cardsGrid}>
        {relatoriosFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhum relatório fechado encontrado para o filtro selecionado.
          </div>
        ) : (
          relatoriosFiltrados.map(r => {
            const totalDGRelatorio = r.funcionarios?.reduce((acc, f) => acc + calcularTotalDG(f), 0) || 0;
            const totalTERelatorio = r.funcionarios?.reduce((acc, f) => acc + (parseFloat(f.horasTrabalhadas) || 0), 0) || 0;
            const huRelatorio = r.horasUteis || calcularHorasUteisPeriodo(r.dataInicio, r.dataFim, feriadosCustomizados).totalHorasUteis;

            const dataFechamentoFmt = r.dataFechamento
              ? new Date(r.dataFechamento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'N/D';

            return (
              <div
                key={r.id}
                className={styles.card}
                onClick={() => {
                  setRelatorioSelecionadoId(r.id);
                  setModalAberto(true);
                }}
              >
                <div className={styles.cardHeader}>
                  <h3>Período Fechado</h3>
                  <small style={{ color: 'var(--cor-texto-secundario, #9ca3af)' }}>
                    {formatarDataBR(r.dataInicio)} até {formatarDataBR(r.dataFim)}
                  </small>
                </div>
                <div className={styles.cardBody}>
                  <p><strong>Fechamento:</strong> {dataFechamentoFmt}</p>
                  <p><strong>Funcionários:</strong> {r.funcionarios?.length || 0}</p>
                  <p><strong>Horas Úteis (HU):</strong> <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{huRelatorio}h</span></p>
                  <p><strong>Tempo Execução (TE):</strong> <span style={{ color: 'var(--cor-destaque, #FF6B00)', fontWeight: 'bold' }}>{totalTERelatorio}h</span></p>
                  <p style={{ marginTop: '0.8rem', fontSize: '1.05rem', color: 'var(--cor-sucesso, #10b981)' }}>
                    <strong>Despesa Geral (DG):</strong> {formatarMoeda(totalDGRelatorio)}
                  </p>
                </div>
                <div className={styles.cardFooter}>
                  Clique para Abrir / Imprimir ➔
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DETALHADO DO RELATÓRIO SALVO SELECIONADO */}
      {modalAberto && relatorioExibido && (
        <div className={styles.modalOverlay} onClick={() => setModalAberto(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalActions}>
              <button className={styles.printButton} onClick={imprimirRelatorio}>
                <Printer size={18} />
                Imprimir Relatório (A4)
              </button>
              <button className={styles.closeButton} onClick={() => setModalAberto(false)}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.reportPrintContainer}>
              <div className={styles.reportHeaderPrint}>
                <img src={logoYamaservice} alt="Logo" className={styles.logoPrint} />
                <div>
                  <h1>YAMASERVICE - RELATÓRIO DE CUSTO (MÃO DE OBRA / PERÍODO E ANO)</h1>
                  <h3>
                    PERÍODO: {formatarDataBR(relatorioExibido?.dataInicio)} ATÉ {formatarDataBR(relatorioExibido?.dataFim)} | HORAS ÚTEIS (HU): {horasUteisRelatorio}h
                  </h3>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.tableReport}>
                  <thead>
                    <tr>
                      <th>CPF / CÓD.</th>
                      <th>NOME DO FUNCIONÁRIO</th>
                      <th>CARGO</th>
                      <th style={{ textAlign: 'center' }} title="Tempo de Execução real apontado em OSs">TE (TEMPO EXEC.)</th>
                      <th>FOLHA MENSAL</th>
                      <th>FÉRIAS</th>
                      <th>DESLIGADO</th>
                      <th>FGTS</th>
                      <th title="Despesa Geral total do colaborador">DG (DESPESA GERAL)</th>
                      <th title="Custo Hora Útil (Teórico) = DG / HU">CUSTO HORA ÚTIL</th>
                      <th title="Custo Hora Real (Efetivo) = DG / TE">CUSTO HORA REAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaExibicaoModal.length === 0 ? (
                      <tr>
                        <td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>
                          Nenhum dado encontrado para este relatório.
                        </td>
                      </tr>
                    ) : (
                      listaExibicaoModal.map(func => {
                        const dg = calcularTotalDG(func);
                        const te = parseFloat(func.horasTrabalhadas) || 0;
                        const custoHoraUtil = horasUteisRelatorio > 0 ? (dg / horasUteisRelatorio) : 0;
                        const custoHoraReal = te > 0 ? (dg / te) : 0;

                        return (
                          <tr key={func.cpf}>
                            <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{func.cpf}</td>
                            <td style={{ whiteSpace: 'nowrap', minWidth: '180px', fontSize: '0.8rem' }}><strong>{func.nome}</strong></td>
                            <td>{func.cargo || '-'}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-destaque, #FF6B00)', whiteSpace: 'nowrap' }}>
                              {te}h
                            </td>
                            <td>{formatarMoeda(func.folhaMensal)}</td>
                            <td>{formatarMoeda(func.ferias)}</td>
                            <td>{formatarMoeda(func.desligado)}</td>
                            <td>{formatarMoeda(func.fgts)}</td>
                            <td style={{ fontWeight: 'bold' }}>{formatarMoeda(dg)}</td>
                            <td style={{ fontWeight: 'bold', color: '#3b82f6', whiteSpace: 'nowrap' }}>
                              {formatarMoeda(custoHoraUtil)} /h
                            </td>
                            <td style={{ fontWeight: 'bold', color: 'var(--cor-sucesso, #10b981)', whiteSpace: 'nowrap' }}>
                              {formatarMoeda(custoHoraReal)} /h
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {listaExibicaoModal.length > 0 && (
                    <tfoot>
                      <tr className={styles.totalRow}>
                        <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL GERAL DO PERÍODO:</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-destaque, #FF6B00)', whiteSpace: 'nowrap' }}>
                          {totalTEModal}h
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{formatarMoeda(totalFolhaModal)}</td>
                        <td style={{ fontWeight: 'bold' }}>{formatarMoeda(totalFeriasModal)}</td>
                        <td style={{ fontWeight: 'bold' }}>{formatarMoeda(totalDesligadoModal)}</td>
                        <td style={{ fontWeight: 'bold' }}>{formatarMoeda(totalFgtsModal)}</td>
                        <td style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--cor-destaque, #FF6B00)' }}>
                          {formatarMoeda(totalDGModal)}
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#3b82f6', whiteSpace: 'nowrap' }}>
                          {formatarMoeda(totalCustoHoraUtilModal)} /h
                        </td>
                        <td style={{ fontWeight: 'bold', color: 'var(--cor-sucesso, #10b981)', whiteSpace: 'nowrap' }}>
                          {formatarMoeda(totalCustoHoraRealModal)} /h
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatorioCustoMensal;