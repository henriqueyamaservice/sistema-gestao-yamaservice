import React, { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, Inbox, Clock, CalendarCheck, CalendarX, FileText, ChevronDown, ChevronUp, Search } from 'lucide-react';
import styles from './DashboardDiretor.module.css';
import LogoYama from '../../assets/YAMASERVICE.jpeg';
import { AGUARDANDO_DIRETORIA, ATRIBUIDO_TECNICO, REJEITADO_DIRETORIA } from '../../utils/osStatus';
import UserInfo from '../UserInfo';

import HeaderDiretor from './componentes/HeaderDiretor';
import HistoricoDiretor from './componentes/HistoricoDiretor';
import PendenciasDiretor from './componentes/PendenciasDiretor';

const DashboardDiretor = () => {
  const [abaAtiva, setAbaAtiva] = useState('pendentes'); // 'pendentes' | 'historico'
  const [requisicoesAguardando, setRequisicoesAguardando] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDados = async () => {
    try {
      setLoading(true);
      const [resReq, resOS] = await Promise.all([
        fetch('/api/requisicoes'),
        fetch('/api/os')
      ]);

      let requisicoes = [];
      if (resReq.ok) {
        const dataReq = await resReq.json();
        requisicoes = dataReq.filter(r => r.origem === 'app_funcionario');
      }

      let ordens = [];
      if (resOS.ok) {
        ordens = await resOS.json();
      }

      // Concatena as pendências de alçada (> 5k) do Dashboard OS e Recomendações
      const osAguardando = ordens.filter(o => o.situacao === AGUARDANDO_DIRETORIA);
      const reqAguardando = requisicoes.filter(r => r.status === 'aguardando_diretoria');

      const todasPendentes = [...osAguardando, ...reqAguardando];
      todasPendentes.sort((a, b) => {
        const aUrg = a.prioridade === 'urgente' || a.isEmergencia;
        const bUrg = b.prioridade === 'urgente' || b.isEmergencia;
        if (aUrg && !bUrg) return -1;
        if (!aUrg && bUrg) return 1;
        return new Date(a.dataCriacao || 0) - new Date(b.dataCriacao || 0);
      });
      setRequisicoesAguardando(todasPendentes);

      // Histórico
      const osHistorico = ordens.filter(o => o.situacao && o.situacao !== AGUARDANDO_DIRETORIA && o.dataAutorizacaoChefe);
      const reqHistorico = requisicoes.filter(r => r.status && r.status !== 'aguardando_diretoria');
      const todoHistorico = [...osHistorico, ...reqHistorico];
      todoHistorico.sort((a, b) => new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0));

      setHistorico(todoHistorico);
    } catch (error) {
      console.error('Erro ao buscar dados do Diretor:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const handleAcao = async (codigoOuId, acao) => {
    const motivo = acao === 'rejeitar' ? window.prompt('Informe o motivo da rejeição (opcional):') : null;
    if (acao === 'rejeitar' && motivo === null) return;

    try {
      // Tenta aprovar via rota de O.S. primeiro se for formato XX-MMYY ou via requisição
      const isOS = codigoOuId.includes('-');
      const url = isOS 
        ? `/api/os/${codigoOuId}` 
        : `/api/requisicoes/${codigoOuId}/autorizar`;

      const body = isOS
        ? {
            situacao: acao === 'aprovar' ? ATRIBUIDO_TECNICO : REJEITADO_DIRETORIA,
            dataAprovacaoDiretoria: new Date().toISOString(),
            motivoRejeicaoDiretoria: motivo
          }
        : { acao, motivo };

      const method = isOS ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        alert(acao === 'aprovar' ? 'Aprovado com sucesso!' : 'Solicitação rejeitada!');
        fetchDados();
      } else {
        alert('Erro ao processar a aprovação.');
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro de conexão ao autorizar.');
    }
  };

  const qtdAprovados = historico.filter(h => h.status !== REJEITADO_DIRETORIA && h.situacao !== REJEITADO_DIRETORIA).length;
  const qtdRejeitados = historico.filter(h => h.status === REJEITADO_DIRETORIA || h.situacao === REJEITADO_DIRETORIA).length;

  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  const totalAprovadoMes = historico.reduce((acc, req) => {
    const aprovado = req.status !== REJEITADO_DIRETORIA && req.situacao !== REJEITADO_DIRETORIA;
    const dataObj = new Date(req.dataCriacao || new Date());
    if (aprovado && dataObj.getMonth() === mesAtual && dataObj.getFullYear() === anoAtual) {
      const itens = req.itens || req.itensCarrinho || [];
      const valor = req.valorEstimado !== undefined && req.valorEstimado !== null && Number(req.valorEstimado) > 0
        ? Number(req.valorEstimado)
        : itens.reduce((soma, i) => soma + (Number(i.quantidade || 0) * Number(i.valor_unitario || 0)), 0);
      return acc + valor;
    }
    return acc;
  }, 0);

  return (
    <div className={styles.container}>
      <HeaderDiretor 
        qtdAguardando={requisicoesAguardando.length}
        qtdAprovados={qtdAprovados}
        qtdRejeitados={qtdRejeitados}
        totalAprovadoMes={totalAprovadoMes}
      />

      {/* TABS STICKY */}
      <div className={styles.tabsWrapper}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${abaAtiva === 'pendentes' ? styles.tabBtnAtivo : ''}`}
            onClick={() => setAbaAtiva('pendentes')}
          >
            <ShieldAlert size={18} />
            Pendentes ({requisicoesAguardando.length})
          </button>
          <button 
            className={`${styles.tabBtn} ${abaAtiva === 'historico' ? styles.tabBtnAtivo : ''}`}
            onClick={() => setAbaAtiva('historico')}
          >
            <FileText size={18} />
            Histórico ({historico.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando pendências...</div>
      ) : abaAtiva === 'pendentes' ? (
        <PendenciasDiretor requisicoesAguardando={requisicoesAguardando} onAcao={handleAcao} />
      ) : (
        <HistoricoDiretor historico={historico} />
      )}
    </div>
  );
};

export default DashboardDiretor;
