import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Film, Users, TrendingUp, X, Crown, Edit2 } from 'lucide-react';
import axios from 'axios';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';
import AvatarChat from '../features/chat/AvatarChat';
import { playSound } from '../utils/soundManager';
import io from 'socket.io-client';

// AnimatedCore Component - Glitching energy core
const AnimatedCore = ({ coreColor = '#00ffff' }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <MeshDistortMaterial
        color={coreColor}
        wireframe={true}
        distort={0.5}
        speed={2}
        roughness={0}
        metalness={0.8}
      />
    </Sphere>
  );
};

// Background mapping based on equipped items
const BACKGROUNDS = {
  'DEFAULT': 'bg-black',
  'SPACE_STATION': 'bg-[url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1920")] bg-cover bg-center',
  'CYBER_CITY': 'bg-[url("https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1920")] bg-cover bg-center'
};

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Simple state management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [processingItemId, setProcessingItemId] = useState(null);
  const [coreColor, setCoreColor] = useState('#00ffff');
  const [showMissions, setShowMissions] = useState(false);
  const [miningProgress, setMiningProgress] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  const [updatingProfileImage, setUpdatingProfileImage] = useState(false);
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [socket, setSocket] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Strict check: location.state must have avatarName, stats, AND profile_image
    const hasAvatarName = location?.state?.avatarName;
    const hasStats = location?.state?.stats && Object.keys(location.state.stats).length > 0;
    const hasProfileImage = location?.state?.avatar?.profile_image || location?.state?.profile_image;
    
    // Only use location.state if ALL required fields are present
    if (location?.state && hasAvatarName && hasStats && hasProfileImage) {
      console.log('Using location.state (complete data):', location.state);
          const coreColorValue = location.state?.core_color || location.state?.avatar?.core_color || '#00ffff';
          const profileImage = location.state?.avatar?.profile_image || location.state?.profile_image;
          const currentBg = location.state?.avatar?.current_bg || location.state?.current_bg || 'DEFAULT';
          setData({
            avatarName: location.state.avatarName,
            stats: location.state.stats,
            core_color: coreColorValue,
            profile_image: profileImage,
            current_bg: currentBg,
            is_admin: location.state?.is_admin || false,
            avatar: {
              ...location.state?.avatar,
              profile_image: profileImage,
              core_color: coreColorValue,
              current_bg: currentBg
            }
          });
      setCoreColor(coreColorValue);
      setLoading(false);
      return;
    }

    // If location.state is missing or incomplete, fetch fresh data from API
    console.log("Fetching fresh data from API...");
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/login');
      return;
    }

    // Fetch from /api/auth/me
    setLoading(true);
    axios.get('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      withCredentials: true
    })
      .then(response => {
        console.log("ME Response:", response.data);
        if (response.data?.success) {
          // Transform stats array to object format for compatibility
          const statsArray = response.data?.stats || [];
          const statsObject = {};
          
          // Convert array to object: { key_name: { type, value } }
          if (Array.isArray(statsArray)) {
            statsArray.forEach(stat => {
              if (stat?.key_name) {
                statsObject[stat.key_name] = {
                  type: stat?.type || 'PHYSICAL',
                  value: stat?.value || '0'
                };
              }
            });
          }
          
          // Explicitly map profile_image and current_bg from response
          const profileImage = response.data?.avatar?.profile_image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
          const coreColorValue = response.data?.avatar?.core_color || '#00ffff';
          const currentBg = response.data?.avatar?.current_bg || 'DEFAULT';
          
          // Set data with explicit profile_image, current_bg, and is_admin mapping
          setData({
            avatarName: response.data?.avatar?.avatar_name || 'Guest Avatar',
            core_color: coreColorValue,
            profile_image: profileImage, // <--- MAKE SURE THIS IS HERE
            current_bg: currentBg,
            is_admin: response.data?.user?.is_admin || false,
            stats: statsObject,
            userEmail: response.data?.user?.email || '',
            avatar: {
              ...response.data?.avatar,
              profile_image: profileImage,
              core_color: coreColorValue,
              current_bg: currentBg
            }
          });
          setCoreColor(coreColorValue);
          setLoading(false);
        } else {
          throw new Error('Invalid response from server');
        }
      })
      .catch(error => {
        console.error('Error fetching user data:', error);
        // On API failure, redirect to login
        localStorage.removeItem('token');
        navigate('/login');
      });
  }, [location, navigate]);

  // Extract values with optional chaining and defaults
  const avatarName = data?.avatarName || 'Guest Avatar';
  const stats = data?.stats || {};
  const userEmail = data?.userEmail || '';
  const currentUsername = userEmail ? userEmail.split('@')[0] : '';
  
  // Extract stats safely with optional chaining
  const credits = stats?.credits?.value ? parseInt(String(stats?.credits?.value), 10) : (stats?.credits ? parseInt(String(stats?.credits), 10) : 500);
  const energy = stats?.energy?.value ? parseInt(String(stats?.energy?.value), 10) : (stats?.energy ? parseInt(String(stats?.energy), 10) : 100);
  const mood = stats?.mood?.value || stats?.mood || 'Neutral';
  const level = stats?.level?.value ? parseInt(String(stats?.level?.value), 10) : (stats?.level ? parseInt(String(stats?.level), 10) : (data?.level || 1));
  const xp = stats?.xp?.value ? parseInt(String(stats?.xp?.value), 10) : (stats?.xp ? parseInt(String(stats?.xp), 10) : 0);

  const hasStats = stats && typeof stats === 'object' && Object.keys(stats)?.length > 0;

  // Fetch inventory when modal opens
  useEffect(() => {
    if (showInventory) {
      const fetchInventory = async () => {
        try {
          setInventoryLoading(true);
          const token = localStorage.getItem('token');
          
          if (!token) {
            console.error('No token found');
            setShowInventory(false);
            return;
          }

          const response = await axios.get('/api/products/inventory', {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            withCredentials: true
          });

          if (response.data?.success) {
            setInventoryItems(response.data.inventory || []);
          } else {
            throw new Error('Failed to fetch inventory');
          }
        } catch (error) {
          console.error('Error fetching inventory:', error);
          setInventoryItems([]);
        } finally {
          setInventoryLoading(false);
        }
      };

      fetchInventory();
    }
  }, [showInventory]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLeaderboardLoading(true);
        const response = await axios.get('/api/leaderboard', {
          withCredentials: true
        });

        if (response.data?.success) {
          setLeaderboardData(response.data.leaderboard || []);
        } else {
          throw new Error('Failed to fetch leaderboard');
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        setLeaderboardData([]);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Socket.io connection for Global Chat
  useEffect(() => {
    if (showGlobalChat) {
      // Load chat history when modal opens
      const loadChatHistory = async () => {
        try {
          const response = await axios.get('/api/chat/history', {
            withCredentials: true
          });
          
          if (response.data?.success && response.data?.messages) {
            // Format history messages to match real-time message structure
            const formattedHistory = response.data.messages.map(msg => ({
              username: msg.username,
              message: msg.message,
              time: msg.time || null
            }));
            setChatHistory(formattedHistory);
            
            // Auto-scroll to bottom after loading history
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          // Continue even if history fails to load
        }
      };

      loadChatHistory();

      // Connect to socket when modal opens
      const newSocket = io.connect(import.meta.env.VITE_API_URL || 'http://localhost:5001');
      setSocket(newSocket);

      // Listen for incoming messages
      newSocket.on('receive_message', (data) => {
        setChatHistory((prev) => [...prev, data]);
        // Auto-scroll to bottom when new message arrives
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });

      // Cleanup on unmount or modal close
      return () => {
        newSocket.disconnect();
        setSocket(null);
        setChatHistory([]); // Clear chat history when closing
      };
    } else {
      // Disconnect when modal closes
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setChatHistory([]); // Clear chat history when closing
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGlobalChat]);

  // Handle sending message in Global Chat
  const handleSendMessage = (e) => {
    // Prevent page refresh
    if (e) {
      e.preventDefault();
    }
    
    if (!messageInput.trim() || !socket || !data?.avatarName) return;

    const messageData = {
      username: data.avatarName,
      message: messageInput.trim(),
      time: new Date().toLocaleTimeString()
    };

    socket.emit('send_message', messageData);
    playSound('click');
    setMessageInput('');
    
    // Auto-scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle Enter key press in message input
  const handleMessageKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission/page refresh
      handleSendMessage(e);
    }
  };

  // Handle mission completion
  const handleCompleteMission = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in.');
        return;
      }

      const response = await axios.post(
        '/api/missions/complete',
        { missionType: 'DATA_MINING' },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data?.success) {
        // Play success sound on completion
        playSound('success');
        
        // Update stats in local state
        const newStats = response.data?.newStats || {};
        const updatedStatsObject = {};
        
        // Convert backend stats format to frontend format: { key_name: { type, value } }
        Object.keys(newStats).forEach(key => {
          updatedStatsObject[key] = {
            type: data?.stats?.[key]?.type || 'PHYSICAL',
            value: String(newStats[key])
          };
        });

        // Update data state with new stats
        setData(prevData => ({
          ...prevData,
          stats: {
            ...prevData?.stats,
            ...updatedStatsObject
          }
        }));

        // Show success message
        const credits = response.data?.reward?.credits || 0;
        const xp = response.data?.reward?.xp || 0;
        const levelUpMsg = response.data?.levelUp ? ' 🎉 LEVEL UP!' : '';
        alert(`Data Decrypted! Earned ${credits} Credits & ${xp} XP.${levelUpMsg}`);

        // Reset progress
        setMiningProgress(0);
      } else {
        throw new Error(response.data?.message || 'Failed to complete mission');
      }
    } catch (error) {
      console.error('Error completing mission:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to complete mission';
      alert(errorMessage);
    }
  };

  // Handle mining button click
  const handleMiningClick = () => {
    // Play click sound on every click
    playSound('click');
    
    const newProgress = Math.min(miningProgress + 10, 100);
    setMiningProgress(newProgress);

    // When progress reaches 100%, complete the mission
    if (newProgress >= 100) {
      handleCompleteMission();
    }
  };

  // Handle profile image update
  const handleProfileImageUpdate = async (imageUrl) => {
    try {
      setUpdatingProfileImage(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in.');
        setUpdatingProfileImage(false);
        return;
      }

      const response = await axios.post(
        '/api/auth/avatar-image',
        { imageUrl },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data?.success) {
        // Update local state immediately
        setData(prevData => ({
          ...prevData,
          profile_image: imageUrl,
          avatar: {
            ...prevData?.avatar,
            profile_image: imageUrl
          }
        }));

        // Close modal
        setShowProfileImageModal(false);
      } else {
        throw new Error(response.data?.message || 'Failed to update profile image');
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile image';
      alert(errorMessage);
    } finally {
      setUpdatingProfileImage(false);
    }
  };

  // Handle core color customization
  const handleColorChange = async (color, requiredLevel) => {
    if (level < requiredLevel) {
      alert(`Level ${requiredLevel} Required!`);
      return;
    }

    // Update state immediately for instant UI feedback
    setCoreColor(color);

    // Save to backend
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in.');
        setCoreColor(data?.core_color || '#00ffff'); // Revert on error
        return;
      }

      await axios.post(
        '/api/auth/customize',
        { color },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      // Update data state to persist the color
      setData(prevData => ({
        ...prevData,
        core_color: color
      }));
    } catch (error) {
      console.error('Error updating core color:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update core color';
      alert(errorMessage);
      // Revert on error
      setCoreColor(data?.core_color || '#00ffff');
    }
  };

  // Handle equipping an item
  const handleEquipItem = async (itemId, itemName) => {
    try {
      setProcessingItemId(itemId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in.');
        setProcessingItemId(null);
        return;
      }

      const response = await axios.post(
        '/api/products/equip',
        { itemId, itemName },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data?.success) {
        // Update state to change background instantly
        const newBg = response.data?.newBg || 'DEFAULT';
        setData(prevData => ({
          ...prevData,
          current_bg: newBg,
          avatar: {
            ...prevData?.avatar,
            current_bg: newBg
          }
        }));

        alert(`Background changed to ${newBg}!`);
      } else {
        throw new Error(response.data?.message || 'Failed to equip item');
      }
    } catch (error) {
      console.error('Error equipping item:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to equip item';
      alert(errorMessage);
    } finally {
      setProcessingItemId(null);
    }
  };

  // Handle using an item from inventory
  const handleUseItem = async (itemId, itemType, itemName) => {
    try {
      setProcessingItemId(itemId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in.');
        return;
      }

      const response = await axios.post(
        '/api/products/use',
        { inventoryId: itemId, itemType },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data?.success) {
        // Update stats in local state
        const newStats = response.data?.stats || {};
        const updatedStatsObject = {};
        
        // Convert backend stats format to frontend format: { key_name: { type, value } }
        Object.keys(newStats).forEach(key => {
          updatedStatsObject[key] = {
            type: data?.stats?.[key]?.type || 'PHYSICAL',
            value: String(newStats[key])
          };
        });

        // Update data state with new stats
        setData(prevData => ({
          ...prevData,
          stats: {
            ...prevData?.stats,
            ...updatedStatsObject
          }
        }));

        // Check for level up and show celebration
        console.log('Level Up Check:', response.data.levelUp);
        if (response.data?.levelUp === true) {
          // Play level up sound BEFORE alert (browsers may block sound after alert)
          playSound('levelup');
          alert('🎉 LEVEL UP! SYSTEM UPGRADED!');
        }

        // Remove item from inventory if it was consumed
        if (response.data?.itemRemoved) {
          setInventoryItems(prevItems => prevItems.filter(item => item.id !== itemId));
          // Show success message for consumed items (only if not level up to avoid double alerts)
          if (!response.data?.levelUp) {
            alert(`Consumed ${itemName}. Energy Restored!`);
          }
        } else {
          // Show message for physical items (delivery tracked)
          alert(response.data?.message || `Used ${itemName}. Delivery status tracked.`);
        }
      } else {
        throw new Error(response.data?.message || 'Failed to use item');
      }
    } catch (error) {
      console.error('Error using item:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to use item';
      alert(errorMessage);
    } finally {
      setProcessingItemId(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Loading State - Full screen
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-cyan-400 font-mono text-2xl mb-4 animate-pulse">
            Loading Neural Link...
          </p>
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Get current background class
  const currentBg = data?.current_bg || data?.avatar?.current_bg || 'DEFAULT';
  const bgClass = BACKGROUNDS[currentBg] || BACKGROUNDS['DEFAULT'];

  return (
    <div className={`min-h-screen ${bgClass} text-white relative overflow-hidden`}>
      {/* Animated background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(cyan 1px, transparent 1px),
            linear-gradient(90deg, cyan 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-10 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <motion.div
        className="relative z-10 container mx-auto px-4 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="mb-8 text-center" variants={itemVariants}>
          <div className="flex items-center justify-center gap-4 mb-2">
            {/* Profile Image Avatar */}
            <motion.button
              onClick={() => setShowProfileImageModal(true)}
              className="relative group"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={data?.profile_image || data?.avatar?.profile_image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                alt="Profile"
                className="w-16 h-16 rounded-full border-2 border-cyan-400 object-cover shadow-[0_0_20px_rgba(6,182,212,0.6)]"
                onError={(e) => {
                  e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                }}
              />
              {/* Edit Icon Overlay */}
              <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Edit2 className="w-5 h-5 text-cyan-400" />
              </div>
            </motion.button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                HAYALPEREST
              </h1>
            </div>
          </div>
          <p className="text-purple-400 font-mono italic">Just Imagine</p>
          <p className="text-gray-400 text-sm font-mono mt-2">COMMAND_CENTER::ONLINE</p>
        </motion.div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Navigation */}
          <motion.div className="lg:col-span-3" variants={itemVariants}>
            <div className="bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6"
              style={{
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.2), inset 0 0 30px rgba(147, 51, 234, 0.1)'
              }}
            >
              <h2 className="text-cyan-400 font-mono text-sm mb-4 border-b border-cyan-500/30 pb-2">
                NAVIGATION_MENU
              </h2>
              <div className="space-y-3">
                {[
                  { icon: ShoppingBag, label: 'Marketplace', iconColor: 'text-cyan-400', hoverIconColor: 'group-hover:text-cyan-300', path: '/marketplace' },
                  { icon: '🎒', label: '🎒 INVENTORY', iconColor: 'text-cyan-400', hoverIconColor: 'group-hover:text-cyan-300', path: null, action: 'inventory' },
                  { icon: '⛏️', label: '⛏️ EARN CREDITS', iconColor: 'text-cyan-400', hoverIconColor: 'group-hover:text-cyan-300', path: null, action: 'missions' },
                  { icon: Heart, label: 'Health/Vitals', iconColor: 'text-purple-400', hoverIconColor: 'group-hover:text-purple-300', path: null },
                  { icon: '🎬', label: '🎬 HOLO-CINEMA', iconColor: 'text-purple-400', hoverIconColor: 'group-hover:text-purple-300', path: '/cinema' },
                  { icon: '📡', label: '📡 GLOBAL CHAT', iconColor: 'text-purple-400', hoverIconColor: 'group-hover:text-purple-300', path: null, action: 'globalChat' },
                  { icon: '⚔️', label: '⚔️ CYBER ARENA', iconColor: 'text-red-500', hoverIconColor: 'group-hover:text-orange-400', path: '/arena', isArena: true }
                ]?.map((item, index) => (
                  <motion.button
                    key={index}
                    onClick={() => {
                      if (item?.action === 'inventory') {
                        setShowInventory(true);
                      } else if (item?.action === 'missions') {
                        setShowMissions(true);
                      } else if (item?.action === 'globalChat') {
                        setShowGlobalChat(true);
                      } else if (item?.path) {
                        navigate(item.path);
                      }
                    }}
                    className={`w-full bg-black/50 border rounded px-4 py-3 text-left font-mono text-sm transition-all duration-300 flex items-center gap-3 group ${
                      item.isArena
                        ? 'border-red-500/50 hover:border-orange-500 hover:bg-red-500/20 hover:shadow-[0_0_25px_rgba(239,68,68,0.6)] shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                        : 'border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    }`}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {typeof item.icon === 'string' ? (
                      <span className={`text-2xl ${item?.iconColor || 'text-cyan-400'}`}>{item.icon}</span>
                    ) : (
                      <item.icon className={`w-5 h-5 ${item?.iconColor || 'text-cyan-400'} ${item?.hoverIconColor || 'group-hover:text-cyan-300'}`} />
                    )}
                    <span className={item.isArena ? 'text-red-400 group-hover:text-orange-400' : 'text-white group-hover:text-cyan-300'}>{item?.label || 'Menu Item'}</span>
                  </motion.button>
                )) ?? []}
                
                {/* Admin Panel Button - Only visible to admins */}
                {data?.is_admin && (
                  <motion.button
                    onClick={() => navigate('/admin')}
                    className="w-full bg-black/50 border border-red-500/30 rounded px-4 py-3 text-left font-mono text-sm hover:border-red-500 hover:bg-red-500/10 hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] transition-all duration-300 flex items-center gap-3 group shadow-[0_0_15px_rgba(239,68,68,0.1)] mt-4"
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-2xl text-red-500">⚡</span>
                    <span className="text-red-500 group-hover:text-red-400">⚡ SYSTEM CORE</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Center Column - The Twin */}
          <motion.div className="lg:col-span-6" variants={itemVariants}>
            <div className="bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6 h-full"
              style={{
                boxShadow: '0 0 40px rgba(6, 182, 212, 0.3), inset 0 0 40px rgba(147, 51, 234, 0.1)'
              }}
            >
              <h2 className="text-cyan-400 font-mono text-sm mb-4 border-b border-cyan-500/30 pb-2">
                DIGITAL_TWIN::RENDER
              </h2>
              
              {/* Avatar Frame */}
              <div className="relative border-2 border-cyan-500/50 rounded-lg p-4 bg-gradient-to-br from-cyan-500/10 to-purple-500/10"
                style={{
                  boxShadow: 'inset 0 0 30px rgba(6, 182, 212, 0.2), 0 0 40px rgba(6, 182, 212, 0.3)'
                }}
              >
                {/* 3D Model Container - React Three Fiber Canvas */}
                <div className="h-[500px] w-full rounded-lg overflow-hidden bg-black/40">
                  <Canvas camera={{ position: [0, 0, 3] }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} color={coreColor} />
                    <AnimatedCore coreColor={coreColor} />
                    <OrbitControls enableZoom={false} />
                  </Canvas>
                </div>

                {/* Avatar Name */}
                <div className="mt-4 text-center relative z-20">
                  <div className="inline-block px-4 py-2 bg-black/60 backdrop-blur-sm border border-cyan-500/50 rounded-lg"
                    style={{
                      boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
                    }}
                  >
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent font-mono">
                      {avatarName}
                    </h3>
                    <p className="text-gray-400 text-xs font-mono mt-1">LEVEL_{level}</p>
                  </div>
                </div>

                {/* Customize Core Section */}
                <div className="mt-4 text-center relative z-20">
                  <div className="inline-block px-4 py-3 bg-black/60 backdrop-blur-sm border border-cyan-500/50 rounded-lg"
                    style={{
                      boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
                    }}
                  >
                    <h4 className="text-cyan-400 font-mono text-sm mb-2">CUSTOMIZE CORE</h4>
                    <div className="flex justify-center gap-2">
                      {/* Cyan - Always unlocked */}
                      <motion.button
                        onClick={() => handleColorChange('#00ffff', 1)}
                        className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                          coreColor === '#00ffff'
                            ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-110'
                            : 'border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                        }`}
                        style={{ backgroundColor: '#00ffff' }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Cyan (Unlocked)"
                      />
                      
                      {/* Red - Unlocks at Level 2 */}
                      <motion.button
                        onClick={() => handleColorChange('#ff0000', 2)}
                        disabled={level < 2}
                        className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                          level < 2
                            ? 'border-gray-600 opacity-50 cursor-not-allowed'
                            : coreColor === '#ff0000'
                            ? 'border-red-400 shadow-[0_0_15px_rgba(255,0,0,0.8)] scale-110'
                            : 'border-red-500/50 hover:border-red-400 hover:shadow-[0_0_10px_rgba(255,0,0,0.6)]'
                        }`}
                        style={{ backgroundColor: level < 2 ? '#666' : '#ff0000' }}
                        whileHover={level >= 2 ? { scale: 1.1 } : {}}
                        whileTap={level >= 2 ? { scale: 0.95 } : {}}
                        title={level < 2 ? 'Red (Level 2 Required)' : 'Red (Unlocked)'}
                      />
                      
                      {/* Gold - Unlocks at Level 5 */}
                      <motion.button
                        onClick={() => handleColorChange('#ffd700', 5)}
                        disabled={level < 5}
                        className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                          level < 5
                            ? 'border-gray-600 opacity-50 cursor-not-allowed'
                            : coreColor === '#ffd700'
                            ? 'border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.8)] scale-110'
                            : 'border-yellow-500/50 hover:border-yellow-400 hover:shadow-[0_0_10px_rgba(255,215,0,0.6)]'
                        }`}
                        style={{ backgroundColor: level < 5 ? '#666' : '#ffd700' }}
                        whileHover={level >= 5 ? { scale: 1.1 } : {}}
                        whileTap={level >= 5 ? { scale: 0.95 } : {}}
                        title={level < 5 ? 'Gold (Level 5 Required)' : 'Gold (Unlocked)'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Status */}
          <motion.div className="lg:col-span-3" variants={itemVariants}>
            <div className="bg-black/40 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6"
              style={{
                boxShadow: '0 0 30px rgba(6, 182, 212, 0.2), inset 0 0 30px rgba(147, 51, 234, 0.1)'
              }}
            >
              <h2 className="text-cyan-400 font-mono text-sm mb-4 border-b border-cyan-500/30 pb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                LIVE_STATS
              </h2>
              
              {!hasStats ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 font-mono text-sm">No Vital Signs Detected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Level Card */}
                  <div className="bg-black/50 border border-purple-500/30 rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-purple-400 font-mono text-xs">LEVEL</span>
                      <span className="text-white font-bold">{level}</span>
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-purple-300 font-mono text-xs">XP</span>
                        <span className="text-white font-mono text-xs">{xp}/100</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-300" style={{ width: `${Math.min((xp / 100) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Credits Card */}
                  <div className="bg-black/50 border border-cyan-500/30 rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-cyan-400 font-mono text-xs">CREDITS</span>
                      <span className="text-white font-bold">{credits}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full" style={{ width: `${Math.min(credits / 10, 100)}%` }}></div>
                    </div>
                  </div>

                  {/* Energy Card */}
                  <div className="bg-black/50 border border-cyan-500/30 rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-cyan-400 font-mono text-xs">ENERGY</span>
                      <span className="text-white font-bold">{energy}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full animate-pulse" style={{ width: `${Math.min(energy, 100)}%` }}></div>
                    </div>
                  </div>

                  {/* Mood Card */}
                  <div className="bg-black/50 border border-purple-500/30 rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-purple-400 font-mono text-xs">MOOD</span>
                      <span className="text-white font-bold">{mood}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard Widget */}
              <div className="mt-6 border-t border-cyan-500/30 pt-4">
                <h2 className="text-cyan-400 font-mono text-sm mb-4 border-b border-cyan-500/30 pb-2 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  🏆 TOP RANKINGS
                </h2>
                
                {leaderboardLoading ? (
                  <div className="text-center py-4">
                    <p className="text-cyan-400 font-mono text-xs animate-pulse">
                      Scanning Network...
                    </p>
                  </div>
                ) : leaderboardData.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 font-mono text-xs">
                      No Rankings Available
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboardData.map((player, index) => {
                      const rank = index + 1;
                      const isCurrentUser = player.username === currentUsername;
                      const isFirst = rank === 1;
                      
                      return (
                        <motion.div
                          key={index}
                          className={`p-2 rounded border transition-all duration-300 ${
                            isCurrentUser
                              ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                              : isFirst
                              ? 'bg-yellow-500/10 border-yellow-500/50'
                              : 'bg-black/30 border-cyan-500/20 hover:border-cyan-500/40'
                          }`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`font-mono text-xs font-bold ${
                                isFirst ? 'text-yellow-400' : 'text-cyan-400'
                              }`}>
                                #{rank}
                              </span>
                              {isFirst && (
                                <Crown className="w-3 h-3 text-yellow-400" />
                              )}
                              <span className={`font-mono text-xs truncate ${
                                isCurrentUser ? 'text-cyan-300 font-bold' : 'text-white'
                              }`}>
                                {player.username}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              <span className="text-purple-400 font-mono text-xs">
                                Lv.{player.level}
                              </span>
                              <span className="text-gray-400 font-mono text-xs">
                                {player.xp}XP
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Avatar Chat Interface */}
      {data && (
        <AvatarChat
          avatarName={avatarName}
          avatarStats={stats}
          userName={data?.userName || 'Commander'}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      )}

      {/* Inventory Modal Overlay */}
      {showInventory && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Black Overlay with 80% opacity */}
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: 0.8 }}
            onClick={() => setShowInventory(false)}
          />

          {/* Holographic Window */}
          <motion.div
            className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-black/90 backdrop-blur-md border-2 border-cyan-500 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.6)] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            style={{
              boxShadow: '0 0 60px rgba(6, 182, 212, 0.8), inset 0 0 40px rgba(6, 182, 212, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-4 flex justify-between items-center">
              <h2 className="text-cyan-400 font-mono text-xl font-bold">
                ACCESSING STORAGE...
              </h2>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setShowInventory(false)}
                  className="text-cyan-400 hover:text-white font-mono px-4 py-2 border border-cyan-500/50 rounded hover:bg-cyan-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  CLOSE TERMINAL
                </motion.button>
                <motion.button
                  onClick={() => setShowInventory(false)}
                  className="text-cyan-400 hover:text-white p-2 border border-cyan-500/50 rounded hover:bg-cyan-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-cyan-400 font-mono text-lg mb-4 animate-pulse">
                      Loading Storage...
                    </p>
                    <div className="flex justify-center space-x-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              ) : inventoryItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-mono text-lg mb-2">
                    Storage Empty.
                  </p>
                  <p className="text-cyan-400 font-mono text-sm">
                    Visit Marketplace.
                  </p>
                  <motion.button
                    onClick={() => {
                      setShowInventory(false);
                      navigate('/marketplace');
                    }}
                    className="mt-4 px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-mono font-bold rounded hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    GO TO MARKETPLACE
                  </motion.button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventoryItems.map((item) => (
                    <motion.div
                      key={item.id}
                      className="bg-black/60 border border-cyan-500/30 rounded-lg overflow-hidden hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {/* Item Image */}
                      <div className="relative h-32 bg-black/60 overflow-hidden">
                        <img
                          src={item.image_url || 'https://via.placeholder.com/400x400/000000/00ffff?text=Item'}
                          alt={item.item_name || 'Item'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x400/000000/00ffff?text=Item';
                          }}
                        />
                        {/* Type Badge */}
                        {item.item_type && (
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-1 rounded text-xs font-mono ${
                              item.item_type === 'PHYSICAL'
                                ? 'bg-purple-500/80 text-white'
                                : 'bg-cyan-500/80 text-black'
                            }`}>
                              {item.item_type}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Item Info */}
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="text-cyan-400 font-mono font-bold text-sm truncate flex-1">
                            {item.item_name || 'Unnamed Item'}
                          </h3>
                          {/* Show EQUIP button for equippable items, USE for others */}
                          {(item.item_name === 'Astronaut Lamp' || item.item_name === 'Neon Core Upgrade') ? (
                            <motion.button
                              onClick={() => handleEquipItem(item.id, item.item_name)}
                              disabled={processingItemId === item.id}
                              className={`px-3 py-1 text-xs font-mono font-bold rounded border-2 transition-all duration-300 ${
                                processingItemId === item.id
                                  ? 'border-purple-400/50 text-purple-400/50 cursor-not-allowed opacity-50'
                                  : 'border-purple-400 text-purple-400 hover:bg-purple-400/20 hover:shadow-[0_0_15px_rgba(147,51,234,0.6)]'
                              }`}
                              whileHover={processingItemId !== item.id ? { scale: 1.05 } : {}}
                              whileTap={processingItemId !== item.id ? { scale: 0.95 } : {}}
                              style={{
                                textShadow: processingItemId !== item.id ? '0 0 10px rgba(147, 51, 234, 0.8)' : 'none'
                              }}
                            >
                              {processingItemId === item.id ? 'EQUIPPING...' : 'EQUIP'}
                            </motion.button>
                          ) : (
                            <motion.button
                              onClick={() => handleUseItem(item.id, item.item_type, item.item_name)}
                              disabled={processingItemId === item.id}
                              className={`px-3 py-1 text-xs font-mono font-bold rounded border-2 transition-all duration-300 ${
                                processingItemId === item.id
                                  ? 'border-green-400/50 text-green-400/50 cursor-not-allowed opacity-50'
                                  : 'border-green-400 text-green-400 hover:bg-green-400/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.6)]'
                              }`}
                              whileHover={processingItemId !== item.id ? { scale: 1.05 } : {}}
                              whileTap={processingItemId !== item.id ? { scale: 0.95 } : {}}
                              style={{
                                textShadow: processingItemId !== item.id ? '0 0 10px rgba(34, 197, 94, 0.8)' : 'none'
                              }}
                            >
                              {processingItemId === item.id ? 'USING...' : 'USE'}
                            </motion.button>
                          )}
                        </div>
                        <p className="text-gray-400 font-mono text-xs">
                          Acquired: {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Mission Modal Overlay */}
      {showMissions && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Black Overlay with 80% opacity */}
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: 0.8 }}
            onClick={() => setShowMissions(false)}
          />

          {/* Holographic Window */}
          <motion.div
            className="relative z-10 w-full max-w-2xl bg-black/90 backdrop-blur-md border-2 border-cyan-500 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.6)] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            style={{
              boxShadow: '0 0 60px rgba(6, 182, 212, 0.8), inset 0 0 40px rgba(6, 182, 212, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-4 flex justify-between items-center">
              <h2 className="text-cyan-400 font-mono text-xl font-bold">
                CRYPTO-MINING TERMINAL
              </h2>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setShowMissions(false)}
                  className="text-cyan-400 hover:text-white font-mono px-4 py-2 border border-cyan-500/50 rounded hover:bg-cyan-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  CLOSE TERMINAL
                </motion.button>
                <motion.button
                  onClick={() => setShowMissions(false)}
                  className="text-cyan-400 hover:text-white p-2 border border-cyan-500/50 rounded hover:bg-cyan-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="text-center mb-6">
                <p className="text-gray-300 font-mono text-sm mb-4">
                  Click to decrypt secure packets.
                </p>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-gray-800 rounded-full h-4 mb-2 border border-cyan-500/30">
                    <motion.div
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 h-4 rounded-full transition-all duration-300"
                      initial={{ width: 0 }}
                      animate={{ width: `${miningProgress}%` }}
                      style={{
                        boxShadow: '0 0 20px rgba(6, 182, 212, 0.8)'
                      }}
                    />
                  </div>
                  <p className="text-cyan-400 font-mono text-xs">
                    {miningProgress}%
                  </p>
                </div>

                {/* Decrypt Button */}
                <motion.button
                  onClick={handleMiningClick}
                  disabled={miningProgress >= 100}
                  className={`px-8 py-4 text-xl font-mono font-bold rounded-lg border-2 transition-all duration-300 ${
                    miningProgress >= 100
                      ? 'border-cyan-400/50 text-cyan-400/50 cursor-not-allowed opacity-50'
                      : 'border-cyan-400 text-cyan-400 bg-black/50 hover:bg-cyan-500/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.8)]'
                  }`}
                  whileHover={miningProgress < 100 ? { scale: 1.05 } : {}}
                  whileTap={miningProgress < 100 ? { scale: 0.95 } : {}}
                  style={{
                    textShadow: miningProgress < 100 ? '0 0 20px rgba(6, 182, 212, 0.8)' : 'none',
                    boxShadow: miningProgress < 100 ? '0 0 25px rgba(6, 182, 212, 0.6)' : 'none'
                  }}
                >
                  {miningProgress >= 100 ? 'DECRYPTING...' : 'DECRYPT DATA BLOCK'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Profile Image Selection Modal */}
      <AnimatePresence>
        {showProfileImageModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Dark Overlay */}
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: 0.8 }}
              onClick={() => setShowProfileImageModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="relative z-10 w-full max-w-3xl mx-4 bg-black/90 backdrop-blur-md border-2 border-cyan-500 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.6)] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                boxShadow: '0 0 60px rgba(6, 182, 212, 0.8), inset 0 0 40px rgba(6, 182, 212, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-4 flex justify-between items-center">
                <h2 className="text-cyan-400 font-mono text-xl font-bold">
                  CHOOSE YOUR IDENTITY
                </h2>
                <motion.button
                  onClick={() => setShowProfileImageModal(false)}
                  className="text-cyan-400 hover:text-white p-2 border border-cyan-500/50 rounded hover:bg-cyan-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Hacker */}
                  <motion.button
                    onClick={() => handleProfileImageUpdate('https://img.freepik.com/premium-photo/cyberpunk-hacker-hoodie-neon-lights_146508-2516.jpg')}
                    disabled={updatingProfileImage}
                    className="relative group bg-black/60 border-2 border-cyan-500/30 rounded-lg overflow-hidden hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="aspect-square relative">
                      <img
                        src="https://img.freepik.com/premium-photo/cyberpunk-hacker-hoodie-neon-lights_146508-2516.jpg"
                        alt="Hacker"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-cyan-400 font-mono text-xs font-bold">HACKER</p>
                      </div>
                    </div>
                    {updatingProfileImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </motion.button>

                  {/* Android */}
                  <motion.button
                    onClick={() => handleProfileImageUpdate('https://img.freepik.com/premium-photo/futuristic-female-android-with-neon-lights_146508-2678.jpg')}
                    disabled={updatingProfileImage}
                    className="relative group bg-black/60 border-2 border-cyan-500/30 rounded-lg overflow-hidden hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="aspect-square relative">
                      <img
                        src="https://img.freepik.com/premium-photo/futuristic-female-android-with-neon-lights_146508-2678.jpg"
                        alt="Android"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-cyan-400 font-mono text-xs font-bold">ANDROID</p>
                      </div>
                    </div>
                    {updatingProfileImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </motion.button>

                  {/* Samurai */}
                  <motion.button
                    onClick={() => handleProfileImageUpdate('https://img.freepik.com/premium-photo/cyberpunk-samurai-warrior-neon-city_146508-2345.jpg')}
                    disabled={updatingProfileImage}
                    className="relative group bg-black/60 border-2 border-cyan-500/30 rounded-lg overflow-hidden hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="aspect-square relative">
                      <img
                        src="https://img.freepik.com/premium-photo/cyberpunk-samurai-warrior-neon-city_146508-2345.jpg"
                        alt="Samurai"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-cyan-400 font-mono text-xs font-bold">SAMURAI</p>
                      </div>
                    </div>
                    {updatingProfileImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </motion.button>

                  {/* Corporate */}
                  <motion.button
                    onClick={() => handleProfileImageUpdate('https://img.freepik.com/premium-photo/futuristic-businessman-cyberpunk-style_146508-2890.jpg')}
                    disabled={updatingProfileImage}
                    className="relative group bg-black/60 border-2 border-cyan-500/30 rounded-lg overflow-hidden hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="aspect-square relative">
                      <img
                        src="https://img.freepik.com/premium-photo/futuristic-businessman-cyberpunk-style_146508-2890.jpg"
                        alt="Corporate"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-cyan-400 font-mono text-xs font-bold">CORPORATE</p>
                      </div>
                    </div>
                    {updatingProfileImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Chat Modal */}
      <AnimatePresence>
        {showGlobalChat && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Dark Overlay */}
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: 0.8 }}
              onClick={() => setShowGlobalChat(false)}
            />

            {/* Chat Modal */}
            <motion.div
              className="relative z-10 w-full max-w-2xl mx-4 bg-black/90 backdrop-blur-md border-2 border-cyan-500 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.6)] overflow-hidden flex flex-col"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                boxShadow: '0 0 60px rgba(6, 182, 212, 0.8), inset 0 0 40px rgba(6, 182, 212, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="border-b border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 p-4 flex justify-between items-center">
                <h2 className="text-cyan-400 font-mono text-xl font-bold">
                  GALACTIC UPLINK // LIVE CHANNEL
                </h2>
                <motion.button
                  onClick={() => setShowGlobalChat(false)}
                  className="text-cyan-400 hover:text-white p-2 border border-cyan-500/50 rounded hover:bg-cyan-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Messages Area - Scrollable */}
              <div className="flex-1 p-4 overflow-y-auto bg-black/60 min-h-[400px] max-h-[500px]">
                <div className="space-y-3">
                  {chatHistory.length === 0 ? (
                    <div className="text-gray-500 font-mono text-sm text-center py-8">
                      <p className="text-cyan-400/50">No messages yet. Be the first to speak!</p>
                    </div>
                  ) : (
                    chatHistory.map((msg, index) => {
                      const isMyMessage = msg.username === data?.avatarName;
                      return (
                        <div
                          key={index}
                          className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 font-mono text-sm ${
                              isMyMessage
                                ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                                : 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                            }`}
                          >
                            <div className="font-bold text-xs mb-1 opacity-80">
                              {msg.username}
                            </div>
                            <div>{msg.message}</div>
                            {msg.time && (
                              <div className="text-xs mt-1 opacity-60">{msg.time}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Footer - Input and Send Button */}
              <div className="border-t border-cyan-500/50 bg-black/80 p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleMessageKeyPress}
                    className="flex-1 bg-black/60 border border-cyan-500/30 rounded px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300"
                  />
                  <motion.button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || !socket}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-mono font-bold rounded hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    SEND
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
