import React, { useState, useEffect } from 'react';
import { Utensils, Clock, Search, Star, X, Store, ChevronRight, MapPin, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Vendor, MenuItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { VendorRegistrationModal } from '../components/VendorRegistrationModal';
import { cn } from '../utils/cn';
import { createNotification } from '../utils/notifications';

export const FoodOrdering = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const { user, signIn } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'vendors'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vendorList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
      vendorList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setVendors(vendorList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;
    const q = query(collection(db, `vendors/${selectedVendor.id}/menuItems`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `vendors/${selectedVendor.id}/menuItems`);
    });
    return unsubscribe;
  }, [selectedVendor]);

  const placeOrder = async (item: MenuItem) => {
    if (!user || !selectedVendor) return signIn();
    try {
      await addDoc(collection(db, 'orders'), {
        type: 'food',
        buyerId: user.uid,
        buyerName: user.displayName || 'Student',
        vendorId: item.vendorId,
        vendorLocation: selectedVendor.location,
        vendorCoordinates: selectedVendor.coordinates || null,
        items: [{ name: item.name, price: item.price, quantity: 1 }],
        totalPrice: item.price,
        pickupTime: '12:00 PM',
        status: 'pending',
        createdAt: Timestamp.now()
      });
      
      // Send notification to vendor
      if (selectedVendor.ownerId) {
        await createNotification(
          selectedVendor.ownerId,
          'New Food Order!',
          `${user.displayName} just ordered ${item.name}.`,
          'order',
          '#'
        );
      }

      alert(`Order placed for ${item.name}! The vendor's location (${selectedVendor.location}) has been added to your order details.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  if (selectedVendor) {
    return (
      <div className="py-12 space-y-12 max-w-7xl mx-auto px-4">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setSelectedVendor(null)} 
          className="group flex items-center gap-3 text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
            <X size={18} />
          </div>
          Back to Vendors
        </motion.button>

        <div className="grid lg:grid-cols-12 gap-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-4 space-y-8"
          >
            <div className="relative group">
              <img 
                src={selectedVendor.logo} 
                alt="" 
                className="w-full aspect-square object-cover rounded-[3rem] shadow-2xl group-hover:scale-[1.02] transition-transform duration-700" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-[3rem]" />
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-[0.2em]">
                  <Star size={14} fill="currentColor" />
                  <span>{selectedVendor.rating?.toFixed(1) || 'New'} Vendor</span>
                </div>
                <h1 className="text-5xl font-display font-black text-slate-900 leading-none">{selectedVendor.name}</h1>
              </div>
              
              <p className="text-lg text-slate-500 font-medium leading-relaxed">{selectedVendor.description}</p>
              
              <div className="grid gap-4 pt-4">
                <div className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operating Hours</p>
                    <p className="font-bold text-slate-900">{selectedVendor.operatingHours}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pickup Location</p>
                    <p className="font-bold text-slate-900">{selectedVendor.location}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-8 space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-display font-black text-slate-900">Today's Menu</h2>
              <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                <Utensils size={18} />
                <span>{menuItems.length} Items Available</span>
              </div>
            </div>

            <div className="grid gap-6">
              {['Main Course', 'Snacks', 'Drinks', 'Desserts'].map(category => {
                const categoryItems = menuItems.filter(item => item.category === category);
                if (categoryItems.length === 0) return null;
                
                return (
                  <div key={category} className="space-y-6">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest border-l-4 border-brand-600 pl-4">
                      {category}
                    </h3>
                    <div className="grid gap-6">
                      {categoryItems.map((item, i) => (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            "group bg-white p-6 rounded-[2.5rem] border flex flex-col sm:flex-row items-center justify-between gap-8 transition-all duration-500",
                            item.isAvailable ? "border-slate-100 hover:shadow-2xl hover:shadow-brand-500/5" : "border-red-50 bg-slate-50/50 opacity-75"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row gap-8 items-center flex-1">
                            <div className="relative">
                              <img 
                                src={item.photo || 'https://picsum.photos/seed/food/200/200'} 
                                alt="" 
                                className={cn(
                                  "w-32 h-32 rounded-3xl object-cover transition-transform duration-700",
                                  item.isAvailable ? "group-hover:scale-110" : "grayscale"
                                )}
                                referrerPolicy="no-referrer" 
                              />
                              {!item.isAvailable && (
                                <div className="absolute inset-0 bg-red-500/20 rounded-3xl flex items-center justify-center">
                                  <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Sold Out</span>
                                </div>
                              )}
                              {item.isAvailable && (
                                <div className="absolute -top-2 -right-2 bg-white px-3 py-1 rounded-full text-[10px] font-black text-brand-600 shadow-lg border border-brand-50">
                                  FRESH
                                </div>
                              )}
                            </div>
                            <div className="text-center sm:text-left space-y-2">
                              <h3 className={cn(
                                "font-display font-black text-2xl transition-colors",
                                item.isAvailable ? "text-slate-900 group-hover:text-brand-600" : "text-slate-400"
                              )}>
                                {item.name}
                              </h3>
                              <p className="text-slate-500 font-medium line-clamp-2 max-w-md">{item.description}</p>
                              <div className="flex items-center justify-center sm:justify-start gap-4 pt-2">
                                <span className={cn(
                                  "text-2xl font-display font-black",
                                  item.isAvailable ? "text-brand-600" : "text-slate-400"
                                )}>
                                  BWP {item.price}
                                </span>
                                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Est. 15-20 min</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            disabled={!item.isAvailable || !selectedVendor?.isOpen}
                            onClick={() => placeOrder(item)}
                            className={cn(
                              "w-full sm:w-auto px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-xl",
                              (item.isAvailable && selectedVendor?.isOpen)
                                ? "bg-slate-900 text-white hover:bg-brand-600 hover:-translate-y-1 shadow-slate-900/10 hover:shadow-brand-500/20" 
                                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            )}
                          >
                            {!selectedVendor?.isOpen ? 'Vendor Closed' : item.isAvailable ? 'Add to Order' : 'Sold Out'}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {menuItems.length === 0 && (
                <div className="py-32 text-center glass rounded-[3rem] space-y-6">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                    <Search size={48} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-display font-black text-slate-900">Menu is empty</h3>
                    <p className="text-slate-500">This vendor hasn't added any items yet.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 space-y-16 max-w-7xl mx-auto px-4">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-black uppercase tracking-widest">
            <Utensils size={14} />
            <span>Campus Dining</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-slate-900 leading-none tracking-tight">
            Hungry? <br />
            <span className="text-brand-600">Order Ahead.</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed">
            Skip the long queues at the cafeteria. Order from your favorite campus vendors and pick up when it's ready.
          </p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => user ? setIsRegisterModalOpen(true) : signIn()}
          className="group flex items-center gap-4 bg-slate-900 text-white px-10 py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 w-fit"
        >
          <Store size={22} className="group-hover:rotate-12 transition-transform" />
          <span>Register Business</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {vendors.map((vendor, i) => (
          <motion.div 
            key={vendor.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -12 }}
            onClick={() => setSelectedVendor(vendor)}
            className="group bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-3xl hover:shadow-brand-500/10 transition-all duration-700 cursor-pointer"
          >
            <div className="h-64 relative overflow-hidden">
              <img 
                src={vendor.logo || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000'} 
                alt={vendor.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
              <div className="absolute bottom-8 left-8 right-8 text-white space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                  <Clock size={12} className="text-brand-400" />
                  <span className="text-brand-400">{vendor.operatingHours}</span>
                  <span className={cn(
                    "ml-2 px-2 py-0.5 rounded-full",
                    vendor.isOpen ? "bg-brand-500/20 text-brand-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {vendor.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
                <h3 className="text-3xl font-display font-black leading-none">{vendor.name}</h3>
              </div>
              <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-black text-slate-900">{vendor.rating ? vendor.rating.toFixed(1) : 'New'}</span>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <p className="text-slate-500 font-medium line-clamp-2 text-lg leading-relaxed">{vendor.description}</p>
              <div className="flex items-center justify-between pt-8 border-t border-slate-50">
                <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                  <MapPin size={18} />
                  <span>{vendor.location}</span>
                </div>
                <div className="flex items-center gap-2 text-brand-600 font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                  <span>View Menu</span>
                  <ChevronRight size={18} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {vendors.length === 0 && !loading && (
          <div className="col-span-full py-40 text-center glass rounded-[4rem] space-y-10">
            <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto text-slate-200">
              <Utensils size={64} />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-display font-black text-slate-900">No vendors active yet</h3>
              <p className="text-slate-500 max-w-md mx-auto text-lg">Be the first to start selling food on campus! Register your business today.</p>
              <button 
                onClick={() => user ? setIsRegisterModalOpen(true) : signIn()}
                className="btn-primary mt-8 px-12 py-5 text-lg"
              >
                Register as a Vendor
              </button>
            </div>
          </div>
        )}
      </div>

      <VendorRegistrationModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
      />
    </div>
  );
};
