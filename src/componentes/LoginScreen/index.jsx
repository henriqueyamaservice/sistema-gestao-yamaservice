import React, { useState, useEffect } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import styles from './LoginScreen.module.css';
import logo from '../../assets/YAMASERVICE.jpeg';
import bg1 from '../../assets/login-aves.jpg';
import bg2 from '../../assets/login-pintinho.jpg';
import bg3 from '../../assets/login-empresa.jpg';

const LoginScreen = ({ onLoginSuccess }) => {
  const [bgIndex, setBgIndex] = useState(0);
  const backgrounds = [bg1, bg2, bg3];

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [backgrounds.length]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao fazer login');
      }

      // Salva o token no localStorage
      localStorage.setItem('almoxarifado_token', data.token);
      localStorage.setItem('almoxarifado_user', JSON.stringify(data.user));

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left side: Premium Poultry Farm Background */}
      <div className={styles.imagePanel}>
        {backgrounds.map((bg, idx) => (
          <div
            key={bg}
            className={styles.slideImage}
            style={{
              backgroundImage: `url(${bg})`,
              opacity: bgIndex === idx ? 1 : 0
            }}
          />
        ))}
        <div className={styles.overlay}>
          <div className={styles.brandInfo}>
            <h1>YamaService</h1>
            <p>Gestão Unificada de Ordens de Serviço, Almoxarifado e Compras.</p>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className={styles.loginPanel}>
        <div className={styles.loginBox}>
          <div className={styles.header}>
            <img src={logo} alt="YamaService Logo" className={styles.logo} />
            <h2>Acesso Restrito</h2>
            <p>Insira suas credenciais para continuar.</p>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Usuário</label>
              <div className={styles.inputWrapper}>
                <User size={20} className={styles.inputIcon} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário..."
                  required
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Senha</label>
              <div className={styles.inputWrapper}>
                <Lock size={20} className={styles.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha..."
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles.loginButton}>
              {loading ? 'Entrando...' : 'Entrar Seguramente'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
