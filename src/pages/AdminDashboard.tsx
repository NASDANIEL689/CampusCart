import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle, XCircle, Store, Mail, Phone, MapPin } from 'lucide-react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Vendor, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';

export const AdminDashboard = () => {
  const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const q = query(collection(db, 'vendors'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    });
    return unsubscribe;
  }, [profile]);

  const updateStatus = async (vendorId: string, ownerId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'vendors', vendorId), { status });
      if (status === 'approved') {
        await updateDoc(doc(db, 'users', ownerId), { role: 'vendor' });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'vendors');
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="py-20 text-center">
        <ShieldCheck size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold">Admin Access Required</h2>
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">Review and approve vendor applications.</p>
      </div>

      <div className="grid gap-6">
        {pendingVendors.map((vendor) => (
          <div key={vendor.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex gap-6">
                <img src={vendor.logo} alt="" className="w-24 h-24 rounded-2xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">{vendor.name}</h3>
                  <p className="text-gray-500 max-w-xl">{vendor.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-2">
                    <div className="flex items-center gap-1.5"><Mail size={16} /> {vendor.email}</div>
                    <div className="flex items-center gap-1.5"><Phone size={16} /> {vendor.phone}</div>
                    <div className="flex items-center gap-1.5"><MapPin size={16} /> {vendor.location}</div>
                  </div>
                </div>
              </div>
              <div className="flex md:flex-col gap-3">
                <button 
                  onClick={() => updateStatus(vendor.id, vendor.ownerId, 'approved')}
                  className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle size={20} /> Approve
                </button>
                <button 
                  onClick={() => updateStatus(vendor.id, vendor.ownerId, 'rejected')}
                  className="flex-1 bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <XCircle size={20} /> Reject
                </button>
              </div>
            </div>
          </div>
        ))}
        {pendingVendors.length === 0 && (
          <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Store size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No pending applications</h3>
            <p className="text-gray-500">All vendor applications have been processed.</p>
          </div>
        )}
      </div>
    </div>
  );
};
