import React from 'react';
import styles from './index.module.css';
import logoYamaservice from '../../../../assets/YAMASERVICE.jpeg';

const ImpressaoOS = ({ os }) => {
  if (!os) return null;

  const isConcluida = os.situacao === 'CONCLUÍDO' || os.situacao === 'CONCLUIDO';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img src={logoYamaservice} alt="Logo" className={styles.logo} />
        <div className={styles.headerText}>
          <h1>ORDEM DE SERVIÇO</h1>
          <h2>Nº {os.codigo}</h2>
        </div>
      </div>

      <table className={`${styles.table} ${styles.dados}`}>
        <tbody>
          <tr>
            <td colSpan="2"><strong>Tipo de Manutenção:</strong> {os.tipo}</td>
            <td colSpan="2"><strong>Data Abertura:</strong> {os.data ? os.data.split('-').reverse().join('/') : ''}</td>
          </tr>
          <tr>
            <td colSpan="2"><strong>Centro de Custo:</strong> {os.centroCusto}</td>
            <td colSpan="2"><strong>Setor:</strong> {os.setor}</td>
          </tr>
          <tr>
            <td colSpan="4"><strong>Solicitante:</strong> {os.requisitante}</td>
          </tr>
          <tr>
            <td colSpan="4" style={{ height: '70px', verticalAlign: 'top' }}>
              <strong>Descrição do Problema/Serviço:</strong><br />
              {os.descricaoProblema || os.descricao}
            </td>
          </tr>
        </tbody>
      </table>

      <h3 className={styles.sectionTitle}>Mão de Obra</h3>
      <table className={`${styles.table} ${styles.linhas}`}>
        <thead>
          <tr>
            <th style={{width: '20%'}}>Matrícula</th>
            <th style={{width: '50%'}}>Nome do Funcionário</th>
            <th style={{width: '15%'}}>Função</th>
            <th style={{width: '15%'}}>Horas</th>
          </tr>
        </thead>
        <tbody>
          {isConcluida && os.maoDeObra && os.maoDeObra.length > 0 ? (
            os.maoDeObra.map((item, i) => (
              <tr key={`mao-${i}`}>
                <td>{item.matricula}</td>
                <td>{item.nome}</td>
                <td>{item.funcao}</td>
                <td>{item.horas}</td>
              </tr>
            ))
          ) : (
            [...Array(4)].map((_, i) => (
              <tr key={`mao-${i}`}><td></td><td></td><td></td><td></td></tr>
            ))
          )}
        </tbody>
      </table>

      <h3 className={styles.sectionTitle}>Serviços Adicionais Executados</h3>
      <table className={`${styles.table} ${styles.linhas}`}>
        <thead>
          <tr>
            <th style={{width: '15%'}}>Data</th>
            <th style={{width: '15%'}}>Hora</th>
            <th style={{width: '70%'}}>Descrição do Serviço</th>
          </tr>
        </thead>
        <tbody>
          {isConcluida && os.servicosExecutados && os.servicosExecutados.length > 0 ? (
            os.servicosExecutados.map((item, i) => (
              <tr key={`serv-${i}`}>
                <td>{item.data ? item.data.split('-').reverse().join('/') : ''}</td>
                <td>{item.hora}</td>
                <td>{item.descricao}</td>
              </tr>
            ))
          ) : (
            [...Array(4)].map((_, i) => (
              <tr key={`serv-${i}`}><td></td><td></td><td></td></tr>
            ))
          )}
        </tbody>
      </table>

      <h3 className={styles.sectionTitle}>Consumíveis / Peças (Materiais)</h3>
      <table className={`${styles.table} ${styles.linhas}`}>
        <thead>
          <tr>
            <th style={{width: '15%'}}>Data</th>
            <th style={{width: '15%'}}>Hora</th>
            <th style={{width: '20%'}}>Cód. Peça</th>
            <th style={{width: '10%'}}>Quant.</th>
            <th style={{width: '40%'}}>Descrição</th>
          </tr>
        </thead>
        <tbody>
          {isConcluida && os.consumiveis && os.consumiveis.length > 0 ? (
            os.consumiveis.map((item, i) => (
              <tr key={`peca-${i}`}>
                <td>{item.data ? item.data.split('-').reverse().join('/') : ''}</td>
                <td>{item.hora}</td>
                <td>{item.codigo}</td>
                <td>{item.quantidade}</td>
                <td>{item.descricao}</td>
              </tr>
            ))
          ) : (
            [...Array(7)].map((_, i) => (
              <tr key={`peca-${i}`}><td></td><td></td><td></td><td></td><td></td></tr>
            ))
          )}
        </tbody>
      </table>

      <h3 className={styles.sectionTitle}>Finalização e Assinaturas</h3>
      <table className={`${styles.table} ${styles.dados}`}>
        <tbody>
          <tr>
            {isConcluida ? (
              <>
                <td colSpan="2"><strong>Utilizou Veículo?</strong> {os.usouVeiculo || 'Não'}</td>
                <td><strong>Placa:</strong> {os.placaVeiculo || ''}</td>
                <td><strong>KM:</strong> {os.kmRodado || ''}</td>
              </>
            ) : (
              <>
                <td colSpan="2"><strong>Utilizou Veículo?</strong> ( ) Sim &nbsp; ( ) Não</td>
                <td><strong>Placa:</strong></td>
                <td><strong>KM:</strong></td>
              </>
            )}
          </tr>
          <tr>
            {isConcluida ? (
              <>
                <td colSpan="2"><strong>Data/Hora Fim:</strong> {os.dataFim ? os.dataFim.split('-').reverse().join('/') : ''} às {os.horaFim || ''}</td>
                <td colSpan="2"><strong>Atraso/Motivo:</strong> {os.observacao || ''}</td>
              </>
            ) : (
              <>
                <td colSpan="2"><strong>Data/Hora Fim:</strong> _____/_____/_______ às ____:____</td>
                <td colSpan="2"><strong>Atraso/Motivo:</strong></td>
              </>
            )}
          </tr>
          <tr style={{ height: '70px', verticalAlign: 'bottom', textAlign: 'center' }}>
            <td colSpan="2" style={{ borderBottom: 'none' }}>__________________________________________<br/>Assinatura do Técnico</td>
            <td colSpan="2" style={{ borderBottom: 'none' }}>__________________________________________<br/>Assinatura do Solicitante / Recebedor</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ImpressaoOS;
