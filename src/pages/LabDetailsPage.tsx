import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { 
  Beaker, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Play, 
  Github, 
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Zap,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, onSnapshot, addDoc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

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

export default function LabDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [lab, setLab] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [repoUrl, setRepoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    const unsubscribeLab = onSnapshot(doc(db, 'labs', id), (snapshot) => {
      if (snapshot.exists()) {
        setLab({ id: snapshot.id, ...snapshot.data() });
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `labs/${id}`));

    let unsubscribeSub = () => {};
    if (profile?.uid) {
      const subQ = query(
        collection(db, 'lab_submissions'), 
        where('labId', '==', id),
        where('studentId', '==', profile.uid)
      );
      unsubscribeSub = onSnapshot(subQ, (snapshot) => {
        if (!snapshot.empty) {
          const subData = snapshot.docs[0].data();
          setSubmission(subData);
          setRepoUrl(subData.githubLink || '');
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'lab_submissions'));
    }

    return () => {
      unsubscribeLab();
      unsubscribeSub();
    };
  }, [id, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !profile?.uid || !repoUrl) return;

    setIsSubmitting(true);
    try {
      if (submission) {
        toast.error('You have already submitted this lab.');
        return;
      }

      await addDoc(collection(db, 'lab_submissions'), {
        labId: id,
        studentId: profile.uid,
        studentName: profile.displayName,
        githubLink: repoUrl,
        completedAt: serverTimestamp(),
        score: 0,
        facultyId: lab?.facultyId
      });

      if (lab?.facultyId) {
        await addDoc(collection(db, 'notifications'), {
          userId: lab.facultyId,
          title: 'New Lab Submission',
          message: `${profile.displayName || 'A student'} has submitted the lab "${lab.title}".`,
          type: 'assignment',
          read: false,
          createdAt: serverTimestamp(),
          link: `/labs/${id}`
        });
      }

      toast.success('Lab submitted successfully!');
      navigate('/labs');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'lab_submissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-6">
        <AlertCircle className="w-20 h-20 text-red-500 opacity-20" />
        <h2 className="text-3xl font-playfair font-black text-stone-900">Experiment Not Found</h2>
        <button 
          onClick={() => navigate('/labs')}
          className="px-8 py-4 bg-[#5A5A40] text-white rounded-2xl font-montserrat font-bold uppercase tracking-widest"
        >
          Back to Labs
        </button>
      </div>
    );
  }

  const steps = lab.steps || [
    { title: 'Environment Setup', content: 'Clone the repository and install dependencies.' },
    { title: 'Implementation', content: 'Follow the instructions in the README to implement the core logic.' },
    { title: 'Testing', content: 'Run the test suite to verify your implementation.' },
    { title: 'Submission', content: 'Push your changes and submit the repository URL.' }
  ];

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
        className="relative z-10 max-w-6xl mx-auto space-y-8 md:space-y-12 pb-24 px-4 md:px-0"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <button 
            onClick={() => navigate('/labs')}
            className="group flex items-center gap-3 text-stone-400 hover:text-[#5A5A40] transition-colors"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/40 backdrop-blur-xl border border-white/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="font-montserrat font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em]">Back to Experiments</span>
          </button>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex-1 md:flex-none px-4 md:px-6 py-3 bg-white/40 backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/50 flex items-center justify-center gap-2 md:gap-3">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-[#5A5A40]" />
              <span className="font-montserrat font-black text-xs md:text-sm text-[#5A5A40]">60 MINS</span>
            </div>
            <div className="flex-1 md:flex-none px-4 md:px-6 py-3 bg-[#5A5A40] rounded-xl md:rounded-2xl text-white flex items-center justify-center gap-2 md:gap-3 shadow-xl shadow-[#5A5A40]/20">
              <Zap className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-montserrat font-black text-xs md:text-sm uppercase tracking-widest">{lab.weight} PTS</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8 md:space-y-12">
            <motion.div variants={itemVariants} className="space-y-4 md:space-y-6">
              <div className="flex items-center gap-3 md:gap-4">
                <span className={cn(
                  "text-[8px] md:text-[10px] uppercase font-montserrat font-black tracking-widest px-3 md:px-4 py-1 md:py-1.5 rounded-full border",
                  lab.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  lab.difficulty === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-red-50 text-red-600 border-red-200'
                )}>
                  {lab.difficulty} Level
                </span>
                <div className="h-px w-8 md:w-12 bg-stone-200" />
                <span className="text-[8px] md:text-[10px] text-stone-400 font-montserrat font-black uppercase tracking-widest">Practical Session</span>
              </div>
              <h1 className="text-3xl md:text-7xl font-playfair font-black text-stone-900 leading-tight md:leading-[0.9] tracking-tight">
                {lab.title}
              </h1>
            </motion.div>

            {/* Steps Navigation */}
            <motion.div variants={itemVariants} className="flex gap-3 md:gap-4 overflow-x-auto pb-4 custom-scrollbar">
              {steps.map((step: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveStep(i)}
                  className={cn(
                    "px-6 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-[2rem] whitespace-nowrap transition-all flex items-center gap-3 md:gap-4 border",
                    activeStep === i 
                      ? "bg-[#5A5A40] text-white border-[#5A5A40] shadow-xl shadow-[#5A5A40]/20" 
                      : "bg-white/40 backdrop-blur-xl text-stone-400 border-white/50 hover:bg-white/60"
                  )}
                >
                  <span className="text-[9px] md:text-[10px] font-black font-montserrat opacity-40">0{i + 1}</span>
                  <span className="font-montserrat font-black text-[9px] md:text-[10px] uppercase tracking-widest">{step.title}</span>
                </button>
              ))}
            </motion.div>

            {/* Step Content */}
            <motion.div 
              key={activeStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/40 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/50 shadow-2xl min-h-[300px] md:min-h-[400px]"
            >
              <div className="prose prose-stone max-w-none">
                <h3 className="text-2xl md:text-3xl font-playfair font-black text-stone-900 mb-6 md:mb-8">{steps[activeStep].title}</h3>
                <div className="text-stone-600 font-montserrat font-medium leading-relaxed space-y-4 md:space-y-6">
                  <Markdown>{steps[activeStep].content}</Markdown>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8 md:space-y-12">
            {/* Submission Card */}
            <motion.div variants={itemVariants} className="bg-white/40 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/50 shadow-2xl space-y-6 md:space-y-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#5A5A40]/5 rounded-xl md:rounded-2xl flex items-center justify-center text-[#5A5A40]">
                  <Github className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="font-playfair font-black text-xl md:text-2xl text-stone-900">Submission</h3>
              </div>
              
              {submission ? (
                <div className="space-y-4 md:space-y-6">
                  <div className="p-4 md:p-6 bg-emerald-50 border border-emerald-100 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4">
                    <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-500" />
                    <div>
                      <p className="text-[10px] md:text-sm font-montserrat font-black text-emerald-900 uppercase tracking-widest">Submitted</p>
                      <p className="text-[9px] md:text-xs text-emerald-600 font-montserrat font-medium">Your work is under review.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-stone-400 ml-2">Your Repository</p>
                    <a 
                      href={submission.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 md:p-5 bg-white/60 border border-stone-100 rounded-xl md:rounded-2xl group/link"
                    >
                      <span className="text-[10px] md:text-xs font-montserrat font-medium text-stone-600 truncate mr-4">{submission.githubLink}</span>
                      <ExternalLink className="w-4 h-4 text-stone-400 group-hover/link:text-[#5A5A40] transition-colors" />
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  <div className="space-y-2 md:space-y-3">
                    <label className="block text-[9px] md:text-[10px] font-black uppercase tracking-widest text-stone-400 ml-2">Repository URL</label>
                    <input 
                      type="url" 
                      required
                      placeholder="https://github.com/username/repo"
                      className="w-full px-5 md:px-6 py-4 md:py-5 rounded-xl md:rounded-2xl bg-white/60 border border-stone-100 focus:ring-4 focus:ring-[#5A5A40]/10 outline-none font-montserrat font-medium text-sm transition-all"
                      value={repoUrl}
                      onChange={e => setRepoUrl(e.target.value)}
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 md:py-6 bg-[#5A5A40] text-white rounded-xl md:rounded-[2rem] font-montserrat font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] hover:bg-[#4A4A30] transition-all shadow-xl shadow-[#5A5A40]/20 flex items-center justify-center gap-2 md:gap-3 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Submit Repository'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              <div className="pt-4 md:pt-6 border-t border-stone-100">
                <div className="flex items-center gap-3 text-stone-400">
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
                  <p className="text-[8px] md:text-[10px] font-montserrat font-bold uppercase tracking-widest leading-tight">
                    Make sure your repository is public or shared with faculty.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Resources */}
            <motion.div variants={itemVariants} className="bg-stone-900 rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 md:w-40 md:h-40 bg-white/5 rounded-full -mr-16 -mt-16 md:-mr-20 md:-mt-20 blur-3xl group-hover:bg-white/10 transition-all" />
              
              <h3 className="font-playfair font-black text-xl md:text-2xl mb-6 md:mb-8 relative z-10">Resources</h3>
              <div className="space-y-3 md:space-y-4 relative z-10">
                {[
                  { icon: FileText, label: 'Documentation', link: '#' },
                  { icon: Play, label: 'Video Tutorial', link: '#' },
                  { icon: ExternalLink, label: 'Reference API', link: '#' }
                ].map((res, i) => (
                  <a 
                    key={i}
                    href={res.link}
                    className="flex items-center justify-between p-4 md:p-5 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10 transition-all group/res"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <res.icon className="w-4 h-4 md:w-5 md:h-5 text-white/40 group-hover/res:text-white transition-colors" />
                      <span className="text-[9px] md:text-[10px] font-montserrat font-black uppercase tracking-widest">{res.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover/res:opacity-100 transition-all" />
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
