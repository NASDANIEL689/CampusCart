import React, { useState } from 'react';
import { ShoppingBag, Utensils, Store, LayoutDashboard, ShieldCheck, MessageSquare, User as UserIcon, LogOut, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

export const Navbar = ({ activeTab, setActiveTab, onMessageClick }: { activeTab: string, setActiveTab: (tab: string) => void, onMessageClick?: () => void }) => {
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
