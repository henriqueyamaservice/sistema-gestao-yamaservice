import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    const token = authHeader.split(' ')[1]; // Espera o formato "Bearer <token>"
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Formato de token inválido.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'almoxarifado_yama_secret_dev';

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role, setor, nome, codigo_omie }
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido ou expirado.' });
  }
};

export const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || (!allowedRoles.includes(req.user.role) && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Acesso restrito para o seu nível de usuário.' });
    }
    next();
  };
};
