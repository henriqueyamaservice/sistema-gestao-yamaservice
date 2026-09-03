import React from 'react';
import { Clock, CalendarCheck, CalendarX, DollarSign } from 'lucide-react';
import styles from './HeaderDiretor.module.css';
import LogoYama from '../../../../assets/YAMASERVICE.jpeg';
import UserInfo from '../../../UserInfo';

const HeaderDiretor = ({ qtdAguardando, qtdAprovados, qtdRejeitados, totalAprovadoMes }) => {
  return (
    <header className={styles.headerPremium}>
      <div className={styles.headerInfo} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={LogoYama} alt="Yamaservice" className={styles.logoYama} />
          <div>
            <h1>Mesa do Diretor</h1>
            <p>Painel de Aprovações de Investimentos e Alçadas (&gt; R$ 5.000,00)</p>
          </div>
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <UserInfo />
        </div>
      </div>

      <div className={styles.statsContainer}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.blue}`}><DollarSign size={20} /></div>
          <div className={styles.statData}>
            <h4>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalAprovadoMes)}
            </h4>
            <p>Aprovado no Mês</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.orange}`}><Clock size={20} /></div>
          <div className={styles.statData}>
            <h4>{qtdAguardando}</h4>
            <p>Aguardando</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.green}`}><CalendarCheck size={20} /></div>
          <div className={styles.statData}>
            <h4>{qtdAprovados}</h4>
            <p>Aprovados</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.red}`}><CalendarX size={20} /></div>
          <div className={styles.statData}>
            <h4>{qtdRejeitados}</h4>
            <p>Rejeitados</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderDiretor;
