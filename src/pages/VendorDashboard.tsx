import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, CheckCircle, XCircle, Utensils } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Vendor, MenuItem, Order, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';

export const VendorDashboard = () => {
  const { user, profile } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', photo: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'vendors'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setVendor({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vendor);
      }
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
    const q = query(collection(db, 'orders'), where('vendorId', '==', vendor.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return unsubscribe;
  }, [vendor]);

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    try {
      await addDoc(collection(db, `vendors/${vendor.id}/menuItems`), {
        ...newItem,
        price: parseFloat(newItem.price),
        vendorId: vendor.id,
        createdAt: Timestamp.now()
      });
      setNewItem({ name: '', price: '', description: '', photo: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vendors/${vendor.id}/menuItems`);
    }
  };

  const deleteMenuItem = async (id: string) => {
    if (!vendor) return;
    try {
      await deleteDoc(doc(db, `vendors/${vendor.id}/menuItems`, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `vendors/${vendor.id}/menuItems`);
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  if (!vendor) {
    return (
      <div className="py-20 text-center">
        <Utensils size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold">Vendor Dashboard</h2>
        <p className="text-gray-500">You are not registered as a vendor yet.</p>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{vendor.name} Dashboard</h1>
          <p className="text-gray-500">Manage your menu and orders.</p>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold">
          Status: {vendor.status.toUpperCase()}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Menu Management */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Utensils size={24} /> Menu Items
          </h2>
          <form onSubmit={addMenuItem} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input 
                placeholder="Item Name" 
                value={newItem.name} 
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                className="p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <input 
                placeholder="Price (BWP)" 
                type="number" 
                value={newItem.price} 
                onChange={e => setNewItem({...newItem, price: e.target.value})}
                className="p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <textarea 
              placeholder="Description" 
              value={newItem.description} 
              onChange={e => setNewItem({...newItem, description: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
              rows={2}
            />
            <input 
              placeholder="Photo URL (Optional)" 
              value={newItem.photo} 
              onChange={e => setNewItem({...newItem, photo: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500"
            />
            <button type="submit" className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2">
              <Plus size={20} /> Add Item
            </button>
          </form>

          <div className="grid gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex gap-4">
                  <img src={item.photo || 'https://picsum.photos/seed/food/100/100'} alt="" className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <span className="text-emerald-600 font-bold">BWP {item.price}</span>
                  </div>
                </div>
                <button onClick={() => deleteMenuItem(item.id)} className="p-2 text-red-400 hover:text-red-600">
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Orders Management */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock size={24} /> Recent Orders
          </h2>
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">Order #{order.id.slice(-4)}</h3>
                    <p className="text-sm text-gray-500">Buyer: {order.buyerName}</p>
                    <p className="text-sm text-gray-500">Pickup: {order.pickupTime}</p>
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
                <div className="border-t border-gray-50 pt-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>BWP {item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-50">
                    <span>Total</span>
                    <span>BWP {order.totalPrice}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
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
                  {order.status !== 'cancelled' && order.status !== 'completed' && (
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <XCircle size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-500 text-center py-10">No orders yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
};
