import { NativeModule, requireNativeModule } from 'expo-modules-core';

export interface QueueItem {
  id: string;
  text: string;
  timestamp: number;
  status: 'cooling' | 'held' | 'draft' | 'ready';
  sendAt?: number;
}

interface QueueBridgeModule extends NativeModule {
  getQueueItems(): Promise<QueueItem[]>;
  removeQueueItem(id: string): Promise<void>;
  updateQueueItemStatus(id: string, status: string): Promise<void>;
}

export default requireNativeModule<QueueBridgeModule>('QueueBridge');
