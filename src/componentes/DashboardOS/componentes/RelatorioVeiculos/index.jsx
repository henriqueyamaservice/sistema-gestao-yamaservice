import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Calendar as CalendarIcon, Clock, Filter, Settings, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import RevisaoVeiculo from '../../DashboardControleCombustivel/componentes/RevisaoVeiculo';
import DetalhesVeiculoModal from '../DetalhesVeiculoModal';
import styles from './index.module.css';

// Função para calcular a diferença de horas entre duas datas/horas
function calcularHorasServico(dataInicio, horaInicio, dataFim, horaFim) {
  if (!dataInicio || !horaInicio || !dataFim || !horaFim) return 0;
  
  // Constrói objetos Date
  const start = new Date(`${dataInicio}T${horaInicio}:00`);
  const end = new Date(`${dataFim}T${horaFim}:00`);
  
  const diffMs = end - start;
  if (diffMs <= 0) return 0;
  
  return diffMs / (1000 * 60 * 60); // Diferença em horas
}

// Função para tratar número de KM
function parseKM(kmString) {
  if (!kmString) return 0;
  const val = parseFloat(String(kmString).replace(',', '.'));
  return isNaN(val) ? 0 : val;
}

const RelatorioVeiculos = ({ osList }) => {
  const currentDate = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [anoSelecionado, setAnoSelecionado] = useState(String(currentDate.getFullYear()));
  const [showConfig, setShowConfig] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [veiculoSelecionado, setVeiculoSelecionado] = useState(null);
  const [veiculosConfig, setVeiculosConfig] = useState([]);

  const carregarConfiguracoes = () => {
    fetch(`/api/veiculos`)
      .then(res => res.json())
      .then(data => setVeiculosConfig(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  // Processa e agrega os dados dos veículos sempre que osList ou filtros mudam
  const dadosAgregados = useMemo(() => {
    const agregados = {};

    // 1. Inicializa todos os veículos configurados na base (para sempre aparecerem no relatório)
    if (veiculosConfig && veiculosConfig.length > 0) {
      veiculosConfig.forEach(v => {
        agregados[v.placa] = {
          placa: v.placa,
          kmTotal: 0,
          horasTotal: 0,
          qtdOS: 0,
          kmInicialMes: null,
          kmFinalMes: null
        };
      });
    }

    if (osList && osList.length > 0) {
      // Filtra apenas OS Concluídas do mês/ano selecionado (usando dataFim como referência de conclusão)
      const osDoMes = osList.filter(os => {
        if (os.situacao !== 'CONCLUÍDO') return false;
        if (!os.dataFim) return false;
        
        const [ano, mes] = os.dataFim.split('-');
        return mes === mesSelecionado && ano === anoSelecionado;
      });

      osDoMes.forEach(os => {
        // Extrai todos os veículos desta OS (novo formato de array ou formato legado)
        const veiculosDestaOS = [];
        
        if (os.veiculos && os.veiculos.length > 0) {
          veiculosDestaOS.push(...os.veiculos);
        } else if (os.usouVeiculo === 'Sim' && os.placaVeiculo) {
          veiculosDestaOS.push({ placa: os.placaVeiculo, km: os.kmRodado });
        }

        if (veiculosDestaOS.length > 0) {
          // Calcula a duração total desta OS para contabilizar como "horas de serviço" do veículo
          const horasDaOS = calcularHorasServico(os.dataInicio, os.horaInicio, os.dataFim, os.horaFim);

          veiculosDestaOS.forEach(v => {
            const placa = v.placa.trim().toUpperCase();
            if (!placa) return;

            if (!agregados[placa]) {
              agregados[placa] = {
                placa,
                kmTotal: 0,
                horasTotal: 0,
                qtdOS: 0,
                kmInicialMes: null,
                kmFinalMes: null
              };
            }

            agregados[placa].kmTotal += parseKM(v.km);
            agregados[placa].horasTotal += horasDaOS;
            agregados[placa].qtdOS += 1;

            // Se a OS tiver kmInicial / kmFinal registrados, verifica para guardar o menor e o maior do mês
            const kmi = parseKM(v.kmInicial);
            const kmf = parseKM(v.kmFinal);

            if (kmi > 0) {
              if (agregados[placa].kmInicialMes === null || kmi < agregados[placa].kmInicialMes) {
                agregados[placa].kmInicialMes = kmi;
              }
            }
            if (kmf > 0) {
              if (agregados[placa].kmFinalMes === null || kmf > agregados[placa].kmFinalMes) {
                agregados[placa].kmFinalMes = kmf;
              }
            }
          });
        }
      });
    }

    // Converte o objeto de agregados em um array e ordena por placa
    return Object.values(agregados).sort((a, b) => a.placa.localeCompare(b.placa));
  }, [osList, mesSelecionado, anoSelecionado, veiculosConfig]);

  // Constantes para os selects
  const meses = [
    { valor: '01', nome: 'Janeiro' },
    { valor: '02', nome: 'Fevereiro' },
    { valor: '03', nome: 'Março' },
    { valor: '04', nome: 'Abril' },
    { valor: '05', nome: 'Maio' },
    { valor: '06', nome: 'Junho' },
    { valor: '07', nome: 'Julho' },
    { valor: '08', nome: 'Agosto' },
    { valor: '09', nome: 'Setembro' },
    { valor: '10', nome: 'Outubro' },
    { valor: '11', nome: 'Novembro' },
    { valor: '12', nome: 'Dezembro' }
  ];

  const anos = Array.from({ length: 5 }, (_, i) => String(currentDate.getFullYear() - i));

  // Aplica o filtro de busca
  const dadosFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return dadosAgregados;
    const termo = termoBusca.toLowerCase();
    return dadosAgregados.filter(item => {
      const conf = veiculosConfig.find(v => v.placa === item.placa);
      const placaMatch = item.placa.toLowerCase().includes(termo);
      const modeloMatch = conf && conf.modelo && conf.modelo.toLowerCase().includes(termo);
      return placaMatch || modeloMatch;
    });
  }, [dadosAgregados, termoBusca, veiculosConfig]);

  // Totais (baseado nos dados filtrados)
  const totalGeralKM = dadosFiltrados.reduce((acc, curr) => acc + curr.kmTotal, 0);
  const totalGeralHoras = dadosFiltrados.reduce((acc, curr) => acc + curr.horasTotal, 0);

  return (
    <div className={`${styles.card} ${styles.animateFadeIn}`}>
      <div className={styles.header}>
        <h2 className={styles.cardTitle}>
          <Truck size={20} className={styles.logoIcon} />
          Relatório de Uso da Frota
        </h2>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>

            <div style={{ position: 'relative', marginLeft: '16px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--cor-texto-secundario)' }} />
              <input 
                type="text" 
                className={styles.select}
                style={{ paddingLeft: '32px', minWidth: '200px' }}
                placeholder="Buscar placa ou modelo..." 
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
              />
            </div>
            <Filter size={16} className={styles.filterIcon} style={{marginLeft: '16px'}} />
            <select 
              className={styles.select}
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
            >
              {meses.map(m => (
                <option key={m.valor} value={m.valor}>{m.nome}</option>
              ))}
            </select>
            
            <select 
              className={styles.select}
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
            >
              {anos.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Veículo (Placa)</th>
              <th style={{ textAlign: 'center' }}>Categoria</th>
              <th style={{ textAlign: 'center' }}>Qtd. de O.S. Atendidas</th>
              <th style={{ textAlign: 'center' }}>Leitura Inicial (Mínimo no Mês)</th>
              <th style={{ textAlign: 'center' }}>Leitura Final (Máximo no Mês)</th>
              <th style={{ textAlign: 'center' }}>Status de Manutenção</th>
              <th style={{ textAlign: 'center' }}>Total Uso Registrado (KM/H)</th>
              <th style={{ textAlign: 'center' }}>Horas Trabalhadas (Duração O.S)</th>
            </tr>
          </thead>
          <tbody>
            {dadosFiltrados.length > 0 ? (
              dadosFiltrados.map((item, index) => {
                const conf = veiculosConfig.find(v => v.placa === item.placa);
                const unidade = conf && conf.tipoMedicao === 'Horas' ? 'H' : 'KM';
                const categoria = conf && conf.categoria ? conf.categoria : 'Carro Leve';
                
                let statusManutencao = 'Sem config.';
                let color = '#94a3b8';
                let alertText = 'Não configurado';
                let Icon = null;
                
                if (conf) {
                  if (item.kmFinalMes !== null) {
                    const metaOleo = conf.kmTrocaOleo + conf.intervaloTrocaOleo;
                    const metaRevisao = conf.kmRevisao + conf.intervaloRevisao;
                    
                    const diffOleo = metaOleo - item.kmFinalMes;
                    const diffRevisao = metaRevisao - item.kmFinalMes;
                    
                    if (diffOleo <= 0 || diffRevisao <= 0) {
                      statusManutencao = 'Vencida';
                      color = '#ef4444'; // red
                      alertText = diffOleo <= 0 ? 'Troca de Óleo Atrasada!' : 'Revisão Atrasada!';
                      Icon = AlertTriangle;
                    } else if (diffOleo <= (unidade === 'H' ? 50 : 500) || diffRevisao <= (unidade === 'H' ? 50 : 500)) {
                      statusManutencao = 'Atenção';
                      color = '#f59e0b'; // orange
                      alertText = diffOleo <= (unidade === 'H' ? 50 : 500) ? `Óleo em ${diffOleo.toFixed(0)} ${unidade}` : `Revisão em ${diffRevisao.toFixed(0)} ${unidade}`;
                      Icon = AlertTriangle;
                    } else {
                      statusManutencao = 'Ok';
                      color = '#10b981'; // green
                      alertText = 'Manutenção em dia';
                      Icon = CheckCircle;
                    }
                  } else {
                    statusManutencao = 'Aguardando';
                    color = '#3b82f6'; // blue
                    alertText = 'Aguardando Uso Atual';
                    Icon = Clock;
                  }
                }

                return (
                  <tr key={index} className={styles.tableRow} onClick={() => setVeiculoSelecionado(item.placa)}>
                  <td><strong>{item.placa}</strong></td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', whiteSpace: 'nowrap', fontSize: '0.8rem', padding: '2px 6px', backgroundColor: '#f1f5f9', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                      {categoria}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.qtdOS} O.S.</td>
                  <td style={{ textAlign: 'center' }}>
                    {item.kmInicialMes !== null ? `${item.kmInicialMes.toFixed(1)} ${unidade}` : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.kmFinalMes !== null ? `${item.kmFinalMes.toFixed(1)} ${unidade}` : '-'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '16px', backgroundColor: `${color}15`, color: color, fontWeight: 'bold', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      {Icon && <Icon size={14} />} {alertText}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--cor-destaque)', fontWeight: 'bold' }}>
                    {item.kmTotal.toFixed(1)} {unidade}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Clock size={14} color="var(--cor-texto-secundario)" />
                      {item.horasTotal.toFixed(1)} h
                    </div>
                  </td>
                </tr>
              );
            })
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--cor-texto-secundario)' }}>
                  Nenhum registro de veículo encontrado em Ordens de Serviço concluídas para este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      


      {veiculoSelecionado && (
        <DetalhesVeiculoModal
          placa={veiculoSelecionado}
          osList={osList}
          veiculosConfig={veiculosConfig}
          onClose={() => setVeiculoSelecionado(null)}
        />
      )}
    </div>
  );
};

export default RelatorioVeiculos;
