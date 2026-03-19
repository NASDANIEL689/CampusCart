import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Utensils, 
  Store, 
  LayoutDashboard, 
  ShieldCheck, 
  MessageSquare, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  Home as HomeIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { NotificationCenter } from './NotificationCenter';

export const Navbar = ({ activeTab, setActiveTab, onMessageClick }: { activeTab: string, setActiveTab: (tab: string) => void, onMessageClick?: () => void }) => {
  const { profile, signIn, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
    { id: 'food', label: 'Food', icon: Utensils },
  ];

  if (profile?.role === 'vendor') {
    tabs.push({ id: 'vendor-dashboard', label: 'Dashboard', icon: LayoutDashboard });
  }
  if (profile?.role === 'admin') {
    tabs.push({ id: 'admin-dashboard', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <nav className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 pt-4">
      <div className="max-w-7xl mx-auto">
        <div className="glass rounded-3xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <button 
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 group"
            >
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
                <ShoppingBag size={20} />
              </div>
              <span className="text-xl font-display font-bold tracking-tight text-slate-900">
                Campus<span className="text-brand-600">Cart</span>
              </span>
            </button>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2.5 px-4 py-2 rounded-xl transition-all duration-300 text-sm font-medium",
                      isActive 
                        ? "text-brand-600" 
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute -bottom-1 left-4 right-4 h-0.5 bg-brand-500 rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {profile ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
                <NotificationCenter />
                
                <button 
                  onClick={onMessageClick}
                  className="p-2.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all relative"
                  title="My Messages"
                >
                  <MessageSquare size={20} />
                </button>
                
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={cn(
                    "flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all",
                    activeTab === 'profile' ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-200 overflow-hidden border border-white shadow-sm">
                    {profile.photoURL ? (
                      <img src={profile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-100 text-brand-700 font-bold">
                        {profile.displayName?.[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{profile.displayName.split(' ')[0]}</span>
                </button>

                <button 
                  onClick={logout} 
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Sign Out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={signIn}
                className="btn-primary flex items-center gap-2 py-2.5"
              >
                <UserIcon size={18} />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-24 left-4 right-4 glass rounded-3xl p-6 shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                  className={cn(
                    "flex items-center gap-3 w-full p-4 rounded-2xl text-lg font-medium transition-colors",
                    activeTab === tab.id ? "bg-brand-50 text-brand-600" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <tab.icon size={24} />
                  {tab.label}
                </button>
              ))}
              <div className="h-px bg-slate-100 my-4" />
              {profile ? (
                <div className="space-y-2">
                  <button 
                    onClick={() => { onMessageClick?.(); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 w-full p-4 rounded-2xl text-slate-600 hover:bg-slate-50"
                  >
                    <MessageSquare size={24} />
                    <span className="text-lg font-medium">Messages</span>
                  </button>
                  <button 
                    onClick={() => { setActiveTab('profile'); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 w-full p-4 rounded-2xl text-slate-600 hover:bg-slate-50"
                  >
                    <UserIcon size={24} />
                    <span className="text-lg font-medium">Profile</span>
                  </button>
                  <button 
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="flex items-center gap-3 w-full p-4 rounded-2xl text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={24} />
                    <span className="text-lg font-medium">Logout</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { signIn(); setIsMenuOpen(false); }}
                  className="btn-primary w-full py-4 text-lg"
                >
                  Sign In with Google
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
