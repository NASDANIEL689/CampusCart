import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'vendor' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  schoolId?: string;
  grade?: string;
  rating?: number;
  ratingCount?: number;
  preferences?: UserPreferences;
  createdAt: Timestamp;
}

export interface UserPreferences {
  notifications: {
    messages: boolean;
    orders: boolean;
    promotions: boolean;
  };
  theme: 'light' | 'dark' | 'system';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'message' | 'order' | 'system';
  link?: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface Vendor {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  logo: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  operatingHours: string;
  phone?: string;
  email?: string;
  rating?: number;
  ratingCount?: number;
  isOpen: boolean;
  status: 'pending' | 'approved' | 'suspended';
  createdAt: Timestamp;
}

export interface MenuItem {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  photo: string;
  isAvailable: boolean;
  category: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerName?: string;
  vendorId?: string;
  sellerId?: string;
  listingId?: string;
  vendorLocation?: string;
  vendorCoordinates?: { lat: number; lng: number };
  type: 'food' | 'marketplace';
  items: { name: string; price: number; quantity: number }[];
  totalPrice: number;
  pickupTime?: string;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  rated?: boolean;
  createdAt: Timestamp;
}

export interface Listing {
  id: string;
  sellerId: string;
  sellerName?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'used';
  photos: string[];
  status: 'available' | 'sold';
  location?: string;
  coordinates?: { lat: number; lng: number };
  createdAt: Timestamp;
}

export interface Chat {
  id: string;
  participants: string[];
  participantNames?: string[];
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  listingId?: string;
  listingTitle?: string;
  agreed?: boolean;
  agreedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  unreadCount?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
