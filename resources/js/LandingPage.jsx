import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Video,
  BookOpen,
  Award,
  Calendar,
  ShieldCheck,
  Users,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  Laptop,
  Check,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Star
} from 'lucide-react';

const VACATION_CLASS_NAME = "SHS Vacation Classes";

export const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* ======================= TOP NAVIGATION ======================= */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-md shadow-xs border-b border-slate-200/80 py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Brand Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-black text-slate-900 tracking-tight block leading-tight">
                {VACATION_CLASS_NAME}
              </span>
              <span className="text-[10px] font-bold text-blue-600 tracking-widest uppercase block">
                Academic Excellence Portal
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-600">
            <a href="#about" className="hover:text-blue-600 transition-colors">About Program</a>
            <a href="#streams" className="hover:text-blue-600 transition-colors">SHS Streams</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Learning Desk</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
          </nav>

          {/* Authentication Actions */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/login"
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100/80 transition-all"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
            >
              <span>Enroll Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-5 space-y-4 shadow-xl animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-3 text-sm font-semibold text-slate-700">
              <a href="#about" onClick={() => setMobileMenuOpen(false)}>About Program</a>
              <a href="#streams" onClick={() => setMobileMenuOpen(false)}>SHS Streams</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Learning Desk</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            </div>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              <a
                href="/login"
                className="w-full py-2.5 rounded-xl border border-slate-200 text-center text-xs font-bold text-slate-800"
              >
                Sign In to Portal
              </a>
              <a
                href="/register"
                className="w-full py-2.5 rounded-xl bg-blue-600 text-center text-xs font-bold text-white shadow-md shadow-blue-600/20"
              >
                Register as New Student
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ======================= HERO SECTION ======================= */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-[#F8FAFC]">
        {/* Background Glow Blobs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-blue-400/10 to-indigo-400/10 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-xs mb-6 animate-in fade-in duration-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Admissions Open for August & September Vacation Session</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Prepare, Revise & Excel with Expert-Led <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">SHS Vacation Classes</span>
          </h1>

          {/* Subheading */}
          <p className="mt-5 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Gain an academic advantage during vacation. Access live virtual classes, expert tutor feedback, practice problem sets, and targeted WASSCE preparation for SHS 1, 2, and 3 students.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <a
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Enroll as a Student</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In to Desk</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Key Quick Stats Strip */}
          <div className="mt-14 pt-8 border-t border-slate-200/60 max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">100%</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Live Interactive Lessons</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">7+ Streams</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Comprehensive Curricula</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">Top Faculty</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Certified SHS Instructors</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600">WASSCE</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Aligned Standard Prep</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= WHY JOIN SECTION ======================= */}
      <section id="about" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Program Highlights
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight">
              Designed to Accelerate Your Senior High School Performance
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Everything you need to master challenging topics and build solid exam confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 hover:border-blue-300 transition-all hover:shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Live Virtual Classrooms</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect directly with certified subject teachers via Zoom and Google Meet. Ask real-time questions, review step-by-step problem sets, and participate in classroom discussions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 hover:border-indigo-300 transition-all hover:shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Task Briefs & Homework Scoring</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Download structured assessment briefs (DOCX/PDF) from your instructors. Submit your working out directly online and receive recorded percentage marks and constructive feedback.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-[#F8FAFC] border border-slate-200/80 hover:border-emerald-300 transition-all hover:shadow-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Attendance & Grade Tracking</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Stay on track with verified attendance rolls logged daily by course tutors. Monitor your cumulative scores and academic standings in a clean, comprehensive report.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= CURRICULUM STREAMS ======================= */}
      <section id="streams" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Subject Offerings
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight">
              Specialized Streams for Every SHS Candidate
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Syllabus-aligned preparation led by seasoned tutors specializing in WASSCE formats.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Stream 1 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-50 text-blue-700">
                  SCIENCE
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-3">General Science</h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Elective Mathematics</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Physics</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Chemistry</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600" /> Biology / ICT</li>
                </ul>
              </div>
              <a href="/register" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 mt-2">
                <span>Select this stream</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Stream 2 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-purple-50 text-purple-700">
                  ARTS
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-3">General Arts</h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-600" /> Economics</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-600" /> Government & History</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-600" /> Literature-in-English</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-purple-600" /> Geography</li>
                </ul>
              </div>
              <a href="/register" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 mt-2">
                <span>Select this stream</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Stream 3 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-50 text-amber-700">
                  COMMERCE
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-3">Business</h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-600" /> Financial Accounting</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-600" /> Cost Accounting</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-600" /> Business Management</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-amber-600" /> Economics</li>
                </ul>
              </div>
              <a href="/register" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 mt-2">
                <span>Select this stream</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Stream 4 */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700">
                  CORE
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-3">Core Subjects</h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Core Mathematics</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> English Language</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Integrated Science</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> Social Studies</li>
                </ul>
              </div>
              <a href="/register" className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 mt-2">
                <span>Select this stream</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= HOW IT WORKS ======================= */}
      <section id="how-it-works" className="py-20 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
              Simple 4-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight">
              How to Get Started with Vacation Classes
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              From online sign-up to joining your first live lesson in just a few simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            
            {/* Step 1 */}
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20">
                1
              </div>
              <h4 className="text-base font-bold text-slate-900">Register Online</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Complete the new student enrollment form with your academic details and select your subjects.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-md">
                2
              </div>
              <h4 className="text-base font-bold text-slate-900">Enrollment Cleared</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your admission is verified by administrators, automatically creating your index number and profile.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-md">
                3
              </div>
              <h4 className="text-base font-bold text-slate-900">Fee Clearance</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Once tuition status is confirmed, live Zoom and Google Meet classroom coordinates unlock on your desk.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-500/20">
                4
              </div>
              <h4 className="text-base font-bold text-slate-900">Attend & Succeed</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Join scheduled live virtual classes, download task briefs, submit coursework, and track your progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= CALL TO ACTION BANNER ======================= */}
      <section className="py-20 bg-slate-950 text-white relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/20 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Academic Portal</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Ready to Accelerate Your Senior High School Grades?
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Join other ambitious students across Ghana preparing for academic excellence and top WASSCE honors.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105"
            >
              Sign Up as New Student
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all"
            >
              Existing Student Sign In
            </a>
          </div>
        </div>
      </section>

      {/* ======================= FOOTER ======================= */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{VACATION_CLASS_NAME}</p>
              <p className="text-[11px] text-slate-500">Academic Management Infrastructure</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <a href="/login" className="hover:text-white transition-colors">Portal Login</a>
            <a href="/register" className="hover:text-white transition-colors">Student Admissions</a>
            <a href="/login" className="hover:text-white transition-colors">Faculty Desk</a>
          </div>

          <p className="text-[11px] text-slate-500">
            © 2026 {VACATION_CLASS_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Mount component to root element
const landingRoot = document.getElementById('landing-page-root') || document.getElementById('app');
if (landingRoot) {
  ReactDOM.createRoot(landingRoot).render(
    <React.StrictMode>
      <LandingPage />
    </React.StrictMode>
  );
}

export default LandingPage;