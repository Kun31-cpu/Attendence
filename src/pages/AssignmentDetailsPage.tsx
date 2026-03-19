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
  Upload
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { format, isAfter } from 'date-fns';
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 max-w-5xl mx-auto pb-12"
    >
      <motion.button 
        variants={itemVariants}
        onClick={() => navigate('/assignments')}
        className="flex items-center gap-2 text-gray-500 hover:text-[#5A5A40] transition-colors font-bold group"
      >
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-sm uppercase tracking-widest">Back to Assignments</span>
      </motion.button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignment Info */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            variants={itemVariants}
            className="glass-effect rounded-[3rem] p-8 md:p-12 border border-white/40 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#5A5A40]/5 blur-3xl rounded-full -mr-32 -mt-32" />
            
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-4 mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#5A5A40] to-[#4A4A30] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#5A5A40]/20">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[#5A5A40]/40 mb-1">Assignment Details</p>
                  <h1 className="text-4xl md:text-5xl font-playfair font-black text-gray-900 leading-tight">{assignment.title}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-[#5A5A40]/10 text-[#5A5A40] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#5A5A40]/20">
                      {assignment.subjectId || 'General'}
                    </span>
                    <span className="text-gray-400 text-xs font-serif italic">Created by Faculty</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mb-10">
                <div className="p-6 bg-white/40 rounded-3xl border border-white/60">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> Description & Instructions
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-serif text-lg">{assignment.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-black/5">
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Deadline</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {assignment.deadline ? format(new Date(assignment.deadline), 'MMM d, yyyy') : 'No deadline'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {assignment.deadline ? format(new Date(assignment.deadline), 'h:mm a') : 'Anytime'}
                      </p>
                    </div>
                  </div>
                  {profile?.role === 'student' && !studentSubmission && (
                    <div className="mt-2">
                      {isOverdue ? (
                        <span className="px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-red-100">
                          Overdue
                        </span>
                      ) : isNearingDeadline ? (
                        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-100 animate-pulse">
                          Due Soon
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Grading</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{assignment.maxMarks} Points</p>
                      <p className="text-[10px] text-gray-500">Maximum Score</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Activity</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{submissions.length} Students</p>
                      <p className="text-[10px] text-gray-500">Total Submissions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Student View: My Submission */}
          {profile?.role === 'student' && (
            <motion.div 
              variants={itemVariants}
              className="glass-effect rounded-[3rem] p-8 md:p-12 border border-white/40 shadow-xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-playfair font-black text-gray-900">My Submission</h2>
                {studentSubmission && (
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                    studentSubmission.status === 'graded' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {studentSubmission.status}
                  </div>
                )}
              </div>

              {studentSubmission ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-8 bg-white/40 rounded-[2.5rem] border border-white/60 hover:bg-white/60 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <FileText className="w-8 h-8 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">submission.pdf</p>
                        <p className="text-sm text-gray-500 font-serif italic">
                          Submitted on {studentSubmission.submittedAt?.toDate ? format(studentSubmission.submittedAt.toDate(), 'PPP p') : 'just now'}
                        </p>
                      </div>
                    </div>
                    <button className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-[#5A5A40] hover:text-white transition-all">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>

                  {studentSubmission.status === 'graded' && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 bg-emerald-50/30 rounded-[2.5rem] border border-emerald-100 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Award className="w-24 h-24 text-emerald-900" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                              <Award className="w-6 h-6" />
                            </div>
                            Grading Results
                          </h3>
                          <div className="text-right">
                            <span className="text-4xl font-black text-emerald-600">{studentSubmission.marks}</span>
                            <span className="text-emerald-400 font-bold ml-1">/ {assignment.maxMarks}</span>
                          </div>
                        </div>
                        {studentSubmission.feedback && (
                          <div className="p-6 bg-white/60 rounded-2xl border border-emerald-100/50">
                            <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600/60 mb-2">Faculty Feedback</p>
                            <p className="text-gray-800 italic font-serif text-lg leading-relaxed">"{studentSubmission.feedback}"</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 border-4 border-dashed border-white/40 rounded-[3rem] bg-white/20 group hover:bg-white/30 transition-all cursor-pointer">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-gray-300 group-hover:text-[#5A5A40] transition-colors" />
                  </div>
                  <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Ready to submit?</h3>
                  <p className="text-gray-500 font-serif italic mb-8">Drag and drop your file here or click to browse</p>
                  <button className="bg-[#5A5A40] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#4A4A30] transition-all shadow-2xl shadow-[#5A5A40]/30">
                    Upload Assignment
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
              className="glass-effect rounded-[3rem] p-8 shadow-xl border border-white/40 sticky top-24"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-playfair font-black text-gray-900">Submissions</h2>
                <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
                  <User className="w-5 h-5" />
                </div>
              </div>
              
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="text-gray-400 italic text-sm font-serif">No submissions yet</p>
                  </div>
                ) : (
                  submissions.map((sub, idx) => (
                    <motion.div 
                      key={sub.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "p-5 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden group",
                        gradingId === sub.id ? "border-[#5A5A40] bg-[#5A5A40]/5 shadow-inner" : "border-white/40 bg-white/20 hover:bg-white/40 hover:border-white/60"
                      )}
                      onClick={() => {
                        setGradingId(sub.id);
                        setGradeData({ marks: sub.marks || 0, feedback: sub.feedback || '' });
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-bold text-gray-900 truncate flex-1">{sub.studentName || 'Unknown Student'}</p>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shadow-sm",
                          sub.status === 'graded' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
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
                      <h3 className="font-bold text-gray-900">Grade Submission</h3>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Marks</label>
                          <span className="text-[10px] font-black text-[#5A5A40]">Max: {assignment.maxMarks}</span>
                        </div>
                        <input 
                          type="number"
                          max={assignment.maxMarks}
                          className="w-full px-5 py-3 rounded-2xl bg-white/40 border border-white/60 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none text-sm transition-all font-bold"
                          value={gradeData.marks}
                          onChange={e => setGradeData({...gradeData, marks: parseInt(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Feedback</label>
                        <textarea 
                          rows={4}
                          className="w-full px-5 py-3 rounded-2xl bg-white/40 border border-white/60 focus:ring-4 focus:ring-[#5A5A40]/5 focus:border-[#5A5A40]/30 outline-none text-sm transition-all font-serif italic"
                          placeholder="Provide constructive feedback..."
                          value={gradeData.feedback}
                          onChange={e => setGradeData({...gradeData, feedback: e.target.value})}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setGradingId(null)}
                          className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:bg-gray-50 transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleGrade(gradingId)}
                          className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-[#5A5A40] text-white hover:bg-[#4A4A30] transition-all shadow-xl shadow-[#5A5A40]/20"
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
  );
}

function Upload({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  );
}
