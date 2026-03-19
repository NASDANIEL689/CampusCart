import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Package, 
  ShoppingBag, 
  MessageSquare, 
  LogOut, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Store, 
  Star, 
  X, 
  Briefcase,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Settings,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, Timestamp, addDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Listing, Order, Chat, OperationType, Vendor, UserProfile } from '../types';
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
      const isFood = ratingOrder.type === 'food';
      const targetId = isFood ? ratingOrder.vendorId : ratingOrder.sellerId;
      const targetCollection = isFood ? 'vendors' : 'users';
      
      if (!targetId) throw new Error(`No ${isFood ? 'vendor' : 'seller'} ID associated with this order`);

      await runTransaction(db, async (transaction) => {
        const targetRef = doc(db, targetCollection, targetId);
        const targetDoc = await transaction.get(targetRef);
        
        if (!targetDoc.exists()) throw new Error(`${isFood ? 'Vendor' : 'Seller'} does not exist`);
        
        const targetData = targetDoc.data() as (Vendor | UserProfile);
        const currentRating = targetData.rating || 0;
        const currentCount = targetData.ratingCount || 0;
        
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + ratingValue) / newCount;
        
        transaction.update(targetRef, {
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
      handleFirestoreError(error, OperationType.UPDATE, ratingOrder.type === 'food' ? 'vendors' : 'users');
    } finally {
      setIsRatingLoading(false);
    }
  };

  if (!user || !profile) return null;

  const tabs = [
    { id: 'listings', label: 'My Listings', icon: Package, color: 'brand' },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag, color: 'blue' },
    { id: 'sales', label: 'My Sales', icon: Store, color: 'purple' },
    { id: 'chats', label: 'My Chats', icon: MessageSquare, color: 'orange' },
    { id: 'business', label: 'My Business', icon: Briefcase, color: 'emerald' },
  ];

  return (
    <div className="py-12 space-y-16 max-w-7xl mx-auto px-4">
      {/* Profile Header Section */}
      <section className="relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-purple-500/5 rounded-[3.5rem] -rotate-1 group-hover:rotate-0 transition-transform duration-700" />
        <div className="glass p-12 rounded-[3.5rem] flex flex-col lg:flex-row items-center lg:items-end gap-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl animate-pulse" />
          
          <div className="relative group/avatar">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative z-10"
            >
              <img 
                src={profile.photoURL} 
                alt="" 
                className="w-48 h-48 rounded-[3rem] object-cover border-8 border-white shadow-2xl ring-1 ring-slate-200" 
                referrerPolicy="no-referrer" 
              />
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-3 -right-3 bg-brand-600 text-white p-3.5 rounded-2xl shadow-2xl ring-4 ring-white"
              >
                <ShieldCheck size={24} />
              </motion.div>
            </motion.div>
            <div className="absolute inset-0 bg-brand-600/20 rounded-[3rem] blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500 -z-10" />
          </div>

          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="space-y-2">
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-4">
                <span className="px-4 py-1 bg-brand-100 text-brand-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                  {profile.role}
                </span>
                <span className="px-4 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                  Verified Member
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-display font-black text-slate-900 tracking-tight leading-none">
                {profile.displayName}
              </h1>
              <p className="text-xl text-slate-500 font-medium flex items-center justify-center lg:justify-start gap-2">
                <span className="opacity-50">@</span>{profile.email.split('@')[0]}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-8 pt-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Since</p>
                <p className="text-slate-900 font-bold">March 2024</p>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden sm:block" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                <p className="text-slate-900 font-bold">Main Campus</p>
              </div>
              <div className="w-px h-10 bg-slate-200 hidden sm:block" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trust Score</p>
                <div className="flex items-center gap-1 text-brand-600 font-bold">
                  <Star size={16} fill="currentColor" />
                  <span>4.9/5.0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full lg:w-auto">
            <button 
              onClick={logout} 
              className="group flex items-center justify-center gap-3 bg-white text-red-500 font-black px-8 py-5 rounded-[2rem] border-2 border-red-50 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 shadow-sm"
            >
              <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" /> 
              <span>Sign Out</span>
            </button>
            <button className="group flex items-center justify-center gap-3 bg-slate-900 text-white font-black px-8 py-5 rounded-[2rem] hover:bg-slate-800 transition-all duration-300 shadow-xl shadow-slate-900/20">
              <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" /> 
              <span>Preferences</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Listings', value: myListings.length, icon: Package, color: 'brand' },
          { label: 'Total Orders', value: myOrders.length, icon: ShoppingBag, color: 'blue' },
          { label: 'Successful Sales', value: mySales.length, icon: Store, color: 'purple' },
          { label: 'Active Chats', value: myChats.length, icon: MessageSquare, color: 'orange' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-8 rounded-[2.5rem] group hover:bg-white transition-all duration-500"
          >
            <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 mb-6 group-hover:scale-110 transition-transform duration-500`}>
              <stat.icon size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-display font-black text-slate-900">{stat.value}</h3>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Main Navigation Tabs */}
      <div className="space-y-10">
        <div className="flex flex-wrap gap-2 p-2 bg-slate-200/50 backdrop-blur-md rounded-[2.5rem] w-full sm:w-fit mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-[1.8rem] text-sm font-black transition-all relative group overflow-hidden",
                activeSubTab === tab.id 
                  ? "bg-white text-slate-900 shadow-2xl shadow-slate-300/50" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <tab.icon size={18} className={cn(
                "transition-all duration-500",
                activeSubTab === tab.id ? "text-brand-600 scale-110" : "text-slate-400 group-hover:text-slate-600"
              )} />
              <span className="relative z-10">{tab.label}</span>
              {activeSubTab === tab.id && (
                <motion.div 
                  layoutId="active-profile-tab-bg"
                  className="absolute inset-0 bg-white -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="min-h-[500px]"
          >
            {activeSubTab === 'listings' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {myListings.map(listing => (
                  <motion.div 
                    key={listing.id} 
                    whileHover={{ y: -12 }}
                    className="group bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-3xl hover:shadow-brand-500/10 transition-all duration-700"
                  >
                    <div className="aspect-[4/5] relative overflow-hidden">
                      <img 
                        src={listing.photos[0]} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                        referrerPolicy="no-referrer" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl text-lg font-display font-black text-brand-700 shadow-xl">
                        BWP {listing.price}
                      </div>
                      <div className="absolute bottom-6 left-6 right-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        <button className="w-full bg-white text-slate-900 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">
                          Edit Listing
                        </button>
                      </div>
                    </div>
                    <div className="p-10 space-y-6">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">{listing.category}</span>
                        <h3 className="font-display font-black text-2xl text-slate-900 group-hover:text-brand-600 transition-colors leading-tight">
                          {listing.title}
                        </h3>
                      </div>
                      <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            listing.status === 'available' ? 'bg-brand-500' : 'bg-slate-300'
                          )} />
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{listing.status}</span>
                        </div>
                        <button 
                          onClick={() => deleteListing(listing.id)} 
                          className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-300"
                        >
                          <Trash2 size={22} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {myListings.length === 0 && (
                  <div className="col-span-full py-40 text-center space-y-8 glass rounded-[4rem]">
                    <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200">
                      <Package size={64} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-display font-black text-slate-900">No listings yet</h3>
                      <p className="text-slate-500 max-w-md mx-auto text-lg">Your marketplace items will appear here once you create them.</p>
                      <button className="btn-primary mt-6">Create First Listing</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'orders' && (
              <div className="grid gap-8">
                {myOrders.map(order => (
                  <motion.div 
                    key={order.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass p-10 rounded-[3.5rem] group hover:bg-white transition-all duration-500"
                  >
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                      <div className="flex gap-8 items-center">
                        <div className="w-24 h-24 bg-brand-50 rounded-[2rem] flex items-center justify-center text-brand-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                          <ShoppingBag size={40} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <h3 className="font-display font-black text-3xl text-slate-900">Order #{order.id.slice(-4)}</h3>
                            <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                              {order.type}
                            </span>
                          </div>
                          <p className="text-lg text-slate-500 font-medium">
                            {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-slate-400 font-bold">
                            <div className="flex items-center gap-2">
                              <Clock size={16} />
                              <span>{(order.createdAt as any)?.toDate().toLocaleDateString()}</span>
                            </div>
                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span>{(order.createdAt as any)?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row lg:flex-col items-end gap-6 w-full lg:w-auto">
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                          <p className="text-4xl font-display font-black text-brand-600">BWP {order.totalPrice.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                          {order.status === 'completed' && !order.rated && (
                            <button 
                              onClick={() => setRatingOrder(order)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-brand-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
                            >
                              <Star size={18} fill="currentColor" /> Rate
                            </button>
                          )}
                          {order.status === 'completed' && (
                            <button 
                              onClick={() => reorder(order)}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-3 bg-slate-100 text-slate-900 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                              <ArrowRight size={18} /> Re-order
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 pt-10 border-t border-slate-100">
                      <OrderStatusTracker status={order.status} />
                    </div>
                  </motion.div>
                ))}
                {myOrders.length === 0 && (
                  <div className="text-center py-40 glass rounded-[4rem] space-y-8">
                    <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200">
                      <ShoppingBag size={64} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-display font-black text-slate-900">No orders yet</h3>
                      <p className="text-slate-500 max-w-md mx-auto text-lg">Your purchase history will appear here once you start shopping.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'sales' && (
              <div className="grid gap-8">
                {mySales.map(order => (
                  <motion.div 
                    key={order.id} 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 space-y-10"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                      <div className="flex gap-8 items-center">
                        <div className="w-20 h-20 bg-blue-50 rounded-[1.8rem] flex items-center justify-center text-blue-600 shadow-inner">
                          <Store size={32} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-display font-black text-2xl text-slate-900">Sale #{order.id.slice(-4)}</h3>
                          <div className="flex items-center gap-2 text-slate-500 font-bold">
                            <UserIcon size={16} className="text-slate-300" />
                            <span>{order.buyerName}</span>
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm",
                        order.status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                        order.status === 'ready' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        order.status === 'completed' ? 'bg-brand-50 text-brand-600 border border-brand-100' :
                        'bg-slate-50 text-slate-600 border border-slate-100'
                      )}>
                        {order.status}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="flex-1 bg-blue-600 text-white py-5 rounded-[1.8rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-1 transition-all duration-300"
                        >
                          <CheckCircle size={20} /> Mark as Ready
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button 
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                          className="flex-1 bg-brand-600 text-white py-5 rounded-[1.8rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-brand-500/20 hover:bg-brand-700 hover:-translate-y-1 transition-all duration-300"
                        >
                          <CheckCircle size={20} /> Complete Order
                        </button>
                      )}
                      <button className="flex-1 bg-slate-50 text-slate-600 py-5 rounded-[1.8rem] font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all">
                        View Details
                      </button>
                    </div>
                  </motion.div>
                ))}
                {mySales.length === 0 && (
                  <div className="text-center py-40 bg-white rounded-[4rem] border border-slate-100 space-y-8">
                    <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200">
                      <Store size={64} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-display font-black text-slate-900">No sales yet</h3>
                      <p className="text-slate-500 max-w-md mx-auto text-lg">When people buy your items, they will appear here for you to manage.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'chats' && (
              <div className="grid gap-6">
                {myChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => onChatClick(chat)}
                    className="glass p-10 rounded-[3.5rem] flex items-center justify-between hover:bg-white hover:shadow-2xl hover:shadow-brand-500/5 transition-all duration-500 group border-2 border-transparent hover:border-brand-100"
                  >
                    <div className="flex items-center gap-8">
                      <div className="w-20 h-20 bg-brand-50 rounded-[1.8rem] flex items-center justify-center text-brand-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <MessageSquare size={32} />
                      </div>
                      <div className="text-left space-y-2">
                        <h3 className="font-display font-black text-2xl text-slate-900 group-hover:text-brand-600 transition-colors">
                          {chat.listingTitle}
                        </h3>
                        <div className="flex items-center gap-3">
                          <p className="text-slate-500 font-medium line-clamp-1 max-w-md">
                            {chat.lastMessage || 'Start a conversation...'}
                          </p>
                          {chat.unreadCount && (
                            <span className="w-2 h-2 bg-brand-500 rounded-full animate-ping" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Clock size={14} />
                        <span>Active Now</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-600 transition-all duration-500">
                        <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </button>
                ))}
                {myChats.length === 0 && (
                  <div className="text-center py-40 glass rounded-[4rem] space-y-8">
                    <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200">
                      <MessageSquare size={64} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-display font-black text-slate-900">No chats yet</h3>
                      <p className="text-slate-500 max-w-md mx-auto text-lg">Your conversations with buyers and sellers will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSubTab === 'business' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[4rem] overflow-hidden"
              >
                <VendorDashboard />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Rating Modal Overrides */}
      <Modal isOpen={!!ratingOrder} onClose={() => setRatingOrder(null)} title="Rate Experience">
        <div className="space-y-10 py-8">
          <div className="text-center space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Feedback Required</p>
              <h4 className="text-3xl font-display font-black text-slate-900 leading-tight">
                How was your experience with <br/>
                <span className="text-brand-600">{ratingOrder?.items[0].name}</span>?
              </h4>
            </div>
            
            <div className="flex justify-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className="group relative p-2 transition-all hover:scale-125 active:scale-95"
                >
                  <Star
                    size={56}
                    className={cn(
                      "transition-all duration-500",
                      star <= ratingValue 
                        ? "text-yellow-400 fill-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]" 
                        : "text-slate-100 group-hover:text-slate-200"
                    )}
                  />
                  {star === ratingValue && (
                    <motion.div 
                      layoutId="star-glow"
                      className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full -z-10"
                    />
                  )}
                </button>
              ))}
            </div>
            <p className="text-sm font-bold text-slate-500">
              {ratingValue === 5 ? 'Excellent! Loved it.' :
               ratingValue === 4 ? 'Great experience.' :
               ratingValue === 3 ? 'It was okay.' :
               ratingValue === 2 ? 'Could be better.' : 'Poor experience.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setRatingOrder(null)}
              className="flex-1 px-8 py-5 rounded-[1.8rem] font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
            >
              Skip for now
            </button>
            <button
              onClick={submitRating}
              disabled={isRatingLoading}
              className="flex-1 bg-slate-900 text-white py-5 rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              {isRatingLoading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

