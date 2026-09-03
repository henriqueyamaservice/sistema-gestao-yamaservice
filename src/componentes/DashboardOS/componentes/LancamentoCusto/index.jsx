import React, { useState, useEffect } from 'react';
import styles from './index.module.css';
import { Save, FileSpreadsheet, CheckCircle, Calendar, Info } from 'lucide-react';
import { calcularHorasUteisPeriodo } from '../../utils/horasUteis';

const LancamentoCusto = ({
  osList,
  relatoriosSalvos,
  carregarCustos,
  feriadosCustomizados = [],
  onOpenCalendario,
  onNavigateToRelatorio
}) => {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [funcionariosBase, setFuncionariosBase] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Helper para adicionar 1 dia a uma data YYYY-MM-DD
  const adicionarUmDia = (dataISOStr) => {
    if (!dataISOStr) return '';
    const date = new Date(dataISOStr + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  // Helper para buscar o último dia do mês de uma data YYYY-MM-DD
  const getUltimoDiaDoMes = (dataISOStr) => {
    if (!dataISOStr) return '';
    const parts = dataISOStr.split('-');
    const anoNum = parseInt(parts[0], 10);
    const mesNum = parseInt(parts[1], 10);
    if (isNaN(anoNum) || isNaN(mesNum)) return '';
    const uDia = new Date(anoNum, mesNum, 0).getDate();
    const mesStr = String(mesNum).padStart(2, '0');
    return `${anoNum}-${mesStr}-${String(uDia).padStart(2, '0')}`;
  };

  // 1. Inicializa dataInicio e dataFim baseadas nos relatoriosSalvos ou no mês atual
  useEffect(() => {
    let inicioCalculado = '';
    if (relatoriosSalvos && relatoriosSalvos.length > 0) {
      const ultimoRelatorio = relatoriosSalvos[relatoriosSalvos.length - 1];
      if (ultimoRelatorio && ultimoRelatorio.dataFim) {
        inicioCalculado = adicionarUmDia(ultimoRelatorio.dataFim);
      }
    }
    if (!inicioCalculado) {
      const hoje = new Date();
      inicioCalculado = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    }

    if (!dataInicio) {
      setDataInicio(inicioCalculado);
    }

    if (!dataFim && inicioCalculado) {
      setDataFim(getUltimoDiaDoMes(inicioCalculado));
    }
  }, [relatoriosSalvos]);

  // Se o usuário altera dataInicio e dataFim está vazia, preenche dataFim com o fim do mês
  const handleDataInicioChange = (novaDataInicio) => {
    setDataInicio(novaDataInicio);
    if (novaDataInicio) {
      setDataFim(getUltimoDiaDoMes(novaDataInicio));
    }
  };

  // Período efetivo para cálculo (mesmo que dataFim esteja temporariamente vazio)
  const dataFimEfetiva = dataFim || getUltimoDiaDoMes(dataInicio);

  // Cálculo dinâmico de Horas Úteis (HU) com base no período e calendário
  const resumoHorasUteis = calcularHorasUteisPeriodo(dataInicio, dataFimEfetiva, feriadosCustomizados);
  const horasUteis = resumoHorasUteis.totalHorasUteis;

  // 2. Extrair funcionários e acumular TEMPO DE EXECUÇÃO (TE / Horas Trabalhadas) de todas as OSs do período
  useEffect(() => {
    if (!osList || !dataInicio) {
      setFuncionariosBase([]);
      return;
    }

    const fimBusca = dataFimEfetiva;

    // Filtra as OSs pertencentes ao intervalo selecionado (ignorando OSs Canceladas)
    const osDoPeriodo = osList.filter(os => {
      if (os.situacao === 'CANCELADO') return false;
      const osData = os.data || (os.dataCriacao ? os.dataCriacao.split('T')[0] : '');
      const osDataInicio = os.dataInicio || '';
      const dataChecar = osData || osDataInicio;
      return dataChecar >= dataInicio && dataChecar <= fimBusca;
    });

    const mapFuncionarios = new Map();

    // Processa as OSs do período acumulando as horas de cada funcionário
    osDoPeriodo.forEach(os => {
      const listaMaoDeObra = [];
      if (os.maoDeObra && Array.isArray(os.maoDeObra)) {
        listaMaoDeObra.push(...os.maoDeObra);
      }
      if (os.servicosExecutados && Array.isArray(os.servicosExecutados)) {
        os.servicosExecutados.forEach(s => {
          if (s.maoDeObra && Array.isArray(s.maoDeObra)) {
            listaMaoDeObra.push(...s.maoDeObra);
          }
        });
      }

      listaMaoDeObra.forEach(func => {
        if (func.matricula || func.nome) {
          const idKey = func.matricula || func.nome;
          const horasNum = parseFloat(String(func.horas || '0').replace(/h/gi, '').replace(',', '.')) || 0;

          if (!mapFuncionarios.has(idKey)) {
            mapFuncionarios.set(idKey, {
              cpf: func.matricula || idKey,
              nome: func.nome || 'Sem Nome',
              cargo: '',
              folhaMensal: 0,
              ferias: 0,
              desligado: 0,
              fgts: 0,
              horasTrabalhadas: horasNum
            });
          } else {
            const emp = mapFuncionarios.get(idKey);
            emp.horasTrabalhadas += horasNum;
          }
        }
      });
    });

    const listaExtraida = Array.from(mapFuncionarios.values());

    setFuncionariosBase(prev => {
      return listaExtraida.map(novo => {
        const existente = prev.find(p => p.cpf === novo.cpf);
        return existente
          ? { ...existente, horasTrabalhadas: novo.horasTrabalhadas }
          : novo;
      }).sort((a, b) => a.nome.localeCompare(b.nome));
    });

  }, [osList, dataInicio, dataFim, dataFimEfetiva]);

  const handleChangeInput = (cpf, field, value) => {
    let numValue = parseFloat(value.replace(',', '.')) || 0;

    setFuncionariosBase(prev => prev.map(f => {
      if (f.cpf === cpf) {
        return { ...f, [field]: numValue };
      }
      return f;
    }));
  };

  const handleChangeText = (cpf, field, value) => {
    setFuncionariosBase(prev => prev.map(f => {
      if (f.cpf === cpf) {
        return { ...f, [field]: value };
      }
      return f;
    }));
  };

  // DG (Despesa Geral do Colaborador)
  const calcularTotalDG = (func) => {
    return (parseFloat(func.folhaMensal) || 0) +
      (parseFloat(func.ferias) || 0) +
      (parseFloat(func.desligado) || 0) +
      (parseFloat(func.fgts) || 0);
  };

  const handleCLickBotaoCalendario = () => {
    if (dataInicio) {
      const parts = dataInicio.split('-');
      const anoNum = parseInt(parts[0], 10);
      const mesNum = parseInt(parts[1], 10) - 1; // 0-indexed
      if (!isNaN(anoNum) && !isNaN(mesNum)) {
        onOpenCalendario({ ano: anoNum, mes: mesNum });
        return;
      }
    }
    onOpenCalendario(null);
  };

  const salvarCustos = async () => {
    const fimParaSalvar = dataFimEfetiva;
    if (!dataInicio || !fimParaSalvar) {
      alert('Por favor, preencha as datas de início e fim do período.');
      return;
    }

    if (fimParaSalvar < dataInicio) {
      alert('A Data Fim não pode ser anterior à Data Início.');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const novoRelatorio = {
        id: new Date().getTime().toString(),
        dataInicio,
        dataFim: fimParaSalvar,
        horasUteis, // Persiste as Horas Úteis (HU) calculadas no período
        dataFechamento: new Date().toISOString(),
        funcionarios: funcionariosBase
      };

      const payload = [...relatoriosSalvos, novoRelatorio];
      const response = await fetch(`/api/custos-funcionarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSaveMessage('Relatório de custos fechado e salvo com sucesso!');
        await carregarCustos();

        const proximaDataInicio = adicionarUmDia(fimParaSalvar);
        setDataInicio(proximaDataInicio);
        setDataFim(getUltimoDiaDoMes(proximaDataInicio));
        setFuncionariosBase([]);

        setTimeout(() => setSaveMessage(''), 4000);
      } else {
        setSaveMessage('Erro ao salvar relatório');
      }
    } catch (error) {
      console.error(error);
      setSaveMessage('Erro de conexão');
    } finally {
      setIsSaving(false);
    }
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

  // Totais Gerais
  const totalTEGeral = funcionariosBase.reduce((acc, f) => acc + (parseFloat(f.horasTrabalhadas) || 0), 0);
  const totalFolhaGeral = funcionariosBase.reduce((acc, f) => acc + (parseFloat(f.folhaMensal) || 0), 0);
  const totalFeriasGeral = funcionariosBase.reduce((acc, f) => acc + (parseFloat(f.ferias) || 0), 0);
  const totalDesligadoGeral = funcionariosBase.reduce((acc, f) => acc + (parseFloat(f.desligado) || 0), 0);
  const totalFgtsGeral = funcionariosBase.reduce((acc, f) => acc + (parseFloat(f.fgts) || 0), 0);
  const totalDGGeral = funcionariosBase.reduce((acc, f) => acc + calcularTotalDG(f), 0);

  const totalCustoHoraUtilGeral = horasUteis > 0 ? (totalDGGeral / horasUteis) : 0;
  const totalCustoHoraRealGeral = totalTEGeral > 0 ? (totalDGGeral / totalTEGeral) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Lançamento de Custos (Período Ativo)</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>
            Apuração de custos por colaborador e comparação entre Custo Hora Útil (Teórico) e Custo Hora Real (Apontado)
          </p>
        </div>

        <div className={styles.headerControls}>
          <div className={styles.dateField}>
            <label>De (Início):</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => handleDataInicioChange(e.target.value)}
            />
          </div>

          <div className={styles.dateField}>
            <label>Até (Fim):</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={styles.viewReportButton}
            onClick={handleCLickBotaoCalendario}
            style={{ backgroundColor: 'var(--cor-fundo-secundario)', border: '1px solid var(--cor-destaque, #FF6B00)' }}
            title="Abrir Calendário de Feriados e Carga Horária"
          >
            <Calendar size={18} color="var(--cor-destaque, #FF6B00)" />
            Calendário ({horasUteis}h Úteis)
          </button>

          <button className={styles.saveButton} onClick={salvarCustos} disabled={isSaving}>
            <CheckCircle size={18} />
            {isSaving ? 'Salvando...' : 'Fechar & Salvar Período'}
          </button>

          <button
            className={styles.viewReportButton}
            onClick={onNavigateToRelatorio}
          >
            <FileSpreadsheet size={18} />
            Relatórios Salvos ({relatoriosSalvos ? relatoriosSalvos.length : 0})
          </button>
        </div>
      </div>

      {saveMessage && <div className={styles.alertMessage}>{saveMessage}</div>}

      {/* Card Informativo com Resumo do Período */}
      {dataInicio && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          gap: '16px',
          padding: '12px 18px',
          marginBottom: '1rem',
          borderRadius: '10px',
          backgroundColor: 'var(--cor-fundo-cartao, #1e1e1e)',
          border: '1px solid var(--cor-borda-cartao, rgba(255,255,255,0.1))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={20} color="var(--cor-destaque, #FF6B00)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--cor-texto-principal)' }}>
              Período Selecionado: <strong>{formatarDataBR(dataInicio)}</strong> até <strong>{formatarDataBR(dataFimEfetiva)}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.85rem' }}>
            <span>Horas Úteis (HU): <strong style={{ color: 'var(--cor-destaque, #FF6B00)' }}>{horasUteis} hrs</strong></span>
            <span>Dias Úteis (8h): <strong>{resumoHorasUteis.diasUteisSegSex}d</strong></span>
            <span>Sábados (4h): <strong style={{ color: '#eab308' }}>{resumoHorasUteis.diasSabados}sáb</strong></span>
            <span>Feriados: <strong style={{ color: '#3b82f6' }}>{resumoHorasUteis.totalFeriados}d</strong></span>
          </div>
        </div>
      )}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>CPF / CÓD.</th>
              <th>NOME</th>
              <th>CARGO</th>
              <th style={{ textAlign: 'center' }} title="Tempo de Execução real apontado em OSs">TE (TEMPO EXEC.)</th>
              <th>FOLHA MENSAL</th>
              <th>FÉRIAS</th>
              <th>DESLIGADO</th>
              <th>FGTS</th>
              <th title="Despesa Geral total do Colaborador (Folha + Férias + Encargos)">DG (DESPESA GERAL)</th>
              <th title="Custo Nominal Teórico = DG / HU">CUSTO HORA ÚTIL (DG / HU)</th>
              <th title="Custo Efetivo Real = DG / TE">CUSTO HORA REAL (DG / TE)</th>
            </tr>
          </thead>
          <tbody>
            {funcionariosBase.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>
                  <span>
                    Nenhum funcionário encontrou O.S. no período de {formatarDataBR(dataInicio)} até {formatarDataBR(dataFimEfetiva)}.
                  </span>
                </td>
              </tr>
            ) : (
              funcionariosBase.map(func => {
                const dg = calcularTotalDG(func);
                const te = parseFloat(func.horasTrabalhadas) || 0;
                const custoHoraUtil = horasUteis > 0 ? (dg / horasUteis) : 0;
                const custoHoraReal = te > 0 ? (dg / te) : 0;

                return (
                  <tr key={func.cpf}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{func.cpf}</td>
                    <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }} title={func.nome}>{func.nome}</td>
                    <td>
                      <input
                        type="text"
                        className={styles.textInput}
                        value={func.cargo || ''}
                        onChange={(e) => handleChangeText(func.cpf, 'cargo', e.target.value)}
                        placeholder="Ex: Motorista"
                      />
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-destaque, #FF6B00)', whiteSpace: 'nowrap' }}>
                      {Number(te).toFixed(1)}h
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className={styles.currencyInput}
                        value={func.folhaMensal || ''}
                        onChange={(e) => handleChangeInput(func.cpf, 'folhaMensal', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className={styles.currencyInput}
                        value={func.ferias || ''}
                        onChange={(e) => handleChangeInput(func.cpf, 'ferias', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className={styles.currencyInput}
                        value={func.desligado || ''}
                        onChange={(e) => handleChangeInput(func.cpf, 'desligado', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        className={styles.currencyInput}
                        value={func.fgts || ''}
                        onChange={(e) => handleChangeInput(func.cpf, 'fgts', e.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formatarMoeda(dg)}</td>
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
          {funcionariosBase.length > 0 && (
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL GERAL DO PERÍODO:</td>
                <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-destaque, #FF6B00)', whiteSpace: 'nowrap' }}>
                  {Number(totalTEGeral).toFixed(1)}h
                </td>
                <td style={{ fontWeight: 'bold' }}>{formatarMoeda(totalFolhaGeral)}</td>
                <td style={{ fontWeight: 'bold' }}>{formatarMoeda(totalFeriasGeral)}</td>
                <td style={{ fontWeight: 'bold' }}>{formatarMoeda(totalDesligadoGeral)}</td>
                <td style={{ fontWeight: 'bold' }}>{formatarMoeda(totalFgtsGeral)}</td>
                <td style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--cor-destaque, #FF6B00)', whiteSpace: 'nowrap' }}>
                  {formatarMoeda(totalDGGeral)}
                </td>
                <td style={{ fontWeight: 'bold', color: '#3b82f6', whiteSpace: 'nowrap' }}>
                  {formatarMoeda(totalCustoHoraUtilGeral)} /h
                </td>
                <td style={{ fontWeight: 'bold', color: 'var(--cor-sucesso, #10b981)', whiteSpace: 'nowrap' }}>
                  {formatarMoeda(totalCustoHoraRealGeral)} /h
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default LancamentoCusto;
