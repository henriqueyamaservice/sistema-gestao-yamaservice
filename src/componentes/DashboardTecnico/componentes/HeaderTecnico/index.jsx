import React from 'react';
import { Wrench, CheckCircle, Plus, Search } from 'lucide-react';
import styles from './HeaderTecnico.module.css';
import LogoYama from '../../../../assets/YAMASERVICE.jpeg';

import NotificationBell from '../../../NotificationBell';

const HeaderTecnico = ({
  abaAtiva,
  setAbaAtiva,
  totalMinhas,
  totalHistorico,
  termoBusca,
  setTermoBusca,
  onNovoChamado
}) => {
  return (
    <header className={styles.headerContainer}>
      {/* LINHA SUPERIOR: Logo, Título e Botão Novo */}
      <div className={styles.topRow}>
        <div className={styles.brandGroup}>
          <img src={LogoYama} alt="Yamaservice Logo" className={styles.logoImg} />
          <div className={styles.titleGroup}>
            <h2>Painel do Técnico</h2>
            <p className={styles.subtitle}>Gestão de ordens de serviço e apontamentos</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationBell />
          <button className={styles.btnNovoChamado} onClick={onNovoChamado} title="Abrir Novo Chamado">
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* LINHA INFERIOR: Busca e Filtros/Abas */}
      <div className={styles.bottomRow}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por O.S., cliente ou problema..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>


      </div>
    </header>
  );
};

export default HeaderTecnico;