import React from 'react';
import styles from './index.module.css';
import logoYamaservice from '../../../../assets/YAMASERVICE.jpeg';
import { formatarQuantidadeComUnidade } from '../../../../utils/classificadorUnidades';

const ImpressaoOS = ({ os }) => {
  if (!os) return null;

  // Detecta se a O.S. possui dados de preenchimento (seja finalizada, em andamento ou apontada no totem)
  const temDadosPreenchidos = Boolean(
    os.situacao === 'CONCLUÍDO' ||
    os.situacao === 'CONCLUIDO' ||
    (os.servicosExecutados && os.servicosExecutados.length > 0) ||
    (os.maoDeObra && os.maoDeObra.length > 0) ||
    (os.consumiveis && os.consumiveis.length > 0) ||
    (os.veiculos && os.veiculos.length > 0) ||
    os.preenchidoNoTotem ||
    os.executor
  );

  // 1. Mão de Obra Consolidada (Pega direto de os.maoDeObra ou extrai dos turnos)
  const listaMaoDeObra = React.useMemo(() => {
    if (os.maoDeObra && os.maoDeObra.length > 0) {
      return os.maoDeObra.map(m => ({
        ...m,
        data: m.data || os.dataFim || os.dataInicio || os.dataAbertura || ''
      }));
    }
    const extraida = [];
    (os.servicosExecutados || []).forEach(t => {
      (t.maoDeObra || []).forEach(m => {
        if (m.nome && m.nome.trim()) {
          const jaExiste = extraida.find(x => x.nome === m.nome && (x.data === t.data || !x.data));
          if (!jaExiste) {
            extraida.push({
              data: m.data || t.data || '',
              matricula: m.matricula || '',
              nome: m.nome,
              funcao: m.funcao || 'Executor',
              horas: m.horas || ''
            });
          }
        }
      });
    });
    return extraida;
  }, [os]);

  // 2. Veículos Utilizados Consolidados
  const listaVeiculos = React.useMemo(() => {
    if (os.veiculos && os.veiculos.length > 0) {
      return os.veiculos;
    }
    const extraidos = [];
    (os.servicosExecutados || []).forEach(t => {
      (t.veiculosUtilizados || []).forEach(v => {
        if (v.placa && v.placa.trim()) {
          const jaExiste = extraidos.find(x => x.placa === v.placa);
          if (!jaExiste) {
            extraidos.push(v);
          }
        }
      });
    });
    return extraidos;
  }, [os]);

  // 3. Consumíveis / Peças Consolidadas
  const listaConsumiveis = React.useMemo(() => {
    if (os.consumiveis && os.consumiveis.length > 0) {
      return os.consumiveis.map(c => ({
        ...c,
        data: c.data || os.dataFim || os.dataInicio || os.dataAbertura || ''
      }));
    }
    const extraidas = [];
    (os.servicosExecutados || []).forEach(t => {
      (t.pecasUtilizadas || []).forEach(p => {
        if (p.descricao || p.codigo) {
          extraidas.push({
            data: p.data || t.data || '',
            hora: p.hora || '',
            codigo: p.codigo || (p.tipo === 'EXTERNA' ? 'EXTERNO' : 'ESTOQUE'),
            quantidade: p.quantidade || 1,
            descricao: p.descricao || ''
          });
        }
      });
    });
    return extraidas;
  }, [os]);

  // Helper para formatar horários de turnos (Diário de Bordo)
  const formatarHorarioTurno = (t) => {
    if (t.hora) return t.hora;
    if (t.tipoTurno === 'TARDE' || (!t.horaInicio && t.horaInicio2)) {
      return `${t.horaInicio2 || '--:--'} às ${t.horaFim || '--:--'}`;
    }
    if (t.tipoTurno === 'MANHA' || (t.horaInicio && t.horaFim1 && !t.horaInicio2)) {
      return `${t.horaInicio || '--:--'} às ${t.horaFim1 || t.horaFim || '--:--'}`;
    }
    if (t.horaInicio && t.horaFim1 && t.horaInicio2 && t.horaFim) {
      return `${t.horaInicio}-${t.horaFim1} / ${t.horaInicio2}-${t.horaFim}`;
    }
    if (t.horaInicio && t.horaFim) {
      return `${t.horaInicio} às ${t.horaFim}`;
    }
    if (t.horaInicio) return `Início: ${t.horaInicio}`;
    return '-';
  };

  // Formatação de data padrão BR
  const formatarDataBR = (d) => {
    if (!d) return '';
    if (d.includes('/')) return d;
    return d.split('T')[0].split('-').reverse().join('/');
  };

  const executorExibicao = os.executor || os.tecnicoResponsavel || 'Não definido';
  const dataInicioReal = os.dataInicio || (os.servicosExecutados?.[0]?.data) || '';
  const horaInicioReal = os.horaInicio || (os.servicosExecutados?.[0]?.horaInicio) || '';
  const dataFimReal = os.dataFim || (os.servicosExecutados?.[os.servicosExecutados.length - 1]?.data) || '';
  const horaFimReal = os.horaFim || (os.servicosExecutados?.[os.servicosExecutados.length - 1]?.horaFim) || '';

  return (
    <>
      {!os.somenteVerso && (
        <div className={styles.container}>
          {/* Cabeçalho */}
          <div className={styles.header}>
            <img src={logoYamaservice} alt="Logo" className={styles.logo} />
            <div className={styles.headerText}>
              <h1>ORDEM DE SERVIÇO</h1>
              <h2>Nº {os.codigo}</h2>
            </div>
          </div>

          {/* Tabela de Dados Gerais */}
          <table className={`${styles.table} ${styles.dados}`}>
            <tbody>
              <tr>
                <td colSpan="2"><strong>Tipo de Manutenção:</strong> {os.tipo || 'CORRETIVA'}</td>
                <td colSpan="2"><strong>Data Abertura:</strong> {formatarDataBR(os.data)} {os.hora ? `às ${os.hora}` : ''}</td>
              </tr>
              <tr>
                <td colSpan="2"><strong>Centro de Custo / Alvo:</strong> {os.centroCusto || '-'}</td>
                <td colSpan="2"><strong>Setor Responsável:</strong> {os.setor || 'MECÂNICA'}</td>
              </tr>
              <tr>
                <td colSpan="2"><strong>Requisitante / Chefe:</strong> {os.requisitante || '-'}</td>
                <td colSpan="2"><strong>Prazo Limite:</strong> {formatarDataBR(os.prazo) || 'Não definido'}</td>
              </tr>
              <tr>
                <td colSpan="2"><strong>Aberto por (Iniciativa):</strong> {os.abertoPor || os.requisitante || 'Sistema'}</td>
                <td colSpan="2"><strong>Mecânico / Executor Resp.:</strong> <strong>{executorExibicao}</strong></td>
              </tr>
              <tr>
                <td colSpan="4" style={{ height: '48px', verticalAlign: 'top' }}>
                  <strong>Descrição do Problema / Serviço Solicitado:</strong><br />
                  {os.descricaoProblema || os.descricao || '-'}
                </td>
              </tr>
              <tr>
                <td colSpan="4" style={{ height: '48px', verticalAlign: 'top' }}>
                  <strong>Motivo / Causa do Serviço (Diagnóstico):</strong><br />
                  {os.motivo || os.descricaoServico || ''}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Mão de Obra */}
          <h3 className={styles.sectionTitle}>Mão de Obra / Equipe Executora</h3>
          <table className={`${styles.table} ${styles.linhas}`}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Data</th>
                <th style={{ width: '20%' }}>CPF / Matrícula</th>
                <th style={{ width: '40%' }}>Nome do Funcionário</th>
                <th style={{ width: '13%' }}>Função</th>
                <th style={{ width: '12%' }}>Horas</th>
              </tr>
            </thead>
            <tbody>
              {temDadosPreenchidos && listaMaoDeObra.length > 0 ? (
                listaMaoDeObra.map((item, i) => (
                  <tr key={`mao-${i}`}>
                    <td>{formatarDataBR(item.data) || '-'}</td>
                    <td>{item.matricula || '-'}</td>
                    <td><strong>{item.nome}</strong></td>
                    <td>{item.funcao || 'Executor'}</td>
                    <td>{item.horas ? `${item.horas}h` : '-'}</td>
                  </tr>
                ))
              ) : (
                [...Array(6)].map((_, i) => (
                  <tr key={`mao-blank-${i}`}><td></td><td></td><td></td><td></td><td></td></tr>
                ))
              )}
            </tbody>
          </table>

          {/* Veículos Utilizados */}
          <h3 className={styles.sectionTitle}>Veículos / Equipamentos Utilizados & Frota</h3>
          <table className={`${styles.table} ${styles.linhas}`}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Utilizou Veículo?</th>
                <th style={{ width: '25%' }}>Placa / Equipamento</th>
                <th style={{ width: '20%' }}>KM / Horímetro Inicial</th>
                <th style={{ width: '20%' }}>KM / Horímetro Final</th>
                <th style={{ width: '20%' }}>KM Rodado / Manutenção</th>
              </tr>
            </thead>
            <tbody>
              {temDadosPreenchidos && listaVeiculos.length > 0 ? (
                listaVeiculos.map((item, i) => {
                  const kmInicialNum = parseFloat(item.kmInicial) || 0;
                  const kmFinalNum = parseFloat(item.kmFinal) || 0;
                  const kmRodadoCalc = item.kmRodado || item.km || (kmFinalNum > kmInicialNum ? kmFinalNum - kmInicialNum : '');
                  const infoManut = [];
                  if (item.trocouOleo) infoManut.push('Óleo Trocado');
                  if (item.fezRevisao) infoManut.push('Revisão Feita');

                  return (
                    <tr key={`veiculo-${i}`}>
                      <td>Sim</td>
                      <td><strong>{item.placa}</strong></td>
                      <td>{item.kmInicial ? item.kmInicial.toLocaleString('pt-BR') : '-'}</td>
                      <td>{item.kmFinal ? item.kmFinal.toLocaleString('pt-BR') : '-'}</td>
                      <td>
                        {kmRodadoCalc ? `${kmRodadoCalc} km` : ''}
                        {infoManut.length > 0 ? ` (${infoManut.join(', ')})` : ''}
                      </td>
                    </tr>
                  );
                })
              ) : (
                [...Array(4)].map((_, i) => (
                  <tr key={`veiculo-blank-${i}`}>
                    <td>{i === 0 && !temDadosPreenchidos ? '( ) Sim   ( ) Não' : ''}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Diário de Bordo / Serviços Executados */}
          <h3 className={styles.sectionTitle}>Diário de Bordo / Serviços Realizados por Turno</h3>
          <table className={`${styles.table} ${styles.linhas}`}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Data</th>
                <th style={{ width: '20%' }}>Período / Horário</th>
                <th style={{ width: '65%' }}>Descrição do Serviço Realizado</th>
              </tr>
            </thead>
            <tbody>
              {temDadosPreenchidos && os.servicosExecutados && os.servicosExecutados.length > 0 ? (
                [...os.servicosExecutados]
                  .sort((a, b) => (a.data || '').localeCompare(b.data || ''))
                  .map((item, i) => (
                    <tr key={`serv-${i}`}>
                      <td>{formatarDataBR(item.data)}</td>
                      <td>{formatarHorarioTurno(item)}</td>
                      <td>{item.descricao || '-'}</td>
                    </tr>
                  ))
              ) : (
                [...Array(6)].map((_, i) => (
                  <tr key={`serv-blank-${i}`}><td></td><td></td><td></td></tr>
                ))
              )}
            </tbody>
          </table>

          {/* Consumíveis / Peças */}
          <h3 className={styles.sectionTitle}>Consumíveis / Peças & Materiais Aplicados</h3>
          <table className={`${styles.table} ${styles.linhas}`}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Data</th>
                <th style={{ width: '15%' }}>Cód. / Tipo</th>
                <th style={{ width: '10%' }}>Quant.</th>
                <th style={{ width: '60%' }}>Descrição do Material</th>
              </tr>
            </thead>
            <tbody>
              {temDadosPreenchidos && listaConsumiveis.length > 0 ? (
                listaConsumiveis.map((item, i) => (
                  <tr key={`peca-${i}`}>
                    <td>{formatarDataBR(item.data) || '-'}</td>
                    <td>{item.codigo || (item.tipo === 'EXTERNA' ? 'EXTERNA' : 'ESTOQUE')}</td>
                    <td><strong>{formatarQuantidadeComUnidade(item.quantidade, item.unidade)}</strong></td>
                    <td>{item.descricao}</td>
                  </tr>
                ))
              ) : (
                [...Array(6)].map((_, i) => (
                  <tr key={`peca-blank-${i}`}><td></td><td></td><td></td><td></td></tr>
                ))
              )}
            </tbody>
          </table>

          {/* Finalização e Assinaturas */}
          <h3 className={styles.sectionTitle}>Finalização e Assinaturas</h3>
          <table className={`${styles.table} ${styles.dados}`}>
            <tbody>
              <tr>
                <td colSpan="4">
                  <strong>Resultado da Ordem de Serviço:</strong><br/>
                  <div style={{ marginTop: '5px', display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                    <span>(&nbsp;&nbsp;) Executada</span>
                    <span>(&nbsp;&nbsp;) Em andamento</span>
                    <span>(&nbsp;&nbsp;) Aguardando Insumo</span>
                    <span>(&nbsp;&nbsp;) Execução Pausada</span>
                    <span>(&nbsp;&nbsp;) Cancelada</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan="1">
                  <strong>Início Real:</strong> {formatarDataBR(dataInicioReal) || '___/___/____'} {horaInicioReal ? `às ${horaInicioReal}` : 'às __:__'}
                </td>
                <td colSpan="1">
                  <strong>Fim Real:</strong> {formatarDataBR(dataFimReal) || '___/___/____'} {horaFimReal ? `às ${horaFimReal}` : 'às __:__'}
                </td>
                <td colSpan="2">
                  <strong>Atraso / Observação:</strong> {os.observacao || os.dataJustificativa ? `Justificativa: ${os.observacao || ''}` : '-'}
                  {os.descarteBorraLitros ? ` | Borra Descartada: ${os.descarteBorraLitros}L` : ''}
                </td>
              </tr>
              <tr style={{ height: '42px', verticalAlign: 'bottom', textAlign: 'center' }}>
                <td colSpan="2" style={{ borderBottom: 'none' }}>
                  __________________________________________<br />
                  <strong>Assinatura do Técnico / Mecânico ({executorExibicao})</strong>
                </td>
                <td colSpan="2" style={{ borderBottom: 'none' }}>
                  __________________________________________<br />
                  <strong>Assinatura do Solicitante / Chefe ({os.requisitante || 'Recebedor'})</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Verso / Folha Adicional (Opcional para impressão em branco) */}
      {os.somenteVerso && (
        <div className={styles.container}>
          <div className={styles.header}>
            <img src={logoYamaservice} alt="Logo" className={styles.logo} />
            <div className={styles.headerText}>
              <h1>ORDEM DE SERVIÇO - VERSO (CONTINUAÇÃO)</h1>
              <h2>Nº {os.codigo}</h2>
            </div>
          </div>

          <h3 className={styles.sectionTitle}>Mão de Obra (Continuação)</h3>
          <table className={`${styles.table} ${styles.linhas}`}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Data</th>
                <th style={{ width: '20%' }}>CPF / Matrícula</th>
                <th style={{ width: '40%' }}>Nome do Funcionário</th>
                <th style={{ width: '13%' }}>Função</th>
                <th style={{ width: '12%' }}>Horas</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(12)].map((_, i) => (
                <tr key={`mao-verso-${i}`}><td></td><td></td><td></td><td></td><td></td></tr>
              ))}
            </tbody>
          </table>

          <h3 className={styles.sectionTitle}>Veículos Utilizados (Continuação)</h3>
          <table className={`${styles.table} ${styles.linhas}`}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Utilizou Veículo?</th>
                <th style={{ width: '25%' }}>Placa</th>
                <th style={{ width: '20%' }}>KM Inicial</th>
                <th style={{ width: '20%' }}>KM Final</th>
                <th style={{ width: '20%' }}>KM Rodado</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, i) => (
                <tr key={`veiculo-verso-${i}`}>
                  <td>{i === 0 ? '( ) Sim   ( ) Não' : ''}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className={styles.sectionTitle}>Diário de Bordo / Serviços Adicionais (Continuação)</h3>
          <table className={`${styles.table} ${styles.linhas}`}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Data</th>
                <th style={{ width: '20%' }}>Período / Horário</th>
                <th style={{ width: '65%' }}>Descrição do Serviço Realizado</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(14)].map((_, i) => (
                <tr key={`serv-verso-${i}`}><td></td><td></td><td></td></tr>
              ))}
            </tbody>
          </table>

          <h3 className={styles.sectionTitle}>Consumíveis / Peças (Continuação)</h3>
          <table className={`${styles.table} ${styles.linhas}`}>
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Data</th>
                <th style={{ width: '15%' }}>Cód. / Tipo</th>
                <th style={{ width: '10%' }}>Quant.</th>
                <th style={{ width: '60%' }}>Descrição do Material</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(14)].map((_, i) => (
                <tr key={`peca-verso-${i}`}><td></td><td></td><td></td><td></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default ImpressaoOS;
