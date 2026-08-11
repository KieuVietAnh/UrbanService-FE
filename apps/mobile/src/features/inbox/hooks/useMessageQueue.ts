import { useRef, useEffect } from 'react';

/**
 * Simple in-memory message queue with optional persistence hook points.
 * This queue stores outgoing messages when offline and exposes flush logic.
 */

type QueuedItem = { id: string; conversationId: string; payload: any };

const QUEUE_KEY = '__inbox_outgoing_queue__';

const globalQueue: QueuedItem[] = (globalThis as any)[QUEUE_KEY] || [];
(globalThis as any)[QUEUE_KEY] = globalQueue;

export const useMessageQueue = () => {
  const flushRef = useRef<() => Promise<void> | null>(null);

  const enqueue = (item: QueuedItem) => {
    globalQueue.push(item);
  };

  const dequeueAll = () => {
    const items = globalQueue.splice(0, globalQueue.length);
    return items;
  };

  const setFlushHandler = (fn: () => Promise<void>) => {
    flushRef.current = fn;
  };

  useEffect(() => {
    // attempt flush on mount if handler exists
    const tryFlush = async () => {
      if (!flushRef.current) return;
      if (globalQueue.length === 0) return;
      try {
        await flushRef.current();
      } catch (e) {
        // keep queue
      }
    };
    tryFlush();
  }, []);

  return { enqueue, dequeueAll, setFlushHandler, peek: () => [...globalQueue] };
};

export default useMessageQueue;
