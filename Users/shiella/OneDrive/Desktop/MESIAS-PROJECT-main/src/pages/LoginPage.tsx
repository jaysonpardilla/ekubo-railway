import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import logo from '../assets/logo.jpg';
import { auth } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, setLoading: setAuthLoading, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      setAuthLoading(true);
      const result = await auth.login(formData.email, formData.password);

      // If login returned a token, fetch current user from API to populate context
      const me = await auth.getCurrentUser();
      if (me) {
        setUser(me);
        setAuthLoading(false);

        switch (me.user_type) {
          case 'beneficiary':
            navigate('/beneficiary/dashboard');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'bhw':
            navigate('/bhw/dashboard');
            break;
          case 'mswdo':
            navigate('/mswdo/dashboard');
            break;
          default:
            navigate('/');
        }
      } else {
        setError('Login failed. Please try again.');
        setLoading(false);
        setAuthLoading(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Try to parse backend error JSON if present
      let msg = 'Invalid email or password';
      try {
        if (err.message) {
          const parsed = JSON.parse(err.message);
          msg = parsed.error || parsed.detail || msg;
        }
      } catch (_) {
        msg = err.message || msg;
      }
      setError(msg);
      setLoading(false);
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <img src={logo} alt="Logo" className="w-16 h-16 object-cover rounded-full" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a href="/signup" className="text-blue-600 hover:underline font-medium">
              Create account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
