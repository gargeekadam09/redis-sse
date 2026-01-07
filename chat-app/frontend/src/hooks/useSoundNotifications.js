import { useRef, useCallback } from 'react';

export const useSoundNotifications = () => {
  const audioRef = useRef(null);

  // Create audio context for different sounds
  const createAudioContext = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioRef.current;
  }, []);

  // Generate notification sound using Web Audio API
  const playNotificationSound = useCallback((type = 'message') => {
    try {
      const audioContext = createAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different sounds for different notifications
      switch (type) {
        case 'message':
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
          break;
        case 'user-online':
          oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
          break;
        case 'user-offline':
          oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
          break;
        default:
          oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
      }

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [createAudioContext]);

  return {
    playNotificationSound
  };
};