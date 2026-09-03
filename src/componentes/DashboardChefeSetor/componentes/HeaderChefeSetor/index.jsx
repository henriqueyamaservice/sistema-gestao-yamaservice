import React from 'react';
import { Clock, Wrench, FileText, Search, X, ShieldAlert, CheckCircle2, UserCheck, Plus } from 'lucide-react';
import styles from './HeaderChefeSetor.module.css';
import LogoYama from '../../../../assets/YAMASERVICE.jpeg';

import NotificationBell from '../../../NotificationBell';

const HeaderChefeSetor = ({
  abaAtiva,
  setAbaAtiva,
  totalPendentes = 0,
  totalEmAndamento = 0,
  totalHistorico = 0,
  totalEmergencias = 0,
  termoBusca = '',
  setTermoBusca,
  setShowGerenciadorUsuarios,
  onNovoChamado
}) => {
  return (
    <header className={styles.headerContainer}>

      {/* LINHA SUPERIOR: Logo, Título e Botão Novo */}
      <div className={styles.topRow}>
        <div className={styles.brandGroup}>
          <img src={LogoYama} alt="Yamaservice Logo" className={styles.logoImg} />
          <div className={styles.titleGroup}>
            <h2>Chefe do Setor</h2>
            <p className={styles.subtitle}>Gestão de ordens de serviço</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell />
          <button className={styles.btnNovoChamado} onClick={onNovoChamado} title="Abrir Novo Chamado">
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* CONTADORES / BADGES DE STATUS (SCROLLAVEL NO MOBILE) */}
      <div className={styles.statsGroup}>
        {totalEmergencias > 0 && (
          <div className={`${styles.statBadge} ${styles.statEmergencia}`}>
            <ShieldAlert size={16} />
            <span>
              <strong>{totalEmergencias}</strong>{' '}
              <span>{totalEmergencias > 1 ? 'EMERGÊNCIAS' : 'EMERGÊNCIA'}</span>
            </span>
          </div>
        )}


        <div className={styles.statBadge}>
          <Clock size={15} style={{ color: 'var(--cor-destaque)' }} />
          <span>
            <strong>{totalPendentes}</strong>{' '}
            <span>{totalPendentes !== 1 ? 'Triagens' : 'Triagem'}</span>
          </span>
        </div>

        <div className={styles.statBadge}>
          <Wrench size={15} style={{ color: '#3b82f6' }} />
          <span>
            <strong>{totalEmAndamento}</strong>{' '}
            <span>Em Execução</span>
          </span>
        </div>

        <div className={styles.statBadge}>
          <CheckCircle2 size={15} style={{ color: 'var(--cor-sucesso)' }} />
          <span>
            <strong>{totalHistorico}</strong>{' '}
            <span>{totalHistorico !== 1 ? 'Concluídas' : 'Concluída'}</span>
          </span>
        </div>
      </div>

      {/* LINHA INFERIOR: CAMPO DE PESQUISA */}
      <div className={styles.controlsRow}>

        {/* CAMPO DE PESQUISA */}
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="PESQUISAR CÓDIGO O.S., SOLICITANTE, SETOR OU SERVIÇO..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className={styles.searchInput}
          />
          {termoBusca && (
            <button
              type="button"
              className={styles.btnClearSearch}
              onClick={() => setTermoBusca('')}
              title="Limpar pesquisa"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderChefeSetor;
