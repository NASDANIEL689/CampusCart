import React, { useState } from 'react';
import { Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { Modal } from './Modal';

export const VendorRegistrationModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: 'Campus Center',
    operatingHours: '9:00 AM - 4:00 PM',
    logo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'vendors'), {
        ownerId: user.uid,
        name: formData.name,
        description: formData.description,
        logo: formData.logo || `https://picsum.photos/seed/${formData.name}/400/300`,
        location: formData.location,
        operatingHours: formData.operatingHours,
        status: 'approved',
        rating: 0,
        ratingCount: 0,
        createdAt: Timestamp.now()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'vendors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register as Vendor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input 
            required
            type="text" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full p-3 rounded-xl border border-gray-200"
            placeholder="e.g. Sarah's Snacks"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea 
            required
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full p-3 rounded-xl border border-gray-200 h-24"
            placeholder="What do you sell?"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input 
              required
              type="text" 
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              className="w-full p-3 rounded-xl border border-gray-200"
              placeholder="e.g. Block A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
            <input 
              required
              type="text" 
              value={formData.operatingHours}
              onChange={e => setFormData({...formData, operatingHours: e.target.value})}
              className="w-full p-3 rounded-xl border border-gray-200"
              placeholder="e.g. 9am - 5pm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (Optional)</label>
          <input 
            type="url" 
            value={formData.logo}
            onChange={e => setFormData({...formData, logo: e.target.value})}
            className="w-full p-3 rounded-xl border border-gray-200"
            placeholder="https://..."
          />
        </div>
        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </Modal>
  );
};
