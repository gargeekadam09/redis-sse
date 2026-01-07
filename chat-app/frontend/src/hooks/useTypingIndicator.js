import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const useTypingIndicator = (selectedUserId) => {
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useState(null);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping) => {
    if (!selectedUserId) return;
    
    try {
      await axios.post('/api/chat/typing', {
        receiverId: selectedUserId,
        isTyping
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }, [selectedUserId]);

  // Handle typing start
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 2000);
  }, [isTyping, sendTypingIndicator]);

  // Handle typing stop
  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(false);
    }, 1000);
  }, [sendTypingIndicator]);

  // Add typing user
  const addTypingUser = useCallback((userId) => {
    setTypingUsers(prev => new Set([...prev, userId]));
    
    // Remove after 3 seconds
    setTimeout(() => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }, 3000);
  }, []);

  // Remove typing user
  const removeTypingUser = useCallback((userId) => {
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  }, []);

  return {
    typingUsers,
    isTyping,
    handleTypingStart,
    handleTypingStop,
    addTypingUser,
    removeTypingUser
  };
};