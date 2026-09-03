import React, { useState, useEffect } from 'react';
import { Settings, Zap, CheckCircle, AlertTriangle, AlertOctagon, Info, X, Save, FilePlus } from 'lucide-react';
import styles from './index.module.css';
import { useNotification } from '../../../../../contextos/NotificationContext';

const RevisaoGerador = ({ osList = [] }) => {
  const [geradores, setGeradores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [geradorEditando, setGeradorEditando] = useState(null);
  const { addToast } = useNotification();

  // Dados do formulário
  const [dataUltimaRevisao, setDataUltimaRevisao] = useState('');
  const [intervaloMeses, setIntervaloMeses] = useState('');
  const [horimetroUltimaRevisao, setHorimetroUltimaRevisao] = useState('');
  const [intervaloHorimetro, setIntervaloHorimetro] = useState('');
  const [horimetroAtual, setHorimetroAtual] = useState('');

  const carregarGeradores = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/geradores`);
      const data = await res.json();
      setGeradores(data);
    } catch (error) {
      console.error("Erro ao buscar geradores:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarGeradores();
  }, []);

  const handleConfigurar = (gerador) => {
    setGeradorEditando(gerador);
    
    // Tenta formatar a data YYYY-MM-DD
    let dataValida = '';
    if (gerador.dataUltimaRevisao) {
      try {
        const d = new Date(gerador.dataUltimaRevisao);
        if (!isNaN(d.getTime())) {
          dataValida = d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    
    setDataUltimaRevisao(dataValida);
    setIntervaloMeses(gerador.intervaloMesesRevisao || '');
    setHorimetroUltimaRevisao(gerador.horimetroUltimaRevisao || '');
    setIntervaloHorimetro(gerador.intervaloHorimetroRevisao || '');
    setHorimetroAtual(gerador.horimetroAtual !== undefined && gerador.horimetroAtual !== null ? gerador.horimetroAtual : '');
  };

  const handleSalvar = async () => {
    if (!geradorEditando) return;
    
    try {
      let dataIso = null;
      if (dataUltimaRevisao) {
        try {
          // Garante que é tratado como data UTC meio-dia para evitar fuso jogando pro dia anterior
          dataIso = new Date(dataUltimaRevisao + 'T12:00:00Z').toISOString();
        } catch (e) {
          console.error("Data inválida:", dataUltimaRevisao);
          dataIso = null;
        }
      }

      const bodyParams = {
        id: geradorEditando.id,
        granja: geradorEditando.granja,
        marca: geradorEditando.marca,
        dataUltimaRevisao: dataIso,
        intervaloMesesRevisao: parseInt(intervaloMeses) || null,
        horimetroUltimaRevisao: parseFloat(horimetroUltimaRevisao) || null,
        intervaloHorimetroRevisao: parseFloat(intervaloHorimetro) || null,
        horimetroAtual: horimetroAtual !== '' ? parseFloat(horimetroAtual) : null
      };

      console.log("Salvando gerador:", bodyParams);

      const res = await fetch(`/api/geradores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyParams)
      });

      if (!res.ok) throw new Error("Falha ao salvar configuração");

      addToast("Configuração salva com sucesso!", "success");
      setGeradorEditando(null);
      carregarGeradores(); // Recarrega para ver atualizações
    } catch (error) {
      addToast("Erro ao salvar configuração.", "error");
    }
  };

  const handleGerarOS = async (gerador) => {
    if (!window.confirm(`Deseja abrir uma Ordem de Serviço de revisão para a granja ${gerador.granja}?`)) {
      return;
    }

    try {
      const osData = {
        data: new Date().toISOString().split('T')[0],
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        requisitante: 'SISTEMA GERADORES',
        complexidade: 'NORMAL',
        prioridade: '1-NORMAL',
        setor: 'MECÂNICA',
        centroCusto: gerador.granja,
        prazo: new Date().toISOString().split('T')[0],
        tipo: 'PREVENTIVA',
        situacao: 'EM_ANDAMENTO',
        descricao: `Revisão do Gerador: ${gerador.granja}\nMarca: ${gerador.marca || '-'}\nHorímetro Atual: ${gerador.horimetroAtual || '-'}\n\nFavor preencher na OS os litros de óleo injetados e descarte de borra.`,
        motivo: 'Revisão Periódica de Geradores',
        geradorId: gerador.id // Link para resetar o alerta no futuro
      };

      const resOS = await fetch(`/api/os`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(osData)
      });

      if (!resOS.ok) {
        throw new Error("Falha ao criar a O.S.");
      }

      addToast(`Ordem de Serviço criada com sucesso e enviada para 'Em Andamento'!`, "success");
    } catch (error) {
      addToast("Erro ao gerar OS.", "error");
    }
  };

  const calcularStatus = (gerador) => {
    // Se não tem configuração NENHUMA, fica cinza
    if (!gerador.intervaloMesesRevisao && !gerador.intervaloHorimetroRevisao) {
      return { cor: '#cbd5e1', icone: <Info size={16}/>, texto: 'Não Configurado' };
    }

    let atrasado = false;
    let atencao = false;

    // 1. Verificar por TEMPO (Meses)
    if (gerador.dataUltimaRevisao && gerador.intervaloMesesRevisao) {
      const dataUltima = new Date(gerador.dataUltimaRevisao);
      const dataProxima = new Date(dataUltima);
      dataProxima.setMonth(dataProxima.getMonth() + gerador.intervaloMesesRevisao);
      
      const hoje = new Date();
      const diasFaltando = (dataProxima - hoje) / (1000 * 60 * 60 * 24);

      if (diasFaltando <= 0) atrasado = true;
      else if (diasFaltando <= 15) atencao = true; // 15 dias de tolerância/alerta
    }

    // 2. Verificar por HORÍMETRO
    if (gerador.horimetroUltimaRevisao !== undefined && gerador.intervaloHorimetroRevisao && gerador.horimetroAtual !== undefined) {
      const proximaHorimetro = Number(gerador.horimetroUltimaRevisao) + Number(gerador.intervaloHorimetroRevisao);
      const faltaHoras = proximaHorimetro - Number(gerador.horimetroAtual);

      if (faltaHoras <= 0) atrasado = true;
      else if (faltaHoras <= 50) atencao = true; // 50 horas de alerta
    }

    if (atrasado) {
      return { cor: '#ef4444', icone: <AlertOctagon size={16}/>, texto: 'Atrasado' };
    } else if (atencao) {
      return { cor: '#f59e0b', icone: <AlertTriangle size={16}/>, texto: 'Atenção' };
    } else {
      return { cor: '#10b981', icone: <CheckCircle size={16}/>, texto: 'Em Dia' };
    }
  };

  const formatDataBr = (isoString) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Zap size={24} style={{ color: 'var(--cor-destaque)' }} />
          Painel de Revisões: Geradores
        </h2>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.tabela}>
          <thead>
            <tr>
              <th>Gerador (Granja)</th>
              <th>Última Revisão</th>
              <th>Intervalo (Meses)</th>
              <th>Horímetro Atual</th>
              <th>Intervalo (Horímetro)</th>
              <th>Status Predito</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>Carregando...</td>
              </tr>
            ) : geradores.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center' }}>Nenhum gerador cadastrado.</td>
              </tr>
            ) : (
              geradores.map(gerador => {
                const status = calcularStatus(gerador);
                const osAberta = osList.some(os => os.geradorId === gerador.id && os.situacao !== 'CONCLUIDO' && os.situacao !== 'CANCELADO' && os.situacao !== 'REJEITADO_DIRETORIA');
                
                return (
                  <tr key={gerador.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{gerador.granja}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>{gerador.marca || '-'}</div>
                    </td>
                    <td>{formatDataBr(gerador.dataUltimaRevisao)}</td>
                    <td>{gerador.intervaloMesesRevisao ? `${gerador.intervaloMesesRevisao} meses` : '-'}</td>
                    <td>{gerador.horimetroAtual != null ? `${gerador.horimetroAtual} h` : '-'}</td>
                    <td>{gerador.intervaloHorimetroRevisao ? `A cada ${gerador.intervaloHorimetroRevisao}` : '-'}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ backgroundColor: status.cor }}>
                        {status.icone}
                        {status.texto}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {osAberta ? (
                          <button className={styles.configBtn} style={{ backgroundColor: '#94a3b8', color: '#fff', borderColor: '#94a3b8', cursor: 'not-allowed' }} disabled>
                            <FilePlus size={14} /> O.S. Aberta
                          </button>
                        ) : (
                          <button className={styles.configBtn} style={{ backgroundColor: 'var(--cor-sucesso)', color: '#fff', borderColor: 'var(--cor-sucesso)' }} onClick={() => handleGerarOS(gerador)}>
                            <FilePlus size={14} /> {status.texto === 'Em Dia' ? 'Forçar Revisão' : 'Abrir O.S.'}
                          </button>
                        )}
                        <button className={styles.configBtn} onClick={() => handleConfigurar(gerador)}>
                          <Settings size={14} /> Configurar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Configuração */}
      {geradorEditando && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Configurar: {geradorEditando.granja}</h3>
              <button className={styles.closeBtn} onClick={() => setGeradorEditando(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--cor-texto-secundario)', marginBottom: '16px' }}>
              Configure os alertas de revisão baseados em tempo e/ou horímetro. O alerta "Atrasado" disparará no que vencer primeiro.
            </p>

            <div className={styles.formGrid}>
              {/* Coluna 1: Tempo */}
              <div className={styles.formGroup}>
                <label>Data da Última Revisão</label>
                <input 
                  type="date" 
                  className={styles.inputField} 
                  value={dataUltimaRevisao} 
                  onChange={(e) => setDataUltimaRevisao(e.target.value)} 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Intervalo (Meses)</label>
                <input 
                  type="number" 
                  min="0"
                  placeholder="Ex: 6"
                  className={styles.inputField} 
                  value={intervaloMeses} 
                  onChange={(e) => setIntervaloMeses(e.target.value)} 
                />
              </div>

              {/* Coluna 2: Horímetro */}
              <div className={styles.formGroup}>
                <label>Horímetro Atual</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.1"
                  placeholder="Ex: 1550"
                  className={styles.inputField} 
                  value={horimetroAtual} 
                  onChange={(e) => setHorimetroAtual(e.target.value)} 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Horímetro Última Revisão</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.1"
                  placeholder="Ex: 1500"
                  className={styles.inputField} 
                  value={horimetroUltimaRevisao} 
                  onChange={(e) => setHorimetroUltimaRevisao(e.target.value)} 
                />
              </div>
              <div className={styles.formGroup}>
                <label>Intervalo (Horímetro)</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.1"
                  placeholder="Ex: 50"
                  className={styles.inputField} 
                  value={intervaloHorimetro} 
                  onChange={(e) => setIntervaloHorimetro(e.target.value)} 
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnCancel} onClick={() => setGeradorEditando(null)}>
                Cancelar
              </button>
              <button className={styles.btnSave} onClick={handleSalvar}>
                <Save size={16} /> Salvar Regras
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisaoGerador;
