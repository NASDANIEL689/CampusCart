import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, MessageSquare, MapPin, Navigation, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Listing, Chat, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { cn } from '../utils/cn';
import { CreateListingModal } from '../components/CreateListingModal';
import { ChatModal } from '../components/ChatModal';
import { MarketplaceMap } from '../components/MarketplaceMap';
import { LayoutGrid, Map as MapIcon } from 'lucide-react';

export const Marketplace = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<{id: string, name: string} | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isNearbyOnly, setIsNearbyOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const { user, signIn } = useAuth();

  const toggleNearby = () => {
    if (!isNearbyOnly) {
      if (!navigator.geolocation) return alert("Geolocation is not supported");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsNearbyOnly(true);
        },
        () => alert("Unable to get location")
      );
    } else {
      setIsNearbyOnly(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'listings');
    });
    return unsubscribe;
  }, []);

  const startChatWithUser = async (targetUserId: string, listingId?: string, listingTitle?: string) => {
    if (!user) return signIn();
    
    try {
      const q = query(
        collection(db, 'chats'), 
        where('participants', 'array-contains', user.uid)
      );
      const snapshot = await getDocs(q);
      const existingChatDoc = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.listingId === listingId && data.participants.includes(targetUserId);
      });

      if (existingChatDoc) {
        setActiveChat({ id: existingChatDoc.id, ...existingChatDoc.data() } as Chat);
      } else {
        const newChat = {
          participants: [user.uid, targetUserId],
          listingId: listingId || null,
          listingTitle: listingTitle || 'General Inquiry',
          createdAt: Timestamp.now()
        };
        const docRef = await addDoc(collection(db, 'chats'), newChat);
        setActiveChat({ id: docRef.id, ...newChat } as Chat);
      }
      setIsChatOpen(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'chats');
    }
  };

  const startChat = async (listing: Listing) => {
    if (!user) return signIn();
    if (listing.sellerId === user.uid) return;
    startChatWithUser(listing.sellerId, listing.id, listing.title);
  };

  const filteredListings = listings.filter(l => {
    const matchesCategory = category === 'All' || l.category === category;
    const matchesSearch = l.title.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase());
    let matchesNearby = true;
    if (isNearbyOnly && userCoords && l.coordinates) {
      const dist = calculateDistance(userCoords.lat, userCoords.lng, l.coordinates.lat, l.coordinates.lng);
      matchesNearby = dist < 10; // Within 10km
    } else if (isNearbyOnly && !l.coordinates) {
      matchesNearby = false;
    }
    return matchesCategory && matchesSearch && matchesNearby;
  });

  const buyListing = async (listing: Listing) => {
    if (!user) return signIn();
    if (listing.sellerId === user.uid) return alert("You can't buy your own item!");
    try {
      await addDoc(collection(db, 'orders'), {
        type: 'marketplace',
        buyerId: user.uid,
        buyerName: user.displayName || 'Student',
        sellerId: listing.sellerId,
        listingId: listing.id,
        items: [{ name: listing.title, price: listing.price, quantity: 1 }],
        totalPrice: listing.price,
        status: 'pending',
        createdAt: Timestamp.now()
      });
      
      alert(`Interest sent! You've requested to buy ${listing.title}. The seller has been notified. Check your profile for order details.`);
      setSelectedListing(null);
      startChat(listing);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  if (selectedSeller) {
    const sellerListings = listings.filter(l => l.sellerId === selectedSeller.id && l.status === 'available');
    return (
      <div className="py-8 space-y-8">
        <button onClick={() => setSelectedSeller(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} /> Back to Marketplace
        </button>
        
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-3xl font-bold">
            {selectedSeller.name[0]}
          </div>
          <div className="flex-1 text-center md:text-left space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">{selectedSeller.name}</h1>
            <p className="text-gray-500">Verified Student Seller</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {sellerListings.length} Active Listings
              </span>
            </div>
          </div>
          <button 
            onClick={() => startChatWithUser(selectedSeller.id, undefined, `Inquiry for ${selectedSeller.name}`)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
          >
            <MessageSquare size={20} /> Message Seller
          </button>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Seller's Items</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sellerListings.map((listing) => (
              <motion.div 
                key={listing.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  setSelectedListing(listing);
                  setSelectedSeller(null);
                }}
                className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img 
                    src={listing.photos?.[0] || 'https://picsum.photos/seed/item/400/400'} 
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-emerald-700">
                    BWP {listing.price}
                  </div>
                </div>
                <div className="p-4">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1 block">{listing.category}</span>
                  <h3 className="font-bold text-gray-900 truncate mb-1">{listing.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedListing) {
    return (
      <div className="py-8 space-y-8">
        <button onClick={() => setSelectedListing(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} /> Back to Marketplace
        </button>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <img src={selectedListing.photos?.[0]} alt="" className="w-full aspect-square object-cover rounded-3xl shadow-lg" referrerPolicy="no-referrer" />
          </div>
          <div className="md:w-1/2 space-y-6">
            <div>
              <span className="text-emerald-600 font-bold uppercase tracking-widest text-xs">{selectedListing.category}</span>
              <h1 className="text-4xl font-bold mt-2">{selectedListing.title}</h1>
              <p className="text-3xl font-bold text-gray-900 mt-4">BWP {selectedListing.price}</p>
            </div>
            <div 
              className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setSelectedSeller({ id: selectedListing.sellerId, name: selectedListing.sellerName || 'Seller' })}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                  {selectedListing.sellerName?.[0] || 'S'}
                </div>
                <div>
                  <p className="text-sm font-bold">{selectedListing.sellerName || 'Seller'}</p>
                  <p className="text-xs text-gray-500">Verified Student • View Profile</p>
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  startChat(selectedListing);
                }}
                className="p-2 bg-white rounded-xl border border-gray-100 text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <MessageSquare size={20} />
              </button>
            </div>
            <div>
              <h3 className="font-bold mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed">{selectedListing.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="bg-gray-100 px-3 py-1 rounded-full capitalize">Condition: {selectedListing.condition}</span>
              {selectedListing.location && (
                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                  <MapPin size={14} /> {selectedListing.location}
                </span>
              )}
              <span>Posted {new Date(selectedListing.createdAt.seconds * 1000).toLocaleDateString()}</span>
            </div>
            <button 
              onClick={() => buyListing(selectedListing)}
              disabled={selectedListing.status === 'sold'}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-colors disabled:bg-gray-300"
            >
              {selectedListing.status === 'sold' ? 'Sold' : 'I\'m Interested / Buy'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Marketplace</h1>
          <p className="text-gray-500">Discover what your fellow students are selling.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 p-1 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'grid' ? "bg-emerald-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'map' ? "bg-emerald-600 text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <MapIcon size={20} />
            </button>
          </div>
          <button 
            onClick={() => user ? setIsModalOpen(true) : signIn()}
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={20} />
            Create Listing
          </button>
        </div>
      </div>

      <CreateListingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} chat={activeChat} />

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search listings..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button
            onClick={toggleNearby}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
              isNearbyOnly ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border border-gray-200"
            )}
          >
            <Navigation size={16} />
            Nearby
          </button>
          {['All', 'Electronics', 'Books', 'Clothing', 'Food', 'Other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                category === cat ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-white text-gray-600 border border-gray-200 hover:border-emerald-500"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="aspect-[3/4] bg-gray-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : viewMode === 'map' ? (
        <MarketplaceMap 
          listings={filteredListings.filter(l => l.status === 'available')} 
          onListingClick={setSelectedListing}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredListings.filter(l => l.status === 'available').map((listing) => (
            <motion.div 
              key={listing.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setSelectedListing(listing)}
              className="group bg-white rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all cursor-pointer"
            >
              <div className="aspect-square relative overflow-hidden">
                <img 
                  src={listing.photos?.[0] || 'https://picsum.photos/seed/item/400/400'} 
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-emerald-700">
                  BWP {listing.price}
                </div>
              </div>
              <div className="p-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1 block">{listing.category}</span>
                <h3 className="font-bold text-gray-900 truncate mb-1">{listing.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <div 
                    className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSeller({ id: listing.sellerId, name: listing.sellerName || 'Seller' });
                    }}
                  >
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                      {listing.sellerName?.[0] || 'S'}
                    </div>
                    <span className="text-xs text-gray-500 group-hover:text-emerald-600">
                      {listing.sellerName || (listing.location ? (
                        <span className="flex items-center gap-0.5">
                          <MapPin size={10} /> {listing.location.split(',')[0]}
                        </span>
                      ) : 'Seller')}
                    </span>
                  </div>
                  {userCoords && listing.coordinates && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {calculateDistance(userCoords.lat, userCoords.lng, listing.coordinates.lat, listing.coordinates.lng).toFixed(1)}km
                    </span>
                  )}
                  <button className="text-emerald-600 hover:text-emerald-700">
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredListings.filter(l => l.status === 'available').length === 0 && (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <Search size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No listings found</h3>
              <p className="text-gray-500">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
