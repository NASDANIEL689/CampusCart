import React, { useState } from 'react';
import { Timestamp, addDoc, collection } from 'firebase/firestore';
import { MapPin, Navigation } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { Modal } from './Modal';

export const CreateListingModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Books',
    condition: 'used' as 'new' | 'used',
    photo: '',
    location: ''
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const findMe = () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported by your browser");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setFormData(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        setLocating(false);
      },
      (error) => {
        console.error(error);
        alert("Unable to retrieve your location");
        setLocating(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'listings'), {
        sellerId: user.uid,
        sellerName: user.displayName || 'Student',
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        photos: [formData.photo || `https://picsum.photos/seed/${formData.title}/800/600`],
        status: 'available',
        location: formData.location,
        coordinates: coords,
        createdAt: Timestamp.now()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'listings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Listing">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input 
            required
            type="text" 
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            placeholder="e.g. Calculus Textbook"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BWP</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">BWP</span>
              <input 
                required
                type="number" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full pl-12 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
              className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            >
              {['Electronics', 'Books', 'Clothing', 'Food', 'Other'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
          <div className="flex gap-4">
            {['new', 'used'].map(c => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="condition" 
                  value={c} 
                  checked={formData.condition === c}
                  onChange={() => setFormData({...formData, condition: c as any})}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="capitalize">{c}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea 
            required
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-24"
            placeholder="Describe your item..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location / Pickup Point</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full pl-10 p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                placeholder="e.g. Library, Block A"
              />
            </div>
            <button 
              type="button"
              onClick={findMe}
              disabled={locating}
              className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <Navigation size={18} className={locating ? "animate-pulse" : ""} />
              {locating ? "..." : "Find Me"}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL (Optional)</label>
          <input 
            type="url" 
            value={formData.photo}
            onChange={e => setFormData({...formData, photo: e.target.value})}
            className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            placeholder="https://..."
          />
        </div>
        <button 
          disabled={loading}
          type="submit"
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Post Listing'}
        </button>
      </form>
    </Modal>
  );
};
