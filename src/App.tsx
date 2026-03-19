import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Marketplace } from './pages/Marketplace';
import { FoodOrdering } from './pages/FoodOrdering';
import { VendorDashboard } from './pages/VendorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Profile } from './pages/Profile';
import { ChatModal } from './components/ChatModal';
import { CampusAssistant } from './components/CampusAssistant';
import { Chat } from './types';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { loading } = useAuth();

  const handleChatOpen = (chat: Chat) => {
    setActiveChat(chat);
    setIsChatOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <motion.div 
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full" 
          />
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-400 font-display font-medium tracking-widest uppercase text-xs"
          >
            Initializing CampusCart
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col selection:bg-brand-500/20 selection:text-brand-700">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onMessageClick={() => setActiveTab('profile')} 
      />

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
            transition={{ 
              type: "spring",
              stiffness: 100,
              damping: 20,
              duration: 0.4 
            }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
          >
            {activeTab === 'home' && <Home setActiveTab={setActiveTab} />}
            {activeTab === 'marketplace' && <Marketplace />}
            {activeTab === 'food' && <FoodOrdering />}
            {activeTab === 'vendor-dashboard' && <VendorDashboard />}
            {activeTab === 'admin-dashboard' && <AdminDashboard />}
            {activeTab === 'profile' && <Profile onChatClick={handleChatOpen} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        chat={activeChat} 
      />

      <CampusAssistant />

      <footer className="bg-white border-t border-slate-100 py-20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <h3 className="text-2xl font-display font-bold text-slate-900 mb-6">CampusCart</h3>
              <p className="text-slate-500 max-w-sm leading-relaxed">
                The ultimate campus companion for food pre-ordering and student marketplace. 
                Built by students, for students.
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Quick Links</h4>
              <ul className="space-y-4 text-slate-500 text-sm">
                <li><button onClick={() => setActiveTab('home')} className="hover:text-brand-600 transition-colors">Home</button></li>
                <li><button onClick={() => setActiveTab('food')} className="hover:text-brand-600 transition-colors">Food Ordering</button></li>
                <li><button onClick={() => setActiveTab('marketplace')} className="hover:text-brand-600 transition-colors">Marketplace</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-900 mb-6 uppercase text-xs tracking-widest">Support</h4>
              <ul className="space-y-4 text-slate-500 text-sm">
                <li><a href="#" className="hover:text-brand-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-50 mt-20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs uppercase tracking-widest font-medium">
            <span>© {new Date().getFullYear()} CampusCart. All rights reserved.</span>
            <div className="flex gap-8">
              <a href="#" className="hover:text-slate-600 transition-colors">Twitter</a>
              <a href="#" className="hover:text-slate-600 transition-colors">Instagram</a>
              <a href="#" className="hover:text-slate-600 transition-colors">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
