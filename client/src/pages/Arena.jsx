import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';
import axios from 'axios';
import { playSound } from '../utils/soundManager';
import { Zap, Shield, Swords, ArrowLeft } from 'lucide-react';

const Arena = () => {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('IDLE'); // IDLE, SEARCHING, FIGHTING, RESULT
  const [myMove, setMyMove] = useState(null);
  const [result, setResult] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [username, setUsername] = useState('');

  // Get username from API
  useEffect(() => {
    const fetchUsername = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        });

        if (response.data?.success) {
          const avatarName = response.data?.avatar?.avatar_name || 'Player';
          const userUsername = response.data?.user?.username || avatarName;
          setUsername(userUsername);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to email prefix
        const email = localStorage.getItem('email');
        if (email) {
          setUsername(email.split('@')[0]);
        } else {
          setUsername('Player');
        }
      }
    };

    fetchUsername();
  }, [navigate]);

  // Socket connection on mount
  useEffect(() => {
    const newSocket = io.connect(import.meta.env.VITE_API_URL || 'http://localhost:5001');
    setSocket(newSocket);

    // Listen for arena events
    newSocket.on('waiting_opponent', () => {
      setGameState('SEARCHING');
      console.log('⏳ Waiting for opponent...');
    });

    newSocket.on('game_start', (data) => {
      setGameState('FIGHTING');
      setRoomId(data.roomId);
      // Determine opponent name
      const opponentName = data.opponent1 === username ? data.opponent2 : data.opponent1;
      setOpponent(opponentName);
      setMyMove(null);
      setWaitingForOpponent(false);
      playSound('success');
      console.log('🎮 Game started!', data);
    });

    newSocket.on('game_result', (data) => {
      setGameState('RESULT');
      setResult(data);
      playSound(data.isTie ? 'error' : 'levelup');
      console.log('🏆 Game result:', data);
    });

    newSocket.on('move_received', (data) => {
      setWaitingForOpponent(true);
      console.log('✅ Move received, waiting for opponent...');
    });

    newSocket.on('opponent_left', (data) => {
      setGameState('IDLE');
      setResult({ isTie: false, message: 'Opponent disconnected' });
      playSound('error');
      console.log('⚠️ Opponent left');
    });

    newSocket.on('arena_error', (data) => {
      console.error('❌ Arena error:', data.message);
      alert(`Error: ${data.message}`);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [username]);

  const handleFindMatch = () => {
    if (!socket || !username) {
      alert('Please wait for connection...');
      return;
    }
    
    setGameState('SEARCHING');
    setMyMove(null);
    setResult(null);
    setOpponent(null);
    setRoomId(null);
    setWaitingForOpponent(false);
    
    socket.emit('join_arena', { username });
    playSound('click');
  };

  const handleMakeMove = (move) => {
    if (!socket || !roomId || gameState !== 'FIGHTING') return;
    
    setMyMove(move);
    setWaitingForOpponent(true);
    socket.emit('make_move', { roomId, move });
    playSound('click');
  };

  const handlePlayAgain = () => {
    setGameState('IDLE');
    setMyMove(null);
    setResult(null);
    setOpponent(null);
    setRoomId(null);
    setWaitingForOpponent(false);
  };

  const getMoveIcon = (move) => {
    switch (move) {
      case 'EMP':
        return <Zap className="w-8 h-8" />;
      case 'SHIELD':
        return <Shield className="w-8 h-8" />;
      case 'LASER':
        return <Swords className="w-8 h-8" />;
      default:
        return null;
    }
  };

  const getMoveColor = (move) => {
    switch (move) {
      case 'EMP':
        return 'from-yellow-500 to-orange-500';
      case 'SHIELD':
        return 'from-blue-500 to-cyan-500';
      case 'LASER':
        return 'from-red-500 to-pink-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const isWinner = result && !result.isTie && result.winnerUsername === username;
  const isLoser = result && !result.isTie && result.winnerUsername !== username;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-red-900/20"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(cyan 1px, transparent 1px),
            linear-gradient(90deg, cyan 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      ></div>

      {/* Header */}
      <div className="relative z-10 border-b border-red-500/30 bg-gradient-to-r from-red-950/20 to-black p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => navigate('/dashboard')}
              className="text-red-400 hover:text-red-300 p-2 border border-red-500/50 rounded hover:bg-red-500/20 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-red-500 bg-clip-text text-transparent font-mono">
              PVP ARENA
            </h1>
          </div>
          <div className="text-red-400/50 font-mono text-sm">
            {gameState === 'IDLE' && 'READY'}
            {gameState === 'SEARCHING' && 'SEARCHING...'}
            {gameState === 'FIGHTING' && 'BATTLE'}
            {gameState === 'RESULT' && 'RESULT'}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* IDLE State - Find Match Button */}
        {gameState === 'IDLE' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh]"
          >
            <motion.button
              onClick={handleFindMatch}
              className="px-12 py-6 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 text-white font-mono font-bold text-2xl rounded-lg hover:shadow-[0_0_40px_rgba(239,68,68,0.8)] transition-all duration-300 border-2 border-red-400"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              FIND MATCH
            </motion.button>
            <p className="mt-4 text-red-400/70 font-mono text-sm">
              Enter the arena and test your skills
            </p>
          </motion.div>
        )}

        {/* SEARCHING State */}
        {gameState === 'SEARCHING' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[60vh]"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 border-4 border-red-500 border-t-transparent rounded-full"
            />
            <p className="mt-6 text-red-400 font-mono text-xl animate-pulse">
              SEARCHING FOR OPPONENT...
            </p>
          </motion.div>
        )}

        {/* FIGHTING State - Split Screen Battle */}
        {gameState === 'FIGHTING' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Opponent Found Message */}
            <div className="text-center">
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-green-400 font-mono text-lg mb-2"
              >
                ⚡ OPPONENT FOUND
              </motion.p>
              <p className="text-red-400 font-mono text-sm">
                vs {opponent}
              </p>
            </div>

            {/* Split Screen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* You */}
              <div className="bg-black/60 border-2 border-cyan-500/50 rounded-lg p-6 backdrop-blur-sm"
                style={{
                  boxShadow: '0 0 30px rgba(6, 182, 212, 0.3), inset 0 0 30px rgba(6, 182, 212, 0.1)'
                }}
              >
                <h3 className="text-cyan-400 font-mono text-lg mb-4 border-b border-cyan-500/30 pb-2">
                  YOU
                </h3>
                <div className="text-center py-8">
                  {myMove ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getMoveColor(myMove)} text-white`}
                    >
                      {getMoveIcon(myMove)}
                    </motion.div>
                  ) : (
                    <p className="text-gray-400 font-mono text-sm">Choose your move...</p>
                  )}
                </div>
              </div>

              {/* Opponent */}
              <div className="bg-black/60 border-2 border-red-500/50 rounded-lg p-6 backdrop-blur-sm"
                style={{
                  boxShadow: '0 0 30px rgba(239, 68, 68, 0.3), inset 0 0 30px rgba(239, 68, 68, 0.1)'
                }}
              >
                <h3 className="text-red-400 font-mono text-lg mb-4 border-b border-red-500/30 pb-2">
                  {opponent?.toUpperCase() || 'OPPONENT'}
                </h3>
                <div className="text-center py-8">
                  {waitingForOpponent ? (
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-gray-400 font-mono text-sm"
                    >
                      Waiting for opponent...
                    </motion.div>
                  ) : result?.moves?.player2?.move ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getMoveColor(result.moves.player2.move)} text-white`}
                    >
                      {getMoveIcon(result.moves.player2.move)}
                    </motion.div>
                  ) : (
                    <p className="text-gray-400 font-mono text-sm">Waiting...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Battle Controls */}
            {!myMove && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-3 gap-4 mt-6"
              >
                <motion.button
                  onClick={() => handleMakeMove('EMP')}
                  className="px-6 py-8 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-mono font-bold rounded-lg hover:shadow-[0_0_30px_rgba(234,179,8,0.6)] transition-all duration-300 border-2 border-yellow-400 flex flex-col items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Zap className="w-10 h-10" />
                  <span>EMP</span>
                </motion.button>

                <motion.button
                  onClick={() => handleMakeMove('SHIELD')}
                  className="px-6 py-8 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-mono font-bold rounded-lg hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 border-2 border-blue-400 flex flex-col items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Shield className="w-10 h-10" />
                  <span>SHIELD</span>
                </motion.button>

                <motion.button
                  onClick={() => handleMakeMove('LASER')}
                  className="px-6 py-8 bg-gradient-to-r from-red-500 to-pink-500 text-white font-mono font-bold rounded-lg hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all duration-300 border-2 border-red-400 flex flex-col items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Swords className="w-10 h-10" />
                  <span>LASER</span>
                </motion.button>
              </motion.div>
            )}

            {waitingForOpponent && myMove && (
              <div className="text-center mt-4">
                <p className="text-yellow-400 font-mono text-sm animate-pulse">
                  ⏳ Waiting for opponent to make their move...
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* RESULT State */}
        {gameState === 'RESULT' && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Result Banner */}
            <div className={`text-center p-8 rounded-lg border-2 ${
              result.isTie
                ? 'bg-yellow-500/20 border-yellow-500/50'
                : isWinner
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-red-500/20 border-red-500/50'
            }`}>
              <motion.h2
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-4xl font-bold font-mono mb-4 ${
                  result.isTie
                    ? 'text-yellow-400'
                    : isWinner
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {result.isTie ? 'TIE!' : isWinner ? 'VICTORY!' : 'DEFEAT!'}
              </motion.h2>
              {!result.isTie && (
                <p className="text-white font-mono text-lg">
                  Winner: {result.winnerUsername}
                </p>
              )}
            </div>

            {/* Moves Display */}
            {result.moves && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-black/60 border border-cyan-500/50 rounded-lg p-6">
                  <h3 className="text-cyan-400 font-mono mb-4">Your Move</h3>
                  <div className="flex items-center justify-center">
                    {(() => {
                      const myMoveData = result.moves.player1?.username === username 
                        ? result.moves.player1 
                        : result.moves.player2;
                      return myMoveData ? (
                        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getMoveColor(myMoveData.move)} text-white`}>
                          {getMoveIcon(myMoveData.move)}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div className="bg-black/60 border border-red-500/50 rounded-lg p-6">
                  <h3 className="text-red-400 font-mono mb-4">Opponent Move</h3>
                  <div className="flex items-center justify-center">
                    {(() => {
                      const opponentMoveData = result.moves.player1?.username !== username 
                        ? result.moves.player1 
                        : result.moves.player2;
                      return opponentMoveData ? (
                        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r ${getMoveColor(opponentMoveData.move)} text-white`}>
                          {getMoveIcon(opponentMoveData.move)}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Play Again Button */}
            <div className="text-center">
              <motion.button
                onClick={handlePlayAgain}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-mono font-bold rounded-lg hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                PLAY AGAIN
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Arena;
