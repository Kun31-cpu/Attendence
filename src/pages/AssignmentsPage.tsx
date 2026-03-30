import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, Variants } from 'motion/react';
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

  const filteredAssignments = assignments.filter(asgn => 
    asgn.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asgn.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        className="relative z-10 space-y-8 md:space-y-12 pb-24 px-4 md:px-0"
      >
        {/* Header Section */}
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-playfair font-black text-white tracking-tight">
                  {profile?.role === 'admin' ? 'Global Tasks' : 'Assignments'}
                </h1>
                <div className="h-1 w-24 bg-[#5A5A40] mt-2 rounded-full" />
              </div>
            </div>
            <p className="text-lg text-white/40 font-montserrat font-medium italic leading-relaxed max-w-xl">
              {profile?.role === 'student' ? 'Track your academic milestones and submit your work for evaluation.' : 'Design challenges, manage submissions, and provide impactful feedback.'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {(profile?.role === 'faculty' || profile?.role === 'admin') && (
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="w-full md:w-auto flex items-center justify-center gap-3 bg-white text-black px-10 py-5 rounded-2xl font-montserrat font-black text-xs uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:bg-white/90 transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Assignment
              </motion.button>
            )}
          </div>
        </motion.header>

        {/* Search & Filter Bar */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-white/60 transition-colors" />
            <input 
              type="text" 
              placeholder="Search by title or description..."
              className="w-full pl-16 pr-8 py-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none transition-all font-montserrat font-medium text-white placeholder:text-white/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="px-10 py-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white/60 font-montserrat font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 hover:text-white transition-all">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </motion.div>

        {/* Assignments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
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
                whileHover={{ y: -12, scale: 1.02 }}
                className={cn(
                  "group relative flex flex-col h-full bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 overflow-hidden transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)]",
                  status === 'graded' && "border-emerald-500/30 shadow-emerald-500/5",
                  status === 'submitted' && "border-blue-500/30 shadow-blue-500/5",
                  isOverdue && status === 'pending' && "border-red-500/30 shadow-red-500/5",
                  isNearingDeadline && status === 'pending' && "border-amber-500/30 shadow-amber-500/5"
                )}
              >
                {/* Status Glow Overlay */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none",
                  status === 'graded' ? "bg-emerald-500" : 
                  status === 'submitted' ? "bg-blue-500" :
                  isOverdue && status === 'pending' ? "bg-red-500" : 
                  isNearingDeadline && status === 'pending' ? "bg-amber-500" : "bg-[#5A5A40]"
                )} />

                {/* Card Header: Icon & Badges */}
                <div className="p-8 pb-0 flex items-start justify-between relative z-10">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-500 group-hover:rotate-12 group-hover:scale-110",
                    status === 'graded' ? "bg-emerald-500/10 text-emerald-500" : 
                    status === 'submitted' ? "bg-blue-500/10 text-blue-500" : "bg-white/10 text-white/80"
                  )}>
                    <FileText className="w-7 h-7" />
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      {status === 'pending' && (
                        <>
                          {isOverdue ? (
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-red-500/30">
                              Overdue
                            </span>
                          ) : isNearingDeadline ? (
                            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-amber-500/30 animate-pulse">
                              Due Soon
                            </span>
                          ) : null}
                        </>
                      )}
                      <span className="px-3 py-1 bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-white/10">
                        {asgn.maxMarks} PTS
                      </span>
                    </div>
                    {profile?.role === 'student' && (
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border shadow-sm",
                        status === 'graded' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                        status === 'submitted' ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        "bg-white/5 text-white/30 border-white/10"
                      )}>
                        {status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body: Content */}
                <div className="p-8 flex-grow relative z-10">
                  <h3 className="text-2xl font-playfair font-black text-white mb-3 leading-tight group-hover:text-white/90 transition-colors">
                    {asgn.title}
                  </h3>
                  <p className="text-sm text-white/50 font-montserrat font-medium line-clamp-3 leading-relaxed mb-6">
                    {asgn.description}
                  </p>

                  <div className="space-y-4 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3 text-white/40">
                      <Calendar className="w-4 h-4" />
                      <span className="text-[11px] font-montserrat font-bold tracking-wide">
                        Deadline: {asgn.deadline ? format(new Date(asgn.deadline), 'MMM d, yyyy • h:mm a') : 'No Deadline'}
                      </span>
                    </div>
                    
                    {profile?.role === 'student' ? (
                      <div className={cn(
                        "flex items-center gap-3 text-[11px] font-montserrat font-bold tracking-wide",
                        isOverdue && status === 'pending' ? 'text-red-400' : 'text-amber-400/80'
                      )}>
                        <Clock className="w-4 h-4" />
                        <span>{isOverdue ? 'Submission Closed' : 'Time Remaining: ' + (asgn.deadline ? format(new Date(asgn.deadline), 'p') : 'N/A')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-white/60 font-black text-[10px] uppercase tracking-widest">
                        <CheckCircle className="w-4 h-4 text-[#5A5A40]" />
                        <span>{facultySubmissions.length} Submissions Received</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Actions */}
                <div className="p-8 pt-0 mt-auto relative z-10">
                  {profile?.role === 'student' ? (
                    <div className="flex gap-3">
                      <motion.button 
                        whileHover={status === 'pending' && !isOverdue ? { scale: 1.02, y: -2 } : {}}
                        whileTap={status === 'pending' && !isOverdue ? { scale: 0.98 } : {}}
                        onClick={() => handleSubmitAssignment(asgn.id)}
                        disabled={status !== 'pending' || isOverdue || isSubmitting === asgn.id}
                        className={cn(
                          "flex-1 py-4 rounded-2xl font-montserrat font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 shadow-lg",
                          status === 'pending' && !isOverdue 
                            ? "bg-white text-black hover:bg-white/90 shadow-white/10" 
                            : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                        )}
                      >
                        {isSubmitting === asgn.id ? (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                          />
                        ) : (
                          <>
                            {status === 'submitted' ? 'Work Submitted' : 
                             status === 'graded' ? 'View Grade' : 
                             isOverdue ? 'Closed' : 'Upload Assignment'}
                            {status === 'submitted' && <CheckCircle className="w-4 h-4" />}
                          </>
                        )}
                      </motion.button>
                      
                      <motion.button 
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(`/assignments/${asgn.id}`)}
                        className="w-14 h-14 flex items-center justify-center bg-white/5 text-white rounded-2xl border border-white/10 transition-all group/details"
                      >
                        <ArrowUpRight className="w-5 h-5 group-hover/details:translate-x-0.5 group-hover/details:-translate-y-0.5 transition-transform" />
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigate(`/assignments/${asgn.id}`)}
                      className="w-full bg-white/10 text-white py-4 rounded-2xl font-montserrat font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center gap-3"
                    >
                      Manage Submissions
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mb-16 pointer-events-none" />
              </motion.div>
            );
          })}
        </div>

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div 
              key="create-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6 z-[100]"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-stone-900/90 backdrop-blur-3xl w-full max-w-xl rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/10 relative overflow-hidden"
              >
                {/* Modal Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#5A5A40]/20 blur-[100px] rounded-full pointer-events-none" />
                
                <h2 className="text-3xl md:text-4xl font-playfair font-black text-white mb-2 relative z-10">New Assignment</h2>
                <p className="text-white/40 font-montserrat font-medium text-sm mb-10 relative z-10">Create a new academic challenge for your students.</p>
                
                <form onSubmit={handleCreate} className="space-y-6 md:space-y-8 relative z-10">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Assignment Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Advanced Network Security"
                      className="w-full px-8 py-5 rounded-2xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none transition-all font-montserrat font-medium text-white placeholder:text-white/10"
                      value={newAssignment.title}
                      onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Task Description</label>
                    <textarea 
                      rows={3}
                      required
                      placeholder="Describe the learning objectives and requirements..."
                      className="w-full px-8 py-5 rounded-2xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none transition-all font-montserrat font-medium text-white placeholder:text-white/10 resize-none"
                      value={newAssignment.description}
                      onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Submission Deadline</label>
                      <input 
                        type="datetime-local" 
                        required
                        className="w-full px-8 py-5 rounded-2xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none transition-all font-montserrat font-medium text-white [color-scheme:dark]"
                        value={newAssignment.deadline}
                        onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-2">Maximum Marks</label>
                      <input 
                        type="number" 
                        required
                        className="w-full px-8 py-5 rounded-2xl bg-white/5 border border-white/10 focus:ring-4 focus:ring-white/5 focus:border-white/20 outline-none transition-all font-montserrat font-medium text-white"
                        value={isNaN(newAssignment.maxMarks) ? '' : newAssignment.maxMarks}
                        onChange={e => setNewAssignment({...newAssignment, maxMarks: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-6">
                    <button 
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-5 rounded-2xl font-montserrat font-black text-[10px] uppercase tracking-[0.3em] text-white/30 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Discard
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-5 rounded-2xl font-montserrat font-black text-[10px] uppercase tracking-[0.3em] bg-white text-black hover:bg-white/90 transition-all shadow-2xl shadow-white/10"
                    >
                      Post Assignment
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
