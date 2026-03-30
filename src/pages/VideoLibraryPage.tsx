import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, Variants } from 'motion/react';
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
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
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
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    subjectId: '',
    youtubeUrl: '',
    visibility: 'public' as 'private' | 'unlisted' | 'public'
  });

  useEffect(() => {
    const vQ = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribeVideos = onSnapshot(vQ, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'videos');
    });

    const sQ = query(collection(db, 'subjects'), orderBy('name', 'asc'));
    const unsubscribeSubjects = onSnapshot(sQ, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'subjects');
    });

    return () => {
      unsubscribeVideos();
      unsubscribeSubjects();
    };
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || profile.role !== 'faculty') return;
    if (!newVideo.title || !newVideo.subjectId || !newVideo.youtubeUrl) return;

    setIsUploading(true);
    try {
      const subject = subjects.find(s => s.id === newVideo.subjectId);
      await addDoc(collection(db, 'videos'), {
        ...newVideo,
        facultyId: profile.uid,
        subjectName: subject?.name || 'Unknown',
        createdAt: serverTimestamp(),
        views: 0,
        duration: '0:00' // Mock duration
      });
      setIsUploadModalOpen(false);
      setNewVideo({ title: '', subjectId: '', youtubeUrl: '', visibility: 'public' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'videos');
    } finally {
      setIsUploading(false);
    }
  };

  const updateVisibility = async (videoId: string, visibility: string) => {
    try {
      await updateDoc(doc(db, 'videos', videoId), { visibility });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `videos/${videoId}`);
    }
  };

  const filteredVideos = videos.filter(v => {
    const matchesSearch = 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Admin sees everything
    if (profile?.role === 'admin') return matchesSearch;
    
    // Faculty sees their own (any visibility) + public from others
    if (profile?.role === 'faculty') {
      if (v.facultyId === profile.uid) return matchesSearch;
      return matchesSearch && v.visibility === 'public';
    }
    
    // Students see only public videos in the library
    return matchesSearch && v.visibility === 'public';
  });

  return (
    <div className="relative min-h-screen">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -right-[10%] w-[70%] h-[70%] bg-[#5A5A40]/10 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-stone-500/10 blur-[120px] rounded-full"
        />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 space-y-8 md:space-y-12 pb-24 px-4 md:px-0"
      >
        {/* Header Section */}
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-xl shadow-[#5A5A40]/20">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-5xl font-playfair font-black text-white tracking-tight">
                Video Library
              </h1>
            </div>
            <p className="text-base md:text-lg text-white/50 font-montserrat font-medium italic leading-relaxed max-w-xl">
              Explore our curated collection of educational content and recorded sessions.
            </p>
          </div>

          {(profile?.role === 'admin' || profile?.role === 'faculty') && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-white text-[#5A5A40] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all shadow-xl shadow-white/10 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Upload Content
            </button>
          )}
        </motion.header>

        {/* Search & Filter Bar */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="Search videos by title or subject..."
              className="w-full pl-14 pr-6 py-5 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-medium text-sm text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
          <AnimatePresence mode="popLayout">
            {filteredVideos.map((video) => (
              <motion.div
                key={video.id}
                variants={itemVariants}
                layout
                whileHover={{ y: -12 }}
                className="group bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden hover:border-white/40 transition-all duration-500 flex flex-col"
              >
                {/* Thumbnail Container */}
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
                    className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white hover:text-[#5A5A40] transition-all z-10 shadow-2xl"
                  >
                    <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1" />
                  </motion.button>
                  
                  <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-3 md:px-4 py-1.5 md:py-2 bg-black/40 backdrop-blur-md text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10">
                    {video.duration}
                  </div>
                  
                  <div className="absolute top-4 left-4 md:top-6 md:left-6 flex flex-col gap-2">
                    {video.visibility === 'private' ? (
                      <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-red-500/80 backdrop-blur-md text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 shadow-lg">
                        <Lock className="w-3 h-3" /> Private
                      </div>
                    ) : video.visibility === 'unlisted' ? (
                      <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-amber-500/80 backdrop-blur-md text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 shadow-lg">
                        <Eye className="w-3 h-3 opacity-50" /> Unlisted
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-500/80 backdrop-blur-md text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 shadow-lg">
                        <Youtube className="w-3 h-3" /> Public
                      </div>
                    )}

                    {profile?.uid === video.facultyId && (
                      <select 
                        className="bg-black/60 backdrop-blur-md text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl border border-white/10 px-3 py-1 outline-none cursor-pointer hover:bg-black/80 transition-all"
                        value={video.visibility}
                        onChange={(e) => updateVisibility(video.id, e.target.value)}
                      >
                        <option value="public" className="bg-stone-900">Public</option>
                        <option value="unlisted" className="bg-stone-900">Unlisted</option>
                        <option value="private" className="bg-stone-900">Private</option>
                      </select>
                    )}
                  </div>
                </div>
                
                {/* Content Container */}
                <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#5A5A40] uppercase tracking-[0.2em]">{video.subjectName || 'General'}</span>
                      <span className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        {video.createdAt?.toDate ? format(video.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently'}
                      </span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-playfair font-black text-white line-clamp-2 leading-tight group-hover:text-[#5A5A40] transition-colors">
                      {video.title}
                    </h3>
                  </div>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/30">
                        <Eye className="w-4 h-4 text-[#5A5A40]/40" /> {video.views}
                      </div>
                      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white/30">
                        <Clock className="w-4 h-4 text-[#5A5A40]/40" /> 2d ago
                      </div>
                    </div>
                    <button className="text-[#5A5A40] text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group/btn">
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
            className="py-32 text-center space-y-6 bg-white/5 rounded-[3rem] border border-white/10 border-dashed"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-[2rem] flex items-center justify-center mx-auto text-white/20">
              <Video className="w-10 h-10 md:w-12 md:h-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl md:text-3xl font-playfair font-black text-white italic">No lectures found</h3>
              <p className="text-white/40 font-montserrat font-medium italic">Try adjusting your search criteria.</p>
            </div>
          </motion.div>
        )}

        {/* Upload Modal */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-[#5A5A40]/90 backdrop-blur-2xl rounded-[3rem] p-8 md:p-12 shadow-3xl overflow-hidden border border-white/20"
              >
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-playfair font-black text-white">Upload Lecture</h2>
                    <p className="text-white/40 font-montserrat font-medium italic">Share your knowledge with the community.</p>
                  </div>

                  <form onSubmit={handleUpload} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Lecture Title</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g., Introduction to Quantum Mechanics"
                        className="w-full px-6 py-4 bg-white/10 border border-white/10 rounded-2xl focus:ring-4 focus:ring-white/5 outline-none transition-all font-bold text-white"
                        value={newVideo.title}
                        onChange={(e) => setNewVideo({...newVideo, title: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Subject</label>
                        <select 
                          required
                          className="w-full px-6 py-4 bg-white/10 border border-white/10 rounded-2xl focus:ring-4 focus:ring-white/5 outline-none transition-all font-black text-[10px] uppercase tracking-widest text-white appearance-none cursor-pointer"
                          value={newVideo.subjectId}
                          onChange={(e) => setNewVideo({...newVideo, subjectId: e.target.value})}
                        >
                          <option value="" className="bg-[#5A5A40]">Select Subject</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id} className="bg-[#5A5A40]">{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Visibility</label>
                        <select 
                          className="w-full px-6 py-4 bg-white/10 border border-white/10 rounded-2xl focus:ring-4 focus:ring-white/5 outline-none transition-all font-black text-[10px] uppercase tracking-widest text-white appearance-none cursor-pointer"
                          value={newVideo.visibility}
                          onChange={(e) => setNewVideo({...newVideo, visibility: e.target.value as any})}
                        >
                          <option value="public" className="bg-[#5A5A40]">Public</option>
                          <option value="unlisted" className="bg-[#5A5A40]">Unlisted</option>
                          <option value="private" className="bg-[#5A5A40]">Private</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">YouTube URL</label>
                      <input 
                        type="url" 
                        required
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full px-6 py-4 bg-white/10 border border-white/10 rounded-2xl focus:ring-4 focus:ring-white/5 outline-none transition-all font-bold text-white"
                        value={newVideo.youtubeUrl}
                        onChange={(e) => setNewVideo({...newVideo, youtubeUrl: e.target.value})}
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsUploadModalOpen(false)}
                        className="flex-1 py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white/40 hover:bg-white/5 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isUploading}
                        className="flex-1 py-4 md:py-5 bg-white text-[#5A5A40] rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all shadow-xl shadow-white/10 disabled:opacity-50 active:scale-95"
                      >
                        {isUploading ? 'Uploading...' : 'Publish Lecture'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
