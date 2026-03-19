import React, { useState, useEffect, useRef } from 'react';
import { query, collection, orderBy, onSnapshot, addDoc, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { MessageSquare, MapPin, CheckCircle, Handshake } from 'lucide-react';
import Markdown from 'react-markdown';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Chat, Message, OperationType, Listing } from '../types';
import { handleFirestoreError } from '../utils/error';
import { cn } from '../utils/cn';
import { Modal } from './Modal';
import { createNotification } from '../utils/notifications';

export const ChatModal = ({ isOpen, onClose, chat }: { isOpen: boolean, onClose: () => void, chat: Chat | null }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [listing, setListing] = useState<Listing | null>(null);
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
    if (!chat?.listingId) return;
    const fetchListing = async () => {
      const docRef = doc(db, 'listings', chat.listingId!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setListing({ id: docSnap.id, ...docSnap.data() } as Listing);
      }
    };
    fetchListing();
  }, [chat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    if (!chat || !user) return;
    const text = customText || newMessage.trim();
    if (!text) return;
    if (!customText) setNewMessage('');
    
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

      // Send notification to the other participant
      const recipientId = chat.participants.find(id => id !== user.uid);
      if (recipientId) {
        await createNotification(
          recipientId,
          `New message from ${user.displayName}`,
          text.length > 50 ? text.substring(0, 50) + '...' : text,
          'message',
          '#' // In a real app, this would be a link to the chat
        );
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chat.id}/messages`);
    }
  };

  const handleAgree = async () => {
    if (!chat || !user) return;
    const isSeller = listing?.sellerId === user.uid;
    const agreementText = isSeller 
      ? "🤝 Seller has agreed to the deal! Location sharing is now enabled."
      : "🤝 Buyer has agreed to the deal! Waiting for seller confirmation.";
    
    await handleSend(undefined, agreementText);
    
    if (isSeller) {
      await updateDoc(doc(db, 'chats', chat.id), {
        agreed: true,
        agreedAt: Timestamp.now()
      });
    }
  };

  const shareLocation = async () => {
    if (!listing?.location) return;
    let locationText = `📍 Meeting Point: ${listing.location}`;
    if (listing.coordinates) {
      const { lat, lng } = listing.coordinates;
      locationText += `\n🗺️ View on Map: https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    await handleSend(undefined, locationText);
  };

  if (!chat) return null;

  const isSeller = listing?.sellerId === user?.uid;
  const hasAgreed = chat.agreed;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={chat.listingTitle || "Chat"}>
      <div className="flex flex-col h-[600px]">
        {listing && (
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={listing.photos?.[0]} className="w-12 h-12 rounded-xl object-cover" alt="" />
              <div>
                <p className="text-sm font-bold text-slate-900">{listing.title}</p>
                <p className="text-xs text-brand-600 font-black">BWP {listing.price}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!hasAgreed && isSeller && (
                <button 
                  onClick={handleAgree}
                  className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-600 transition-all"
                >
                  <Handshake size={14} />
                  Agree on Deal
                </button>
              )}
              {hasAgreed && (
                <button 
                  onClick={shareLocation}
                  className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all"
                >
                  <MapPin size={14} />
                  Share Location
                </button>
              )}
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map(m => {
            const isSystem = m.text.startsWith('🤝') || m.text.startsWith('📍');
            return (
              <div key={m.id} className={cn(
                "max-w-[85%] p-4 rounded-2xl text-sm shadow-sm",
                isSystem ? "bg-brand-50 text-brand-900 mx-auto text-center border border-brand-100" :
                m.senderId === user?.uid ? "bg-slate-900 text-white ml-auto rounded-tr-none" : "bg-white text-slate-900 mr-auto rounded-tl-none border border-slate-100"
              )}>
                <div className="flex items-start gap-2">
                  {m.text.startsWith('📍') && <MapPin size={16} className="text-brand-600 mt-1 shrink-0" />}
                  {m.text.startsWith('🤝') && <CheckCircle size={16} className="text-brand-600 mt-1 shrink-0" />}
                  <div className={cn("markdown-body", isSystem ? "font-bold" : "")}>
                    <Markdown>{m.text}</Markdown>
                  </div>
                </div>
                <p className={cn("text-[10px] mt-2 opacity-50 font-bold uppercase tracking-widest", m.senderId === user?.uid ? "text-right" : "text-left")}>
                  {m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <input 
            type="text" 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="flex-1 p-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
            placeholder="Type a message..."
          />
          <button type="submit" className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-brand-600 transition-all shadow-lg shadow-slate-900/10">
            <MessageSquare size={20} />
          </button>
        </form>
      </div>
    </Modal>
  );
};
