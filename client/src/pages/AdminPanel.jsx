import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Shield, Users, DollarSign, Clock, ArrowLeft } from 'lucide-react';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/dashboard');
        return;
      }

      try {
        // Check admin access by trying to fetch stats
        const statsResponse = await axios.get('/api/admin/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });

        if (statsResponse.data?.success) {
          setStats(statsResponse.data.stats);
        }

        // Fetch users
        const usersResponse = await axios.get('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });

        if (usersResponse.data?.success) {
          setUsers(usersResponse.data.users);
        }

        setLoading(false);
      } catch (error) {
        // If 403 Forbidden, redirect to dashboard
        if (error.response?.status === 403 || error.response?.status === 401) {
          console.log('Access denied. Redirecting to dashboard...');
          navigate('/dashboard');
          return;
        }
        console.error('Error loading admin data:', error);
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const handleAdminAction = async (action, userId, additionalData = {}) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setActionLoading({ ...actionLoading, [userId]: true });

    try {
      const payload = {
        action,
        userId,
        ...additionalData
      };

      const response = await axios.post('/api/admin/action', payload, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      if (response.data?.success) {
        // Refresh users list after action
        const usersResponse = await axios.get('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });

        if (usersResponse.data?.success) {
          setUsers(usersResponse.data.users);
        }

        alert(`✅ ${response.data.message || 'Action completed successfully'}`);
      }
    } catch (error) {
      console.error('Admin action error:', error);
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [userId]: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 font-mono text-xl animate-pulse">
          LOADING SYSTEM CORE...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-red-900/50 bg-gradient-to-r from-red-950/20 to-black p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="text-red-400 hover:text-red-300 p-2 border border-red-900/50 rounded hover:bg-red-900/20 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-500" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-red-500 bg-clip-text text-transparent font-mono">
                SYSTEM CORE // ADMIN PANEL
              </h1>
            </div>
          </div>
          <div className="text-red-400/50 font-mono text-sm">
            RESTRICTED ACCESS
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Server Stats */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-black/60 border border-red-900/50 rounded-lg p-4 backdrop-blur-sm"
            style={{
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2), inset 0 0 20px rgba(239, 68, 68, 0.05)'
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-red-400" />
              <h3 className="text-red-400/70 font-mono text-sm">TOTAL USERS</h3>
            </div>
            <p className="text-2xl font-bold text-red-400 font-mono">
              {stats?.totalUsers || 0}
            </p>
          </div>

          <div className="bg-black/60 border border-red-900/50 rounded-lg p-4 backdrop-blur-sm"
            style={{
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2), inset 0 0 20px rgba(239, 68, 68, 0.05)'
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-red-400" />
              <h3 className="text-red-400/70 font-mono text-sm">TOTAL CREDITS</h3>
            </div>
            <p className="text-2xl font-bold text-red-400 font-mono">
              {stats?.totalCredits?.toLocaleString() || 0}
            </p>
          </div>

          <div className="bg-black/60 border border-red-900/50 rounded-lg p-4 backdrop-blur-sm"
            style={{
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2), inset 0 0 20px rgba(239, 68, 68, 0.05)'
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-red-400" />
              <h3 className="text-red-400/70 font-mono text-sm">UPTIME</h3>
            </div>
            <p className="text-lg font-bold text-red-400 font-mono">
              {stats?.uptime || '0h 0m 0s'}
            </p>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/60 border border-red-900/50 rounded-lg overflow-hidden backdrop-blur-sm"
          style={{
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.2), inset 0 0 30px rgba(239, 68, 68, 0.05)'
          }}
        >
          <div className="p-4 border-b border-red-900/50 bg-red-950/20">
            <h2 className="text-red-400 font-mono text-lg font-bold">USER MANAGEMENT</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-900/30 bg-red-950/10">
                  <th className="text-left p-4 text-red-400/70 font-mono text-sm">ID</th>
                  <th className="text-left p-4 text-red-400/70 font-mono text-sm">USERNAME</th>
                  <th className="text-left p-4 text-red-400/70 font-mono text-sm">LEVEL</th>
                  <th className="text-left p-4 text-red-400/70 font-mono text-sm">CREDITS</th>
                  <th className="text-left p-4 text-red-400/70 font-mono text-sm">STATUS</th>
                  <th className="text-left p-4 text-red-400/70 font-mono text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-8 text-red-400/50 font-mono">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`border-b border-red-900/20 hover:bg-red-950/10 transition-colors ${
                        index % 2 === 0 ? 'bg-black/20' : 'bg-black/10'
                      }`}
                    >
                      <td className="p-4 text-red-300 font-mono text-sm">{user.id}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: user.coreColor }}
                          />
                          <span className="text-white font-mono">{user.username}</span>
                          {user.isAdmin && (
                            <span className="text-red-500 text-xs font-mono">[ADMIN]</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-red-300 font-mono text-sm">{user.level}</td>
                      <td className="p-4 text-red-300 font-mono text-sm">
                        {user.credits.toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-mono ${
                          user.isAdmin
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-green-500/20 text-green-400 border border-green-500/50'
                        }`}>
                          {user.isAdmin ? 'ADMIN' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => handleAdminAction('GIVE_CREDITS', user.id, { amount: 10000 })}
                            disabled={actionLoading[user.id]}
                            className="px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 font-mono text-xs rounded hover:bg-green-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            ➕ 10k Credits
                          </motion.button>
                          <motion.button
                            onClick={() => handleAdminAction('MAX_ENERGY', user.id)}
                            disabled={actionLoading[user.id]}
                            className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-mono text-xs rounded hover:bg-yellow-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            ⚡ Max Energy
                          </motion.button>
                          <motion.button
                            onClick={() => handleAdminAction('BAN_USER', user.id)}
                            disabled={actionLoading[user.id] || user.isAdmin}
                            className="px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 font-mono text-xs rounded hover:bg-red-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            🚫 BAN
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminPanel;
