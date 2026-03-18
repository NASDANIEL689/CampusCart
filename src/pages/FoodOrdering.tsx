import React, { useState, useEffect } from 'react';
import { Utensils, Clock, Search, Star, X, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Vendor, MenuItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { VendorRegistrationModal } from '../components/VendorRegistrationModal';

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
      // Sort by rating descending
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
    if (!user) return signIn();
    try {
      await addDoc(collection(db, 'orders'), {
        type: 'food',
        buyerId: user.uid,
        buyerName: user.displayName || 'Student',
        vendorId: item.vendorId,
        items: [{ name: item.name, price: item.price, quantity: 1 }],
        totalPrice: item.price,
        pickupTime: '12:00 PM', // Simplified
        status: 'pending',
        createdAt: Timestamp.now()
      });
      alert(`Order placed for ${item.name}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  if (selectedVendor) {
    return (
      <div className="py-8 space-y-8">
        <button onClick={() => setSelectedVendor(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <X size={20} /> Back to Vendors
        </button>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3">
            <img src={selectedVendor.logo} alt="" className="w-full aspect-video object-cover rounded-3xl mb-4" referrerPolicy="no-referrer" />
            <h1 className="text-3xl font-bold">{selectedVendor.name}</h1>
            <p className="text-gray-500 mt-2">{selectedVendor.description}</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} /> {selectedVendor.operatingHours}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Search size={16} /> {selectedVendor.location}
              </div>
            </div>
          </div>
          <div className="md:w-2/3 space-y-6">
            <h2 className="text-2xl font-bold">Menu</h2>
            <div className="grid gap-4">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex gap-4">
                    <img src={item.photo || 'https://picsum.photos/seed/food/100/100'} alt="" className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.description}</p>
                      <span className="text-emerald-600 font-bold">BWP {item.price}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => placeOrder(item)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700"
                  >
                    Order
                  </button>
                </div>
              ))}
              {menuItems.length === 0 && <p className="text-gray-500">No items available.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Food Pre-Ordering</h1>
          <p className="text-gray-500">Order from trusted vendors and pick up at school.</p>
        </div>
        <button 
          onClick={() => user ? setIsRegisterModalOpen(true) : signIn()}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 w-fit"
        >
          <Store size={20} />
          Register your business
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vendors.map((vendor) => (
          <motion.div 
            key={vendor.id}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedVendor(vendor)}
            className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
          >
            <div className="h-40 relative">
              <img 
                src={vendor.logo || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000'} 
                alt={vendor.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-xl font-bold">{vendor.name}</h3>
                <div className="flex items-center gap-1 text-xs opacity-90">
                  <Clock size={12} />
                  <span>{vendor.operatingHours}</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-500 text-sm line-clamp-2 mb-4">{vendor.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-emerald-600 font-bold">
                  <Star size={16} fill="currentColor" />
                  <span>{vendor.rating ? vendor.rating.toFixed(1) : 'New'}</span>
                  <span className="text-gray-400 font-normal text-xs ml-1">({vendor.ratingCount || 0} reviews)</span>
                </div>
                <button className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 hover:text-white transition-all">
                  View Menu
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {vendors.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Utensils size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No vendors active yet</h3>
            <p className="text-gray-500 mb-6">Be the first to start selling food on campus!</p>
            <button 
              onClick={() => user ? setIsRegisterModalOpen(true) : signIn()}
              className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
            >
              Register as a Vendor
            </button>
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
