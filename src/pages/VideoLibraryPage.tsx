import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { 
  Video, 
  Play, 
  Search, 
  Filter, 
  Youtube, 
  Lock,
  Eye,
  Clock,
  Plus
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';

export default function VideoLibraryPage() {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<any[]>([]);

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

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Video Library</h1>
          <p className="text-gray-500 font-serif italic">Watch recorded lectures and tutorials</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search lectures..." 
              className="pl-12 pr-4 py-3 bg-white border border-black/5 rounded-2xl focus:ring-2 focus:ring-[#5A5A40] outline-none w-full md:w-64"
            />
          </div>
          {profile?.role === 'faculty' && (
            <button className="bg-[#5A5A40] text-white p-3 rounded-2xl hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20">
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayVideos.map((video, i) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden group"
          >
            <div className="aspect-video bg-gray-900 relative flex items-center justify-center overflow-hidden">
              <img 
                src={`https://picsum.photos/seed/${video.id}/640/360`} 
                alt={video.title}
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
              <button className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white hover:text-[#5A5A40] transition-all z-10">
                <Play className="w-8 h-8 fill-current" />
              </button>
              <div className="absolute bottom-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-bold rounded-lg">
                {video.duration}
              </div>
              <div className="absolute top-4 left-4">
                {video.visibility === 'private' ? (
                  <div className="flex items-center gap-1 px-2 py-1 bg-red-500/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg uppercase">
                    <Lock className="w-3 h-3" /> Private
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg uppercase">
                    <Youtube className="w-3 h-3" /> {video.visibility}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest">{video.subject}</span>
                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{video.date}</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-gray-900 mb-4 line-clamp-1">{video.title}</h3>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Eye className="w-4 h-4" /> {video.views}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-4 h-4" /> 2d ago
                  </div>
                </div>
                <button className="text-[#5A5A40] hover:underline text-sm font-bold">Details</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
