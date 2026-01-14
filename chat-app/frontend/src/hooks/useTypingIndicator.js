import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export const useTypingIndicator = (selectedUserId) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    if (!selectedUserId) return;
    
    // Send typing indicator if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setIsTyping(true);
      
      axios.post('/api/chat/typing', {
        receiverId: selectedUserId,
        isTyping: true
      }).catch(err => console.error('Typing indicator error:', err));
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setIsTyping(false);
      
      axios.post('/api/chat/typing', {
        receiverId: selectedUserId,
        isTyping: false
      }).catch(err => console.error('Typing indicator error:', err));
    }, 2000);
  }, [selectedUserId]);

  // Cleanup on unmount or user change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && selectedUserId) {
        axios.post('/api/chat/typing', {
          receiverId: selectedUserId,
          isTyping: false
        }).catch(err => console.error('Typing indicator error:', err));
      }
    };
  }, [selectedUserId]);

  return {
    isTyping,
    startTyping
  };
};