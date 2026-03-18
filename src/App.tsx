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
  getDocFromServer,
  getDocs
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
  ChevronLeft,
  Filter,
  Store,
  ShieldCheck,
  LayoutDashboard,
  MapPin,
  Navigation
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
  vendorId?: string;
  sellerId?: string;
  listingId?: string;
  type: 'food' | 'marketplace';
  items: { name: string; price: number; quantity: number }[];
  totalPrice: number;
  pickupTime?: string;
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  createdAt: any;
}

interface Listing {
  id: string;
  sellerId: string;
  sellerName?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: 'new' | 'used';
  photos: string[];
  status: 'available' | 'sold';
  location?: string;
  coordinates?: { lat: number; lng: number };
  createdAt: any;
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: any;
  listingId?: string;
  listingTitle?: string;
  createdAt: any;
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any;
}

// --- Constants ---
const ADMIN_EMAILS = ['pakodaniel43@gmail.com', 'nasdaniel21@gmail.com'];

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
          const existingProfile = docSnap.data() as UserProfile;
          // Auto-promote to admin if email is in the list but role is not admin
          if (ADMIN_EMAILS.includes(user.email || '') && existingProfile.role !== 'admin') {
            const updatedProfile = { ...existingProfile, role: 'admin' as UserRole };
            await updateDoc(docRef, { role: 'admin' });
            setProfile(updatedProfile);
          } else {
            setProfile(existingProfile);
          }
        } else {
          const role: UserRole = ADMIN_EMAILS.includes(user.email || '') ? 'admin' : 'student';
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            role: role,
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

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

const VendorRegistrationModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user, profile } = useAuth();
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
        status: 'pending',
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

