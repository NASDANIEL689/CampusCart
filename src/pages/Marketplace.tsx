import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  MapPin, 
  Navigation, 
  ChevronLeft, 
  ChevronRight,
  Star,
  LayoutGrid, 
  Map as MapIcon,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, getDocs, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Listing, Chat, OperationType } from '../types';
import { handleFirestoreError } from '../utils/error';
import { cn } from '../utils/cn';
import { CreateListingModal } from '../components/CreateListingModal';
import { ChatModal } from '../components/ChatModal';
import { MarketplaceMap } from '../components/MarketplaceMap';
import { createNotification } from '../utils/notifications';

export const Marketplace = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<{id: string, name: string, rating?: number, ratingCount?: number} | null>(null);

  useEffect(() => {
    if (selectedSeller && selectedSeller.rating === undefined) {
      const fetchSellerProfile = async () => {
        try {
          const sellerDoc = await getDoc(doc(db, 'users', selectedSeller.id));
          if (sellerDoc.exists()) {
            const data = sellerDoc.data();
            setSelectedSeller(prev => prev ? { ...prev, rating: data.rating, ratingCount: data.ratingCount } : null);
          }
        } catch (error) {
          console.error("Error fetching seller profile:", error);
        }
      };
      fetchSellerProfile();
    }
  }, [selectedSeller]);

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
      
      // Send notification to seller
      if (listing.sellerId) {
        await createNotification(
          listing.sellerId,
          'New Interest in Item!',
          `${user.displayName} is interested in buying ${listing.title}.`,
          'order',
          '#'
        );
      }
      
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
      <div className="py-8 space-y-12">
        <button 
          onClick={() => setSelectedSeller(null)} 
          className="group flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors font-medium"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Marketplace
        </button>
        
        <div className="glass p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 bg-brand-100 rounded-[2rem] flex items-center justify-center text-brand-600 text-4xl font-display font-bold shadow-inner">
            {selectedSeller.name[0]}
          </div>
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <h1 className="text-4xl font-display font-bold text-slate-900">{selectedSeller.name}</h1>
              {selectedSeller.rating !== undefined && (
                <div className="inline-flex items-center gap-1.5 bg-yellow-50 px-4 py-1.5 rounded-full border border-yellow-100">
                  <Star size={18} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-base font-bold text-yellow-700">{selectedSeller.rating.toFixed(1)}</span>
                  <span className="text-sm text-yellow-600/60">({selectedSeller.ratingCount || 0} reviews)</span>
                </div>
              )}
            </div>
            <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start gap-2">
              <Shield size={16} className="text-brand-500" />
              Verified Student Seller
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
              <span className="px-4 py-1.5 bg-brand-50 text-brand-700 rounded-xl text-xs font-bold uppercase tracking-widest">
                {sellerListings.length} Active Listings
              </span>
            </div>
          </div>
          <button 
            onClick={() => startChatWithUser(selectedSeller.id, undefined, `Inquiry for ${selectedSeller.name}`)}
            className="btn-primary flex items-center gap-3 px-8"
          >
            <MessageSquare size={20} /> Message Seller
          </button>
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-display font-bold text-slate-900">Seller's Items</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {sellerListings.map((listing) => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                onClick={() => {
                  setSelectedListing(listing);
                  setSelectedSeller(null);
                }}
                onSellerClick={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedListing) {
    return (
      <div className="py-8 space-y-12">
        <button 
          onClick={() => setSelectedListing(null)} 
          className="group flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors font-medium"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Marketplace
        </button>
        
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200"
          >
            <img 
              src={selectedListing.photos?.[0] || 'https://picsum.photos/seed/item/800/800'} 
              alt="" 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
              referrerPolicy="no-referrer" 
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10"
          >
            <div className="space-y-4">
              <span className="inline-block px-4 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-bold uppercase tracking-widest">
                {selectedListing.category}
              </span>
              <h1 className="text-5xl font-display font-bold text-slate-900 leading-tight">{selectedListing.title}</h1>
              <p className="text-4xl font-display font-bold text-brand-600">BWP {selectedListing.price}</p>
            </div>

            <div 
              className="glass p-6 rounded-3xl flex items-center justify-between cursor-pointer hover:border-brand-500/30 transition-all group"
              onClick={() => setSelectedSeller({ id: selectedListing.sellerId, name: selectedListing.sellerName || 'Seller' })}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-600 font-display font-bold text-xl group-hover:scale-110 transition-transform">
                  {selectedListing.sellerName?.[0] || 'S'}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{selectedListing.sellerName || 'Seller'}</p>
                  <p className="text-sm text-slate-500">Verified Student • View Profile</p>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:bg-brand-50 transition-all">
                <ChevronRight size={20} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-display font-bold text-slate-900">Description</h3>
              <p className="text-slate-500 leading-relaxed text-lg">{selectedListing.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl">Condition: {selectedListing.condition}</span>
              {selectedListing.location && (
                <span className="flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-xl">
                  <MapPin size={16} /> {selectedListing.location}
                </span>
              )}
              <span className="text-slate-400">Posted {new Date(selectedListing.createdAt.seconds * 1000).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => buyListing(selectedListing)}
                disabled={selectedListing.status === 'sold'}
                className="flex-1 btn-primary text-lg py-5 shadow-xl shadow-brand-500/20"
              >
                {selectedListing.status === 'sold' ? 'Sold' : 'I\'m Interested / Buy'}
              </button>
              <button 
                onClick={() => startChat(selectedListing)}
                className="p-5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-brand-50 hover:text-brand-600 transition-all"
              >
                <MessageSquare size={24} />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-display font-bold text-slate-900 tracking-tight">
            Marketplace
          </h1>
          <p className="text-slate-500 text-lg max-w-md">
            Discover unique items and great deals from your campus community.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="glass p-1.5 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                viewMode === 'grid' ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                viewMode === 'map' ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <MapIcon size={20} />
            </button>
          </div>
          <button 
            onClick={() => user ? setIsModalOpen(true) : signIn()}
            className="btn-primary flex items-center gap-2 shadow-xl shadow-brand-500/20"
          >
            <Plus size={20} />
            Create Listing
          </button>
        </div>
      </div>

      <CreateListingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} chat={activeChat} />

      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search items, textbooks, electronics..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-3xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-lg shadow-sm"
          />
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button
            onClick={toggleNearby}
            className={cn(
              "px-6 py-4 rounded-3xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 border",
              isNearbyOnly 
                ? "bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/20" 
                : "bg-white text-slate-600 border-slate-100 hover:border-brand-500/30"
            )}
          >
            <Navigation size={18} />
            Nearby
          </button>
          {['All', 'Electronics', 'Books', 'Clothing', 'Food', 'Other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-6 py-4 rounded-3xl text-sm font-bold whitespace-nowrap transition-all border",
                category === cat 
                  ? "bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/20" 
                  : "bg-white text-slate-600 border-slate-100 hover:border-brand-500/30"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="aspect-[3/4] bg-slate-100 animate-pulse rounded-[2.5rem]" />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-[600px] rounded-[3rem] overflow-hidden border border-slate-100 shadow-inner"
          >
            <MarketplaceMap 
              listings={filteredListings.filter(l => l.status === 'available')} 
              onListingClick={setSelectedListing}
            />
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredListings.filter(l => l.status === 'available').map((listing) => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                onClick={() => setSelectedListing(listing)}
                onSellerClick={(e) => {
                  e.stopPropagation();
                  setSelectedSeller({ id: listing.sellerId, name: listing.sellerName || 'Seller' });
                }}
                userCoords={userCoords}
                calculateDistance={calculateDistance}
              />
            ))}
            {filteredListings.filter(l => l.status === 'available').length === 0 && (
              <div className="col-span-full py-32 text-center space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                  <Search size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold text-slate-900">No items found</h3>
                  <p className="text-slate-500">Try adjusting your search or filters to find what you're looking for.</p>
                </div>
                <button 
                  onClick={() => { setSearch(''); setCategory('All'); setIsNearbyOnly(false); }}
                  className="text-brand-600 font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ListingCard = ({ listing, onClick, onSellerClick, userCoords, calculateDistance }: any) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -10 }}
      onClick={onClick}
      className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 cursor-pointer"
    >
      <div className="aspect-[4/5] relative overflow-hidden">
        <img 
          src={listing.photos?.[0] || `https://picsum.photos/seed/${listing.id}/600/800`} 
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-sm font-display font-bold text-brand-700 shadow-sm">
          BWP {listing.price}
        </div>
        <div className="absolute bottom-4 left-4 right-4 translate-y-12 group-hover:translate-y-0 transition-transform duration-500">
          <button className="w-full bg-brand-600 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand-500/40">
            View Details <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 block">{listing.category}</span>
          <h3 className="font-display font-bold text-slate-900 text-lg truncate group-hover:text-brand-600 transition-colors">{listing.title}</h3>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          <div 
            className="flex items-center gap-2 hover:text-brand-600 transition-colors"
            onClick={onSellerClick}
          >
            <div className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center text-[10px] font-bold text-brand-600">
              {listing.sellerName?.[0] || 'S'}
            </div>
            <span className="text-xs font-semibold text-slate-500 group-hover:text-brand-600 truncate max-w-[80px]">
              {listing.sellerName?.split(' ')[0] || 'Seller'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {userCoords && listing.coordinates && (
              <span className="flex items-center gap-1 text-[10px] text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-full">
                <Navigation size={10} />
                {calculateDistance(userCoords.lat, userCoords.lng, listing.coordinates.lat, listing.coordinates.lng).toFixed(1)}km
              </span>
            )}
            <button className="text-slate-300 hover:text-brand-600 transition-colors">
              <MessageSquare size={18} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Shield = ({ size, className }: any) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

