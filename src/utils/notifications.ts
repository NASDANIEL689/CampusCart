import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Notification } from '../types';

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'message' | 'order' | 'system',
  link?: string
) => {
  try {
    const notification: Omit<Notification, 'id'> = {
      userId,
      title,
      message,
      type,
      link,
      read: false,
      createdAt: Timestamp.now(),
    };
    await addDoc(collection(db, 'notifications'), notification);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
