import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, Printer, PieChart as PieChartIcon, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import styles from './index.module.css';

const RelatorioRevisoes = ({ veiculos, onClose }) => {

  const { statsOleo, statsRevisao, acoesImediatas } = useMemo(() => {
    let oleo = { emDia: 0, atencao: 0, atrasado: 0 };
    let rev = { emDia: 0, atencao: 0, atrasado: 0 };
    let acoes = [];

    const calcular = (kmUltimo, intervalo, kmAtual) => {
      if (!kmUltimo || !intervalo || !kmAtual) return 'nao_calculavel';
      const proxima = Number(kmUltimo) + Number(intervalo);
      const falta = proxima - Number(kmAtual);
      const proporcao = falta / Number(intervalo);
      if (falta <= 0) return 'atrasado';
      if (proporcao <= 0.1) return 'atencao';
      return 'emDia';
    };

    veiculos.forEach(v => {
      const stOleo = calcular(v.kmTrocaOleo, v.intervaloTrocaOleo, v.kmAtual);
      if (stOleo !== 'nao_calculavel') oleo[stOleo]++;

      const stRev = calcular(v.kmRevisao, v.intervaloRevisao, v.kmAtual);
      if (stRev !== 'nao_calculavel') rev[stRev]++;

      if (stOleo === 'atrasado' || stOleo === 'atencao' || stRev === 'atrasado' || stRev === 'atencao') {
        acoes.push({
          placa: v.placa,
          modelo: v.modelo || v.especieTipo || '-',
          statusOleo: stOleo,
          statusRevisao: stRev
        });
      }
    });

    return { statsOleo: oleo, statsRevisao: rev, acoesImediatas: acoes };
  }, [veiculos]);

  const dataOleo = [
    { name: 'Em Dia', value: statsOleo.emDia, color: '#10b981' },
    { name: 'Atenção', value: statsOleo.atencao, color: '#f59e0b' },
    { name: 'Atrasado', value: statsOleo.atrasado, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const dataRevisao = [
    { name: 'Em Dia', value: statsRevisao.emDia, color: '#10b981' },
    { name: 'Atenção', value: statsRevisao.atencao, color: '#f59e0b' },
    { name: 'Atrasado', value: statsRevisao.atrasado, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const totalAtrasados = statsOleo.atrasado + statsRevisao.atrasado;

  return ReactDOM.createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
          <button className={styles.btnClose} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <h2 className={styles.cardTitle}>
          <PieChartIcon size={20} className={styles.logoIcon} />
          Relatório Gerencial de Manutenção
        </h2>

        <div className={styles.content}>
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <CheckCircle size={24} />
              </div>
              <div>
                <div className={styles.summaryValue}>{statsOleo.emDia + statsRevisao.emDia}</div>
                <div className={styles.summaryLabel}>Itens Em Dia</div>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <div className={styles.summaryValue}>{statsOleo.atencao + statsRevisao.atencao}</div>
                <div className={styles.summaryLabel}>Itens em Atenção</div>
              </div>
            </div>
            <div className={styles.summaryCard} style={{ border: totalAtrasados > 0 ? '1px solid var(--cor-erro)' : undefined }}>
              <div className={styles.summaryIcon} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <AlertOctagon size={24} />
              </div>
              <div>
                <div className={styles.summaryValue} style={{ color: totalAtrasados > 0 ? 'var(--cor-erro)' : undefined }}>{totalAtrasados}</div>
                <div className={styles.summaryLabel}>Itens Atrasados</div>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryIcon} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <PieChartIcon size={24} />
              </div>
              <div>
                <div className={styles.summaryValue}>{veiculos.length}</div>
                <div className={styles.summaryLabel}>Veículos Monitorados</div>
              </div>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            <div className={styles.chartContainer}>
              <h3 className={styles.chartTitle}>Saúde de Troca de Óleo</h3>
              {dataOleo.length > 0 ? (
                <div style={{ width: '100%', height: '250px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={dataOleo} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {dataOleo.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ color: 'var(--cor-texto-secundario)', padding: '40px' }}>Sem dados suficientes para calcular</p>
              )}
            </div>

            <div className={styles.chartContainer}>
              <h3 className={styles.chartTitle}>Saúde das Revisões</h3>
              {dataRevisao.length > 0 ? (
                <div style={{ width: '100%', height: '250px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={dataRevisao} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {dataRevisao.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ color: 'var(--cor-texto-secundario)', padding: '40px' }}>Sem dados suficientes para calcular</p>
              )}
            </div>
          </div>

          {acoesImediatas.length > 0 && (
            <div className={styles.tableSection}>
              <h3 className={styles.tableTitle}>
                <AlertOctagon size={18} /> Veículos que Requerem Ação (Atenção ou Atrasado)
              </h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Placa</th>
                    <th>Modelo</th>
                    <th>Status do Óleo</th>
                    <th>Status da Revisão</th>
                  </tr>
                </thead>
                <tbody>
                  {acoesImediatas.map((v, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 'bold' }}>{v.placa}</td>
                      <td>{v.modelo}</td>
                      <td style={{ color: v.statusOleo === 'atrasado' ? '#ef4444' : v.statusOleo === 'atencao' ? '#f59e0b' : 'inherit' }}>
                        {v.statusOleo === 'atrasado' ? 'ATRASADO' : v.statusOleo === 'atencao' ? 'ATENÇÃO' : '-'}
                      </td>
                      <td style={{ color: v.statusRevisao === 'atrasado' ? '#ef4444' : v.statusRevisao === 'atencao' ? '#f59e0b' : 'inherit' }}>
                        {v.statusRevisao === 'atrasado' ? 'ATRASADO' : v.statusRevisao === 'atencao' ? 'ATENÇÃO' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RelatorioRevisoes;
