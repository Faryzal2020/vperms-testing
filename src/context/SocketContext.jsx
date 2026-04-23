import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { BACKEND_URL } from '../config';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const socketRef = useRef(null);
    const subscribersRef = useRef(new Set());

    useEffect(() => {
        const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + '/api/v1/live';
        
        function connect() {
            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = () => {
                console.log('[WebSocket] Connected');
                setConnected(true);
                
                // Resubscribe if we have active subscribers
                if (subscribersRef.current.size > 0) {
                    ws.send(JSON.stringify({
                        type: 'subscribe',
                        identifiers: Array.from(subscribersRef.current)
                    }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setMessages(prev => {
                        // Keep only last 100 messages to avoid memory issues
                        const newMessages = [...prev, data];
                        if (newMessages.length > 100) return newMessages.slice(-100);
                        return newMessages;
                    });
                } catch (e) {
                    console.warn('[WebSocket] Error parsing message', e);
                }
            };

            ws.onclose = () => {
                console.log('[WebSocket] Disconnected. Reconnecting in 3s...');
                setConnected(false);
                setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('[WebSocket] Error:', err);
                ws.close();
            };
        }

        connect();

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    const subscribe = (id) => {
        if (!id) return;
        const idStr = id.toString();
        subscribersRef.current.add(idStr);
        
        if (connected && socketRef.current) {
            socketRef.current.send(JSON.stringify({
                type: 'subscribe',
                identifiers: [idStr]
            }));
        }
    };

    const unsubscribe = (id) => {
        if (!id) return;
        const idStr = id.toString();
        subscribersRef.current.delete(idStr);
        
        if (connected && socketRef.current) {
            socketRef.current.send(JSON.stringify({
                type: 'unsubscribe',
                identifiers: [idStr]
            }));
        }
    };

    const lastMessageFor = (id) => {
        if (!id) return null;
        const idStr = id.toString();
        return [...messages].reverse().find(msg => 
            msg.type === 'telemetry_update' && 
            (msg.imei?.toString() === idStr || msg.deviceId?.toString() === idStr || msg.vehicleId?.toString() === idStr)
        );
    };

    return (
        <SocketContext.Provider value={{ connected, subscribe, unsubscribe, lastMessage: messages[messages.length - 1], lastMessageFor }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}
