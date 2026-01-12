import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key } from 'lucide-react';
import axios from 'axios';

const Cinema = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEasterEggModal, setShowEasterEggModal] = useState(false);
  const [claimingKey, setClaimingKey] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/media', {
          withCredentials: true
        });

        if (response.data?.success) {
          const mediaList = response.data.media || [];
          setVideos(mediaList);
          // Set first video as default
          if (mediaList.length > 0) {
            setSelectedVideo(mediaList[0]);
          }
        } else {
          throw new Error('Failed to fetch media');
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
  };

  const handleEasterEggClick = async () => {
    try {
      setClaimingKey(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in.');
        setClaimingKey(false);
        return;
      }

      const response = await axios.post(
        '/api/missions/easter-egg',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data?.success) {
        setShowEasterEggModal(true);
      } else {
        throw new Error(response.data?.message || 'Failed to claim key');
      }
    } catch (error) {
      console.error('Error claiming easter egg:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to claim key';
      if (errorMessage.includes('already claimed')) {
        alert('Key already claimed.');
      } else {
        alert(errorMessage);
      }
    } finally {
      setClaimingKey(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-cyan-400 font-mono text-2xl mb-4 animate-pulse">
            Loading Cinema...
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

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Ultra-dark background with subtle grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(cyan 1px, transparent 1px),
            linear-gradient(90deg, cyan 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Glowing orbs for atmosphere */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-5 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-5 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="border-b border-cyan-500/30 bg-black/80 backdrop-blur-sm p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-cyan-400 hover:text-white font-mono px-4 py-2 border border-cyan-500/50 rounded hover:bg-cyan-500/20 transition-all duration-300"
                whileHover={{ scale: 1.05, x: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </motion.button>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent font-mono">
              NOW SHOWING
            </h1>
            <div className="w-32"></div> {/* Spacer for center alignment */}
          </div>
        </header>

        {/* Main Stage - Video Player */}
        <main className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          {selectedVideo ? (
            <motion.div
              className="w-full max-w-6xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Video Title */}
              <div className="mb-4 text-center">
                <h2 className="text-xl font-bold text-cyan-400 font-mono mb-1">
                  {selectedVideo.title}
                </h2>
                <span className="text-xs text-purple-400 font-mono px-2 py-1 border border-purple-500/50 rounded">
                  {selectedVideo.type}
                </span>
              </div>

              {/* Video Player with Neon Glow */}
              <div className="relative">
                {/* Reflection Effect */}
                <div 
                  className="absolute -bottom-20 left-0 right-0 h-40 opacity-20 blur-xl"
                  style={{
                    background: `linear-gradient(to bottom, transparent, rgba(6, 182, 212, 0.3))`,
                    transform: 'scaleY(-1)'
                  }}
                ></div>

                {/* Video Container with Neon Border */}
                <div 
                  className="relative rounded-lg overflow-hidden"
                  style={{
                    boxShadow: '0 0 60px rgba(6, 182, 212, 0.6), 0 0 100px rgba(147, 51, 234, 0.4), inset 0 0 40px rgba(6, 182, 212, 0.2)',
                    border: '2px solid rgba(6, 182, 212, 0.5)'
                  }}
                >
                  <div className="relative pb-[56.25%] h-0 overflow-hidden bg-black">
                    <iframe
                      src={selectedVideo.url}
                      className="absolute top-0 left-0 w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={selectedVideo.title}
                    ></iframe>
                  </div>
                </div>

                {/* Glow effect around video */}
                <div 
                  className="absolute -inset-4 rounded-lg blur-2xl opacity-30 -z-10"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.5), rgba(147, 51, 234, 0.5))'
                  }}
                ></div>
              </div>
            </motion.div>
          ) : (
            <div className="text-center">
              <p className="text-gray-500 font-mono text-lg">
                No video selected
              </p>
            </div>
          )}
        </main>

        {/* Bottom Carousel */}
        <footer className="border-t border-cyan-500/30 bg-black/80 backdrop-blur-sm p-6">
          <div className="container mx-auto">
            <h3 className="text-cyan-400 font-mono text-sm mb-4">
              MORE CONTENT
            </h3>
            {videos.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {videos.map((video) => {
                  const isSelected = selectedVideo?.id === video.id;
                  return (
                    <motion.button
                      key={video.id}
                      onClick={() => handleVideoSelect(video)}
                      className={`flex-shrink-0 w-64 h-36 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                        isSelected
                          ? 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.8)] scale-105'
                          : 'border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]'
                      }`}
                      whileHover={!isSelected ? { scale: 1.02 } : {}}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="relative w-full h-full bg-black">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover opacity-80"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/640x360/000000/00ffff?text=Video';
                          }}
                        />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        {/* Title */}
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white font-mono text-xs font-bold truncate">
                            {video.title}
                          </p>
                          <span className="text-xs text-cyan-400 font-mono">
                            {video.type}
                          </span>
                        </div>
                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 font-mono text-sm text-center py-4">
                No videos available
              </p>
            )}
          </div>
        </footer>
      </div>

      {/* Easter Egg - Hidden Copper Key */}
      <motion.button
        onClick={handleEasterEggClick}
        disabled={claimingKey}
        className="fixed bottom-4 right-4 z-50 p-2 rounded-full transition-all duration-300 group"
        style={{
          opacity: 0.1
        }}
        whileHover={{ 
          opacity: 1,
          scale: 1.2
        }}
        whileTap={{ scale: 0.9 }}
        title="???"
      >
        <Key 
          className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))'
          }}
        />
        {claimingKey && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </motion.button>

      {/* Easter Egg Victory Modal */}
      <AnimatePresence>
        {showEasterEggModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Dark overlay */}
            <div 
              className="absolute inset-0 bg-black"
              style={{ opacity: 0.95 }}
              onClick={() => setShowEasterEggModal(false)}
            />

            {/* Victory Modal */}
            <motion.div
              className="relative z-10 max-w-2xl w-full mx-4 p-8 bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-red-500/20 border-4 border-yellow-400 rounded-lg text-center"
              initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
              animate={{ scale: 1, opacity: 1, rotateY: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
              style={{
                boxShadow: '0 0 100px rgba(234, 179, 8, 0.8), inset 0 0 50px rgba(234, 179, 8, 0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              {/* Sparkle effects */}
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="text-8xl mb-6"
                >
                  🧩
                </motion.div>
                
                <motion.h2
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-5xl font-bold text-yellow-400 mb-4 font-mono"
                  style={{
                    textShadow: '0 0 30px rgba(234, 179, 8, 0.8), 0 0 60px rgba(234, 179, 8, 0.6)'
                  }}
                >
                  EASTER EGG FOUND!
                </motion.h2>

                <motion.p
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-2xl text-yellow-300 mb-2 font-mono"
                >
                  1,000,000 CREDITS TRANSFERRED
                </motion.p>

                <motion.p
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-xl text-yellow-200 mb-8 font-mono"
                >
                  WELCOME TO THE HALL OF FAME, GUNTER.
                </motion.p>

                <motion.button
                  onClick={() => setShowEasterEggModal(false)}
                  className="px-8 py-3 bg-yellow-400 text-black font-bold font-mono rounded-lg hover:bg-yellow-300 transition-all duration-300 shadow-[0_0_30px_rgba(234,179,8,0.8)]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  CONTINUE
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom scrollbar styling */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 4px;
        }
        .scrollbar-hide::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default Cinema;
