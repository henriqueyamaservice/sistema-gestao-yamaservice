import React, { useState, useEffect } from 'react';
import styles from './index.module.css';
import { Calendar, ChevronLeft, ChevronRight, X, Plus, Trash2, Save, CheckCircle, Info } from 'lucide-react';
import { FERIADOS_NACIONAIS_PADRAO, calcularHorasUteisPeriodo } from '../../utils/horasUteis';

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DIAS_SEMANA_SIGLAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CalendarioEmpresaModal = ({
  onClose,
  feriadosCustomizadosProps = [],
  onSalvarFeriados,
  anoInicial,
  mesInicial
}) => {
  const hoje = new Date();
  const [ano, setAno] = useState(anoInicial || hoje.getFullYear());
  const [mes, setMes] = useState(mesInicial !== undefined ? mesInicial : hoje.getMonth());

  const [feriadosCustomizados, setFeriadosCustomizados] = useState(feriadosCustomizadosProps);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [nomeFeriadoInput, setNomeFeriadoInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setFeriadosCustomizados(feriadosCustomizadosProps || []);
  }, [feriadosCustomizadosProps]);

  // Navegação do mês
  const handleMesAnterior = () => {
    if (mes === 0) {
      setMes(11);
      setAno(prev => prev - 1);
    } else {
      setMes(prev => prev - 1);
    }
    setDiaSelecionado(null);
  };

  const handleMesProximo = () => {
    if (mes === 11) {
      setMes(0);
      setAno(prev => prev + 1);
    } else {
      setMes(prev => prev + 1);
    }
    setDiaSelecionado(null);
  };

  // Gerar dias do mês para a grade do calendário
  const primeiroDiaDoMes = new Date(ano, mes, 1);
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0);
  const diaSemanaInicio = primeiroDiaDoMes.getDay(); // 0 = Dom
  const totalDiasNoMes = ultimoDiaDoMes.getDate();

  // Datas formatadas para início e fim do mês
  const mesFormatado = String(mes + 1).padStart(2, '0');
  const dataInicioStr = `${ano}-${mesFormatado}-01`;
  const dataFimStr = `${ano}-${mesFormatado}-${String(totalDiasNoMes).padStart(2, '0')}`;

  // Resumo de Horas Úteis no mês em foco
  const resumoMes = calcularHorasUteisPeriodo(dataInicioStr, dataFimStr, feriadosCustomizados);

  // Ação ao clicar em um dia da grade
  const handleSelecionarDia = (numeroDia) => {
    const diaStr = String(numeroDia).padStart(2, '0');
    const dataISO = `${ano}-${mesFormatado}-${diaStr}`;
    const mmdd = `${mesFormatado}-${diaStr}`;

    // Não permite editar feriado nacional fixo
    const feriadoNacional = FERIADOS_NACIONAIS_PADRAO.find(f => f.diaMes === mmdd);
    if (feriadoNacional) {
      return;
    }

    const feriadoExistente = feriadosCustomizados.find(f => f.data === dataISO);
    setDiaSelecionado(dataISO);
    setNomeFeriadoInput(feriadoExistente ? feriadoExistente.nome : '');
  };

  // Salvar novo ou atualizar feriado municipal
  const handleAdicionarOuAtualizarFeriado = () => {
    if (!diaSelecionado || !nomeFeriadoInput.trim()) return;

    const novosFeriados = feriadosCustomizados.filter(f => f.data !== diaSelecionado);
    novosFeriados.push({
      data: diaSelecionado,
      nome: nomeFeriadoInput.trim(),
      tipo: 'municipal'
    });

    setFeriadosCustomizados(novosFeriados);
    setDiaSelecionado(null);
    setNomeFeriadoInput('');
  };

  // Remover feriado municipal
  const handleRemoverFeriado = (dataISO) => {
    const novosFeriados = feriadosCustomizados.filter(f => f.data !== dataISO);
    setFeriadosCustomizados(novosFeriados);
    setDiaSelecionado(null);
    setNomeFeriadoInput('');
  };

  // Persistir alterações no backend
  const handleSalvarTudo = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      if (onSalvarFeriados) {
        await onSalvarFeriados(feriadosCustomizados);
      } else {
        await fetch(`/api/calendario-empresa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feriadosCustomizados)
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar calendário:', error);
      alert('Erro ao salvar o calendário no servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>

        {/* Cabeçalho */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.iconContainer}>
              <Calendar size={22} />
            </div>
            <div>
              <h3>Calendário da Empresa & Carga Horária Útil</h3>
              <p>Gerencie feriados municipais/folgas e consulte as Horas Úteis (HU) calculadas</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} title="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className={styles.modalBody}>

          {/* Barra de Navegação e Legenda */}
          <div className={styles.controlsBar}>
            <div className={styles.monthNav}>
              <button className={styles.navBtn} onClick={handleMesAnterior} title="Mês Anterior">
                <ChevronLeft size={18} />
              </button>
              <div className={styles.currentMonthTitle}>
                {NOMES_MESES[mes]} de {ano}
              </div>
              <button className={styles.navBtn} onClick={handleMesProximo} title="Próximo Mês">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className={styles.legendBar}>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotNacional}`}></span> Feriado Nacional
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotMunicipal}`}></span> Feriado Municipal
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotSabado}`}></span> Sábado (4h)
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotDomingo}`}></span> Domingo (0h)
              </div>
            </div>
          </div>

          {/* Form de Edição de Feriado Municipal (caso algum dia esteja selecionado) */}
          {diaSelecionado && (
            <div className={styles.formCard}>
              <div className={styles.formCardTitle}>
                <span>
                  {feriadosCustomizados.some(f => f.data === diaSelecionado) ? 'Editar Feriado Municipal' : 'Adicionar Feriado Municipal / Folga'}
                  {` (${diaSelecionado.split('-').reverse().join('/')})`}
                </span>
                <button className={styles.closeBtn} onClick={() => setDiaSelecionado(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className={styles.inputGroup}>
                <label>Nome do Feriado / Motivo da Folga:</label>
                <input
                  type="text"
                  className={styles.inputField}
                  placeholder="Ex: Aniversário da Cidade, Emancipação, Folga Interna..."
                  value={nomeFeriadoInput}
                  onChange={e => setNomeFeriadoInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div className={styles.formActions}>
                {feriadosCustomizados.some(f => f.data === diaSelecionado) && (
                  <button className={styles.btnDelete} onClick={() => handleRemoverFeriado(diaSelecionado)}>
                    <Trash2 size={16} style={{ marginRight: '6px' }} /> Remover Feriado
                  </button>
                )}
                <button className={styles.btnSecondary} onClick={() => setDiaSelecionado(null)}>
                  Cancelar
                </button>
                <button className={styles.btnPrimary} onClick={handleAdicionarOuAtualizarFeriado}>
                  <Plus size={16} /> Salvar Feriado
                </button>
              </div>
            </div>
          )}

          {/* Grade de Dias */}
          <div className={styles.calendarGrid}>
            {/* Cabeçalho dos Dias da Semana */}
            {DIAS_SEMANA_SIGLAS.map(sigla => (
              <div key={sigla} className={styles.weekHeader}>
                {sigla}
              </div>
            ))}

            {/* Células em branco antes do 1º dia */}
            {Array.from({ length: diaSemanaInicio }).map((_, idx) => (
              <div key={`empty-${idx}`} className={styles.dayCellEmpty} />
            ))}

            {/* Células dos dias do mês */}
            {Array.from({ length: totalDiasNoMes }).map((_, idx) => {
              const diaNum = idx + 1;
              const diaStr = String(diaNum).padStart(2, '0');
              const dataISO = `${ano}-${mesFormatado}-${diaStr}`;
              const mmdd = `${mesFormatado}-${diaStr}`;

              const dateObj = new Date(ano, mes, diaNum);
              const diaSemana = dateObj.getDay();

              const feriadoNacional = FERIADOS_NACIONAIS_PADRAO.find(f => f.diaMes === mmdd);
              const feriadoCustomizado = feriadosCustomizados.find(f => f.data === dataISO);

              const isSelected = diaSelecionado === dataISO;

              let hoursLabel = '8h';
              let hoursClass = styles.hoursTagSegSex;

              if (feriadoNacional || feriadoCustomizado) {
                hoursLabel = '0h';
                hoursClass = styles.hoursTagZero;
              } else if (diaSemana === 0) {
                hoursLabel = '0h';
                hoursClass = styles.hoursTagZero;
              } else if (diaSemana === 6) {
                hoursLabel = '4h';
                hoursClass = styles.hoursTagSab;
              }

              return (
                <div
                  key={`day-${diaNum}`}
                  className={styles.dayCell}
                  onClick={() => handleSelecionarDia(diaNum)}
                  style={isSelected ? { borderColor: 'var(--cor-destaque, #FF6B00)', backgroundColor: 'var(--cor-fundo-sutil-forte, rgba(255, 107, 0, 0.15))' } : {}}
                >
                  <div className={styles.dayHeaderRow}>
                    <span className={styles.dayNumber}>{diaNum}</span>
                    <span className={`${styles.hoursTag} ${hoursClass}`}>{hoursLabel}</span>
                  </div>

                  {feriadoNacional && (
                    <div className={`${styles.feriadoBadge} ${styles.badgeNacional}`} title="Feriado Nacional Padrão">
                      {feriadoNacional.nome}
                    </div>
                  )}

                  {feriadoCustomizado && (
                    <div className={`${styles.feriadoBadge} ${styles.badgeMunicipal}`} title="Feriado Municipal/Customizado">
                      {feriadoCustomizado.nome}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Rodapé com Resumo de Horas Úteis do Mês e Ação Salvar */}
        <div className={styles.modalFooter}>
          <div className={styles.summaryCards}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Horas Úteis (HU):</span>
              <span className={styles.summaryValue}>{resumoMes.totalHorasUteis} hrs</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Dias Úteis (8h):</span>
              <span className={styles.summaryValue} style={{ color: '#ffffff' }}>{resumoMes.diasUteisSegSex} dias</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Sábados (4h):</span>
              <span className={styles.summaryValue} style={{ color: '#eab308' }}>{resumoMes.diasSabados} sáb</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Feriados:</span>
              <span className={styles.summaryValue} style={{ color: '#3b82f6' }}>{resumoMes.totalFeriados} dias</span>
            </div>
          </div>

          <div className={styles.footerActions}>
            {saveSuccess && (
              <span style={{ color: 'var(--cor-sucesso, #10b981)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={16} /> Salvo com sucesso!
              </span>
            )}
            <button className={styles.btnSecondary} onClick={onClose}>
              Fechar
            </button>
            <button className={styles.btnPrimary} onClick={handleSalvarTudo} disabled={isSaving}>
              <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CalendarioEmpresaModal;
