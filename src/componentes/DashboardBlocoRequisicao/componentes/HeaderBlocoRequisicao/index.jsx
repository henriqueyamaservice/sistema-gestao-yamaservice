import React from 'react';
import LogoYama from '../../../../assets/YAMASERVICE.jpeg';
import UserInfo from '../../../UserInfo';
import ThemeToggle from '../../../ThemeToggle';
import BotaoSair from '../../../BotaoSair';
import styles from './HeaderBlocoRequisicao.module.css';

const HeaderBlocoRequisicao = () => {
  return (
    <header className={styles.industrialHeader}>
      <div className={styles.topBar}>
        <div className={styles.brandGroup}>
          <div className={styles.logoBox}>
            <img src={LogoYama} alt="Yamaservice" className={styles.logo} />
          </div>
          <div className={styles.titles}>
            <h1>YAMASERVICE</h1>
            <h2>SOLICITAÇÃO DE MATERIAIS</h2>
          </div>
        </div>
        <div className={styles.controls}>
          <ThemeToggle isCollapsed={true} />
        </div>
      </div>
      
      <div className={styles.userBar}>
        <UserInfo inline={true} />
        <div className={styles.logoutWrapper}>
           <BotaoSair isCollapsed={true} />
        </div>
      </div>
    </header>
  );
};

export default HeaderBlocoRequisicao;