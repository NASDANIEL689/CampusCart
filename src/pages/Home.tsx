import React from 'react';
import { motion } from 'framer-motion';
import { Utensils, Store, ShieldCheck } from 'lucide-react';
import { cn } from '../utils/cn';
import { seedData } from '../seed';

export const Home = ({ setActiveTab }: { setActiveTab: (tab: string) => void }) => {
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
