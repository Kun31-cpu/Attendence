import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  ArrowLeft,
  Calendar,
  User,
  Download,
  ExternalLink,
  Award,
  MessageSquare,
  Upload,
  Search,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { format, isAfter } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

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
  visible: { opacity: 1, y: 0 }
};

export default function AssignmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeData, setGradeData] = useState({ marks: 0, feedback: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'marks'>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | 'submitted' | 'graded'>('all');

  const filteredSubmissions = submissions
    .filter(sub => {
      const matchesSearch = sub.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : 0;
        const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === 'name') {
        return (a.studentName || '').localeCompare(b.studentName || '');
      }
      if (sortBy === 'marks') {
        return (b.marks || 0) - (a.marks || 0);
      }
      return 0;
    });

  useEffect(() => {
    if (!id) return;

    const fetchAssignment = async () => {
      try {
        const docRef = doc(db, 'assignments', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAssignment({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `assignments/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();

    const q = query(collection(db, 'submissions'), where('assignmentId', '==', id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'submissions');
    });

    return () => unsubscribe();
  }, [id]);

  const handleGrade = async (subId: string) => {
    try {
      const subRef = doc(db, 'submissions', subId);
      const submission = submissions.find(s => s.id === subId);
      
      await updateDoc(subRef, {
        marks: gradeData.marks,
        feedback: gradeData.feedback,
        status: 'graded',
        gradedAt: serverTimestamp()
      });
      toast.success('Submission graded successfully!');

      // Notify student about the grade
      if (submission?.studentId) {
        await addDoc(collection(db, 'notifications'), {
          userId: submission.studentId,
          title: 'Assignment Graded',
          message: `Your assignment "${assignment.title}" has been graded. Marks: ${gradeData.marks}/${assignment.maxMarks}`,
          type: 'grade',
          read: false,
          createdAt: serverTimestamp(),
          link: `/assignments/${assignment.id}`
        });
      }

      setGradingId(null);
      setGradeData({ marks: 0, feedback: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `submissions/${subId}`);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitAssignment = async () => {
    if (!id || !profile) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'submissions'), {
        assignmentId: id,
        studentId: profile.uid,
        studentName: profile.displayName || 'Anonymous',
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
          message: `${profile.displayName || 'A student'} has submitted the assignment "${assignment.title}".`,
          type: 'assignment',
          read: false,
          createdAt: serverTimestamp(),
          link: `/assignments/${id}`
        });
      }
      toast.success('Assignment submitted successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full"
      />
      <p className="text-[#5A5A40] font-serif italic">Loading assignment details...</p>
    </div>
  );

  if (!assignment) return (
    <div className="text-center p-12 glass-effect rounded-[2.5rem] border border-black/5">
      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 className="text-2xl font-serif font-bold text-gray-900">Assignment Not Found</h2>
      <p className="text-gray-500 mt-2">The assignment you're looking for doesn't exist or has been removed.</p>
      <button 
        onClick={() => navigate('/assignments')}
        className="mt-6 bg-[#5A5A40] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all"
      >
        Back to Assignments
      </button>
    </div>
  );

  const studentSubmission = submissions.find(s => s.studentId === profile?.uid);
  const isOverdue = assignment.deadline && isAfter(new Date(), new Date(assignment.deadline));
  const isNearingDeadline = assignment.deadline && !isOverdue && (new Date(assignment.deadline).getTime() - new Date().getTime()) < 24 * 60 * 60 * 1000;

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
        className="relative z-10 space-y-8 md:space-y-12 max-w-5xl mx-auto pb-24 px-4 md:px-0"
      >
        <motion.button 
          variants={itemVariants}
          onClick={() => navigate('/assignments')}
          className="flex items-center gap-3 text-gray-500 hover:text-[#5A5A40] transition-colors font-bold group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/40 backdrop-blur-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all border border-white/50">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] font-black">Back to Assignments</span>
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Assignment Info */}
          <div className="lg:col-span-2 space-y-8 md:space-y-12">
            <motion.div 
              variants={itemVariants}
              className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/40 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#5A5A40]/5 blur-3xl rounded-full -mr-32 -mt-32" />
              
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 md:mb-12">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-[#5A5A40] to-[#4A4A30] rounded-2xl md:rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-[#5A5A40]/20">
                    <FileText className="w-8 h-8 md:w-12 md:h-12 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] font-black text-[#5A5A40]/40 mb-2">Assignment Details</p>
                    <h1 className="text-3xl md:text-5xl font-playfair font-black text-gray-900 leading-tight tracking-tight">{assignment.title}</h1>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="px-3 py-1 bg-[#5A5A40]/10 text-[#5A5A40] text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border border-[#5A5A40]/20">
                        {assignment.subjectId || 'General'}
                      </span>
                      <span className="text-gray-400 text-[10px] md:text-xs font-serif italic">Created by Faculty</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-10 md:mb-12">
                  <div className="p-6 md:p-8 bg-white/40 rounded-[2rem] md:rounded-[2.5rem] border border-white/60">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> Description & Instructions
                    </h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-serif text-base md:text-xl">{assignment.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8 pt-8 md:pt-12 border-t border-black/5">
                  <div className="space-y-3">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-400 ml-2">Deadline</p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                        <Calendar className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <p className="text-sm md:text-base font-black text-gray-900">
                          {assignment.deadline ? format(new Date(assignment.deadline), 'MMM d, yyyy') : 'No deadline'}
                        </p>
                        <p className="text-[10px] md:text-xs text-gray-500 font-medium">
                          {assignment.deadline ? format(new Date(assignment.deadline), 'h:mm a') : 'Anytime'}
                        </p>
                      </div>
                    </div>
                    {profile?.role === 'student' && !studentSubmission && (
                      <div className="mt-2">
                        {isOverdue ? (
                          <span className="px-3 py-1 bg-red-50 text-red-600 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-full border border-red-100">
                            Overdue
                          </span>
                        ) : isNearingDeadline ? (
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[8px] md:text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-100 animate-pulse">
                            Due Soon
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-400 ml-2">Grading</p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                        <Award className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <p className="text-sm md:text-base font-black text-gray-900">{assignment.maxMarks} Points</p>
                        <p className="text-[10px] md:text-xs text-gray-500 font-medium">Maximum Score</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-gray-400 ml-2">Activity</p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
                        <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <p className="text-sm md:text-base font-black text-gray-900">{submissions.length} Students</p>
                        <p className="text-[10px] md:text-xs text-gray-500 font-medium">Total Submissions</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Faculty/Admin View: Detailed Submissions History */}
            {(profile?.role === 'faculty' || profile?.role === 'admin') && (
              <motion.div 
                variants={itemVariants}
                className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/40 shadow-2xl"
              >
                <div className="flex flex-col space-y-8 mb-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-2xl md:text-3xl font-playfair font-black text-gray-900">Submission History</h2>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="relative group w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#5A5A40] transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Search students..."
                          className="w-full pl-10 pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white/40 border border-white/60 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none text-[10px] md:text-xs transition-all font-black"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2 bg-white/40 p-1.5 rounded-xl md:rounded-2xl border border-white/60">
                        <button 
                          onClick={() => setSortBy('date')}
                          className={cn("px-4 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all", sortBy === 'date' ? "bg-[#5A5A40] text-white" : "text-gray-400 hover:text-[#5A5A40]")}
                        >
                          Date
                        </button>
                        <button 
                          onClick={() => setSortBy('name')}
                          className={cn("px-4 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all", sortBy === 'name' ? "bg-[#5A5A40] text-white" : "text-gray-400 hover:text-[#5A5A40]")}
                        >
                          Name
                        </button>
                        <button 
                          onClick={() => setSortBy('marks')}
                          className={cn("px-4 py-2 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all", sortBy === 'marks' ? "bg-[#5A5A40] text-white" : "text-gray-400 hover:text-[#5A5A40]")}
                        >
                          Marks
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    <button 
                      onClick={() => setFilterStatus('all')}
                      className={cn(
                        "px-5 md:px-6 py-2 md:py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                        filterStatus === 'all' ? "bg-[#5A5A40] text-white border-[#5A5A40]" : "bg-white/40 text-gray-500 border-white/60 hover:border-[#5A5A40]/30"
                      )}
                    >
                      All Submissions
                    </button>
                    <button 
                      onClick={() => setFilterStatus('submitted')}
                      className={cn(
                        "px-5 md:px-6 py-2 md:py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                        filterStatus === 'submitted' ? "bg-blue-500 text-white border-blue-500" : "bg-blue-50/50 text-blue-600 border-blue-100 hover:border-blue-300"
                      )}
                    >
                      Pending Review
                    </button>
                    <button 
                      onClick={() => setFilterStatus('graded')}
                      className={cn(
                        "px-5 md:px-6 py-2 md:py-2.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                        filterStatus === 'graded' ? "bg-emerald-500 text-white border-emerald-500" : "bg-emerald-50/50 text-emerald-600 border-emerald-100 hover:border-emerald-300"
                      )}
                    >
                      Graded
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {filteredSubmissions.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-white/40 rounded-[2.5rem] md:rounded-[3rem] bg-white/10">
                      <FileText className="w-12 h-12 md:w-16 md:h-16 text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-500 italic font-serif text-base md:text-lg">No submissions match your criteria</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {filteredSubmissions.map((sub) => (
                        <div 
                          key={sub.id}
                          className={cn(
                            "p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border transition-all relative group",
                            gradingId === sub.id ? "bg-[#5A5A40]/5 border-[#5A5A40] shadow-inner" : "bg-white/40 border-white/60 hover:bg-white/60 hover:shadow-lg"
                          )}
                        >
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-4 md:gap-6">
                              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                <User className="w-6 h-6 md:w-8 md:h-8 text-[#5A5A40]" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-lg md:text-xl font-black text-gray-900">{sub.studentName || 'Unknown Student'}</p>
                                <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-gray-500 font-serif italic">
                                  <Clock className="w-3 h-3" />
                                  Submitted {sub.submittedAt?.toDate ? format(sub.submittedAt.toDate(), 'PPP p') : 'just now'}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                  <span className={cn(
                                    "px-3 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                    sub.status === 'graded' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                                  )}>
                                    {sub.status}
                                  </span>
                                  {sub.status === 'graded' && (
                                    <span className="text-[9px] md:text-[10px] font-black text-[#5A5A40] bg-white/80 px-3 py-1 rounded-full border border-black/5">
                                      {sub.marks} / {assignment.maxMarks} Points
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <a 
                                href={sub.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-3 rounded-xl bg-white/80 text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white transition-all border border-black/5 font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-sm"
                              >
                                <Download className="w-4 h-4" />
                                View File
                              </a>
                              <button 
                                onClick={() => {
                                  setGradingId(sub.id);
                                  setGradeData({ marks: sub.marks || 0, feedback: sub.feedback || '' });
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={cn(
                                  "flex-1 md:flex-none px-6 md:px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all shadow-sm",
                                  gradingId === sub.id ? "bg-[#5A5A40] text-white" : "bg-white/80 text-[#5A5A40] hover:bg-white"
                                )}
                              >
                                {sub.status === 'graded' ? 'Update Grade' : 'Grade Now'}
                              </button>
                            </div>
                          </div>

                          {sub.feedback && (
                            <div className="mt-6 p-5 md:p-6 bg-white/60 rounded-2xl border border-black/5 relative">
                              <div className="absolute top-4 right-4 opacity-10">
                                <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-[#5A5A40]" />
                              </div>
                              <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-[#5A5A40]/40 mb-2">Feedback Provided</p>
                              <p className="text-gray-700 font-serif italic text-sm md:text-base leading-relaxed">"{sub.feedback}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Student View: My Submission */}
            {profile?.role === 'student' && (
              <motion.div 
                variants={itemVariants}
                className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/40 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8 md:mb-10">
                  <h2 className="text-2xl md:text-3xl font-playfair font-black text-gray-900">My Submission</h2>
                  {studentSubmission && (
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border shadow-sm",
                      studentSubmission.status === 'graded' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {studentSubmission.status}
                    </div>
                  )}
                </div>

                {studentSubmission ? (
                  <div className="space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between p-6 md:p-8 bg-white/40 rounded-[2rem] md:rounded-[2.5rem] border border-white/60 hover:bg-white/60 transition-all group">
                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-3xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                          <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-base md:text-lg font-black text-gray-900">submission.pdf</p>
                          <p className="text-[10px] md:text-sm text-gray-500 font-serif italic">
                            Submitted on {studentSubmission.submittedAt?.toDate ? format(studentSubmission.submittedAt.toDate(), 'PPP p') : 'just now'}
                          </p>
                        </div>
                      </div>
                      <button className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-[#5A5A40] hover:text-white transition-all">
                        <Download className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>

                    {studentSubmission.status === 'graded' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 md:p-8 bg-emerald-50/30 rounded-[2rem] md:rounded-[2.5rem] border border-emerald-100 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                          <Award className="w-20 h-20 md:w-24 md:h-24 text-emerald-900" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg md:text-xl font-black text-emerald-900 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <Award className="w-5 h-5 md:w-6 md:h-6" />
                              </div>
                              Grading Results
                            </h3>
                            <div className="text-right">
                              <span className="text-3xl md:text-4xl font-black text-emerald-600">{studentSubmission.marks}</span>
                              <span className="text-emerald-400 font-black ml-1">/ {assignment.maxMarks}</span>
                            </div>
                          </div>
                          {studentSubmission.feedback && (
                            <div className="p-5 md:p-6 bg-white/60 rounded-2xl border border-emerald-100/50">
                              <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-emerald-600/60 mb-2">Faculty Feedback</p>
                              <p className="text-gray-800 italic font-serif text-base md:text-lg leading-relaxed">"{studentSubmission.feedback}"</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => !isOverdue && !isSubmitting && handleSubmitAssignment()}
                    className="text-center py-16 md:py-20 border-4 border-dashed border-white/40 rounded-[2.5rem] md:rounded-[3rem] bg-white/20 group hover:bg-white/30 transition-all cursor-pointer"
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 md:w-10 md:h-10 text-gray-300 group-hover:text-[#5A5A40] transition-colors" />
                    </div>
                    <h3 className="text-lg md:text-xl font-serif font-black text-gray-900 mb-2">Ready to submit?</h3>
                    <p className="text-sm md:text-base text-gray-500 font-serif italic mb-8">Click to simulate uploading your file</p>
                    <button 
                      disabled={isOverdue || isSubmitting}
                      className="bg-[#5A5A40] text-white px-8 md:px-10 py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm hover:bg-[#4A4A30] transition-all shadow-2xl shadow-[#5A5A40]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Submitting...' : 'Upload Assignment'}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Sidebar: Submissions List (Faculty/Admin) */}
          {(profile?.role === 'faculty' || profile?.role === 'admin') && (
            <div className="space-y-6">
              <motion.div 
                variants={itemVariants}
                className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] p-8 shadow-2xl border border-white/40 sticky top-24"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl md:text-2xl font-playfair font-black text-gray-900">Submissions</h2>
                  <div className="w-10 h-10 rounded-xl md:rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
                    <User className="w-5 h-5" />
                  </div>
                </div>
                
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {submissions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-6 h-6 md:w-8 md:h-8 text-gray-200" />
                      </div>
                      <p className="text-gray-400 italic text-xs md:text-sm font-serif">No submissions yet</p>
                    </div>
                  ) : (
                    submissions.map((sub, idx) => (
                      <motion.div 
                        key={sub.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden group",
                          gradingId === sub.id ? "border-[#5A5A40] bg-[#5A5A40]/5 shadow-inner" : "border-white/40 bg-white/20 hover:bg-white/40 hover:border-white/60"
                        )}
                        onClick={() => {
                          setGradingId(sub.id);
                          setGradeData({ marks: sub.marks || 0, feedback: sub.feedback || '' });
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-black text-gray-900 truncate flex-1 text-sm">{sub.studentName || 'Unknown Student'}</p>
                          <span className={cn(
                            "text-[7px] md:text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-sm",
                            sub.status === 'graded' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                          )}>
                            {sub.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] md:text-[10px]">
                          <span className="text-gray-400 font-serif italic">{sub.submittedAt?.toDate ? format(sub.submittedAt.toDate(), 'MMM d, p') : 'Just now'}</span>
                          {sub.status === 'graded' && (
                            <span className="font-black text-[#5A5A40] bg-white/60 px-2 py-0.5 rounded-lg border border-black/5">
                              {sub.marks} pts
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Grading Form */}
                <AnimatePresence>
                  {gradingId && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="mt-8 pt-8 border-t border-black/5 space-y-6"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-gray-900 text-sm">Grade Submission</h3>
                          <p className="text-[9px] md:text-[10px] text-gray-500 font-serif italic">
                            Grading: {submissions.find(s => s.id === gradingId)?.studentName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-5">
                        <div>
                          <div className="flex justify-between mb-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Marks</label>
                            <span className="text-[9px] md:text-[10px] font-black text-[#5A5A40]">Max: {assignment.maxMarks}</span>
                          </div>
                          <input 
                            type="number"
                            max={assignment.maxMarks}
                            className="w-full px-5 py-3 rounded-xl md:rounded-2xl bg-white/40 border border-white/60 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none text-sm transition-all font-black"
                            value={gradeData.marks}
                            onChange={e => setGradeData({...gradeData, marks: parseInt(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Feedback</label>
                          <textarea 
                            rows={4}
                            className="w-full px-5 py-3 rounded-xl md:rounded-2xl bg-white/40 border border-white/60 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none text-sm transition-all font-serif italic"
                            placeholder="Provide constructive feedback..."
                            value={gradeData.feedback}
                            onChange={e => setGradeData({...gradeData, feedback: e.target.value})}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={() => setGradingId(null)}
                            className="flex-1 py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] text-gray-400 hover:bg-gray-50 transition-all"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleGrade(gradingId)}
                            className="flex-1 py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] bg-[#5A5A40] text-white hover:bg-[#4A4A30] transition-all shadow-xl shadow-[#5A5A40]/20"
                          >
                            Save Grade
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
