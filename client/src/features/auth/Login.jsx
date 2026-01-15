import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear messages when user starts typing
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    // Crucial: preventDefault must be the very first line
    e.preventDefault();
    
    console.log('Logging in...', { email: formData.email });
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRedirecting(false);

    try {
      const response = await axios.post(
        '/api/auth/login',
        formData,
        {
          withCredentials: true
        }
      );

      // Log the full response from backend
      console.log('Login Response:', response.data);
      console.log('Response structure:', {
        success: response.data?.success,
        token: response.data?.token ? 'Present' : 'Missing',
        avatar: response.data?.avatar ? 'Present' : 'Missing',
        avatarName: response.data?.avatarName,
        avatar_avatar_name: response.data?.avatar?.avatar_name,
        avatar_profile_image: response.data?.avatar?.profile_image || 'Missing',
        stats: response.data?.stats ? 'Present' : 'Missing'
      });

      if (response.data?.success) {
        // Store token in localStorage
        localStorage.setItem('token', response.data.token);
        console.log('Token saved to localStorage');
        
        // Extract avatarName with fallbacks
        const avatarName = response.data.avatarName || response.data.avatar?.avatar_name || 'User';
        
        setSuccess(`Welcome back, ${avatarName}!`);
        setLoading(false);
        setRedirecting(true);
        
        // Add delay before navigation to show success state
        setTimeout(() => {
          // Extract full data including profile_image from response
          const dashboardState = {
            avatarName: response.data.avatarName || response.data.avatar?.avatar_name || 'Guest Avatar',
            stats: response.data.stats || {},
            profile_image: response.data.avatar?.profile_image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png', // <--- CRITICAL ADDITION
            avatar: response.data.avatar || {},
            core_color: response.data.avatar?.core_color || '#00ffff'
          };
          
          console.log('Navigating to dashboard with state:', dashboardState);
          console.log('Profile image in state:', dashboardState.profile_image);
          
          navigate('/dashboard', { 
            state: dashboardState
          });
        }, 500);
      } else {
        console.error('Login failed: Response success is false');
        setError('Login failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'System connection failed';
      setError(errorMessage);
      alert(`Login failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(cyan 1px, transparent 1px),
            linear-gradient(90deg, cyan 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Glowing orbs for ambiance */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Holographic Title */}
        <motion.div
          className="text-center mb-8"
          variants={itemVariants}
        >
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            HAYALPEREST
          </h1>
          <p className="text-purple-400 text-lg mb-2 font-mono italic">Just Imagine</p>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
          <p className="text-gray-400 text-sm mt-4 font-mono">SYSTEM::AUTHENTICATION_PROTOCOL</p>
        </motion.div>

        {/* Form Container */}
        <motion.form
          onSubmit={handleSubmit}
          className="bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-8 shadow-2xl"
          style={{
            boxShadow: '0 0 40px rgba(6, 182, 212, 0.3), inset 0 0 40px rgba(147, 51, 234, 0.1)'
          }}
          variants={itemVariants}
        >
          {/* Email Input */}
          <motion.div className="mb-6" variants={itemVariants}>
            <label className="block text-cyan-400 text-sm font-mono mb-2">
              EMAIL_ADDRESS
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-cyan-500/30 rounded px-4 pl-12 py-3 text-white font-mono focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300"
                placeholder="user@domain.com"
              />
            </div>
          </motion.div>

          {/* Password Input */}
          <motion.div className="mb-6" variants={itemVariants}>
            <label className="block text-cyan-400 text-sm font-mono mb-2">
              SECURITY_KEY
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 w-5 h-5" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-transparent border border-cyan-500/30 rounded px-4 pl-12 py-3 text-white font-mono focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300"
                placeholder="••••••••"
              />
            </div>
          </motion.div>

          {/* Loading State */}
          {loading && (
            <motion.div
              className="text-center py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-cyan-400 font-mono animate-pulse">
                Syncing with Server...
              </p>
              <div className="flex justify-center mt-2 space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              className="mb-6 p-4 bg-cyan-500/20 border border-cyan-400 rounded font-mono text-sm text-cyan-300"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)'
              }}
            >
              <p className="text-green-400">✓ SYSTEM::SUCCESS</p>
              <p className="mt-2 text-cyan-300">{success}</p>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded font-mono text-sm text-red-400"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)'
              }}
            >
              <p className="text-red-400">✗ SYSTEM::GLITCH</p>
              <p className="mt-2">{error}</p>
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading || redirecting}
            className={`w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-mono font-bold py-4 rounded-lg relative overflow-hidden group transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              redirecting 
                ? 'shadow-[0_0_40px_rgba(34,197,94,0.6)]' 
                : 'shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_50px_rgba(6,182,212,0.8),0_0_80px_rgba(147,51,234,0.6)] hover:border-cyan-400'
            }`}
            whileHover={!loading && !redirecting ? { scale: 1.02 } : {}}
            whileTap={!loading && !redirecting ? { scale: 0.98 } : {}}
          >
            <span className="relative z-10">
              {redirecting ? 'ACCESS GRANTED' : 'LOGIN'}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </motion.button>

          {/* Redirecting Message */}
          {redirecting && (
            <motion.p
              className="mt-4 text-center text-green-400 font-mono text-sm animate-pulse"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              Access Granted. Redirecting...
            </motion.p>
          )}

          {/* Register Link */}
          <motion.div
            className="mt-6 text-center"
            variants={itemVariants}
          >
            <p className="text-gray-400 text-sm font-mono inline">
              New to HayalPerest?{' '}
            </p>
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="text-pink-400 hover:text-pink-300 font-mono font-bold cursor-pointer transition-all duration-300 hover:underline"
              style={{
                textShadow: '0 0 10px rgba(244, 114, 182, 0.8)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = '0 0 20px rgba(244, 114, 182, 1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = '0 0 10px rgba(244, 114, 182, 0.8)';
              }}
            >
              CREATE ACCOUNT
            </button>
          </motion.div>
        </motion.form>

        {/* Footer text */}
        <motion.p
          className="text-center text-gray-500 text-xs font-mono mt-6"
          variants={itemVariants}
        >
          HAYALPEREST::DIGITAL_TWIN_PROTOCOL
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
