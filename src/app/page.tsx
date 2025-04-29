'use client';

import type { FormEvent } from 'react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SendHorizonal, Zap, MessageSquare, CircleDotDashed } from 'lucide-react';
import { format } from 'date-fns';

interface ReceivedEvent {
  name: string;
  args: any[];
  timestamp: Date;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventData, setEventData] = useState('');
  const [receivedEvents, setReceivedEvents] = useState<ReceivedEvent[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const connectSocket = useCallback(() => {
    // Ensure we don't create multiple connections
    if (socket?.connected) return;

    // Connect to the Socket.IO server running on the same host/port
    const newSocket = io();

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setSocket(null); // Clear the socket state on disconnect
    });

    newSocket.on('eventEcho', (data: { name: string; args: any[] }) => {
      setReceivedEvents((prevEvents) => [
        ...prevEvents,
        { ...data, timestamp: new Date() },
      ]);
    });

    // Handle connection errors
    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setIsConnected(false);
      // Optionally, attempt to reconnect or notify the user
    });

     // Clean up the socket connection when the component unmounts or before reconnecting
     return () => {
        if (newSocket) {
            console.log('Cleaning up socket connection');
            newSocket.disconnect();
        }
     };

  }, [socket]); // Depend on socket state to avoid re-running if already connected

  useEffect(() => {
    const cleanup = connectSocket();
    return cleanup; // Return the cleanup function
  }, [connectSocket]); // Run effect when connectSocket changes (it won't often, but good practice)


  useEffect(() => {
    // Auto-scroll to bottom when new events arrive
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if(scrollElement){
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [receivedEvents]);

  const sendEvent = (e: FormEvent) => {
    e.preventDefault();
    if (socket && eventName) {
      try {
        // Attempt to parse the data as JSON, otherwise send as string
        let parsedData;
        try {
          parsedData = JSON.parse(eventData);
        } catch (error) {
          parsedData = eventData; // Send as string if not valid JSON
        }
        socket.emit(eventName, parsedData);
        setEventName('');
        setEventData('');
      } catch (error) {
        console.error('Error sending event:', error);
        // Handle error (e.g., show a toast notification)
      }
    }
  };

  const getEventIcon = (name: string) => {
    if (name.toLowerCase().includes('message')) return <MessageSquare className="mr-2 h-4 w-4 text-accent" />;
    if (name.toLowerCase().includes('action') || name.toLowerCase().includes('click')) return <Zap className="mr-2 h-4 w-4 text-accent" />;
    return <CircleDotDashed className="mr-2 h-4 w-4 text-muted-foreground" />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-secondary">
      <Card className="w-full max-w-2xl bg-card text-card-foreground shadow-lg border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Echo Chamber</CardTitle>
          <div className="flex justify-center items-center mt-2">
            <Badge variant={isConnected ? 'default' : 'destructive'} className={isConnected ? 'bg-accent text-accent-foreground' : ''}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
           {!isConnected && (
             <Button onClick={connectSocket} size="sm" variant="outline" className="ml-2">Reconnect</Button>
           )}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={sendEvent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="text"
                placeholder="Event Name"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
                className="bg-background border-input placeholder:text-muted-foreground"
                aria-label="Event Name"
              />
              <Input
                type="text"
                placeholder="Event Data (string or JSON)"
                value={eventData}
                onChange={(e) => setEventData(e.target.value)}
                className="bg-background border-input placeholder:text-muted-foreground"
                aria-label="Event Data"
              />
            </div>
            <Button type="submit" disabled={!isConnected || !eventName} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <SendHorizonal className="mr-2 h-4 w-4" /> Send Event
            </Button>
          </form>

          <Separator className="my-6 bg-border" />

          <h3 className="text-xl font-semibold mb-4 text-foreground">Received Events</h3>
          <ScrollArea ref={scrollAreaRef} className="h-72 w-full rounded-md border border-input p-4 bg-background">
            {receivedEvents.length === 0 ? (
              <p className="text-muted-foreground text-center">No events received yet. Send an event to see it echoed here!</p>
            ) : (
              <div className="space-y-3">
                {receivedEvents.map((event, index) => (
                  <div key={index} className="p-3 rounded-md bg-card border border-border shadow-sm animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-1">
                       <div className="flex items-center">
                         {getEventIcon(event.name)}
                         <span className="font-medium text-accent">{event.name}</span>
                       </div>
                       <span className="text-xs text-muted-foreground">
                         {format(event.timestamp, 'HH:mm:ss.SSS')}
                       </span>
                    </div>
                    <pre className="text-sm text-foreground whitespace-pre-wrap break-words bg-secondary p-2 rounded text-secondary-foreground">
                      {JSON.stringify(event.args, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="text-center text-muted-foreground text-xs pt-4">
          Events sent are echoed back by the server.
        </CardFooter>
      </Card>
    </div>
  );
}
