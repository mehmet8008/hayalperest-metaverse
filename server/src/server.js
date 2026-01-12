import app from './app.js';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { db } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.io with CORS
// Use same origin as Express CORS for consistency
const socketOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const io = new SocketIOServer(server, {
  cors: {
    origin: socketOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

console.log(`🔌 Socket.io CORS configured for origin: ${socketOrigin}`);

// PvP Arena State
let waitingPlayer = null; // socket.id of waiting player
const activeGames = {}; // { roomId: { player1: { socketId, username, move }, player2: { socketId, username, move } } }

// Helper function to calculate winner
const calculateWinner = (move1, move2) => {
  // EMP > SHIELD > LASER > EMP (Rock Paper Scissors style)
  if (move1 === move2) return null; // Tie
  
  if (
    (move1 === 'EMP' && move2 === 'SHIELD') ||
    (move1 === 'SHIELD' && move2 === 'LASER') ||
    (move1 === 'LASER' && move2 === 'EMP')
  ) {
    return 1; // Player 1 wins
  }
  
  return 2; // Player 2 wins
};

// Helper function to generate unique room ID
const generateRoomId = () => {
  return `arena_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`New user connected: ${socket.id}`);
  
  // Store username in socket data (will be set on join_arena)
  socket.data.username = null;

  // Handle send_message event
  socket.on('send_message', async (data) => {
    const { username, message, time } = data;
    console.log(`Message from ${username}: ${message}`);
    
    try {
      // Insert message into database first (persist)
      await db.query(
        'INSERT INTO global_messages (username, message) VALUES (?, ?)',
        [username, message]
      );
      console.log(`✅ Message persisted to database`);
      
      // THEN emit to all clients (after DB insert ensures persistence)
      io.emit('receive_message', {
        username,
        message,
        time: time || new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error persisting message to database:', error);
      // Still emit the message even if DB fails (graceful degradation)
      io.emit('receive_message', {
        username,
        message,
        time: time || new Date().toISOString()
      });
    }
  });

  // PvP Arena: Join Arena
  socket.on('join_arena', async (data) => {
    const { username } = data;
    
    if (!username) {
      socket.emit('arena_error', { message: 'Username is required' });
      return;
    }
    
    // Store username in socket data
    socket.data.username = username;
    
    if (waitingPlayer && waitingPlayer !== socket.id) {
      // Match found! Create game room
      const roomId = generateRoomId();
      const waitingSocket = io.sockets.sockets.get(waitingPlayer);
      
      if (!waitingSocket) {
        // Waiting player disconnected, clear and set current as waiting
        waitingPlayer = socket.id;
        socket.emit('waiting_opponent');
        return;
      }
      
      // Join both players to the room
      socket.join(roomId);
      waitingSocket.join(roomId);
      
      // Initialize game state
      activeGames[roomId] = {
        player1: {
          socketId: waitingPlayer,
          username: waitingSocket.data.username || 'Player 1',
          move: null
        },
        player2: {
          socketId: socket.id,
          username: username,
          move: null
        }
      };
      
      // Emit game_start to both players
      io.to(roomId).emit('game_start', {
        roomId,
        opponent1: activeGames[roomId].player1.username,
        opponent2: activeGames[roomId].player2.username
      });
      
      console.log(`🎮 Arena match created: ${roomId} - ${activeGames[roomId].player1.username} vs ${activeGames[roomId].player2.username}`);
      
      // Clear waiting player
      waitingPlayer = null;
    } else {
      // No one waiting, set as waiting player
      waitingPlayer = socket.id;
      socket.emit('waiting_opponent');
      console.log(`⏳ Player ${username} (${socket.id}) is waiting for opponent...`);
    }
  });

  // PvP Arena: Make Move
  socket.on('make_move', async (data) => {
    const { roomId, move } = data;
    
    if (!roomId || !move) {
      socket.emit('arena_error', { message: 'roomId and move are required' });
      return;
    }
    
    if (!['EMP', 'SHIELD', 'LASER'].includes(move)) {
      socket.emit('arena_error', { message: 'Invalid move. Must be EMP, SHIELD, or LASER' });
      return;
    }
    
    const game = activeGames[roomId];
    if (!game) {
      socket.emit('arena_error', { message: 'Game not found' });
      return;
    }
    
    // Store the move
    if (game.player1.socketId === socket.id) {
      game.player1.move = move;
    } else if (game.player2.socketId === socket.id) {
      game.player2.move = move;
    } else {
      socket.emit('arena_error', { message: 'You are not part of this game' });
      return;
    }
    
    console.log(`🎯 Move made in ${roomId}: ${socket.data.username} chose ${move}`);
    
    // Check if both players have moved
    if (game.player1.move && game.player2.move) {
      // Calculate winner
      const winner = calculateWinner(game.player1.move, game.player2.move);
      
      let winnerId = null;
      let winnerUsername = null;
      let loserId = null;
      let loserUsername = null;
      
      if (winner === 1) {
        winnerId = game.player1.socketId;
        winnerUsername = game.player1.username;
        loserId = game.player2.socketId;
        loserUsername = game.player2.username;
      } else if (winner === 2) {
        winnerId = game.player2.socketId;
        winnerUsername = game.player2.username;
        loserId = game.player1.socketId;
        loserUsername = game.player1.username;
      }
      
      // Prepare result data
      const resultData = {
        roomId,
        moves: {
          player1: {
            username: game.player1.username,
            move: game.player1.move
          },
          player2: {
            username: game.player2.username,
            move: game.player2.move
          }
        },
        winnerId,
        winnerUsername,
        isTie: winner === null
      };
      
      // Emit result to both players
      io.to(roomId).emit('game_result', resultData);
      
      console.log(`🏆 Game ${roomId} finished: ${winner === null ? 'TIE' : `${winnerUsername} wins`}`);
      
      // Update database stats (optional)
      if (winnerId && !resultData.isTie) {
        try {
          // Winner gets +50 credits
          // Note: This assumes username matches email prefix - you may need to adjust based on your data structure
          const [winnerAvatars] = await db.query(`
            SELECT a.id 
            FROM avatars a 
            INNER JOIN users u ON a.user_id = u.id 
            WHERE u.email LIKE ? OR SUBSTRING_INDEX(u.email, '@', 1) = ?
            LIMIT 1
          `, [`${winnerUsername}@%`, winnerUsername]);
          
          if (winnerAvatars.length > 0) {
            const winnerAvatarId = winnerAvatars[0].id;
            await db.query(`
              UPDATE avatar_stats 
              SET value = CAST(value AS UNSIGNED) + 50 
              WHERE avatar_id = ? AND key_name = 'credits'
            `, [winnerAvatarId]);
          }
          
          // Loser loses -20 credits (minimum 0)
          const [loserAvatars] = await db.query(`
            SELECT a.id 
            FROM avatars a 
            INNER JOIN users u ON a.user_id = u.id 
            WHERE u.email LIKE ? OR SUBSTRING_INDEX(u.email, '@', 1) = ?
            LIMIT 1
          `, [`${loserUsername}@%`, loserUsername]);
          
          if (loserAvatars.length > 0) {
            const loserAvatarId = loserAvatars[0].id;
            await db.query(`
              UPDATE avatar_stats 
              SET value = GREATEST(CAST(value AS UNSIGNED) - 20, 0) 
              WHERE avatar_id = ? AND key_name = 'credits'
            `, [loserAvatarId]);
          }
          
          console.log(`💰 Credits updated: ${winnerUsername} +50, ${loserUsername} -20`);
        } catch (error) {
          console.error('❌ Error updating credits:', error);
          // Don't fail the game if DB update fails
        }
      }
      
      // Clean up: Remove game and leave room
      delete activeGames[roomId];
      io.socketsLeave(roomId);
    } else {
      // Notify that move was received, waiting for opponent
      socket.emit('move_received', { roomId, waitingForOpponent: true });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Clear waiting player if this socket was waiting
    if (waitingPlayer === socket.id) {
      waitingPlayer = null;
      console.log('⏳ Waiting player disconnected');
    }
    
    // Check if user was in an active game
    for (const [roomId, game] of Object.entries(activeGames)) {
      if (game.player1.socketId === socket.id || game.player2.socketId === socket.id) {
        // Notify opponent
        const opponentSocketId = game.player1.socketId === socket.id 
          ? game.player2.socketId 
          : game.player1.socketId;
        
        const opponentSocket = io.sockets.sockets.get(opponentSocketId);
        if (opponentSocket) {
          opponentSocket.emit('opponent_left', { roomId });
        }
        
        // Clean up game
        delete activeGames[roomId];
        io.socketsLeave(roomId);
        
        console.log(`⚠️  Player left game ${roomId}, game cancelled`);
        break;
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.io initialized and listening`);
});
