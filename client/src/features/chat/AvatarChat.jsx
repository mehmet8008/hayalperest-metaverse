import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, X } from 'lucide-react';
import axios from 'axios';

const AvatarChat = ({ avatarName, avatarStats, userName, isOpen, onToggle }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isThinking) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message immediately
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      text: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsThinking(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Call chat API (Simulation Mode)
      const response = await axios.post(
        '/api/chat',
        {
          message: userMessage,
          avatarName: avatarName || 'Avatar',
          avatarStats: avatarStats || {},
          userName: userName || 'Commander'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      if (response.data?.success) {
        // Add avatar response
        const avatarMessage = {
          id: Date.now() + 1,
          type: 'avatar',
          text: response.data.response || 'I apologize, but I could not generate a response.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, avatarMessage]);
      } else {
        throw new Error(response.data?.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'avatar',
        text: `System Error: ${error.response?.data?.message || error.message || 'Failed to connect to Avatar. Please try again.'}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Thinking indicator component (pulsing waveform)
  const ThinkingIndicator = () => (
    <motion.div
      className="flex items-center gap-1 px-4 py-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-end gap-1 h-6">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-1 bg-cyan-400 rounded-full"
            style={{ height: '4px' }}
            animate={{
              height: ['4px', '20px', '4px'],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.1,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>
      <span className="text-cyan-400 font-mono text-xs ml-2">Avatar is typing...</span>
    </motion.div>
  );

  return (
    <>
      {/* Floating Chat Button (when closed) */}
      {!isOpen && (
        <motion.button
          onClick={onToggle}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:shadow-[0_0_50px_rgba(6,182,212,0.9)] transition-all duration-300 z-50 group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 w-96 h-[600px] bg-black/90 backdrop-blur-sm border-2 border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.5)] flex flex-col z-50"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            style={{
              boxShadow: '0 0 50px rgba(6, 182, 212, 0.5), inset 0 0 30px rgba(147, 51, 234, 0.1)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <h3 className="text-cyan-400 font-mono text-sm font-bold">
                  NEURAL_LINK::ACTIVE
                </h3>
              </div>
              <button
                onClick={onToggle}
                className="text-gray-400 hover:text-red-400 transition-colors duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-cyan-400 font-mono text-sm mb-2 animate-pulse">
                      ⚡ Neural Link Established
                    </p>
                    <p className="text-gray-400 font-mono text-xs">
                      Ready to communicate with {avatarName || 'your Avatar'}
                    </p>
                    <p className="text-purple-400 font-mono text-xs mt-2">
                      System::SIMULATION_MODE
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg p-3 font-mono text-sm ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400/50 text-white'
                          : message.isError
                          ? 'bg-red-900/30 border border-red-500/50 text-red-300'
                          : 'bg-purple-500/20 border border-purple-400/50 text-cyan-200'
                      }`}
                      style={{
                        boxShadow: message.type === 'user' 
                          ? '0 0 15px rgba(6, 182, 212, 0.3)'
                          : '0 0 15px rgba(147, 51, 234, 0.3)'
                      }}
                    >
                      <p className="text-xs mb-1 opacity-70">
                        {message.type === 'user' ? 'YOU' : avatarName?.toUpperCase() || 'AVATAR'}
                      </p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}

              {/* Thinking Indicator */}
              {isThinking && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-purple-500/20 border border-purple-400/50 rounded-lg">
                    <ThinkingIndicator />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-cyan-500/30 bg-black/60">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isThinking}
                  className="flex-1 bg-black/50 border border-cyan-500/30 rounded px-4 py-2 text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 disabled:opacity-50"
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || isThinking}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white p-2 rounded hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={!isThinking && inputMessage.trim() ? { scale: 1.1 } : {}}
                  whileTap={!isThinking && inputMessage.trim() ? { scale: 0.9 } : {}}
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AvatarChat;
