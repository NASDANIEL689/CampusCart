import React, { useState } from 'react';
import { Timestamp, addDoc, collection } from 'firebase/firestore';
import { MapPin, Navigation } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { Modal } from './Modal';

export const VendorRegistrationModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: 'Campus Center',
    operatingHours: '9:00 AM - 4:00 PM',
    logo: ''
  });

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
      await addDoc(collection(db, 'vendors'), {
        ownerId: user.uid,
        name: formData.name,
        description: formData.description,
        logo: formData.logo || `https://picsum.photos/seed/${formData.name}/400/300`,
        location: formData.location,
        coordinates: coords,
        operatingHours: formData.operatingHours,
        status: 'approved',
        isOpen: true,
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
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required
                  type="text" 
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full pl-10 p-3 rounded-xl border border-gray-200"
                  placeholder="e.g. Block A, Library"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
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
