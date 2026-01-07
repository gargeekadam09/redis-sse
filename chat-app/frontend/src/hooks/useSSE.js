import { useEffect, useRef } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const useSSE = (url, onMessage) => {
  const eventSourceRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create EventSource with authorization
    const fullUrl = `${API_BASE_URL}${url}?token=${token}`;
    const eventSource = new EventSource(fullUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'ping') {
          onMessage(data);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          // The useEffect will create a new connection
        }
      }, 3000);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [url, onMessage]);

  return eventSourceRef.current;
};