import React from 'react';
import styles from './index.module.css';
import logoYamaservice from '../../../../assets/YAMASERVICE.jpeg';

const formatarDataBR = (d) => {
  if (!d) return '-';
  if (d.includes('/')) return d;
  const parts = d.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

const formatarMoedaBR = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const ImpressaoPrestacaoServico = ({ os }) => {
  if (!os) return null;

  const itens = Array.isArray(os.itensPrestacao) ? os.itensPrestacao : [];

  // Calcula o total geral somando os subtotais dos itens
  const totalGeralCalculado = itens.reduce((acc, item) => {
    const totalItem = parseFloat(item.total) || (parseFloat(item.quantidade || 0) * parseFloat(item.valorUnitario || 0)) || 0;
    return acc + totalItem;
  }, 0);

  const totalGeralFinal = totalGeralCalculado > 0 ? totalGeralCalculado : (parseFloat(os.valorEstimado) || 0);

  // Preenchimento de linhas em branco para manter a estética clássica da folha de papel
  const MIN_LINHAS = 16;
  const linhasRestantes = Math.max(0, MIN_LINHAS - itens.length);

  const primeiroTurno = Array.isArray(os.turnosPrestacao) && os.turnosPrestacao.length > 0 ? os.turnosPrestacao[0] : null;
  const ultimoTurno = Array.isArray(os.turnosPrestacao) && os.turnosPrestacao.length > 0 ? os.turnosPrestacao[os.turnosPrestacao.length - 1] : null;

  let horaInicioFinal = os.horaInicio || (primeiroTurno ? primeiroTurno.horaInicio : '') || '';
  let horaFimFinal = os.horaFim || (ultimoTurno ? ultimoTurno.horaFim : '') || '';
  let intervaloAlmocoStr = '';

  if (primeiroTurno) {
    const almocoIni = primeiroTurno.horaAlmocoInicio || primeiroTurno.horaFim1 || '11:30';
    const almocoFim = primeiroTurno.horaAlmocoFim || primeiroTurno.horaInicio2 || '13:00';
    if (primeiroTurno.tipoTurno === 'MANHA') {
      horaInicioFinal = primeiroTurno.horaInicio || '07:30';
      horaFimFinal = almocoIni;
      intervaloAlmocoStr = '(Turno da Manhã)';
    } else if (primeiroTurno.tipoTurno === 'TARDE') {
      horaInicioFinal = almocoFim;
      horaFimFinal = primeiroTurno.horaFim || '16:20';
      intervaloAlmocoStr = '(Turno da Tarde)';
    } else if (primeiroTurno.tipoTurno === 'CONTINUO') {
      horaInicioFinal = primeiroTurno.horaInicio || '07:00';
      horaFimFinal = primeiroTurno.horaFim || '13:00';
      intervaloAlmocoStr = '(Turno Contínuo)';
    } else {
      if (almocoIni && almocoFim) {
        intervaloAlmocoStr = `(Almoço: ${almocoIni} às ${almocoFim})`;
      }
    }
  }

  const dataHoraInicioStr = [
    os.dataInicio ? formatarDataBR(os.dataInicio) : (primeiroTurno ? formatarDataBR(primeiroTurno.data) : ''),
    horaInicioFinal
  ].filter(Boolean).join(' ') || '-';

  const dataHoraFimStr = [
    os.dataFim ? formatarDataBR(os.dataFim) : (ultimoTurno ? formatarDataBR(ultimoTurno.data) : ''),
    horaFimFinal
  ].filter(Boolean).join(' ') || '-';

  const itensComFoto = itens.filter(it => it.fotoNota);

  return (
    <div className={styles.printContainer}>
      {/* Cabeçalho Oficial */}
      <div className={styles.headerRow}>
        <div className={styles.logoArea}>
          <img src={logoYamaservice} alt="Yamaservice" className={styles.logoImg} />
          <div>
            <h1 className={styles.brandName}>yamaservice</h1>
          </div>
        </div>
        <div className={styles.titleArea}>
          <h2 className={styles.docTitle}>OS - Formulário de Atendimento</h2>
          <h3 className={styles.docNumero}>{os.codigo || '-'}</h3>
        </div>
      </div>

      {/* Grid de Informações do Atendimento */}
      <table className={styles.infoTable}>
        <tbody>
          <tr>
            <td style={{ width: '38%' }}>
              <span className={styles.infoLabel}>Unid. de Destino:</span>
              <span className={styles.infoVal}>{os.centroCusto || os.unidadeDestino || 'G. KAWAMURA'}</span>
            </td>
            <td style={{ width: '18%' }}>
              <span className={styles.infoLabel}>Data:</span>
              <span className={styles.infoVal}>{formatarDataBR(os.data)}</span>
            </td>
            <td style={{ width: '18%' }}>
              <span className={styles.infoLabel}>Data Limite:</span>
              <span className={styles.infoVal}>{formatarDataBR(os.prazo)}</span>
            </td>
            <td style={{ width: '26%' }}>
              <span className={styles.infoLabel}>Requisitante:</span>
              <span className={styles.infoVal}>{os.requisitante || '-'}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span className={styles.infoLabel}>Complexidade:</span>
              <span className={styles.infoVal}>{os.complexidade || 'NORMAL'}</span>
            </td>
            <td colSpan="2">
              <span className={styles.infoLabel}>Prioridade:</span>
              <span className={styles.infoVal}>{os.prioridade || '1-NORMAL'}</span>
            </td>
            <td>
              <span className={styles.infoLabel}>Ficha / Setor:</span>
              <span className={styles.infoVal}>{os.setor || 'SLD'}</span>
            </td>
          </tr>
          <tr>
            <td colSpan="4">
              <span className={styles.infoLabel}>Requisição / Atendimento (Serviço Executado):</span>
              <span className={styles.infoVal}>{os.motivo || os.descricao || os.descricaoProblema || 'LIMPEZA ENTRE LOTES'}</span>
            </td>
          </tr>
          <tr>
            <td colSpan="4">
              <span className={styles.infoLabel}>Responsável:</span>
              <span className={styles.infoVal} style={{ textTransform: 'uppercase' }}>
                {os.executor || os.responsavel || os.tecnicoResponsavel || '-'}
              </span>
            </td>
          </tr>
          <tr className={styles.boxResultadoRow}>
            <td>
              <span className={styles.infoLabel}>Data / Hora de Início:</span>
              <span className={styles.infoVal}>{dataHoraInicioStr}</span>
              {intervaloAlmocoStr && (
                <span style={{ fontSize: '8.5px', color: '#555', display: 'block', marginTop: '1px' }}>
                  {intervaloAlmocoStr}
                </span>
              )}
            </td>
            <td>
              <span className={styles.infoLabel}>Data / Hora Fim:</span>
              <span className={styles.infoVal}>{dataHoraFimStr}</span>
            </td>
            <td>
              <span className={styles.infoLabel}>Resultado:</span>
              <span className={styles.infoVal} style={{ color: '#047857' }}>
                {os.resultado || 'EXECUTADA'}
              </span>
            </td>
            <td style={{ textAlign: 'right', backgroundColor: '#fee2e2' }}>
              <span className={styles.infoLabel} style={{ color: '#991b1b', fontWeight: 'bold' }}>TOTAL GERAL:</span>
              <span className={styles.totalGeralBox}>
                {formatarMoedaBR(totalGeralFinal)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Tabela de Recursos, Mão de Obra e Consumíveis */}
      <table className={styles.recursosTable}>
        <thead>
          <tr>
            <th className={styles.colDataHora}>Data Hora</th>
            <th className={styles.colTp}>Tp</th>
            <th className={styles.colCodigo}>Código</th>
            <th className={styles.colQuant}>Quant.</th>
            <th className={styles.colDescricao}>Descrição do Consumível / Recurso</th>
            <th className={styles.colValorUni}>$/UNI</th>
            <th className={styles.colTotalItem}>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, idx) => {
            const qtdNum = parseFloat(item.quantidade) || 0;
            const vUniNum = parseFloat(item.valorUnitario) || 0;
            const totalItem = parseFloat(item.total) || (qtdNum * vUniNum);
            const isExterna = item.origem === 'EXTERNA' || item.tipo === 'EXT' || item.tipo === 'EXTERNA' || item.codigo === 'EXTERNO';

            return (
              <tr key={`item-${idx}`}>
                <td className={styles.colDataHora}>{item.dataHora ? formatarDataBR(item.dataHora) : formatarDataBR(os.data)}</td>
                <td className={styles.colTp}>{isExterna ? 'EXT' : (item.tipo || item.tp || 'MAT')}</td>
                <td className={styles.colCodigo}>{item.codigo || '-'}</td>
                <td className={styles.colQuant}>
                  {Number.isInteger(qtdNum) ? qtdNum : qtdNum.toFixed(2).replace('.', ',')}
                </td>
                <td className={styles.colDescricao}>
                  <strong>{item.descricao || '-'}</strong>
                  {isExterna && (
                    <span style={{ display: 'block', fontSize: '8.5px', color: '#b45309', fontWeight: 'bold' }}>
                      * Peça Externa {item.codigo ? `(NF/Cupom: ${item.codigo})` : ''}
                    </span>
                  )}
                </td>
                <td className={styles.colValorUni}>
                  {vUniNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={styles.colTotalItem}>
                  {totalItem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}

          {/* Linhas vazias para preenchimento da folha */}
          {[...Array(linhasRestantes)].map((_, i) => (
            <tr key={`blank-${i}`} className={styles.emptyRow}>
              <td className={styles.colDataHora}>&nbsp;</td>
              <td className={styles.colTp}>&nbsp;</td>
              <td className={styles.colCodigo}>&nbsp;</td>
              <td className={styles.colQuant}>&nbsp;</td>
              <td className={styles.colDescricao}>&nbsp;</td>
              <td className={styles.colValorUni}>&nbsp;</td>
              <td className={styles.colTotalItem}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Assinaturas */}
      <div className={styles.assinaturasContainer}>
        <div className={styles.linhaAssinatura}>
          Responsável pela Execução<br />
          <span style={{ fontSize: '9px', fontWeight: 'normal' }}>{os.executor || os.responsavel || 'Executor Yamaservice'}</span>
        </div>
        <div className={styles.linhaAssinatura}>
          Visto da Granja / Destino<br />
          <span style={{ fontSize: '9px', fontWeight: 'normal' }}>{os.centroCusto || 'Responsável Unidade'}</span>
        </div>
      </div>

      {/* Anexo Oficial de Comprovantes & Notas Fiscais de Peças Externas */}
      {itensComFoto.length > 0 && (
        <div className={styles.anexoComprovantes}>
          <div className={styles.anexoHeader}>
            <h3 className={styles.anexoTitulo}>Anexo: Comprovantes e Notas Fiscais de Compras Externas</h3>
            <span className={styles.anexoSubtitulo}>O.S. #{os.codigo} — Destino: {os.centroCusto || os.unidadeDestino || 'Granja'}</span>
          </div>
          <div className={styles.anexoGrid}>
            {itensComFoto.map((it, idx) => (
              <div key={`anexo-${idx}`} className={styles.anexoCard}>
                <div className={styles.anexoCardInfo}>
                  <div className={styles.anexoItemNome}>{it.descricao || 'Peça Externa'}</div>
                  <div className={styles.anexoItemMeta}>
                    <span><strong>Data:</strong> {it.dataHora ? formatarDataBR(it.dataHora) : '-'}</span>
                    <span><strong>Doc / NF:</strong> {it.codigo || 'S/N'}</span>
                    <span><strong>Quant:</strong> {it.quantidade}</span>
                    <span><strong>Total:</strong> {formatarMoedaBR(it.total)}</span>
                  </div>
                </div>
                <div className={styles.anexoImgContainer}>
                  <img src={it.fotoNota} alt={`Comprovante ${it.descricao}`} className={styles.anexoImg} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpressaoPrestacaoServico;
