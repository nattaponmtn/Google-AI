import React, { useState } from 'react';
import { UserProfile } from '../types';
import { login } from '../services/authService';
import { PenTool, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  isLoadingData: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, isLoadingData }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    try {
        // FIX: Trim whitespace from inputs to prevent authentication errors
        const cleanIdentifier = identifier.trim();
        const cleanPassword = password.trim();

        if (!cleanIdentifier || !cleanPassword) {
            setError("Email/Phone and password are required.");
            setIsLoggingIn(false);
            return;
        }

        // Call secure server-side login with cleaned data
        const user = await login(cleanIdentifier, cleanPassword);
        onLoginSuccess(user);
    } catch (err: any) {
        // Handle errors from server
        console.error("Login error:", err);
        const msg = err.message;
        if (msg.includes('Invalid credentials')) {
             setError('Invalid email/phone or password.');
        } else {
             setError('Connection error or invalid login. Please try again.');
        }
    } finally {
        setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4 shadow-lg shadow-blue-900/50">
                <PenTool className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">NexGen CMMS</h1>
            <p className="text-slate-400 text-sm mt-1">Enterprise Maintenance System</p>
        </div>

        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email or Phone Number</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Mail size={18} />
                        </div>
                        <input 
                            type="text" 
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="email@company.com or 081..."
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Lock size={18} />
                        </div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isLoggingIn ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
                </button>
                
                <div className="text-center mt-4">
                    <p className="text-xs text-slate-400">System Version 1.2 (Secure Auth)</p>
                </div>
            </form>
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-400">© 2025 NexGen Maintenance Solutions</p>
    </div>
  );
};