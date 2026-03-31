import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit2, 
  User,
  Hash,
  Building,
  ChevronRight,
  X,
  CheckCircle2
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  deleteDoc,
  where,
  getDocs
} from 'firebase/firestore';
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

export default function SubjectsPage() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    departmentId: '',
    facultyId: ''
  });

  useEffect(() => {
    const subjectsQ = query(collection(db, 'subjects'), orderBy('name', 'asc'));
    const unsubscribeSubjects = onSnapshot(subjectsQ, (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'subjects');
    });

    const facultyQ = query(collection(db, 'users'), where('role', '==', 'faculty'));
    const unsubscribeFaculty = onSnapshot(facultyQ, (snapshot) => {
      setFacultyMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    return () => {
      unsubscribeSubjects();
      unsubscribeFaculty();
    };
  }, []);

  const validateCode = (code: string) => {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (code.length < 3 || code.length > 10) {
      return "Code must be between 3 and 10 characters.";
    }
    if (!alphanumericRegex.test(code)) {
      return "Code must be alphanumeric (no spaces or special characters).";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    const error = validateCode(formData.code);
    if (error) {
      setCodeError(error);
      return;
    }
    setCodeError(null);

    try {
      if (editingSubject) {
        await updateDoc(doc(db, 'subjects', editingSubject.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'subjects'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingSubject(null);
      setFormData({ name: '', code: '', departmentId: '', facultyId: '' });
    } catch (err) {
      handleFirestoreError(err, editingSubject ? OperationType.UPDATE : OperationType.CREATE, 'subjects');
    }
  };

  const handleDelete = (subject: any) => {
    setSubjectToDelete(subject);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    try {
      await deleteDoc(doc(db, 'subjects', subjectToDelete.id));
      setIsDeleteModalOpen(false);
      setSubjectToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `subjects/${subjectToDelete.id}`);
    }
  };

  const openEditModal = (subject: any) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      departmentId: subject.departmentId || '',
      facultyId: subject.facultyId || ''
    });
    setIsModalOpen(true);
  };

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFaculty = facultyFilter === 'all' || subject.facultyId === facultyFilter;
    return matchesSearch && matchesFaculty;
  });

  const getFacultyName = (facultyId: string) => {
    const faculty = facultyMembers.find(f => f.id === facultyId);
    return faculty ? faculty.displayName : 'Not Assigned';
  };

  const isAdmin = profile?.role === 'admin';

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
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight">
              Subject Management
            </h1>
          </div>
          <p className="text-lg text-gray-400 font-serif italic leading-relaxed max-w-xl">
            Organize academic curriculum, assign expert faculty, and track subject delivery.
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => {
              setEditingSubject(null);
              setFormData({ name: '', code: '', departmentId: '', facultyId: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 transition-all shadow-xl shadow-white/10 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        )}
      </motion.header>

      {/* Search & Filter Bar */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-white transition-colors" />
          <input 
            type="text" 
            placeholder="Search by subject name or code..."
            className="w-full pl-14 pr-6 py-5 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-medium text-sm text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative group min-w-[240px]">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white transition-colors" />
          <select 
            className="w-full pl-12 pr-8 py-5 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 text-white font-bold text-xs uppercase tracking-widest outline-none focus:ring-4 focus:ring-white/5 transition-all appearance-none cursor-pointer"
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
          >
            <option value="all" className="bg-black text-white">All Faculty</option>
            <option value="" className="bg-black text-white">Unassigned</option>
            {facultyMembers.map(faculty => (
              <option key={faculty.id} value={faculty.id} className="bg-black text-white">{faculty.displayName}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Subjects Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredSubjects.map((subject) => (
          <motion.div 
            key={subject.id}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 hover:border-white/20 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <BookOpen className="w-32 h-32 text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 group-hover:rotate-6 transition-transform">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                {isAdmin && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditModal(subject)}
                      className="p-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(subject)}
                      className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-1 mb-6">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                  <Hash className="w-3 h-3" />
                  {subject.code}
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">{subject.name}</h3>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Assigned Faculty</p>
                      <p className={cn(
                        "text-xs font-bold",
                        subject.facultyId ? "text-white" : "text-amber-500 italic"
                      )}>
                        {getFacultyName(subject.facultyId)}
                      </p>
                    </div>
                  </div>
                  {subject.facultyId && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <Building className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Department</p>
                    <p className="text-xs font-bold text-white">{subject.departmentId || 'General'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between group/link cursor-pointer">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover/link:text-white transition-colors">View Subject Details</span>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover/link:text-white group-hover/link:translate-x-1 transition-all" />
              </div>
            </div>
          </motion.div>
        ))}
        {filteredSubjects.length === 0 && (
          <div className="col-span-full p-24 text-center bg-white/5 rounded-[3rem] border border-white/10 border-dashed">
            <BookOpen className="w-16 h-16 text-white/10 mx-auto mb-6" />
            <p className="text-gray-500 font-serif italic text-lg">No subjects found matching your criteria.</p>
          </div>
        )}
      </motion.div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] rounded-[3rem] border border-white/10 p-10 md:p-16 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <BookOpen className="w-48 h-48 text-white" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-12">
                  <div>
                    <h2 className="text-4xl font-serif font-bold text-white mb-2">
                      {editingSubject ? 'Edit Subject' : 'New Subject'}
                    </h2>
                    <p className="text-gray-400 font-serif italic">Define academic parameters and assign faculty.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      setCodeError(null);
                    }}
                    className="p-4 rounded-2xl bg-white/5 text-gray-400 hover:text-white transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4 flex items-center gap-2">
                        <BookOpen className="w-3 h-3" /> Subject Name
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g., Computer Networks"
                        className="w-full px-8 py-5 rounded-3xl bg-white/5 border border-white/10 text-white focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-medium"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4 flex items-center gap-2">
                        <Hash className="w-3 h-3" /> Subject Code
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g., CS401"
                        className={cn(
                          "w-full px-8 py-5 rounded-3xl bg-white/5 border text-white focus:ring-4 outline-none transition-all font-medium uppercase",
                          codeError 
                            ? "border-red-500/50 focus:ring-red-500/10 focus:border-red-500" 
                            : "border-white/10 focus:ring-white/5 focus:border-white/30"
                        )}
                        value={formData.code}
                        onChange={(e) => {
                          setFormData({...formData, code: e.target.value.toUpperCase()});
                          if (codeError) setCodeError(null);
                        }}
                        required
                      />
                      {codeError && (
                        <p className="text-[10px] text-red-500 ml-4 font-bold uppercase tracking-wider animate-pulse">
                          {codeError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4 flex items-center gap-2">
                        <Building className="w-3 h-3" /> Department
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g., Computer Science"
                        className="w-full px-8 py-5 rounded-3xl bg-white/5 border border-white/10 text-white focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-medium"
                        value={formData.departmentId}
                        onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4 flex items-center gap-2">
                        <User className="w-3 h-3" /> Assign Faculty
                      </label>
                      <select 
                        className="w-full px-8 py-5 rounded-3xl bg-white/5 border border-white/10 text-white focus:ring-4 focus:ring-white/5 focus:border-white/30 outline-none transition-all font-medium appearance-none cursor-pointer"
                        value={formData.facultyId}
                        onChange={(e) => setFormData({...formData, facultyId: e.target.value})}
                      >
                        <option value="" className="bg-black">Select Faculty Member</option>
                        {facultyMembers.map(faculty => (
                          <option key={faculty.id} value={faculty.id} className="bg-black">{faculty.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-8">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:bg-white/5 transition-all active:scale-95 border border-white/5"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] bg-white text-black hover:bg-gray-200 transition-all shadow-2xl shadow-white/10 active:scale-95"
                    >
                      {editingSubject ? 'Update Subject' : 'Create Subject'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] rounded-[2.5rem] border border-red-500/20 p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Trash2 className="w-32 h-32 text-red-500" />
              </div>

              <div className="relative z-10 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>
                
                <h2 className="text-3xl font-serif font-bold text-white mb-4">Delete Subject?</h2>
                <p className="text-gray-400 font-serif italic mb-10">
                  Are you sure you want to delete <span className="text-white font-bold not-italic">"{subjectToDelete?.name}"</span>? This action cannot be undone.
                </p>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:bg-white/5 transition-all border border-white/5"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-red-600 text-white hover:bg-red-500 transition-all shadow-xl shadow-red-600/20"
                  >
                    Delete Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
