import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { 
  FileText, 
  Upload, 
  Clock, 
  CheckCircle, 
  Plus,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { format, isAfter } from 'date-fns';
import { cn } from '../lib/utils';

import { useNavigate } from 'react-router-dom';

export default function AssignmentsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', deadline: '', maxMarks: 100 });

  useEffect(() => {
    const q = query(collection(db, 'assignments'), orderBy('deadline', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
    });
    return () => unsubscribe();
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'assignments'), {
        ...newAssignment,
        facultyId: profile?.uid,
        createdAt: serverTimestamp(),
      });
      setShowCreateModal(false);
      setNewAssignment({ title: '', description: '', deadline: '', maxMarks: 100 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitAssignment = async (asgnId: string) => {
    setIsSubmitting(asgnId);
    try {
      await addDoc(collection(db, 'submissions'), {
        assignmentId: asgnId,
        studentId: profile?.uid,
        studentName: profile?.displayName,
        submittedAt: serverTimestamp(),
        fileUrl: 'https://example.com/submission.pdf', // Placeholder
        status: 'submitted',
        marks: 0,
        feedback: ''
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'submitted': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            {profile?.role === 'admin' ? 'Global Assignments' : 'Assignments'}
          </h1>
          <p className="text-gray-500 font-serif italic">
            {profile?.role === 'student' ? 'Track your academic progress' : 'Manage and track student submissions'}
          </p>
        </div>
        {(profile?.role === 'faculty' || profile?.role === 'admin') && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
          >
            <Plus className="w-5 h-5" />
            Create New
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignments.map((asgn, i) => {
          const studentSubmission = submissions.find(s => s.assignmentId === asgn.id && s.studentId === profile?.uid);
          const facultySubmissions = submissions.filter(s => s.assignmentId === asgn.id);
          const status = studentSubmission ? studentSubmission.status : 'pending';
          const isOverdue = asgn.deadline && isAfter(new Date(), new Date(asgn.deadline));
          const isNearingDeadline = asgn.deadline && !isOverdue && (new Date(asgn.deadline).getTime() - new Date().getTime()) < 24 * 60 * 60 * 1000;

          return (
            <motion.div
              key={asgn.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group relative overflow-hidden",
                status === 'graded' ? "bg-emerald-50/40 border-emerald-100" : 
                status === 'submitted' ? "bg-blue-50/40 border-blue-100" :
                isOverdue && status === 'pending' ? "border-red-100 bg-red-50/10" : 
                isNearingDeadline && status === 'pending' ? "border-amber-100 bg-amber-50/10" : "border-black/5"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#5A5A40] transition-colors">
                  <FileText className="w-6 h-6 text-[#5A5A40] group-hover:text-white" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    {status === 'pending' && (
                      <>
                        {isOverdue ? (
                          <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-200">
                            Overdue
                          </span>
                        ) : isNearingDeadline ? (
                          <span className="px-3 py-1 bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200 animate-pulse">
                            Due Soon
                          </span>
                        ) : null}
                      </>
                    )}
                    <span className="text-xs font-bold px-3 py-1 bg-gray-100 rounded-full text-gray-500">
                      {asgn.maxMarks} Marks
                    </span>
                  </div>
                  {profile?.role === 'student' && (
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider", getStatusColor(status))}>
                      {status}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-xl font-serif font-bold mb-2">{asgn.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-6">{asgn.description}</p>
              
              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {asgn.deadline ? format(new Date(asgn.deadline), 'PPP') : 'N/A'}</span>
                </div>
                {profile?.role === 'student' ? (
                  <div className={cn("flex items-center gap-2 text-sm", isOverdue && status === 'pending' ? 'text-red-600' : 'text-amber-600')}>
                    <Clock className="w-4 h-4" />
                    <span>{isOverdue ? 'Deadline passed' : 'Upcoming deadline'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-[#5A5A40] font-bold">
                    <CheckCircle className="w-4 h-4" />
                    <span>{facultySubmissions.length} Submissions</span>
                  </div>
                )}
              </div>

              {profile?.role === 'student' ? (
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={() => handleSubmitAssignment(asgn.id)}
                    disabled={status !== 'pending' || isOverdue || isSubmitting === asgn.id}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      status === 'pending' && !isOverdue 
                        ? "bg-[#5A5A40] text-white hover:bg-[#4A4A30]" 
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isSubmitting === asgn.id ? 'Submitting...' : 
                     status === 'submitted' ? 'Submitted' : 
                     status === 'graded' ? 'Graded' : 
                     isOverdue ? 'Closed' : 'Upload'}
                    {status === 'submitted' && <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => navigate(`/assignments/${asgn.id}`)}
                    className="px-4 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    Details
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => navigate(`/assignments/${asgn.id}`)}
                  className="w-full mt-6 bg-gray-50 text-gray-900 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all"
                >
                  View Details & Submissions
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl"
          >
            <h2 className="text-2xl font-serif font-bold mb-6">New Assignment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={newAssignment.title}
                  onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea 
                  rows={3}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                  value={newAssignment.description}
                  onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Deadline</label>
                  <input 
                    type="datetime-local" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                    value={newAssignment.deadline}
                    onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Max Marks</label>
                  <input 
                    type="number" 
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#5A5A40] outline-none"
                    value={isNaN(newAssignment.maxMarks) ? '' : newAssignment.maxMarks}
                    onChange={e => setNewAssignment({...newAssignment, maxMarks: e.target.value === '' ? NaN : parseInt(e.target.value)})}
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
