import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Vendor, MenuItem, Order, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { Plus, Trash2, Edit2, Save, X, Utensils, Clock, MapPin, Image as ImageIcon, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';

export const VendorDashboard = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('orders');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    location: '',
    operatingHours: '',
    logo: ''
  });

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: 0,
    photo: '',
    category: 'Main Course',
    isAvailable: true
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'vendors'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const vendorData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vendor;
        setVendor(vendorData);
        setProfileForm({
          name: vendorData.name,
          description: vendorData.description,
          location: vendorData.location,
          operatingHours: vendorData.operatingHours,
          logo: vendorData.logo
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!vendor) return;
    const q = query(collection(db, `vendors/${vendor.id}/menuItems`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `vendors/${vendor.id}/menuItems`);
    });
    return unsubscribe;
  }, [vendor]);

  useEffect(() => {
    if (!vendor) return;
    const q = query(
      collection(db, 'orders'), 
      where('vendorId', '==', vendor.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return unsubscribe;
  }, [vendor]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    try {
      await updateDoc(doc(db, 'vendors', vendor.id), profileForm);
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'vendors');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    try {
      if (editingItem) {
        await updateDoc(doc(db, `vendors/${vendor.id}/menuItems`, editingItem.id), itemForm);
      } else {
        await addDoc(collection(db, `vendors/${vendor.id}/menuItems`), {
          ...itemForm,
          vendorId: vendor.id,
          createdAt: Timestamp.now()
        });
      }
      setIsAddingItem(false);
      setEditingItem(null);
      setItemForm({ name: '', description: '', price: 0, photo: '', category: 'Main Course', isAvailable: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `vendors/${vendor.id}/menuItems`);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!vendor) return;
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, `vendors/${vendor.id}/menuItems`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vendors/${vendor.id}/menuItems`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    if (!vendor) return;
    try {
      await updateDoc(doc(db, `vendors/${vendor.id}/menuItems`, item.id), {
        isAvailable: !item.isAvailable
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vendors/${vendor.id}/menuItems`);
    }
  };

  const handleToggleShopStatus = async () => {
    if (!vendor) return;
    try {
      await updateDoc(doc(db, 'vendors', vendor.id), { isOpen: !vendor.isOpen });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'vendors');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading your business dashboard...</div>;
  if (!vendor) return <div className="p-8 text-center text-gray-500">You haven't registered a business yet.</div>;

  return (
    <div className="space-y-8">
      {/* Business Profile Section */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="h-48 relative">
          <img 
            src={vendor.logo || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000'} 
            alt={vendor.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end text-white">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-3xl font-bold">{vendor.name}</h2>
                <button 
                  onClick={handleToggleShopStatus}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg",
                    vendor.isOpen ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  )}
                >
                  {vendor.isOpen ? 'Open' : 'Closed'}
                </button>
              </div>
              <div className="flex items-center gap-4 text-sm opacity-90">
                <span className="flex items-center gap-1"><Clock size={14} /> {vendor.operatingHours}</span>
                <span className="flex items-center gap-1"><MapPin size={14} /> {vendor.location}</span>
              </div>
            </div>
            {!isEditingProfile && (
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              >
                <Edit2 size={16} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Business Name</label>
                <input 
                  type="text" 
                  value={profileForm.name}
                  onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Logo URL</label>
                <input 
                  type="text" 
                  value={profileForm.logo}
                  onChange={e => setProfileForm({...profileForm, logo: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Location</label>
                <input 
                  type="text" 
                  value={profileForm.location}
                  onChange={e => setProfileForm({...profileForm, location: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Operating Hours</label>
                <input 
                  type="text" 
                  value={profileForm.operatingHours}
                  onChange={e => setProfileForm({...profileForm, operatingHours: e.target.value})}
                  className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
              <textarea 
                value={profileForm.description}
                onChange={e => setProfileForm({...profileForm, description: e.target.value})}
                className="w-full p-3 rounded-xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none h-24"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
                <Save size={18} /> Save Changes
              </button>
              <button type="button" onClick={() => setIsEditingProfile(false)} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-xl font-bold">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <p className="text-gray-600 leading-relaxed">{vendor.description}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('orders')}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-all relative",
            activeTab === 'orders' ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          Orders
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
          {activeTab === 'orders' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
        <button 
          onClick={() => setActiveTab('menu')}
          className={cn(
            "pb-4 px-2 text-sm font-bold transition-all relative",
            activeTab === 'menu' ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
          )}
        >
          Menu Management
          {activeTab === 'menu' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />}
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag size={24} className="text-emerald-600" />
              Incoming Orders
            </h3>
          </div>

          <div className="grid gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">Order #{order.id.slice(-4).toUpperCase()}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                        order.status === 'pending' ? "bg-amber-100 text-amber-700" :
                        order.status === 'confirmed' ? "bg-blue-100 text-blue-700" :
                        order.status === 'ready' ? "bg-emerald-100 text-emerald-700" :
                        order.status === 'completed' ? "bg-gray-100 text-gray-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Customer: <span className="font-bold text-gray-700">{order.buyerName}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{order.createdAt.toDate().toLocaleTimeString()}</p>
                    <p className="font-bold text-emerald-600">BWP {order.totalPrice}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">BWP {item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all"
                    >
                      Confirm Order
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                    >
                      Mark as Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                      className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black transition-all"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {['pending', 'confirmed'].includes(order.status) && (
                    <button 
                      onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                      className="bg-white text-red-600 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-50 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
                <h4 className="text-xl font-bold text-gray-400">No orders yet</h4>
                <p className="text-gray-400">When customers order from you, they'll appear here.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Utensils size={24} className="text-emerald-600" />
              Menu Items
            </h3>
            <button 
              onClick={() => {
                setIsAddingItem(true);
                setEditingItem(null);
                setItemForm({ name: '', description: '', price: 0, photo: '', category: 'Main Course', isAvailable: true });
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all"
            >
              <Plus size={18} /> Add Item
            </button>
          </div>

          {(isAddingItem || editingItem) && (
            <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 space-y-4">
              <h4 className="font-bold text-emerald-900">{editingItem ? 'Edit Item' : 'Add New Item'}</h4>
              <form onSubmit={handleSaveItem} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Item Name</label>
                    <input 
                      required
                      type="text" 
                      value={itemForm.name}
                      onChange={e => setItemForm({...itemForm, name: e.target.value})}
                      className="w-full p-3 rounded-xl border border-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="e.g. Grilled Chicken"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Price (BWP)</label>
                    <input 
                      required
                      type="number" 
                      value={itemForm.price}
                      onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})}
                      className="w-full p-3 rounded-xl border border-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Photo URL</label>
                    <input 
                      type="text" 
                      value={itemForm.photo}
                      onChange={e => setItemForm({...itemForm, photo: e.target.value})}
                      className="w-full p-3 rounded-xl border border-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Category</label>
                    <select 
                      value={itemForm.category}
                      onChange={e => setItemForm({...itemForm, category: e.target.value})}
                      className="w-full p-3 rounded-xl border border-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    >
                      <option>Main Course</option>
                      <option>Snacks</option>
                      <option>Drinks</option>
                      <option>Desserts</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Description</label>
                  <textarea 
                    required
                    value={itemForm.description}
                    onChange={e => setItemForm({...itemForm, description: e.target.value})}
                    className="w-full p-3 rounded-xl border border-emerald-100 focus:ring-2 focus:ring-emerald-500 outline-none h-20"
                    placeholder="Describe the dish..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isAvailable"
                    checked={itemForm.isAvailable}
                    onChange={e => setItemForm({...itemForm, isAvailable: e.target.checked})}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="isAvailable" className="text-sm font-bold text-emerald-700">Available for ordering</label>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
                    <Save size={18} /> {editingItem ? 'Update Item' : 'Add to Menu'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsAddingItem(false); setEditingItem(null); }} 
                    className="bg-white text-gray-600 px-6 py-2 rounded-xl font-bold border border-emerald-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4">
            {menuItems.map(item => (
              <div key={item.id} className={cn(
                "bg-white p-4 rounded-2xl border flex items-center justify-between group transition-all",
                item.isAvailable ? "border-gray-100 hover:border-emerald-200" : "border-red-100 bg-red-50/10"
              )}>
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center relative">
                    {item.photo ? (
                      <img src={item.photo} alt="" className={cn("w-full h-full object-cover", !item.isAvailable && "grayscale opacity-50")} referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon size={24} className="text-gray-300" />
                    )}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Sold Out</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className={cn("font-bold", !item.isAvailable && "text-gray-400")}>{item.name}</h4>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                    <div className="flex items-center gap-3">
                      <span className={cn("font-bold", item.isAvailable ? "text-emerald-600" : "text-gray-400")}>BWP {item.price}</span>
                      <button 
                        onClick={() => handleToggleAvailability(item)}
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full transition-all",
                          item.isAvailable ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                        )}
                      >
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => {
                      setEditingItem(item);
                      setItemForm({
                        name: item.name,
                        description: item.description,
                        price: item.price,
                        photo: item.photo,
                        category: item.category,
                        isAvailable: item.isAvailable
                      });
                    }}
                    className="p-2 text-gray-400 hover:text-emerald-600 bg-gray-50 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {menuItems.length === 0 && !isAddingItem && (
              <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Utensils size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500">Your menu is empty. Add your first item!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
