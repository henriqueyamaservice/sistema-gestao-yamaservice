import React from 'react';
import { RefreshCw, Search, X, Activity } from 'lucide-react';
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
  searchInputRef
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

        {/* Contador de Chamados em Aberto com Ícone React */}
        <div className={styles.statusCounterBadge}>
          <Activity size={15} />
          <span>{totalPendentes} {totalPendentes === 1 ? 'O.S. Pendente' : 'O.S. Pendentes'}</span>
        </div>
      </div>
    </header>
  );
};

export default HeaderApontamentoOS;