const ChatModal = ({ isOpen, onClose, chat }: { isOpen: boolean, onClose: () => void, chat: Chat | null }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chat) return;
    const q = query(collection(db, `chats/${chat.id}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });
    return unsubscribe;
  }, [chat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chat || !user || !newMessage.trim()) return;
    const text = newMessage.trim();
    setNewMessage('');
    try {
      await addDoc(collection(db, `chats/${chat.id}/messages`), {
        chatId: chat.id,
        senderId: user.uid,
        text,
        createdAt: Timestamp.now()
      });
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: text,
        lastMessageAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${chat.id}/messages`);
    }
  };

  if (!chat) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={chat.listingTitle || "Chat"}>
      <div className="flex flex-col h-[500px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-2">
          {messages.map(m => (
            <div key={m.id} className={cn(
              "max-w-[80%] p-3 rounded-2xl text-sm",
              m.senderId === user?.uid ? "bg-emerald-600 text-white ml-auto rounded-tr-none" : "bg-gray-100 text-gray-900 mr-auto rounded-tl-none"
            )}>
              {m.text}
              <p className={cn("text-[10px] mt-1 opacity-70", m.senderId === user?.uid ? "text-right" : "text-left")}>
                {new Date(m.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="mt-4 flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            className="flex-1 p-3 rounded-xl border border-gray-200 outline-none focus:border-emerald-500"
            placeholder="Type a message..."
          />
          <button type="submit" className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700">
            <MessageSquare size={20} />
          </button>
        </form>
      </div>
    </Modal>
  );
};

const CreateListingModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
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

const Navbar = ({ activeTab, setActiveTab, onMessageClick }: { activeTab: string, setActiveTab: (tab: string) => void, onMessageClick?: () => void }) => {
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
                  onClick={onMessageClick}
                  className="p-2 text-gray-500 hover:text-emerald-600 transition-colors relative"
                  title="My Messages"
                >
                  <MessageSquare size={22} />
                </button>
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
                      onClick={() => { onMessageClick?.(); setIsMenuOpen(false); }}
                      className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-600 hover:bg-gray-50"
                    >
                      <MessageSquare size={20} />
                      Messages
                    </button>
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isNearbyOnly, setIsNearbyOnly] = useState(false);
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

  const startChat = async (listing: Listing) => {
    if (!user) return signIn();
    if (listing.sellerId === user.uid) return;
    startChatWithUser(listing.sellerId, listing.id, listing.title);
  };

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
      // Create an order record
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

  if (selectedListing) {
    return (
      <div className="py-8 space-y-8">
        <button onClick={() => setSelectedListing(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} /> Back to Marketplace
        </button>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <img src={selectedListing.photos?.[0]} alt="" className="w-full aspect-square object-cover rounded-3xl shadow-lg" />
          </div>
          <div className="md:w-1/2 space-y-6">
            <div>
              <span className="text-emerald-600 font-bold uppercase tracking-widest text-xs">{selectedListing.category}</span>
              <h1 className="text-4xl font-bold mt-2">{selectedListing.title}</h1>
              <p className="text-3xl font-bold text-gray-900 mt-4">BWP {selectedListing.price}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                  {selectedListing.sellerName?.[0] || 'S'}
                </div>
                <div>
                  <p className="text-sm font-bold">{selectedListing.sellerName || 'Seller'}</p>
                  <p className="text-xs text-gray-500">Verified Student</p>
                </div>
              </div>
              <button 
                onClick={() => startChat(selectedListing)}
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
        <button 
          onClick={() => user ? setIsModalOpen(true) : signIn()}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} />
          Create Listing
        </button>
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
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                      {listing.sellerName?.[0] || 'S'}
                    </div>
                    <span className="text-xs text-gray-500">
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

const FoodOrdering = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const { user, signIn } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'vendors'), where('status', '==', 'approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'vendors');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedVendor) return;
    const q = query(collection(db, `vendors/${selectedVendor.id}/menuItems`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `vendors/${selectedVendor.id}/menuItems`);
    });
    return unsubscribe;
  }, [selectedVendor]);

  const placeOrder = async (item: MenuItem) => {
    if (!user) return signIn();
    try {
      await addDoc(collection(db, 'orders'), {
        type: 'food',
        buyerId: user.uid,
        buyerName: user.displayName || 'Student',
        vendorId: item.vendorId,
        items: [{ name: item.name, price: item.price, quantity: 1 }],
        totalPrice: item.price,
        pickupTime: '12:00 PM', // Simplified
        status: 'pending',
        createdAt: Timestamp.now()
      });
      alert(`Order placed for ${item.name}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  if (selectedVendor) {
    return (
      <div className="py-8 space-y-8">
        <button onClick={() => setSelectedVendor(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <X size={20} /> Back to Vendors
        </button>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3">
            <img src={selectedVendor.logo} alt="" className="w-full aspect-video object-cover rounded-3xl mb-4" />
            <h1 className="text-3xl font-bold">{selectedVendor.name}</h1>
            <p className="text-gray-500 mt-2">{selectedVendor.description}</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} /> {selectedVendor.operatingHours}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Search size={16} /> {selectedVendor.location}
              </div>
            </div>
          </div>
          <div className="md:w-2/3 space-y-6">
            <h2 className="text-2xl font-bold">Menu</h2>
            <div className="grid gap-4">
              {menuItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div className="flex gap-4">
                    <img src={item.photo || 'https://picsum.photos/seed/food/100/100'} alt="" className="w-20 h-20 rounded-xl object-cover" />
                    <div>
                      <h3 className="font-bold">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.description}</p>
                      <span className="text-emerald-600 font-bold">BWP {item.price}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => placeOrder(item)}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700"
                  >
                    Order
                  </button>
                </div>
              ))}
              {menuItems.length === 0 && <p className="text-gray-500">No items available.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={() => setSelectedVendor(vendor)}
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

const VendorDashboard = () => {
  const { user, profile } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', photo: '' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'vendors'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setVendor({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Vendor);
      }
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!vendor) return;
    const qMenu = query(collection(db, `vendors/${vendor.id}/menuItems`));
    const unsubscribeMenu = onSnapshot(qMenu, (snapshot) => {
      setMenuItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem)));
    });

    const qOrders = query(collection(db, 'orders'), where('vendorId', '==', vendor.id), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    return () => { unsubscribeMenu(); unsubscribeOrders(); };
  }, [vendor]);

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;
    try {
      await addDoc(collection(db, `vendors/${vendor.id}/menuItems`), {
        vendorId: vendor.id,
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        photo: newItem.photo || 'https://picsum.photos/seed/food/400/300',
        isAvailable: true,
        category: 'Main'
      });
      setIsModalOpen(false);
      setNewItem({ name: '', description: '', price: '', photo: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `vendors/${vendor.id}/menuItems`);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  if (!vendor) {
    return (
      <div className="py-20 text-center">
        <Store size={48} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold">Become a Vendor</h2>
        <p className="text-gray-500 mb-6">Start selling food to students on campus.</p>
        <button 
          onClick={() => setIsRegModalOpen(true)}
          className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700"
        >
          Register Vendor
        </button>
        <VendorRegistrationModal isOpen={isRegModalOpen} onClose={() => setIsRegModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{vendor.name}</h1>
          <p className="text-gray-500">Status: <span className="capitalize font-bold text-emerald-600">{vendor.status}</span></p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-medium flex items-center gap-2"
        >
          <Plus size={20} /> Add Menu Item
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Active Orders</h2>
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase">Order #{order.id.slice(-4)} • {(order as any).buyerName || 'Student'}</span>
                    <h3 className="font-bold text-lg">{order.items[0].name} {order.items.length > 1 && `+${order.items.length - 1} more`}</h3>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold capitalize",
                    order.status === 'pending' ? "bg-orange-100 text-orange-600" :
                    order.status === 'confirmed' ? "bg-blue-100 text-blue-600" :
                    order.status === 'ready' ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600"
                  )}>
                    {order.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button onClick={() => updateOrderStatus(order.id, 'confirmed')} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-bold">Confirm</button>
                  )}
                  {order.status === 'confirmed' && (
                    <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold">Mark Ready</button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => updateOrderStatus(order.id, 'completed')} className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-sm font-bold">Complete</button>
                  )}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold">Menu Items</h2>
          <div className="grid gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex gap-4">
                  <img src={item.photo} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <span className="text-emerald-600 font-bold">BWP {item.price}</span>
                  </div>
                </div>
                <button className="text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Menu Item">
        <form onSubmit={addMenuItem} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
            <input required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BWP</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">BWP</span>
              <input 
                required 
                type="number" 
                step="0.01" 
                value={newItem.price} 
                onChange={e => setNewItem({...newItem, price: e.target.value})} 
                className="w-full pl-12 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea required value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 h-24" />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold">Add Item</button>
        </form>
      </Modal>
    </div>
  );
};

const AdminDashboard = () => {
  const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'vendors'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
    });
    return unsubscribe;
  }, []);

  const approveVendor = async (vendorId: string) => {
    try {
      await updateDoc(doc(db, 'vendors', vendorId), { status: 'approved' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `vendors/${vendorId}`);
    }
  };

  return (
    <div className="py-8 space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Pending Vendor Approvals</h2>
        <div className="grid gap-6">
          {pendingVendors.map(vendor => (
            <div key={vendor.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
              <div className="flex gap-4">
                <img src={vendor.logo} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                <div>
                  <h3 className="text-xl font-bold">{vendor.name}</h3>
                  <p className="text-gray-500">{vendor.description}</p>
                  <span className="text-xs font-bold text-gray-400">Owner ID: {vendor.ownerId}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => approveVendor(vendor.id)} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700">Approve</button>
                <button className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-100">Reject</button>
              </div>
            </div>
          ))}
          {pendingVendors.length === 0 && <p className="text-gray-500">No pending approvals.</p>}
        </div>
      </div>
    </div>
  );
};

const Profile = ({ initialView = 'profile' }: { initialView?: 'profile' | 'listings' | 'orders' | 'sales' | 'chats' }) => {
  const { user, profile, logout } = useAuth();
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [mySales, setMySales] = useState<Order[]>([]);
  const [myChats, setMyChats] = useState<Chat[]>([]);
  const [view, setView] = useState<'profile' | 'listings' | 'orders' | 'sales' | 'chats'>(initialView);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!user) return;
    const qL = query(collection(db, 'listings'), where('sellerId', '==', user.uid));
    const unsubscribeL = onSnapshot(qL, (snapshot) => {
      setMyListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing)));
    });

    const qO = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
    const unsubscribeO = onSnapshot(qO, (snapshot) => {
      setMyOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const qS = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    const unsubscribeS = onSnapshot(qS, (snapshot) => {
      setMySales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    const qC = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribeC = onSnapshot(qC, (snapshot) => {
      setMyChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
    });

    return () => { unsubscribeL(); unsubscribeO(); unsubscribeS(); unsubscribeC(); };
  }, [user]);

  const startChatWithUser = async (targetUserId: string, listingId?: string, listingTitle?: string) => {
    if (!user) return;
    
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

  if (!profile) return null;

  if (view === 'listings') {
    return (
      <div className="py-12 max-w-4xl mx-auto space-y-8">
        <button onClick={() => setView('profile')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} /> Back to Profile
        </button>
        <h1 className="text-3xl font-bold">My Listings</h1>
        <div className="grid md:grid-cols-2 gap-6">
          {myListings.map(l => (
            <div key={l.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex gap-4">
              <img src={l.photos[0]} alt="" className="w-24 h-24 rounded-2xl object-cover" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold">{l.title}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    l.status === 'available' ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600"
                  )}>
                    {l.status}
                  </span>
                </div>
                <p className="text-emerald-600 font-bold">BWP {l.price}</p>
                <div className="flex gap-2 mt-3">
                  {l.status === 'available' ? (
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'listings', l.id), { status: 'sold' });
                        } catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, `listings/${l.id}`);
                        }
                      }}
                      className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-colors"
                    >
                      Mark as Sold
                    </button>
                  ) : (
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'listings', l.id), { status: 'available' });
                        } catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, `listings/${l.id}`);
                        }
                      }}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      Relist Item
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this listing?")) {
                        try {
                          await deleteDoc(doc(db, 'listings', l.id));
                        } catch (error) {
                          handleFirestoreError(error, OperationType.DELETE, `listings/${l.id}`);
                        }
                      }
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {myListings.length === 0 && <p className="text-gray-500">You haven't posted any listings yet.</p>}
        </div>
      </div>
    );
  }

  if (view === 'orders') {
    return (
      <div className="py-12 max-w-4xl mx-auto space-y-8">
        <button onClick={() => setView('profile')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} /> Back to Profile
        </button>
        <h1 className="text-3xl font-bold">My Orders</h1>
        <div className="space-y-4">
          {myOrders.map(o => (
            <div key={o.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  o.type === 'food' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                )}>
                  {o.type === 'food' ? <Utensils size={24} /> : <ShoppingBag size={24} />}
                </div>
                <div>
                  <h3 className="font-bold">{o.items[0].name}</h3>
                  <p className="text-sm text-gray-500">{o.type === 'food' ? 'Food Order' : 'Marketplace Purchase'} • {new Date(o.createdAt.seconds * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right space-y-2">
                <div>
                  <p className="font-bold text-emerald-600">BWP {o.totalPrice}</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                    o.status === 'pending' ? "bg-orange-100 text-orange-600" :
                    o.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600"
                  )}>{o.status}</span>
                </div>
                {o.type === 'marketplace' && (
                  <button 
                    onClick={() => {
                      startChatWithUser(o.sellerId!, o.listingId, o.items[0].name);
                    }}
                    className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50"
                  >
                    <MessageSquare size={14} /> Message Seller
                  </button>
                )}
              </div>
            </div>
          ))}
          {myOrders.length === 0 && <p className="text-gray-500">You haven't placed any orders yet.</p>}
        </div>
      </div>
    );
  }

  if (view === 'sales') {
    return (
      <div className="py-12 max-w-4xl mx-auto space-y-8">
        <button onClick={() => setView('profile')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} /> Back to Profile
        </button>
        <h1 className="text-3xl font-bold">My Sales</h1>
        <div className="space-y-4">
          {mySales.map(o => (
            <div key={o.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold">{o.items[0].name}</h3>
                <p className="text-sm text-gray-500">Sold to: {(o as any).buyerName || 'Student'}</p>
                <p className="text-xs text-gray-400">{new Date(o.createdAt.seconds * 1000).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-emerald-600">BWP {o.totalPrice}</p>
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                    o.status === 'pending' ? "bg-orange-100 text-orange-600" :
                    o.status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-600"
                  )}>{o.status}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const listing = { id: o.listingId, title: o.items[0].name, sellerId: user.uid } as Listing;
                      // We need a way to start chat with buyer. 
                      // Let's modify startChat to take a targetId.
                      startChatWithUser(o.buyerId, o.listingId, o.items[0].name);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50"
                  >
                    <MessageSquare size={16} /> Message Buyer
                  </button>
                  {o.status === 'pending' && (
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'orders', o.id), { status: 'completed' });
                          if (o.type === 'marketplace' && o.listingId) {
                            await updateDoc(doc(db, 'listings', o.listingId), { status: 'sold' });
                          }
                        } catch (error) {
                          handleFirestoreError(error, OperationType.UPDATE, `orders/${o.id}`);
                        }
                      }}
                      className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {mySales.length === 0 && <p className="text-gray-500">You haven't sold anything yet.</p>}
        </div>
      </div>
    );
  }

  if (view === 'chats') {
    return (
      <div className="py-12 max-w-4xl mx-auto space-y-8">
        <button onClick={() => setView('profile')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
          <ChevronLeft size={20} /> Back to Profile
        </button>
        <h1 className="text-3xl font-bold">My Messages</h1>
        <div className="space-y-4">
          {myChats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => { setActiveChat(chat); setIsChatOpen(true); }}
              className="bg-white p-6 rounded-3xl border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 className="font-bold">{chat.listingTitle || 'Inquiry'}</h3>
                  <p className="text-sm text-gray-500 truncate max-w-[200px]">{chat.lastMessage || 'No messages yet'}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300" />
            </div>
          ))}
          {myChats.length === 0 && <p className="text-gray-500">No active conversations.</p>}
        </div>
        <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} chat={activeChat} />
      </div>
    );
  }

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
              <button 
                onClick={() => setView('orders')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">My Orders</span>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </button>
              <button 
                onClick={() => setView('listings')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Store size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">My Listings</span>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </button>
              <button 
                onClick={() => setView('sales')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">My Sales</span>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </button>
              <button 
                onClick={() => setView('chats')}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">My Messages</span>
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
  const [profileView, setProfileView] = useState<'profile' | 'listings' | 'orders' | 'sales' | 'chats'>('profile');

  const handleMessageClick = () => {
    setProfileView('chats');
    setActiveTab('profile');
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900">
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'profile') setProfileView('profile');
          }} 
          onMessageClick={handleMessageClick}
        />
        
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
              {activeTab === 'profile' && <Profile initialView={profileView} />}
              {activeTab === 'vendor-dashboard' && <VendorDashboard />}
              {activeTab === 'admin-dashboard' && <AdminDashboard />}
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
