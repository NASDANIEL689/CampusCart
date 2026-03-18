import React, { useState, useEffect, useRef } from 'react';
import { query, collection, orderBy, onSnapshot, addDoc, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Chat, Message, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { cn } from '../utils/cn';
import { Modal } from './Modal';

export const ChatModal = ({ isOpen, onClose, chat }: { isOpen: boolean, onClose: () => void, chat: Chat | null }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chat) return;
    const q = query(collection(db, `chats/${chat.id}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });
    return unsubscribe;
  }, [chat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chat || !user || !newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    try {
      await addDoc(collection(db, `chats/${chat.id}/messages`), {
        chatId: chat.id,
        senderId: user.uid,
        text,
        createdAt: Timestamp.now()
      });
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: text,
        lastMessageAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chat.id}/messages`);
    }
  };

  if (!chat) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={chat.listingTitle || "Chat"}>
      <div className="flex flex-col h-[500px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-2">
          {messages.map(m => (
            <div key={m.id} className={cn(
              "max-w-[80%] p-3 rounded-2xl text-sm",
              m.senderId === user?.uid ? "bg-emerald-600 text-white ml-auto rounded-tr-none" : "bg-gray-100 text-gray-900 mr-auto rounded-tl-none"
            )}>
              {m.text}
              <p className={cn("text-[10px] mt-1 opacity-70", m.senderId === user?.uid ? "text-right" : "text-left")}>
                {m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="flex-1 p-3 rounded-xl border border-gray-200 outline-none focus:border-emerald-500"
            placeholder="Type a message..."
          />
          <button type="submit" className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700">
            <MessageSquare size={20} />
          </button>
        </form>
      </div>
    </Modal>
  );
};
