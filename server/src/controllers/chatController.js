import { db } from '../config/db.js';

export const chatWithAvatar = async (req, res) => {
  try {
    const { message, avatarName, avatarStats, userName: requestUserName } = req.body;
    
    // Get userId from authenticated request (set by authMiddleware)
    const userId = req.user?.id;
    const userEmail = req.user?.email;

    // Validate required fields
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Simulation Mode: Process message and generate response
    const lowerMessage = message.toLowerCase();
    let response = '';

    // Get user's name: prefer request body, then extract from email, fallback to 'Commander'
    const userName = requestUserName || (userEmail ? userEmail.split('@')[0] : 'Commander');

    // Check for keywords and return appropriate response
    if (lowerMessage.includes('hello') || lowerMessage.includes('selam')) {
      response = 'Greetings, Commander. Systems online.';
    } 
    // Time query
    else if (lowerMessage.includes('time') || lowerMessage.includes('saat')) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      });
      response = `Current server time: ${timeString}. Temporal sync active.`;
    }
    // Status/Energy query - check avatarStats
    else if (lowerMessage.includes('status') || lowerMessage.includes('durum') || lowerMessage.includes('energy')) {
      // Extract energy value from avatarStats
      let energyValue = 'Unknown';
      
      if (avatarStats && typeof avatarStats === 'object') {
        // Handle different possible structures
        if (avatarStats.energy) {
          energyValue = avatarStats.energy?.value || avatarStats.energy || 'Unknown';
        } else if (Array.isArray(avatarStats)) {
          // If avatarStats is an array, find energy entry
          const energyStat = avatarStats.find(stat => 
            stat?.key_name === 'energy' || stat?.key === 'energy'
          );
          if (energyStat) {
            energyValue = energyStat.value || energyStat?.value || 'Unknown';
          }
        }
      }
      
      response = `Energy levels at ${energyValue}%. Systems operational.`;
    }
    // Creator query
    else if (lowerMessage.includes('who is your creator') || lowerMessage.includes('kim yaptı') || lowerMessage.includes('who created you')) {
      response = `Built by the Architect, Commander ${userName}. Powered by HayalPerest Core.`;
    }
    // System check
    else if (lowerMessage.includes('system check') || lowerMessage.includes('system status')) {
      response = 'All systems nominal. Ready for the Metaverse.';
    }
    // Who are you
    else if (lowerMessage.includes('who are you')) {
      response = 'I am your Digital Twin, operating in HayalPerest v1.0.';
    } 
    // Default response
    else {
      response = 'Processing input... Data archived to core memory.';
    }

    // Simulate processing delay with randomization (800ms to 1500ms for realism)
    const delay = Math.floor(Math.random() * 700) + 800; // Random between 800-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Return the response
    return res.status(200).json({
      success: true,
      response: response
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Handle errors
    return res.status(500).json({
      success: false,
      message: 'Internal server error during chat',
      error: error.message
    });
  }
};

// Get chat history from database
export const getChatHistory = async (req, res) => {
  try {
    // Select top 50 messages ordered by created_at ASC (oldest first)
    const [messages] = await db.query(`
      SELECT 
        id,
        username,
        message,
        created_at
      FROM global_messages
      ORDER BY created_at ASC
      LIMIT 50
    `);

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      username: msg.username,
      message: msg.message,
      time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : null
    }));

    return res.status(200).json({
      success: true,
      messages: formattedMessages
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chat history',
      error: error.message
    });
  }
};
