// Sound Manager Utility
// Handles sound effects for the HayalPerest application

// Sound effect URLs
export const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Short mech click
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Positive chime
  error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Negative buzz
  mining: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Fast blip (reusing click)
  levelup: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' // Epic win
};

/**
 * Plays a sound effect
 * @param {string} type - The type of sound to play (key of SOUNDS object)
 * @returns {void}
 */
export const playSound = (type) => {
  try {
    // Check if the sound type exists
    if (!SOUNDS[type]) {
      console.warn(`Sound type "${type}" not found in SOUNDS object`);
      return;
    }

    // Create new Audio instance
    const audio = new Audio(SOUNDS[type]);
    
    // Set volume to 50%
    audio.volume = 0.5;
    
    // Play the sound
    audio.play().catch((error) => {
      // Handle autoplay policy errors silently
      // Browsers may block autoplay until user interaction
      console.debug('Sound playback prevented by browser:', error.message);
    });
  } catch (error) {
    // Catch any other errors (e.g., invalid URL, network issues)
    console.debug('Error playing sound:', error.message);
  }
};
