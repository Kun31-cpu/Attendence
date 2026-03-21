import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { 
  Users, 
  Search, 
  Filter, 
  Shield, 
  UserCheck, 
  UserX, 
  MoreVertical,
  Mail,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Layers,
  Plus,
  Trash2,
  Calendar as CalendarIcon
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, orderBy, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
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

export default function UserManagementPage() {
  const { profile: adminProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'batches'>('users');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: '', description: '' });

  useEffect(() => {
    const usersQ = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsubscribeUsers = onSnapshot(usersQ, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    const batchesQ = query(collection(db, 'batches'), orderBy('name', 'asc'));
    const unsubscribeBatches = onSnapshot(batchesQ, (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'batches');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeBatches();
    };
  }, []);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        active: !currentStatus
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateUserBatch = async (userId: string, batchId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        batchId: batchId || null
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const createBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatch.name) return;

    try {
      await addDoc(collection(db, 'batches'), {
        ...newBatch,
        createdAt: serverTimestamp()
      });
      setIsBatchModalOpen(false);
      setNewBatch({ name: '', description: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'batches');
    }
  };

  const deleteBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to delete this batch? Users assigned to it will be unassigned.')) return;

    try {
      await deleteDoc(doc(db, 'batches', batchId));
      // Optionally unassign users here, but Firestore doesn't support bulk updates easily
      // In a real app, you'd use a Cloud Function or batch update
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `batches/${batchId}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <ShieldCheck className="w-4 h-4 text-amber-500" />;
      case 'faculty': return <Shield className="w-4 h-4 text-blue-500" />;
      default: return <GraduationCap className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-20"
    >
      {/* Header Section */}
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight">
              User Management
            </h1>
          </div>
          <p className="text-lg text-gray-400 font-serif italic leading-relaxed max-w-xl">
            Oversee platform access, manage permissions, and maintain user security.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'users' ? "bg-white text-black" : "text-gray-400 hover:text-white"
            )}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('batches')}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'batches' ? "bg-white text-black" : "text-gray-400 hover:text-white"
            )}
          >
            Batches
          </button>
        </div>
      </motion.header>

      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div 
            key="users-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search by name or email..."
                  className="w-full pl-14 pr-6 py-5 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-medium text-sm text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-8 py-5 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 text-white font-bold text-xs uppercase tracking-widest outline-none focus:ring-4 focus:ring-white/5 transition-all"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all" className="bg-black text-white">All Roles</option>
                <option value="admin" className="bg-black text-white">Admins</option>
                <option value="faculty" className="bg-black text-white">Faculty</option>
                <option value="student" className="bg-black text-white">Students</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">User</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Role</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Batch</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                              {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg font-bold text-white">{user.displayName[0]}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white">{user.displayName}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <select 
                              className="bg-transparent text-xs font-bold uppercase tracking-widest text-gray-400 outline-none focus:text-white transition-colors cursor-pointer"
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value)}
                              disabled={user.email === 'beraniranjan722@gmail.com'}
                            >
                              <option value="admin" className="bg-black">Admin</option>
                              <option value="faculty" className="bg-black">Faculty</option>
                              <option value="student" className="bg-black">Student</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {user.role === 'student' ? (
                            <select 
                              className="bg-transparent text-xs font-bold uppercase tracking-widest text-gray-400 outline-none focus:text-white transition-colors cursor-pointer"
                              value={user.batchId || ''}
                              onChange={(e) => updateUserBatch(user.id, e.target.value)}
                            >
                              <option value="" className="bg-black">No Batch</option>
                              {batches.map(batch => (
                                <option key={batch.id} value={batch.id} className="bg-black">{batch.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            user.active !== false 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          )}>
                            {user.active !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.email !== 'beraniranjan722@gmail.com' && (
                              <button 
                                onClick={() => toggleUserStatus(user.id, user.active !== false)}
                                className={cn(
                                  "p-3 rounded-xl transition-all active:scale-90",
                                  user.active !== false 
                                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                                    : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                                )}
                                title={user.active !== false ? 'Deactivate Account' : 'Activate Account'}
                              >
                                {user.active !== false ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                              </button>
                            )}
                            <button className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="p-20 text-center">
                  <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-gray-500 font-serif italic">No users found matching your criteria.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="batches-tab"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif font-bold text-white">Academic Batches</h2>
              <button 
                onClick={() => setIsBatchModalOpen(true)}
                className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all shadow-xl shadow-white/10"
              >
                <Plus className="w-4 h-4" />
                Create Batch
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {batches.map((batch) => (
                <motion.div 
                  key={batch.id}
                  variants={itemVariants}
                  className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 border border-white/10 hover:border-white/20 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Layers className="w-24 h-24 text-white" />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                        <Layers className="w-6 h-6 text-white" />
                      </div>
                      <button 
                        onClick={() => deleteBatch(batch.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">{batch.name}</h3>
                    <p className="text-sm text-gray-400 font-serif italic mb-6 line-clamp-2">
                      {batch.description || 'No description provided.'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <CalendarIcon className="w-3 h-3" />
                        {batch.createdAt?.toDate ? format(batch.createdAt.toDate(), 'MMM yyyy') : 'Recently'}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-white bg-white/10 px-3 py-1 rounded-full border border-white/10">
                        {users.filter(u => u.batchId === batch.id).length} Students
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {batches.length === 0 && (
                <div className="col-span-full p-20 text-center bg-white/5 rounded-[2.5rem] border border-white/10 border-dashed">
                  <Layers className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-gray-500 font-serif italic">No batches created yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Batch Modal */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBatchModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#1A1A1A] rounded-[2.5rem] border border-white/10 p-8 md:p-12 shadow-2xl"
            >
              <h2 className="text-3xl font-serif font-bold text-white mb-2">Create New Batch</h2>
              <p className="text-gray-400 font-serif italic mb-8">Define a new academic group for students.</p>
              
              <form onSubmit={createBatch} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Batch Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Batch 2022-2026"
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all"
                    value={newBatch.name}
                    onChange={(e) => setNewBatch({...newBatch, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Description</label>
                  <textarea 
                    rows={4}
                    placeholder="Briefly describe the batch..."
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all resize-none font-serif italic"
                    value={newBatch.description}
                    onChange={(e) => setNewBatch({...newBatch, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsBatchModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-white text-black hover:bg-gray-200 transition-all shadow-xl shadow-white/10"
                  >
                    Create Batch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
