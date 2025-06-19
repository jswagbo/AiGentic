'use client';

import { useEffect, useState, useRef } from 'react';

interface UseWebSocketOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: string | null;
  connectionError: string | null;
  sendMessage: (message: string) => void;
}

export function useWebSocket(
  url: string, 
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  const connect = () => {
    try {
      // Use Server-Sent Events instead of WebSocket for Next.js compatibility
      const sseUrl = url.startsWith('/') 
        ? `${window.location.protocol}//${window.location.host}${url}`
        : url;
      
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected:', sseUrl);
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        setLastMessage(event.data);
      };

      eventSource.onerror = (error) => {
        console.log('SSE disconnected or error occurred');
        setIsConnected(false);
        eventSourceRef.current = null;

        // Attempt to reconnect if not intentionally closed
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setConnectionError(`Connection lost. Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          eventSource.close();
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setConnectionError('Connection failed. Max reconnection attempts reached.');
          eventSource.close();
        }
      };

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setConnectionError('Failed to establish SSE connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  };

  const sendMessage = (message: string) => {
    // SSE is one-way (server to client), so we can't send messages
    // In a real implementation, you'd use a separate HTTP endpoint for sending commands
    console.warn('SSE is one-way communication. Use HTTP endpoints to send commands to server.');
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [url]);

  return {
    isConnected,
    lastMessage,
    connectionError,
    sendMessage
  };
} 