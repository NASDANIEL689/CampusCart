import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading CampusCart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onMessageClick={() => setActiveTab('profile')} 
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
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

      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <h3 className="text-xl font-bold text-gray-900 mb-4">CampusCart</h3>
              <p className="text-gray-500 max-w-sm">
                The ultimate campus companion for food pre-ordering and student marketplace. 
                Built by students, for students.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><button onClick={() => setActiveTab('home')}>Home</button></li>
                <li><button onClick={() => setActiveTab('food')}>Food Ordering</button></li>
                <li><button onClick={() => setActiveTab('marketplace')}>Marketplace</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-500 text-sm">
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-50 mt-12 pt-8 text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} CampusCart. All rights reserved.
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
