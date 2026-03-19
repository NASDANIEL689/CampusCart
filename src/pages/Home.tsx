import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  Utensils, 
  ArrowRight, 
  Star, 
  Clock, 
  Shield, 
  Zap,
  ChevronRight,
  Store,
  User as UserIcon,
  MessageSquare,
  Navigation,
  MapPin
} from 'lucide-react';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Listing, Vendor } from '../types';

export const Home = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
  const [popularProducts, setPopularProducts] = useState<Listing[]>([]);
  const [popularVendors, setPopularVendors] = useState<Vendor[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(true);

  const [stats, setStats] = useState({
    users: '0',
    listings: '0',
    vendors: '0',
    avgRating: '0'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersSnap, listingsSnap, vendorsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'listings'), where('status', '==', 'available'))),
          getDocs(query(collection(db, 'vendors'), where('status', '==', 'approved')))
        ]);

        const vendors = vendorsSnap.docs.map(doc => doc.data() as Vendor);
        const avgRating = vendors.length > 0 
          ? (vendors.reduce((acc, v) => acc + (v.rating || 0), 0) / vendors.length).toFixed(1)
          : '0';

        setStats({
          users: usersSnap.size > 1000 ? `${(usersSnap.size / 1000).toFixed(1)}k+` : `${usersSnap.size}+`,
          listings: listingsSnap.size.toString(),
          vendors: vendorsSnap.size.toString(),
          avgRating: `${avgRating}/5`
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        const q = query(
          collection(db, 'listings'),
          where('status', '==', 'available'),
          orderBy('createdAt', 'desc'),
          limit(4)
        );
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
        setPopularProducts(products);
      } catch (error) {
        console.error("Error fetching popular products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    const fetchPopularVendors = async () => {
      try {
        const q = query(
          collection(db, 'vendors'),
          where('status', '==', 'approved'),
          orderBy('rating', 'desc'),
          limit(3)
        );
        const snapshot = await getDocs(q);
        const vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
        setPopularVendors(vendors);
      } catch (error) {
        console.error("Error fetching popular vendors:", error);
      } finally {
        setLoadingVendors(false);
      }
    };

    fetchPopularProducts();
    fetchPopularVendors();
  }, []);

  return (
    <div className="space-y-32 pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden rounded-[3rem] bg-slate-900 text-white px-6">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
              rotate: [0, 90, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-1/2 -left-1/4 w-full h-full bg-brand-500/20 blur-[120px] rounded-full"
          />
          <motion.div 
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, -90, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-blue-500/10 blur-[120px] rounded-full"
          />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-brand-300 text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Zap size={14} />
            <span>The Future of Campus Life</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-display font-bold leading-[0.9] mb-8 tracking-tighter"
          >
            ELEVATE YOUR <br />
            <span className="text-brand-500 italic">CAMPUS</span> EXPERIENCE
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Your campus, supercharged. From marketplace steals to lunchtime deals, 
            join students already redefining the university experience.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => setActiveTab('marketplace')}
              className="group btn-primary text-lg px-8 py-4 flex items-center gap-3 bg-white text-slate-900 hover:bg-brand-500 hover:text-white"
            >
              Start Exploring
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setActiveTab('food')}
              className="px-8 py-4 rounded-2xl font-semibold border border-white/20 hover:bg-white/10 transition-all"
            >
              Order Food
            </button>
          </motion.div>
        </div>
      </section>

      {/* Popular Products Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-6 leading-tight">
              Popular in the <br />
              <span className="text-brand-600">Marketplace.</span>
            </h2>
            <p className="text-slate-500 text-lg">
              Check out what's trending on campus. From textbooks to tech, find the best deals from your fellow students.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('marketplace')}
            className="flex items-center gap-2 text-brand-600 font-bold hover:gap-3 transition-all"
          >
            View all products <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {loadingProducts ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] bg-slate-100 animate-pulse rounded-[2.5rem]" />
            ))
          ) : popularProducts.length > 0 ? (
            popularProducts.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -10 }}
                onClick={() => setActiveTab('marketplace')}
                className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 cursor-pointer"
              >
                <div className="aspect-[4/5] relative overflow-hidden">
                  <img 
                    src={product.photos?.[0] || `https://picsum.photos/seed/${product.id}/600/800`} 
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-sm font-display font-bold text-brand-700 shadow-sm">
                    BWP {product.price}
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 block">{product.category}</span>
                    <h3 className="font-display font-bold text-slate-900 text-lg truncate group-hover:text-brand-600 transition-colors">{product.title}</h3>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-brand-50 flex items-center justify-center text-[10px] font-bold text-brand-600">
                        {product.sellerName?.[0] || 'S'}
                      </div>
                      <span className="text-xs font-semibold text-slate-500 truncate max-w-[80px]">
                        {product.sellerName?.split(' ')[0] || 'Seller'}
                      </span>
                    </div>
                    <MessageSquare size={16} className="text-slate-300 group-hover:text-brand-600 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
              <ShoppingBag className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No products yet</h3>
              <p className="text-slate-500 mb-6">Be the first to list something on campus!</p>
              <button 
                onClick={() => setActiveTab('marketplace')}
                className="btn-primary"
              >
                Go to Marketplace
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Popular Food Vendors Grid */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-6 leading-tight">
              Top Rated <br />
              <span className="text-brand-600">Food Vendors.</span>
            </h2>
            <p className="text-slate-500 text-lg">
              The best campus eats, rated by students. Pre-order now and skip the lunchtime rush.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('food')}
            className="flex items-center gap-2 text-brand-600 font-bold hover:gap-3 transition-all"
          >
            Explore all vendors <ChevronRight size={20} />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {loadingVendors ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-[3rem]" />
            ))
          ) : popularVendors.length > 0 ? (
            popularVendors.map((vendor, i) => (
              <motion.div 
                key={vendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -12 }}
                onClick={() => setActiveTab('food')}
                className="group bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-3xl hover:shadow-brand-500/10 transition-all duration-700 cursor-pointer"
              >
                <div className="h-56 relative overflow-hidden">
                  <img 
                    src={vendor.logo || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1000'} 
                    alt={vendor.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                  <div className="absolute bottom-6 left-8 right-8 text-white space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-400">
                      <Clock size={12} />
                      <span>{vendor.operatingHours}</span>
                    </div>
                    <h3 className="text-2xl font-display font-black leading-none">{vendor.name}</h3>
                  </div>
                  <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-black text-slate-900">{vendor.rating ? vendor.rating.toFixed(1) : 'New'}</span>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <p className="text-slate-500 font-medium line-clamp-2 leading-relaxed">{vendor.description}</p>
                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                      <MapPin size={16} />
                      <span>{vendor.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-3 transition-all">
                      <span>Order Now</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
              <Utensils className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No vendors yet</h3>
              <p className="text-slate-500 mb-6">Be the first vendor to join our platform!</p>
              <button 
                onClick={() => setActiveTab('food')}
                className="btn-primary"
              >
                Go to Food Ordering
              </button>
            </div>
          )}
        </div>
      </section>

      {/* New Refined Social Proof / CTA */}
      <section className="bg-slate-900 rounded-[4rem] p-12 md:p-24 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-display font-bold leading-[0.9] tracking-tighter">
                JOIN THE <br />
                <span className="text-brand-500 italic">CAMPUS</span> REVOLUTION.
              </h2>
              <p className="text-slate-400 text-xl max-w-md leading-relaxed">
                Experience a smarter, faster, and more connected campus life. Start trading and ordering today.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setActiveTab('marketplace')}
                className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-500 hover:text-white transition-all shadow-2xl shadow-black/20"
              >
                Get Started Now
              </button>
              <button 
                onClick={() => setActiveTab('food')}
                className="px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all"
              >
                View Food Menu
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            {[
              { label: 'Student Rating', value: stats.avgRating, icon: <Star className="fill-brand-500 text-brand-500" size={20} /> },
              { label: 'Active Vendors', value: stats.vendors, icon: <Store className="text-brand-500" size={20} /> },
              { label: 'Active Users', value: stats.users, icon: <UserIcon className="text-brand-500" size={20} /> },
              { label: 'Live Listings', value: stats.listings, icon: <ShoppingBag className="text-brand-500" size={20} /> }
            ].map((item, i) => (
              <motion.div 
                key={i}
                whileHover={{ scale: 1.05 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  {item.icon}
                </div>
                <div>
                  <div className="text-4xl font-display font-bold mb-1">{item.value}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">{item.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
