import React from 'react';
import { RefreshCw, Search, X, Activity, AlertTriangle, Clock, Wrench, Sparkles } from 'lucide-react';
import styles from './HeaderApontamentoOS.module.css';
import logoYamaservice from '../../../../assets/YAMASERVICE.jpeg';
import UserInfo from '../../../UserInfo';
import ThemeToggle from '../../../ThemeToggle';
import BotaoSair from '../../../BotaoSair';

const HeaderApontamentoOS = ({ 
  onAtualizar, 
  termoBusca = '', 
  setTermoBusca, 
  totalPendentes = 0,
  loading = false,
  searchInputRef,
  totalRevisoesCriticas = 0,
  totalRevisoesAtencao = 0,
  onAbrirVisualizadorRevisoes,
  onAbrirGerenciadorKits,
  totalKits = 0
}) => {
  return (
    <header className={styles.headerContainer}>
      {/* LINHA SUPERIOR: Branding, Logo e Painel de Usuário */}
      <div className={styles.topRow}>
        <div className={styles.brandGroup}>
          <img src={logoYamaservice} alt="Logo Yamaservice" className={styles.logoImg} />
          
          <div className={styles.dividerVertical} />

          <div className={styles.titleArea}>
            <h1 className={styles.brandTitle}>YAMASERVICE</h1>
            <p className={styles.subtitle}>Terminal de Apontamento e Conclusão de Ordens de Serviço</p>
          </div>
        </div>

        {/* Lado Direito: Barra Unificada de Ações e Usuário (Horizontal) */}
        <div className={styles.userActionsBar}>
          {onAtualizar && (
            <button
              type="button"
              onClick={onAtualizar}
              className={styles.btnAtualizar}
              title="Atualizar lista de O.S."
            >
              <RefreshCw size={13} className={loading ? 'fa-spin' : ''} />
              <span>Atualizar</span>
            </button>
          )}

          <div className={styles.iconDivider} />

          {/* Dados do Usuário Logado Sem Cortes */}
          <div className={styles.userInfoWrapper}>
            <UserInfo inline={true} />
          </div>

          <div className={styles.iconDivider} />

          {/* Alternância de Modo Escuro/Claro Compacto */}
          <ThemeToggle isCollapsed={true} />

          {/* Logout Compacto */}
          <BotaoSair isCollapsed={true} />
        </div>
      </div>

      {/* LINHA INFERIOR: Barra Organizadora de Busca e Contador */}
      <div className={styles.bottomRow}>
        <div className={styles.searchBoxOrganizador}>
          <Search size={18} color="var(--cor-destaque)" />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInputOrganizador}
            placeholder="Digite o número da sua O.S. (ex: 177), placa, alvo ou solicitante..."
            value={termoBusca}
            onChange={(e) => setTermoBusca && setTermoBusca(e.target.value)}
          />
          {termoBusca && (
            <button
              type="button"
              className={styles.btnClearSearch}
              onClick={() => setTermoBusca && setTermoBusca('')}
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Botão Catálogo de Kits de Serviços da Oficina */}
          {onAbrirGerenciadorKits && (
            <button
              type="button"
              className={styles.btnKitsServicos}
              onClick={onAbrirGerenciadorKits}
              title="Abrir catálogo e cadastro de kits de serviços"
            >
              <Sparkles size={15} color="var(--cor-destaque)" />
              <span>Kits de Serviços</span>
              {totalKits > 0 && (
                <span className={styles.badgeKitsCount}>{totalKits}</span>
              )}
            </button>
          )}

          {/* Botão Indicador de Revisões da Frota */}
          {onAbrirVisualizadorRevisoes && (
            <button
              type="button"
              className={`${styles.btnAlertaRevisoes} ${totalRevisoesCriticas > 0 ? styles.alertaCritico : (totalRevisoesAtencao > 0 ? styles.alertaAtencao : styles.alertaOk)}`}
              onClick={onAbrirVisualizadorRevisoes}
              title="Abrir painel de revisão preventiva da frota"
            >
              {totalRevisoesCriticas > 0 ? (
                <>
                  <AlertTriangle size={15} className={styles.pulseIcon} />
                  <span>{totalRevisoesCriticas} {totalRevisoesCriticas === 1 ? 'Revisão Vencida' : 'Revisões Vencidas'}</span>
                </>
              ) : totalRevisoesAtencao > 0 ? (
                <>
                  <Clock size={15} />
                  <span>{totalRevisoesAtencao} {totalRevisoesAtencao === 1 ? 'Revisão Próxima' : 'Revisões Próximas'}</span>
                </>
              ) : (
                <>
                  <Wrench size={15} />
                  <span>Frota em Dia</span>
                </>
              )}
            </button>
          )}

          {/* Contador de Chamados em Aberto com Ícone React */}
          <div className={styles.statusCounterBadge}>
            <Activity size={15} />
            <span>{totalPendentes} {totalPendentes === 1 ? 'O.S. Pendente' : 'O.S. Pendentes'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderApontamentoOS;
