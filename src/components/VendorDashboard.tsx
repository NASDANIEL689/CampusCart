import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Vendor, MenuItem, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { Plus, Trash2, Edit2, Save, X, Utensils, Clock, MapPin, Image as ImageIcon } from 'lucide-react';

export const VendorDashboard = () => {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
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
              <h2 className="text-3xl font-bold">{vendor.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
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

      {/* Menu Management Section */}
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
            <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-emerald-200 transition-all">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                  {item.photo ? (
                    <img src={item.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <ImageIcon size={24} className="text-gray-300" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">{item.name}</h4>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1">{item.description}</p>
                  <span className="text-emerald-600 font-bold">BWP {item.price}</span>
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
    </div>
  );
};
