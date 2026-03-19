import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Clock, 
  CheckCircle, 
  Plus,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { format, isAfter } from 'date-fns';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

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

export default function AssignmentsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', deadline: '', maxMarks: 100 });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'assignments'), orderBy('deadline', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'assignments');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile) return;
    
    let q;
    if (profile.role === 'student') {
      q = query(collection(db, 'submissions'), where('studentId', '==', profile.uid));
    } else {
      q = query(collection(db, 'submissions'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'submissions');
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (profile?.role === 'student' && assignments.length > 0) {
      const checkDeadlines = async () => {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        for (const asgn of assignments) {
          if (asgn.deadline) {
            const deadline = new Date(asgn.deadline);
            const hasSubmitted = submissions.some(s => s.assignmentId === asgn.id && s.studentId === profile.uid);
            
            if (!hasSubmitted && deadline > now && deadline < tomorrow) {
              const q = query(
                collection(db, 'notifications'),
                where('userId', '==', profile.uid),
                where('title', '==', 'Upcoming Deadline'),
                where('link', '==', `/assignments/${asgn.id}`)
              );
              const snap = await getDocs(q);
              
              if (snap.empty) {
                await addDoc(collection(db, 'notifications'), {
                  userId: profile.uid,
                  title: 'Upcoming Deadline',
                  message: `The assignment "${asgn.title}" is due within 24 hours!`,
                  type: 'warning',
                  read: false,
                  createdAt: serverTimestamp(),
                  link: `/assignments/${asgn.id}`
                });
              }
            }
          }
        }
      };
      checkDeadlines();
    }
  }, [profile, assignments, submissions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const asgnRef = await addDoc(collection(db, 'assignments'), {
        ...newAssignment,
        facultyId: profile?.uid,
        createdAt: serverTimestamp(),
      });

      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      
      const notificationPromises = studentsSnapshot.docs.map(studentDoc => 
        addDoc(collection(db, 'notifications'), {
          userId: studentDoc.id,
          title: 'New Assignment Posted',
          message: `A new assignment "${newAssignment.title}" has been posted.`,
          type: 'assignment',
          read: false,
          createdAt: serverTimestamp(),
          link: `/assignments/${asgnRef.id}`
        })
      );
      
      await Promise.all(notificationPromises);

      setShowCreateModal(false);
      setNewAssignment({ title: '', description: '', deadline: '', maxMarks: 100 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'assignments');
    }
  };

  const handleSubmitAssignment = async (asgnId: string) => {
    setIsSubmitting(asgnId);
    try {
      const assignment = assignments.find(a => a.id === asgnId);
      await addDoc(collection(db, 'submissions'), {
        assignmentId: asgnId,
        studentId: profile?.uid,
        studentName: profile?.displayName,
        submittedAt: serverTimestamp(),
        fileUrl: 'https://example.com/submission.pdf',
        status: 'submitted',
        marks: 0,
        feedback: '',
        facultyId: assignment?.facultyId
      });

      if (assignment?.facultyId) {
        await addDoc(collection(db, 'notifications'), {
          userId: assignment.facultyId,
          title: 'New Assignment Submission',
          message: `${profile?.displayName} has submitted the assignment "${assignment.title}".`,
          type: 'assignment',
          read: false,
          createdAt: serverTimestamp(),
          link: `/assignments/${asgnId}`
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissions');
    } finally {
      setIsSubmitting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20';
      case 'submitted': return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
      default: return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    }
  };

  const filteredAssignments = assignments.filter(asgn => 
    asgn.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asgn.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-xl shadow-[#5A5A40]/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-playfair font-black text-[#5A5A40] tracking-tight">
              {profile?.role === 'admin' ? 'Global Assignments' : 'Assignments'}
            </h1>
          </div>
          <p className="text-xl text-[#5A5A40]/60 font-montserrat font-medium italic leading-relaxed max-w-xl">
            {profile?.role === 'student' ? 'Track your academic milestones and submit your work for evaluation.' : 'Design challenges, manage submissions, and provide impactful feedback.'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {(profile?.role === 'faculty' || profile?.role === 'admin') && (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-3 bg-[#5A5A40] text-white px-8 py-5 rounded-3xl font-montserrat font-black text-xs uppercase tracking-widest shadow-2xl shadow-[#5A5A40]/30 hover:bg-[#4A4A30] transition-all"
            >
              <Plus className="w-5 h-5" />
              Create New
            </motion.button>
          )}
        </div>
      </motion.header>

      {/* Search & Filter Bar */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5A5A40]/30 group-focus-within:text-[#5A5A40] transition-colors" />
          <input 
            type="text" 
            placeholder="Search assignments..."
            className="w-full pl-14 pr-6 py-5 rounded-3xl bg-white/40 backdrop-blur-xl border border-[#5A5A40]/10 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none transition-all font-montserrat font-medium text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="px-8 py-5 rounded-3xl bg-white/40 backdrop-blur-xl border border-[#5A5A40]/10 text-[#5A5A40] font-montserrat font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-white/60 transition-all">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </motion.div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredAssignments.map((asgn, i) => {
          const studentSubmission = submissions.find(s => s.assignmentId === asgn.id && s.studentId === profile?.uid);
          const facultySubmissions = submissions.filter(s => s.assignmentId === asgn.id);
          const status = studentSubmission ? studentSubmission.status : 'pending';
          const isOverdue = asgn.deadline && isAfter(new Date(), new Date(asgn.deadline));
          const isNearingDeadline = asgn.deadline && !isOverdue && (new Date(asgn.deadline).getTime() - new Date().getTime()) < 24 * 60 * 60 * 1000;

          return (
            <motion.div
              key={asgn.id}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className={cn(
                "bg-white/60 backdrop-blur-xl p-10 rounded-[3.5rem] border shadow-xl transition-all group relative overflow-hidden",
                status === 'graded' ? "border-emerald-500/20" : 
                status === 'submitted' ? "border-blue-500/20" :
                isOverdue && status === 'pending' ? "border-red-500/20" : 
                isNearingDeadline && status === 'pending' ? "border-amber-500/20" : "border-white/40"
              )}
            >
              {/* Background Glow */}
              <div className={cn(
                "absolute -top-20 -right-20 w-40 h-40 blur-[80px] rounded-full opacity-20 pointer-events-none transition-colors",
                status === 'graded' ? "bg-emerald-500" : 
                status === 'submitted' ? "bg-blue-500" :
                isOverdue && status === 'pending' ? "bg-red-500" : 
                isNearingDeadline && status === 'pending' ? "bg-amber-500" : "bg-[#5A5A40]"
              )} />

              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:rotate-6",
                  status === 'graded' ? "bg-emerald-500/10" : 
                  status === 'submitted' ? "bg-blue-500/10" : "bg-[#5A5A40]/10"
                )}>
                  <FileText className={cn(
                    "w-8 h-8",
                    status === 'graded' ? "text-emerald-600" : 
                    status === 'submitted' ? "text-blue-600" : "text-[#5A5A40]"
                  )} />
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    {status === 'pending' && (
                      <>
                        {isOverdue ? (
                          <span className="px-4 py-1.5 bg-red-500/10 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-red-500/20">
                            Overdue
                          </span>
                        ) : isNearingDeadline ? (
                          <span className="px-4 py-1.5 bg-amber-500/10 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-500/20 animate-pulse">
                            Due Soon
                          </span>
                        ) : null}
                      </>
                    )}
                    <span className="text-[9px] font-black uppercase tracking-widest px-4 py-1.5 bg-[#5A5A40]/5 rounded-full text-[#5A5A40]/60 border border-[#5A5A40]/10">
                      {asgn.maxMarks} Marks
                    </span>
                  </div>
                  {profile?.role === 'student' && (
                    <span className={cn("text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest shadow-sm", getStatusColor(status))}>
                      {status}
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10 space-y-4">
                <h3 className="text-2xl font-playfair font-black text-[#5A5A40] leading-tight group-hover:text-[#4A4A30] transition-colors">{asgn.title}</h3>
                <p className="text-sm text-[#5A5A40]/60 font-montserrat font-medium line-clamp-2 leading-relaxed">{asgn.description}</p>
                
                <div className="pt-8 space-y-4 border-t border-[#5A5A40]/5">
                  <div className="flex items-center gap-3 text-[#5A5A40]/50">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[11px] font-montserrat font-bold">Due: {asgn.deadline ? format(new Date(asgn.deadline), 'PPP') : 'N/A'}</span>
                  </div>
                  {profile?.role === 'student' ? (
                    <div className={cn("flex items-center gap-3 text-[11px] font-montserrat font-bold", isOverdue && status === 'pending' ? 'text-red-500' : 'text-amber-500')}>
                      <Clock className="w-4 h-4" />
                      <span>{isOverdue ? 'Deadline passed' : 'Upcoming deadline'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-[#5A5A40] font-black text-[11px] uppercase tracking-widest">
                      <CheckCircle className="w-4 h-4" />
                      <span>{facultySubmissions.length} Submissions</span>
                    </div>
                  )}
                </div>

                {profile?.role === 'student' ? (
                  <div className="flex gap-3 mt-10">
                    <motion.button 
                      whileHover={status === 'pending' && !isOverdue ? { scale: 1.02 } : {}}
                      whileTap={status === 'pending' && !isOverdue ? { scale: 0.98 } : {}}
                      onClick={() => handleSubmitAssignment(asgn.id)}
                      disabled={status !== 'pending' || isOverdue || isSubmitting === asgn.id}
                      className={cn(
                        "flex-1 py-4 rounded-2xl font-montserrat font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl",
                        status === 'pending' && !isOverdue 
                          ? "bg-[#5A5A40] text-white shadow-[#5A5A40]/20 hover:bg-[#4A4A30]" 
                          : "bg-[#5A5A40]/5 text-[#5A5A40]/30 cursor-not-allowed shadow-none"
                      )}
                    >
                      {isSubmitting === asgn.id ? 'Submitting...' : 
                       status === 'submitted' ? 'Submitted' : 
                       status === 'graded' ? 'Graded' : 
                       isOverdue ? 'Closed' : 'Upload Work'}
                      {status === 'submitted' && <CheckCircle className="w-4 h-4" />}
                    </motion.button>
                    <button 
                      onClick={() => navigate(`/assignments/${asgn.id}`)}
                      className="px-6 bg-white/40 text-[#5A5A40] rounded-2xl hover:bg-white/60 transition-all border border-[#5A5A40]/10 group/details"
                    >
                      <ArrowUpRight className="w-5 h-5 group-hover/details:translate-x-0.5 group-hover/details:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                ) : (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/assignments/${asgn.id}`)}
                    className="w-full mt-10 bg-white/40 text-[#5A5A40] py-4 rounded-2xl font-montserrat font-black text-[10px] uppercase tracking-widest hover:bg-white/60 transition-all border border-[#5A5A40]/10 flex items-center justify-center gap-3"
                  >
                    View Submissions
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/90 backdrop-blur-2xl w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl border border-white/40"
            >
              <h2 className="text-4xl font-playfair font-black text-[#5A5A40] mb-10">New Assignment</h2>
              <form onSubmit={handleCreate} className="space-y-8">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#5A5A40]/40 ml-2">Title</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-6 py-5 rounded-3xl bg-white/40 border border-[#5A5A40]/10 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none transition-all font-montserrat font-medium text-sm"
                    value={newAssignment.title}
                    onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#5A5A40]/40 ml-2">Description</label>
                  <textarea 
                    rows={3}
                    required
                    className="w-full px-6 py-5 rounded-3xl bg-white/40 border border-[#5A5A40]/10 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none transition-all font-montserrat font-medium text-sm"
                    value={newAssignment.description}
                    onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#5A5A40]/40 ml-2">Deadline</label>
                    <input 
                      type="datetime-local" 
                      required
                      className="w-full px-6 py-5 rounded-3xl bg-white/40 border border-[#5A5A40]/10 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none transition-all font-montserrat font-medium text-sm"
                      value={newAssignment.deadline}
                      onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#5A5A40]/40 ml-2">Max Marks</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-6 py-5 rounded-3xl bg-white/40 border border-[#5A5A40]/10 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none transition-all font-montserrat font-medium text-sm"
                      value={isNaN(newAssignment.maxMarks) ? '' : newAssignment.maxMarks}
                      onChange={e => setNewAssignment({...newAssignment, maxMarks: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex gap-6 pt-6">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-5 rounded-2xl font-montserrat font-black text-[10px] uppercase tracking-[0.2em] text-[#5A5A40]/40 hover:text-[#5A5A40] transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 rounded-2xl font-montserrat font-black text-[10px] uppercase tracking-[0.2em] bg-[#5A5A40] text-white hover:bg-[#4A4A30] transition-all shadow-2xl shadow-[#5A5A40]/30"
                  >
                    Post Assignment
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
