import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LoginPage from './components/auth/LoginPage';
import { isLoggedIn, verifyToken, logout } from './services/authService';

const Root: React.FC = () => {
  // null = 还在检查, false = 未登录, true = 已登录
  const [authState, setAuthState] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoggedIn()) {
        setAuthState(false);
        return;
      }
      // 验证 token 是否还有效
      const valid = await verifyToken();
      if (!valid) {
        logout(); // 清除过期 token
        setAuthState(false);
      } else {
        setAuthState(true);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = () => {
    setAuthState(true);
  };

  const handleLogout = () => {
    logout();
    setAuthState(false);
  };

  // 检查中，显示空白（避免闪烁）
  if (authState === null) {
    return (
      <div className="min-h-screen bg-[#FEFDF5] flex items-center justify-center">
        <span className="animate-pulse text-wood-400 font-serif text-xl">Nest...</span>
      </div>
    );
  }

  if (authState === false) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return <App onLogout={handleLogout} />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);