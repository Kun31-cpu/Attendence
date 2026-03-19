import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { 
  Beaker, 
  Trophy, 
  Github, 
  CheckCircle2, 
  Plus,
  Zap,
  Users
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { cn } from '../lib/utils';

export default function LabsPage() {
  const { profile } = useAuth();
  const [labs, setLabs] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLab, setNewLab] = useState({ title: '', difficulty: 'easy', weight: 10 });

  useEffect(() => {
    const q = query(collection(db, 'labs'), orderBy('difficulty', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLabs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'labs');
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'labs'), {
        ...newLab,
        facultyId: profile?.uid,
        createdAt: serverTimestamp(),
      });
      setShowCreateModal(false);
      setNewLab({ title: '', difficulty: 'easy', weight: 10 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'labs');
    }
  };

  const completionRate = labs.length > 0 ? (labs.filter(l => l.completed).length / labs.length) * 100 : 0;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            {profile?.role === 'student' ? 'Lab Progress' : 'Lab Management'}
          </h1>
          <p className="text-gray-500 font-serif italic">
            {profile?.role === 'student' ? 'Cybersecurity & Practical Skills Tracking' : 'Track student progress and manage experiments'}
          </p>
        </div>
        {profile?.role === 'student' ? (
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Global Rank</p>
              <p className="text-xl font-bold text-[#5A5A40]">#42</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
              <Trophy className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
          >
            <Plus className="w-5 h-5" />
            New Experiment
          </button>
        )}
      </header>

      {profile?.role === 'student' && (
        <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Overall Completion</h3>
            <span className="text-[#5A5A40] font-bold">{completionRate.toFixed(0)}%</span>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              className="h-full bg-[#5A5A40]"
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-gray-500 uppercase">Solved</p>
            </div>
            <div className="text-center border-x border-gray-100">
              <p className="text-2xl font-bold">450</p>
              <p className="text-xs text-gray-500 uppercase">Points</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-gray-500 uppercase">Badges</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {labs.map((lab, i) => (
          <motion.div
            key={lab.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "p-6 rounded-3xl border transition-all flex items-center gap-6 bg-white",
              lab.completed ? "border-emerald-100" : "border-black/5"
            )}
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
              lab.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600' :
              lab.difficulty === 'medium' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'
            )}>
              {lab.completed ? <CheckCircle2 className="w-8 h-8" /> : <Beaker className="w-8 h-8" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                  lab.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700' :
                  lab.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                )}>
                  {lab.difficulty}
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase">{lab.weight} PTS</span>
              </div>
              <h4 className="font-bold text-gray-900 truncate">{lab.title}</h4>
            </div>

            <div className="flex flex-col gap-2">
              {profile?.role === 'student' ? (
                lab.completed ? (
                  <button className="p-2 bg-gray-50 rounded-xl text-gray-400 hover:text-[#5A5A40] transition-colors">
                    <Github className="w-5 h-5" />
                  </button>
                ) : (
                  <button className="px-4 py-2 bg-[#5A5A40] text-white rounded-xl text-sm font-bold hover:bg-[#4A4A30] transition-all flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Start
                  </button>
                )
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                  <Users className="w-4 h-4" />
                  <span>24 Done</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-serif font-bold mb-6">New Lab Experiment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={newLab.title}
                  onChange={e => setNewLab({...newLab, title: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                    value={newLab.difficulty}
                    onChange={e => setNewLab({...newLab, difficulty: e.target.value})}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Weight (PTS)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                    value={isNaN(newLab.weight) ? '' : newLab.weight}
                    onChange={e => setNewLab({...newLab, weight: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold bg-[#5A5A40] text-white hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
                >
                  Create
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
