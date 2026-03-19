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
  MessageSquare
} from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { format, isAfter } from 'date-fns';
import { cn } from '../lib/utils';

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
      await updateDoc(subRef, {
        marks: gradeData.marks,
        feedback: gradeData.feedback,
        status: 'graded',
        gradedAt: serverTimestamp()
      });
      setGradingId(null);
      setGradeData({ marks: 0, feedback: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `submissions/${subId}`);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading assignment details...</div>;
  if (!assignment) return <div className="text-center p-12">Assignment not found.</div>;

  const studentSubmission = submissions.find(s => s.studentId === profile?.uid);
  const isOverdue = assignment.deadline && isAfter(new Date(), new Date(assignment.deadline));
  const isNearingDeadline = assignment.deadline && !isOverdue && (new Date(assignment.deadline).getTime() - new Date().getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate('/assignments')}
        className="flex items-center gap-2 text-gray-500 hover:text-[#5A5A40] transition-colors font-bold"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Assignments
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignment Info */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-black/5"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-[#5A5A40]/10 rounded-3xl flex items-center justify-center">
                <FileText className="w-8 h-8 text-[#5A5A40]" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold text-gray-900">{assignment.title}</h1>
                <p className="text-gray-500 font-serif italic">Subject ID: {assignment.subjectId || 'N/A'}</p>
              </div>
            </div>

            <div className="prose prose-stone max-w-none mb-8">
              <h3 className="text-lg font-bold mb-2">Description</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-50">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Deadline</p>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Calendar className="w-4 h-4 text-[#5A5A40]" />
                  {assignment.deadline ? format(new Date(assignment.deadline), 'PPP p') : 'No deadline'}
                  {profile?.role === 'student' && !studentSubmission && (
                    <>
                      {isOverdue ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-red-200">
                          Overdue
                        </span>
                      ) : isNearingDeadline ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-amber-200 animate-pulse">
                          Due Soon
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Max Marks</p>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <Award className="w-4 h-4 text-[#5A5A40]" />
                  {assignment.maxMarks} Points
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">Submissions</p>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <CheckCircle className="w-4 h-4 text-[#5A5A40]" />
                  {submissions.length} Total
                </div>
              </div>
            </div>
          </motion.div>

          {/* Student View: My Submission */}
          {profile?.role === 'student' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-black/5"
            >
              <h2 className="text-2xl font-serif font-bold mb-6">My Submission</h2>
              {studentSubmission ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <FileText className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">submission.pdf</p>
                        <p className="text-xs text-gray-500">Submitted on {studentSubmission.submittedAt?.toDate ? format(studentSubmission.submittedAt.toDate(), 'PPP p') : 'just now'}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border",
                      studentSubmission.status === 'graded' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {studentSubmission.status}
                    </span>
                  </div>

                  {studentSubmission.status === 'graded' && (
                    <div className="p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-emerald-900 flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          Grading Results
                        </h3>
                        <span className="text-2xl font-black text-emerald-600">{studentSubmission.marks} / {assignment.maxMarks}</span>
                      </div>
                      {studentSubmission.feedback && (
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600/60">Faculty Feedback</p>
                          <p className="text-sm text-emerald-800 italic">"{studentSubmission.feedback}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                  <Upload className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-serif italic">No submission yet</p>
                  <button className="mt-4 bg-[#5A5A40] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20">
                    Upload Now
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-black/5 sticky top-24"
            >
              <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-[#5A5A40]" />
                Student Submissions
              </h2>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {submissions.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 italic text-sm">No submissions yet</p>
                ) : (
                  submissions.map((sub) => (
                    <div 
                      key={sub.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer",
                        gradingId === sub.id ? "border-[#5A5A40] bg-[#5A5A40]/5" : "border-gray-50 hover:border-gray-200"
                      )}
                      onClick={() => {
                        setGradingId(sub.id);
                        setGradeData({ marks: sub.marks || 0, feedback: sub.feedback || '' });
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-sm truncate">{sub.studentName || 'Unknown Student'}</p>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full border",
                          sub.status === 'graded' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {sub.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>{sub.submittedAt?.toDate ? format(sub.submittedAt.toDate(), 'MMM d, p') : 'Just now'}</span>
                        {sub.status === 'graded' && <span className="font-black text-[#5A5A40]">{sub.marks} pts</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Grading Form */}
              <AnimatePresence>
                {gradingId && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8 pt-8 border-t border-gray-100 space-y-4"
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#5A5A40]" />
                      Grade Submission
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Marks (Max {assignment.maxMarks})</label>
                        <input 
                          type="number"
                          max={assignment.maxMarks}
                          className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#5A5A40] outline-none text-sm"
                          value={gradeData.marks}
                          onChange={e => setGradeData({...gradeData, marks: parseInt(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Feedback</label>
                        <textarea 
                          rows={3}
                          className="w-full px-4 py-2 rounded-xl border border-gray-100 focus:ring-2 focus:ring-[#5A5A40] outline-none text-sm"
                          placeholder="Great work! Keep it up."
                          value={gradeData.feedback}
                          onChange={e => setGradeData({...gradeData, feedback: e.target.value})}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setGradingId(null)}
                          className="flex-1 py-2 rounded-xl font-bold text-gray-400 hover:bg-gray-50 text-xs"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleGrade(gradingId)}
                          className="flex-1 py-2 rounded-xl font-bold bg-[#5A5A40] text-white hover:bg-[#4A4A30] text-xs shadow-lg shadow-[#5A5A40]/20"
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
    </div>
  );
}

function Upload({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
    </svg>
  );
}
