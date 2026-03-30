import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { 
  Beaker, 
  Trophy, 
  Github, 
  CheckCircle2, 
  Plus,
  Zap,
  Users,
  Search,
  Filter,
  ArrowRight,
  X,
  Dna,
  Atom,
  FlaskConical
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { cn } from '../lib/utils';

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

import { useNavigate } from 'react-router-dom';

export default function LabsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [labs, setLabs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLab, setNewLab] = useState({ title: '', difficulty: 'easy', weight: 10 });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'labs'), orderBy('difficulty', 'asc'));
    const unsubscribeLabs = onSnapshot(q, (snapshot) => {
      setLabs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'labs');
    });

    let unsubscribeSubs = () => {};
    if (profile?.uid && profile.role === 'student') {
      const subQ = query(collection(db, 'lab_submissions'), where('studentId', '==', profile.uid));
      unsubscribeSubs = onSnapshot(subQ, (snapshot) => {
        const subs: Record<string, any> = {};
        snapshot.docs.forEach(doc => {
          subs[doc.data().labId] = doc.data();
        });
        setSubmissions(subs);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'lab_submissions'));
    }

    return () => {
      unsubscribeLabs();
      unsubscribeSubs();
    };
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'labs'), {
        ...newLab,
        facultyId: profile?.uid,
        facultyName: profile?.displayName,
        createdAt: serverTimestamp(),
      });
      setShowCreateModal(false);
      setNewLab({ title: '', difficulty: 'easy', weight: 10 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'labs');
    }
  };

  const filteredLabs = labs.map(lab => ({
    ...lab,
    completed: !!submissions[lab.id]
  })).filter(lab => 
    lab.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completionRate = labs.length > 0 ? (Object.keys(submissions).length / labs.length) * 100 : 0;

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
          className="absolute -top-[10%] -right-[10%] w-[70%] h-[70%] bg-[#5A5A40]/5 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] bg-stone-500/5 blur-[120px] rounded-full"
        />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 space-y-8 md:space-y-10 pb-24 px-4 md:px-0"
      >
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl md:text-4xl font-playfair font-black text-stone-900 tracking-tight mb-2">
              {profile?.role === 'student' ? 'Laboratory Hub' : 'Lab Administration'}
            </h1>
            <p className="text-stone-500 font-montserrat font-medium italic text-sm md:text-base">
              {profile?.role === 'student' ? 'Master practical skills through immersive experiments' : 'Design and monitor student laboratory progress'}
            </p>
          </motion.div>
          
          <motion.div variants={itemVariants} className="flex items-center gap-4">
            {profile?.role === 'student' ? (
              <div className="flex items-center gap-4 bg-white/30 backdrop-blur-xl p-2 md:p-3 pr-6 rounded-[2rem] border border-white/50 shadow-xl">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] text-stone-400 uppercase font-black tracking-widest leading-none mb-1">Global Rank</p>
                  <p className="text-lg md:text-xl font-playfair font-black text-stone-900 leading-none">#42</p>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="w-full md:w-auto flex items-center justify-center gap-3 bg-[#5A5A40] text-white px-8 py-4 rounded-2xl font-montserrat font-bold text-sm hover:bg-[#4A4A30] transition-all shadow-xl shadow-[#5A5A40]/20 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                New Experiment
              </button>
            )}
          </motion.div>
        </header>

        {profile?.role === 'student' && (
          <motion.div 
            variants={itemVariants}
            className="bg-white/30 backdrop-blur-2xl p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-white/50 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#5A5A40]/5 blur-[80px] rounded-full" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-playfair font-bold text-xl md:text-2xl text-stone-900">Overall Mastery</h3>
                <span className="text-2xl md:text-3xl font-playfair font-black text-[#5A5A40]">{completionRate.toFixed(0)}%</span>
              </div>
              
              <div className="w-full h-4 md:h-5 bg-stone-100/50 rounded-full overflow-hidden p-1 shadow-inner mb-8 md:mb-10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-[#5A5A40] rounded-full shadow-lg"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
                {[
                  { label: 'Experiments Solved', value: '12', icon: FlaskConical, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Skill Points Earned', value: '450', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Achievement Badges', value: '3', icon: Trophy, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-4 md:gap-5 p-4 md:p-5 rounded-2xl md:rounded-3xl bg-white/40 border border-white/50">
                    <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0", stat.bg)}>
                      <stat.icon className={cn("w-6 h-6 md:w-7 md:h-7", stat.color)} />
                    </div>
                    <div>
                      <p className="text-xl md:text-2xl font-playfair font-black text-stone-900">{stat.value}</p>
                      <p className="text-[9px] md:text-[10px] text-stone-400 font-montserrat font-black uppercase tracking-widest">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-[#5A5A40] transition-colors" />
            <input 
              type="text" 
              placeholder="Search experiments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-white/30 backdrop-blur-xl border border-white/50 focus:ring-4 focus:ring-[#5A5A40]/10 outline-none font-montserrat font-medium text-stone-800 shadow-xl transition-all"
            />
          </div>
          <button className="px-8 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-white/30 backdrop-blur-xl border border-white/50 text-stone-600 font-montserrat font-bold text-sm flex items-center justify-center gap-3 hover:bg-white/50 transition-all shadow-xl active:scale-95">
            <Filter className="w-5 h-5" /> Filters
          </button>
        </motion.div>

        {/* Labs Grid */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8"
        >
          {filteredLabs.map((lab, i) => (
            <motion.div
              key={lab.id}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className={cn(
                "p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border transition-all flex flex-col sm:flex-row items-center gap-6 md:gap-8 bg-white/30 backdrop-blur-xl shadow-2xl group",
                lab.completed ? "border-emerald-200/50" : "border-white/50"
              )}
            >
              <div className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:rotate-6 duration-500",
                lab.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
                lab.difficulty === 'medium' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
              )}>
                {lab.completed ? <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10" /> : <Beaker className="w-8 h-8 md:w-10 md:h-10" />}
              </div>
              
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                  <span className={cn(
                    "text-[9px] md:text-[10px] uppercase font-montserrat font-black tracking-widest px-3 py-1 rounded-full",
                    lab.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                    lab.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                  )}>
                    {lab.difficulty}
                  </span>
                  <span className="text-[9px] md:text-[10px] text-stone-400 font-montserrat font-black uppercase tracking-widest">{lab.weight} PTS</span>
                </div>
                <h4 className="text-lg md:text-xl font-playfair font-bold text-stone-900 truncate mb-1">{lab.title}</h4>
                <p className="text-[10px] md:text-xs text-stone-500 font-montserrat font-medium">Practical Session #{i + 1}</p>
              </div>

              <div className="flex flex-row sm:flex-col gap-3 w-full sm:w-auto justify-center">
                {profile?.role === 'student' ? (
                  lab.completed ? (
                    <button 
                      onClick={() => navigate(`/labs/${lab.id}`)}
                      className="w-12 h-12 bg-stone-100/50 rounded-2xl flex items-center justify-center text-stone-400 hover:text-[#5A5A40] hover:bg-white transition-all shadow-sm"
                    >
                      <Github className="w-6 h-6" />
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(`/labs/${lab.id}`)}
                      className="flex-1 sm:flex-none px-6 py-3 bg-[#5A5A40] text-white rounded-2xl text-[10px] md:text-xs font-montserrat font-bold uppercase tracking-widest hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#5A5A40]/20 active:scale-95"
                    >
                      <Zap className="w-4 h-4" /> Start
                    </button>
                  )
                ) : (
                  <button 
                    onClick={() => navigate(`/labs/${lab.id}`)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-stone-50/50 rounded-2xl text-[10px] text-stone-500 font-montserrat font-black uppercase tracking-widest hover:bg-white transition-all"
                  >
                    <Users className="w-4 h-4" />
                    <span>Manage</span>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div 
              key="create-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[100]"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-lg rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-[#5A5A40]" />
                
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="absolute top-6 md:top-8 right-6 md:right-8 p-2 rounded-full hover:bg-stone-50 transition-colors"
                >
                  <X className="w-6 h-6 text-stone-400" />
                </button>

                <h2 className="text-2xl md:text-3xl font-playfair font-black text-stone-900 mb-2">New Experiment</h2>
                <p className="text-sm md:text-base text-stone-500 font-montserrat font-medium mb-8 md:mb-10">Define the parameters for the new practical session.</p>
                
                <form onSubmit={handleCreate} className="space-y-6 md:space-y-8">
                  <div className="space-y-3">
                    <label className="block text-[10px] md:text-xs font-montserrat font-black uppercase tracking-widest text-stone-400 ml-2">Experiment Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Advanced Network Security"
                      className="w-full px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-stone-50 border border-stone-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:bg-white outline-none font-montserrat font-medium text-stone-800 transition-all"
                      value={newLab.title}
                      onChange={e => setNewLab({...newLab, title: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-[10px] md:text-xs font-montserrat font-black uppercase tracking-widest text-stone-400 ml-2">Difficulty</label>
                      <select 
                        className="w-full px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-stone-50 border border-stone-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:bg-white outline-none font-montserrat font-bold text-stone-800 transition-all appearance-none cursor-pointer"
                        value={newLab.difficulty}
                        onChange={e => setNewLab({...newLab, difficulty: e.target.value})}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] md:text-xs font-montserrat font-black uppercase tracking-widest text-stone-400 ml-2">Weight (PTS)</label>
                      <input 
                        type="number" 
                        required
                        placeholder="10"
                        className="w-full px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-stone-50 border border-stone-100 focus:ring-4 focus:ring-[#5A5A40]/10 focus:bg-white outline-none font-montserrat font-bold text-stone-800 transition-all"
                        value={isNaN(newLab.weight) ? '' : newLab.weight}
                        onChange={e => setNewLab({...newLab, weight: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 md:pt-6">
                    <button 
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-4 md:py-5 rounded-2xl md:rounded-3xl font-montserrat font-black text-[10px] md:text-xs uppercase tracking-widest text-stone-400 hover:bg-stone-50 transition-all"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 md:py-5 rounded-2xl md:rounded-3xl font-montserrat font-black text-[10px] md:text-xs uppercase tracking-widest bg-[#5A5A40] text-white hover:bg-[#4A4A30] transition-all shadow-xl shadow-[#5A5A40]/20 active:scale-95"
                    >
                      Create Experiment
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
