import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, 
  Play, 
  Search, 
  Filter, 
  Youtube, 
  Lock,
  Eye,
  Clock,
  Plus,
  ArrowRight,
  Activity,
  Zap
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { cn } from '../lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function VideoLibraryPage() {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'videos');
    });
    return () => unsubscribe();
  }, []);

  // Mock data if empty
  const displayVideos = videos.length > 0 ? videos : [
    { id: '1', title: 'Introduction to React Hooks', subject: 'Web Dev', date: '2024-03-10', duration: '45:20', views: 124, visibility: 'public' },
    { id: '2', title: 'Advanced CSS Grid Layouts', subject: 'Web Dev', date: '2024-03-12', duration: '38:15', views: 89, visibility: 'unlisted' },
    { id: '3', title: 'Firebase Auth Integration', subject: 'Full Stack', date: '2024-03-14', duration: '52:40', views: 210, visibility: 'private' },
  ];

  const filteredVideos = displayVideos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-12"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-[#5A5A40]/30" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-montserrat font-black text-[#5A5A40]/60">Knowledge Repository</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-playfair font-black tracking-tighter leading-[0.9] text-stone-900">
            Video Library<span className="text-[#5A5A40]">.</span>
          </h1>
          <p className="text-xl text-stone-500 font-montserrat font-medium italic max-w-md leading-relaxed">
            Access recorded lectures and curated tutorials to master your craft.
          </p>
        </motion.div>
        
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative group">
            <Search className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-[#5A5A40]/40 group-focus-within:text-[#5A5A40] transition-colors" />
            <input 
              type="text" 
              placeholder="Search lectures..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 pr-6 py-4 bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl focus:ring-4 focus:ring-[#5A5A40]/10 outline-none w-full md:w-80 font-montserrat font-bold text-stone-800 transition-all shadow-xl shadow-black/5"
            />
          </div>
          {profile?.role === 'faculty' && (
            <button className="bg-[#5A5A40] text-white p-4 rounded-2xl hover:bg-[#4A4A30] transition-all shadow-xl shadow-[#5A5A40]/20 active:scale-95">
              <Plus className="w-6 h-6" />
            </button>
          )}
        </motion.div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence mode="popLayout">
          {filteredVideos.map((video, i) => (
            <motion.div
              key={video.id}
              variants={itemVariants}
              layout
              className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-2xl overflow-hidden group hover:shadow-3xl transition-all duration-500"
            >
              <div className="aspect-video bg-stone-900 relative flex items-center justify-center overflow-hidden">
                <img 
                  src={`https://picsum.photos/seed/${video.id}/640/360`} 
                  alt={video.title}
                  className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white hover:text-[#5A5A40] transition-all z-10 shadow-2xl"
                >
                  <Play className="w-10 h-10 fill-current ml-1" />
                </motion.button>
                
                <div className="absolute bottom-6 right-6 px-4 py-2 bg-black/40 backdrop-blur-md text-white text-[10px] font-montserrat font-black uppercase tracking-widest rounded-xl border border-white/10">
                  {video.duration}
                </div>
                
                <div className="absolute top-6 left-6">
                  {video.visibility === 'private' ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-500/80 backdrop-blur-md text-white text-[10px] font-montserrat font-black uppercase tracking-widest rounded-xl border border-white/10 shadow-lg">
                      <Lock className="w-3 h-3" /> Private
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-montserrat font-black uppercase tracking-widest rounded-xl border border-white/10 shadow-lg">
                      <Youtube className="w-3 h-3" /> {video.visibility}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-montserrat font-black text-[#5A5A40] uppercase tracking-[0.2em]">{video.subject}</span>
                    <span className="w-1 h-1 bg-stone-300 rounded-full" />
                    <span className="text-[10px] font-montserrat font-bold text-stone-400 uppercase tracking-widest">{video.date}</span>
                  </div>
                  <h3 className="text-2xl font-playfair font-black text-stone-900 line-clamp-2 leading-tight group-hover:text-[#5A5A40] transition-colors">
                    {video.title}
                  </h3>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-stone-100">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-montserrat font-black uppercase tracking-widest text-stone-400">
                      <Eye className="w-4 h-4 text-[#5A5A40]/40" /> {video.views}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-montserrat font-black uppercase tracking-widest text-stone-400">
                      <Clock className="w-4 h-4 text-[#5A5A40]/40" /> 2d ago
                    </div>
                  </div>
                  <button className="text-[#5A5A40] text-[10px] font-montserrat font-black uppercase tracking-widest flex items-center gap-2 group/btn">
                    Details
                    <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredVideos.length === 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-32 text-center space-y-6"
        >
          <div className="w-24 h-24 bg-stone-100 rounded-[2rem] flex items-center justify-center mx-auto text-stone-300">
            <Video className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-playfair font-black text-stone-900 italic">No lectures found</h3>
            <p className="text-stone-400 font-montserrat font-medium">Try adjusting your search criteria.</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
