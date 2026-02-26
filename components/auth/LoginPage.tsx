import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cat, AlertCircle, LogIn } from 'lucide-react';
import { login, saveAuth } from '../../services/authService';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('请输入用户名和密码');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { token, user } = await login(username.trim(), password.trim());
            saveAuth(token, user);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || '登录失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setUsername('demo');
        setPassword('demo123');
        setIsLoading(true);
        setError('');
        try {
            const { token, user } = await login('demo', 'demo123');
            saveAuth(token, user);
            onLoginSuccess();
        } catch (err: any) {
            setError(err.message || '演示登录失败');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FEFDF5] flex flex-col items-center justify-center px-6">
            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center mb-10"
            >
                <div className="h-16 w-16 rounded-3xl bg-wood-800 flex items-center justify-center shadow-lg mb-4">
                    <Cat size={32} className="text-wood-50" />
                </div>
                <h1 className="text-3xl font-serif font-bold text-wood-900">Nest</h1>
                <p className="text-wood-400 text-sm mt-1">家庭数字孪生体</p>
            </motion.div>

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="w-full max-w-sm bg-white rounded-3xl shadow-soft border border-wood-100/50 p-8"
            >
                <h2 className="text-lg font-bold text-wood-800 mb-6">登录</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-wood-500 mb-1.5">用户名</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="请输入用户名"
                            autoFocus
                            autoCapitalize="none"
                            autoCorrect="off"
                            className="w-full px-4 py-3 bg-wood-50 border border-wood-100 rounded-xl text-wood-900 placeholder-wood-300 focus:outline-none focus:border-wood-400 focus:ring-2 focus:ring-wood-100 transition-all text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-wood-500 mb-1.5">密码</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="请输入密码"
                            className="w-full px-4 py-3 bg-wood-50 border border-wood-100 rounded-xl text-wood-900 placeholder-wood-300 focus:outline-none focus:border-wood-400 focus:ring-2 focus:ring-wood-100 transition-all text-sm"
                        />
                    </div>

                    {/* Error message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="flex items-center gap-2 p-3 bg-red-50 text-red-500 rounded-xl text-sm"
                            >
                                <AlertCircle size={16} className="flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-wood-800 text-wood-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-wood-700 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">登录中...</span>
                        ) : (
                            <>
                                <LogIn size={16} />
                                登录
                            </>
                        )}
                    </button>
                </form>

                {/* Demo login */}
                <div className="mt-4 pt-4 border-t border-wood-100">
                    <button
                        onClick={handleDemoLogin}
                        disabled={isLoading}
                        className="w-full py-3 bg-wood-50 text-wood-500 rounded-xl text-sm font-medium hover:bg-wood-100 active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                        🐱 以演示账户进入
                    </button>
                </div>
            </motion.div>

            <p className="text-wood-300 text-xs mt-6">数据保存在本地，不上传云端</p>
        </div>
    );
};

export default LoginPage;
