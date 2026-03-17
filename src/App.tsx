import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  ShoppingBag, 
  Utensils, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Search, 
  MessageSquare, 
  Star, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  Filter,
  Store,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type UserRole = 'student' | 'vendor' | 'admin';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  schoolId?: string;
  grade?: string;
  createdAt: any;
}

interface Vendor {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  logo: string;
  location: string;
  operatingHours: string;
  status: 'pending' | 'approved' | 'suspended';
  createdAt: any;
}

interface MenuItem {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  photo: string;
  isAvailable: boolean;
  category: string;
}

interface Order {
  id: string;
  buyerId: string;
  vendorId: string;
  items: { name: string; price: number; quantity: number }[];
  totalPrice: number;
  pickupTime: string;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  createdAt: any;
}

interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'used';
  photos: string[];
  status: 'available' | 'sold';
  createdAt: any;
}

// --- Context ---
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: 'student',
            createdAt: Timestamp.now(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Sign in error", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- Components ---

const Navbar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
  const { profile, signIn, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home', icon: ShoppingBag },
    { id: 'food', label: 'Food', icon: Utensils },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
  ];

  if (profile?.role === 'vendor') {
    tabs.push({ id: 'vendor-dashboard', label: 'Dashboard', icon: LayoutDashboard });
  }
  if (profile?.role === 'admin') {
    tabs.push({ id: 'admin-dashboard', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <ShoppingBag size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">CampusCart</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  activeTab === tab.id ? "text-emerald-600" : "text-gray-500 hover:text-gray-900"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {profile ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <img src={profile.photoURL} alt="" className="w-8 h-8 rounded-full border border-gray-200" referrerPolicy="no-referrer" />
                  <span className="text-sm font-medium text-gray-700">{profile.displayName.split(' ')[0]}</span>
                </button>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="bg-emerald-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-500">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                  className={cn(
                    "flex items-center gap-3 w-full p-3 rounded-xl text-base font-medium transition-colors",
                    activeTab === tab.id ? "bg-emerald-50 text-emerald-600" : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <tab.icon size={20} />
                  {tab.label}
                </button>
              ))}
              <div className="pt-4 border-t border-gray-100">
                {profile ? (
                  <div className="space-y-2">
                    <button 
                      onClick={() => { setActiveTab('profile'); setIsMenuOpen(false); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-600 hover:bg-gray-50"
                    >
                      <UserIcon size={20} />
                      Profile
                    </button>
                    <button 
                      onClick={logout}
                      className="flex items-center gap-3 w-full p-3 rounded-xl text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={20} />
                      Logout
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={signIn}
                    className="w-full bg-emerald-600 text-white p-3 rounded-xl font-medium"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Pages ---

import { seedData } from './seed';

const Home = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const handleSeed = async () => {
    await seedData();
    alert("Sample data seeded! Refresh the page or check Marketplace/Food tabs.");
  };

  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <section className="relative h-[500px] rounded-3xl overflow-hidden bg-emerald-900 text-white">
        <img 
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=2070" 
          alt="Campus Life" 
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4 max-w-3xl mx-auto">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            Your Campus, <br />
            <span className="text-emerald-400">Your Marketplace.</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-gray-200 mb-10"
          >
            Pre-order food from your favorite vendors or discover unique products sold by fellow students.
          </motion.p>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <button 
              onClick={() => setActiveTab('food')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105"
            >
              Order Food
            </button>
            <button 
              onClick={() => setActiveTab('marketplace')}
              className="bg-white hover:bg-gray-100 text-emerald-900 px-8 py-4 rounded-2xl font-bold text-lg transition-all transform hover:scale-105"
            >
              Browse Marketplace
            </button>
          </motion.div>
          
          <button 
            onClick={handleSeed}
            className="mt-8 text-xs text-white/50 hover:text-white underline"
          >
            Demo: Seed Sample Data
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8">
        {[
          { title: 'Food Pre-ordering', desc: 'Skip the lines. Order your lunch before 10am and pick it up when it\'s ready.', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
          { title: 'Student Businesses', desc: 'Support your peers. Buy textbooks, electronics, or homemade treats directly from students.', icon: Store, color: 'bg-blue-100 text-blue-600' },
          { title: 'Secure & Simple', desc: 'Verified school community. Easy communication and reliable pickup points.', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-600' },
        ].map((feature, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", feature.color)}>
              <feature.icon size={28} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
            <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

const Marketplace = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredListings = listings.filter(l => 
    (category === 'All' || l.category === category) &&
    (l.title.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Marketplace</h1>
          <p className="text-gray-500">Discover what your fellow students are selling.</p>
        </div>
        <button className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-colors">
          <Plus size={20} />
          Create Listing
        </button>
      </div>

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
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredListings.map((listing) => (
            <motion.div 
              key={listing.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
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
                  ${listing.price}
                </div>
              </div>
              <div className="p-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1 block">{listing.category}</span>
                <h3 className="font-bold text-gray-900 truncate mb-1">{listing.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-gray-200" />
                    <span className="text-xs text-gray-500">Seller</span>
                  </div>
                  <button className="text-emerald-600 hover:text-emerald-700">
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {filteredListings.length === 0 && (
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

const FoodOrdering = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vendors'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Food Pre-Ordering</h1>
        <p className="text-gray-500">Order from trusted vendors and pick up at school.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vendors.map((vendor) => (
          <motion.div 
            key={vendor.id}
            whileHover={{ y: -5 }}
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
                  <span>4.8</span>
                  <span className="text-gray-400 font-normal text-xs ml-1">(120+ reviews)</span>
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
            <p className="text-gray-500">Check back later for food options.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const { profile, logout } = useAuth();
  
  if (!profile) return null;

  return (
    <div className="py-12 max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-emerald-600" />
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6">
            <img 
              src={profile.photoURL} 
              alt={profile.displayName} 
              className="w-32 h-32 rounded-3xl border-4 border-white shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg">
              <UserIcon size={20} />
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{profile.displayName}</h1>
              <p className="text-gray-500">{profile.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Role</span>
                <span className="font-bold text-emerald-700 capitalize">{profile.role}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Member Since</span>
                <span className="font-bold text-gray-700">March 2026</span>
              </div>
            </div>

            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <ShoppingBag size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">My Orders</span>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </button>
              <button className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Store size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">My Listings</span>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </button>
            </div>

            <button 
              onClick={logout}
              className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900">
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'home' && <Home setActiveTab={setActiveTab} />}
              {activeTab === 'marketplace' && <Marketplace />}
              {activeTab === 'food' && <FoodOrdering />}
              {activeTab === 'profile' && <Profile />}
              {activeTab === 'vendor-dashboard' && (
                <div className="py-20 text-center">
                  <LayoutDashboard size={48} className="mx-auto text-gray-300 mb-4" />
                  <h2 className="text-2xl font-bold">Vendor Dashboard</h2>
                  <p className="text-gray-500">Coming soon: Manage your menu and orders here.</p>
                </div>
              )}
              {activeTab === 'admin-dashboard' && (
                <div className="py-20 text-center">
                  <ShieldCheck size={48} className="mx-auto text-gray-300 mb-4" />
                  <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                  <p className="text-gray-500">Coming soon: Moderate listings and users.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="mt-20 border-t border-gray-100 bg-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
                <ShoppingBag size={18} />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900">CampusCart</span>
            </div>
            <p className="text-gray-400 text-sm">© 2026 CampusCart. Built for the school community.</p>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}
