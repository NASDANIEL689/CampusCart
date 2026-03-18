import React, { useState, useEffect } from 'react';
import { User as UserIcon, Package, ShoppingBag, MessageSquare, LogOut, Trash2, CheckCircle, Clock, Store, Star, X, Briefcase } from 'lucide-react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, Timestamp, addDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Listing, Order, Chat, OperationType, Vendor } from '../types';
import { handleFirestoreError } from '../utils/error';
import { cn } from '../utils/cn';
import { OrderStatusTracker } from '../components/OrderStatusTracker';
import { Modal } from '../components/Modal';
import { VendorDashboard } from '../components/VendorDashboard';

export const Profile = ({ onChatClick }: { onChatClick: (chat: Chat) => void }) => {
  const { user, profile, logout } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'listings' | 'orders' | 'sales' | 'chats' | 'business'>('listings');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [mySales, setMySales] = useState<Order[]>([]);
  const [myChats, setMyChats] = useState<Chat[]>([]);
  const [myVendor, setMyVendor] = useState<Vendor | null>(null);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [isRatingLoading, setIsRatingLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'vendors'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setMyVendor({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vendor);
      } else {
        setMyVendor(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'listings'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'listings');
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMySales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });
    return unsubscribe;
  }, [user]);

  const deleteListing = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'listings', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'listings');
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const reorder = async (order: Order) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'orders'), {
        ...order,
        id: undefined,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      alert("Order placed again! Check your active orders.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const submitRating = async () => {
    if (!ratingOrder || !user) return;
    setIsRatingLoading(true);
    try {
      const vendorId = ratingOrder.vendorId;
      if (!vendorId) throw new Error("No vendor ID associated with this order");

      await runTransaction(db, async (transaction) => {
        const vendorRef = doc(db, 'vendors', vendorId);
        const vendorDoc = await transaction.get(vendorRef);
        
        if (!vendorDoc.exists()) throw new Error("Vendor does not exist");
        
        const vendorData = vendorDoc.data() as Vendor;
        const currentRating = vendorData.rating || 0;
        const currentCount = vendorData.ratingCount || 0;
        
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + ratingValue) / newCount;
        
        transaction.update(vendorRef, {
          rating: newRating,
          ratingCount: newCount
        });
        
        transaction.update(doc(db, 'orders', ratingOrder.id), {
          rated: true
        });
      });
      
      setRatingOrder(null);
      alert("Thank you for your rating!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'vendors');
    } finally {
      setIsRatingLoading(false);
    }
  };

  if (!user || !profile) return null;

  return (
    <div className="py-8 space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <img src={profile.photoURL} alt="" className="w-32 h-32 rounded-full border-4 border-emerald-50" referrerPolicy="no-referrer" />
        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{profile.displayName}</h1>
          <p className="text-gray-500">{profile.email}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
              {profile.role}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider">
              Student ID: {user.uid.slice(0, 8)}
            </span>
          </div>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold px-6 py-3 rounded-2xl hover:bg-red-50 transition-all">
          <LogOut size={20} /> Logout
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        {[
          { id: 'listings', label: 'My Listings', icon: Package },
          { id: 'orders', label: 'My Orders', icon: ShoppingBag },
          { id: 'sales', label: 'My Sales', icon: Store },
          { id: 'chats', label: 'My Chats', icon: MessageSquare },
          { id: 'business', label: 'My Business', icon: Briefcase },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
              activeSubTab === tab.id ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6">
        {activeSubTab === 'listings' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map(listing => (
              <div key={listing.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <img src={listing.photos[0]} alt="" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-2">{listing.title}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-600 font-bold">BWP {listing.price}</span>
                    <button onClick={() => deleteListing(listing.id)} className="p-2 text-red-400 hover:text-red-600">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {myListings.length === 0 && <p className="col-span-full text-center py-20 text-gray-500">No listings yet.</p>}
          </div>
        )}

        {activeSubTab === 'orders' && (
          <div className="space-y-6">
            {myOrders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                      <ShoppingBag size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">Order #{order.id.slice(-4)}</h3>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          {order.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-medium">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(order.createdAt as any)?.toDate().toLocaleDateString()} at {(order.createdAt as any)?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-600">BWP {order.totalPrice.toFixed(2)}</p>
                    <div className="flex flex-col items-end gap-2 mt-2">
                      {order.status === 'completed' && !order.rated && order.type === 'food' && (
                        <button 
                          onClick={() => setRatingOrder(order)}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                        >
                          Rate Vendor
                        </button>
                      )}
                      {order.status === 'completed' && (
                        <button 
                          onClick={() => reorder(order)}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                        >
                          Re-order
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-50">
                  <OrderStatusTracker status={order.status} />
                </div>
              </div>
            ))}
            {myOrders.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <ShoppingBag size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">No orders yet</h3>
                <p className="text-gray-500">Your food orders and marketplace purchases will appear here.</p>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'sales' && (
          <div className="space-y-4">
            {mySales.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Store size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">Sale #{order.id.slice(-4)}</h3>
                      <p className="text-sm text-gray-500">Buyer: {order.buyerName}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                    order.status === 'ready' ? 'bg-blue-100 text-blue-600' :
                    order.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Mark Completed
                    </button>
                  )}
                </div>
              </div>
            ))}
            {mySales.length === 0 && <p className="text-center py-20 text-gray-500">No sales yet.</p>}
          </div>
        )}

        {activeSubTab === 'chats' && (
          <div className="grid gap-4">
            {myChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => onChatClick(chat)}
                className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <MessageSquare size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">Chat about {chat.listingTitle}</h3>
                    <p className="text-sm text-gray-500">Last message: {chat.lastMessage}</p>
                  </div>
                </div>
                <Clock size={18} className="text-gray-300" />
              </button>
            ))}
            {myChats.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <MessageSquare size={40} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">No chats yet</h3>
                <p className="text-gray-500">Your conversations with buyers and sellers will appear here.</p>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'business' && <VendorDashboard />}
      </div>

      <Modal isOpen={!!ratingOrder} onClose={() => setRatingOrder(null)} title="Rate your experience">
        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-gray-500 mb-4">How was your order from {ratingOrder?.items[0]?.name}?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={cn(
                      "transition-colors",
                      star <= ratingValue ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={submitRating}
            disabled={isRatingLoading}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isRatingLoading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
