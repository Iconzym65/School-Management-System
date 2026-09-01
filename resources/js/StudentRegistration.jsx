import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  ShieldCheck,
  Edit3,
  Save,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Lock,
  Check,
  Info,
  Loader2,
  Building,
  Sparkles,
  Layers,
  FileCheck,
  Eye,
  EyeOff,
  Clock,
  Send,
  HelpCircle
} from 'lucide-react';

// --- Customizable Institution Configuration ---
export const INSTITUTION_CONFIG = {
  name: import.meta.env.VITE_INSTITUTION_NAME || 'Apex Institute of Technology & Science',
  shortName: import.meta.env.VITE_INSTITUTION_SHORT_NAME || 'ApexEdu',
  portalTagline: 'Sandwich & Vacation Academic Admissions Portal',
  portalUrl: window.location.origin,
  supportEmail: 'admissions@institution.edu',
  logoIcon: GraduationCap, // Replaceable with <img> or custom SVG logo component
  primaryAccent: 'blue', // Aligns with Admin & Student Portals
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = resJson.message || resJson.error || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMessage);
  }

  return resJson.data !== undefined ? resJson.data : resJson;
}

const STORAGE_KEY = 'apex_admission_draft_v2';
const DRAFT_TIME_KEY = 'apex_admission_draft_timestamp_v2';

export const StudentRegistration = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [draftTimestamp, setDraftTimestamp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Active Cohort and Available Subjects
  const [activeCohort, setActiveCohort] = useState({
    id: 1,
    name: '2026 Sandwich & Vacation Intake - Track Alpha',
    code: 'VAC-2026-A',
    academic_year: '2025/2026',
    starts_on: '2026-06-01',
    ends_on: '2026-08-31',
    description: 'Admissions Open: Auto-enrollment into virtual live lecture schedules upon verification.'
  });

  const [availableCourses, setAvailableCourses] = useState([
    { id: 101, code: 'CS101', name: 'Computer Programming & Logic', credit_hours: 3, category: 'Core Science' },
    { id: 102, code: 'MATH204', name: 'Discrete Computational Mathematics', credit_hours: 3, category: 'Core Science' },
    { id: 103, code: 'ENG101', name: 'Academic Communication & Writing', credit_hours: 2, category: 'General' },
    { id: 104, code: 'BUSM102', name: 'Principles of Business & Management', credit_hours: 3, category: 'Business' },
    { id: 105, code: 'PHYS101', name: 'Applied Modern Physics', credit_hours: 3, category: 'Core Science' },
    { id: 106, code: 'CHEM101', name: 'Inorganic & Physical Chemistry', credit_hours: 3, category: 'Core Science' },
    { id: 107, code: 'ECON101', name: 'Micro & Macroeconomics Analysis', credit_hours: 3, category: 'Business' },
    { id: 108, code: 'BIO101', name: 'Molecular Biology & Genetics', credit_hours: 3, category: 'Core Science' },
  ]);

  // Comprehensive Registration State
  const [formData, setFormData] = useState({
    // Step 1: Candidate Identity
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'Male',
    dob: '',
    student_phone: '',
    student_email: '',
    residential_address: '',
    city: '',

    // Step 2: Educational Background
    previous_institution: '',
    current_level: 'Level 200 / Form 2',
    stream_track: 'General Science',
    student_id_reference: '',

    // Step 3: Subject Enrollment
    selected_courses: [101, 102],

    // Step 4: Guardian & Emergency Contact
    guardian_name: '',
    guardian_relationship: 'Parent',
    guardian_email: '',
    guardian_phone: '',
    guardian_whatsapp: '',
    emergency_contact_address: '',

    // Step 5: Portal Account Security
    password: '',
    password_confirmation: '',

    // Step 6: Legal Declarations
    declaration_confirmed: false,
    privacy_accepted: false,
  });

  // Fetch Live Portal Cohorts & Restore Local Draft
  useEffect(() => {
    apiFetch('/public/active-cohort')
      .then((res) => {
        if (res && res.id) setActiveCohort(res);
      })
      .catch(() => {});

    apiFetch('/public/courses')
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) setAvailableCourses(res);
      })
      .catch(() => {});

    const savedDraft = localStorage.getItem(STORAGE_KEY);
    const savedTime = localStorage.getItem(DRAFT_TIME_KEY);

    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft));
      } catch (_) {}
    }

    if (savedTime) {
      setDraftTimestamp(savedTime);
    } else {
      recordDraftTime();
    }
  }, []);

  const recordDraftTime = () => {
    const now = new Date();
    const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
      ', ' + now.toLocaleDateString();
    setDraftTimestamp(formatted);
    localStorage.setItem(DRAFT_TIME_KEY, formatted);
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    recordDraftTime();
  };

  const toggleCourseSelection = (courseId) => {
    setFormData((prev) => {
      const isSelected = prev.selected_courses.includes(courseId);
      const updatedList = isSelected
        ? prev.selected_courses.filter((id) => id !== courseId)
        : [...prev.selected_courses, courseId];

      const updated = { ...prev, selected_courses: updatedList };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    recordDraftTime();
  };

  const handleSaveDraftManual = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    recordDraftTime();
    alert('Progress saved. You can return and complete this application at any time.');
  };

  const handleClearDraft = () => {
    if (window.confirm('Clear all entries and restart your application?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DRAFT_TIME_KEY);
      setFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        gender: 'Male',
        dob: '',
        student_phone: '',
        student_email: '',
        residential_address: '',
        city: '',
        previous_institution: '',
        current_level: 'Level 200 / Form 2',
        stream_track: 'General Science',
        student_id_reference: '',
        selected_courses: [],
        guardian_name: '',
        guardian_relationship: 'Parent',
        guardian_email: '',
        guardian_phone: '',
        guardian_whatsapp: '',
        emergency_contact_address: '',
        password: '',
        password_confirmation: '',
        declaration_confirmed: false,
        privacy_accepted: false,
      });
      setStep(1);
      recordDraftTime();
    }
  };

  const validateStepFields = () => {
    setErrorMessage('');

    if (step === 1) {
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setErrorMessage('Please enter your full legal first and last name.');
        return false;
      }
      if (!formData.student_email.trim() || !formData.student_phone.trim()) {
        setErrorMessage('A valid applicant email and mobile phone number are required.');
        return false;
      }
      if (!formData.dob) {
        setErrorMessage('Please specify your date of birth.');
        return false;
      }
      if (!formData.residential_address.trim()) {
        setErrorMessage('Please enter your residential address.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.previous_institution.trim()) {
        setErrorMessage('Please provide your current or previous academic institution.');
        return false;
      }
    }

    if (step === 3) {
      if (formData.selected_courses.length === 0) {
        setErrorMessage('Please select at least one course / subject module.');
        return false;
      }
    }

    if (step === 4) {
      if (!formData.guardian_name.trim() || !formData.guardian_phone.trim() || !formData.guardian_email.trim()) {
        setErrorMessage('Guardian contact name, phone, and email address are required.');
        return false;
      }
    }

    if (step === 5) {
      if (!formData.password || formData.password.length < 8) {
        setErrorMessage('Password must be at least 8 characters in length.');
        return false;
      }
      if (formData.password !== formData.password_confirmation) {
        setErrorMessage('The passwords provided do not match.');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    if (validateStepFields()) {
      setStep((prev) => Math.min(prev + 1, 6));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setErrorMessage('');
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitApplication = async (e) => {
    e.preventDefault();
    if (!formData.declaration_confirmed || !formData.privacy_accepted) {
      setErrorMessage('You must review and accept the honor code and institutional privacy policies.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await apiFetch('/public/student/register', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          cohort_id: activeCohort.id
        })
      });

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DRAFT_TIME_KEY);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMessage(err.message || 'Submission failed. Please verify your details or contact technical support.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCoursesDetails = useMemo(() => {
    return availableCourses.filter((c) => formData.selected_courses.includes(c.id));
  }, [availableCourses, formData.selected_courses]);

  const totalCreditHours = useMemo(() => {
    return selectedCoursesDetails.reduce((sum, c) => sum + (c.credit_hours || 0), 0);
  }, [selectedCoursesDetails]);

  // --- Step 6: Confirmation Screen ---
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans text-slate-100 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Application Docket Created
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight">Admission Dossier Received</h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              Your candidate registration for <strong className="text-slate-200">{activeCohort.name}</strong> has been cataloged in our administrative admission registry.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-3 text-slate-300">
            <div className="flex items-center gap-2 font-bold text-blue-400 text-sm">
              <ShieldCheck className="w-4 h-4" /> Next Enrollment Protocols
            </div>
            <p className="text-slate-400 leading-relaxed">
              1. Our Academic Registry is auditing your submitted course requirements.
            </p>
            <p className="text-slate-400 leading-relaxed">
              2. Formal confirmation, fee invoice details, and your verified portal authentication link have been dispatched to <strong className="text-slate-200">{formData.student_email}</strong>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <a
              href="/login"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-900/30"
            >
              <span>Access Student Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const stepsList = [
    { num: 1, title: 'Identity', label: 'Candidate Identity' },
    { num: 2, title: 'Academic', label: 'Previous Institution' },
    { num: 3, title: 'Courses', label: 'Curriculum & Modules' },
    { num: 4, title: 'Guardian', label: 'Parent / Sponsor Contact' },
    { num: 5, title: 'Security', label: 'Portal Password' },
    { num: 6, title: 'Audit', label: 'Review & Declaration' }
  ];

  const LogoIcon = INSTITUTION_CONFIG.logoIcon;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-800 antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-900/30 transition-transform hover:scale-105 duration-200">
            <LogoIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-white tracking-tight">
                {INSTITUTION_CONFIG.name}
              </span>
              <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                Admission Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {INSTITUTION_CONFIG.portalTagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-300">Admission Hotline</span>
            <span className="text-[11px] font-mono text-slate-500">{INSTITUTION_CONFIG.supportEmail}</span>
          </div>
          <a
            href="/login"
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            Sign In
          </a>
        </div>
      </header>

      {/* Main Responsive Grid Layout (Desktop Two-Column / Mobile Stacked) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: PROGRESS STEPPER & ADMISSION HIGHLIGHTS */}
        {/* ======================================================== */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
          {/* Active Cohort Banner Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden text-slate-200 space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {activeCohort.code}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active Enrollment Intake
              </span>
            </div>

            <div>
              <h2 className="text-base font-black text-white leading-snug">{activeCohort.name}</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{activeCohort.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Session Term Start:</span>
                <span className="font-semibold text-slate-200">{activeCohort.starts_on}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Session Concludes:</span>
                <span className="font-semibold text-slate-200">{activeCohort.ends_on}</span>
              </div>
            </div>
          </div>

          {/* Stepper Navigation Tracker */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Application Stages</span>
              <span className="text-xs font-mono font-bold text-blue-400">Stage {step} of 6</span>
            </div>

            <div className="space-y-3">
              {stepsList.map((st) => {
                const isComplete = step > st.num;
                const isCurrent = step === st.num;

                return (
                  <div
                    key={st.num}
                    onClick={() => {
                      if (isComplete) setStep(st.num);
                    }}
                    className={`flex items-center gap-3.5 p-2.5 rounded-2xl transition-all ${
                      isCurrent
                        ? 'bg-blue-600/10 border border-blue-500/30'
                        : isComplete
                        ? 'cursor-pointer hover:bg-slate-800/50 text-slate-400'
                        : 'opacity-40 text-slate-600'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isComplete
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isComplete ? <Check className="w-4 h-4" /> : st.num}
                    </div>

                    <div className="flex-1">
                      <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                        {st.label}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">Stage 0{st.num}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Autosave Draft Indicator */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Local Autosave:</span>
              <span className="text-slate-400">{draftTimestamp || 'Active'}</span>
            </div>
          </div>
        </aside>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: INTERACTIVE APPLICATION DOSSIER */}
        {/* ======================================================== */}
        <section className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative transition-all">
          {/* Header for Current Step */}
          <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider font-mono">
                Section 0{step} • Process Checklist
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {stepsList[step - 1]?.label}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraftManual}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Save progress to device"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                onClick={handleClearDraft}
                className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all"
                title="Reset application draft"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Validation Alert */}
          {errorMessage && (
            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: CANDIDATE IDENTITY */}
          {/* ======================================================== */}
          {step === 1 && (
            <div className="mt-6 space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Legal First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emmanuel"
                    value={formData.first_name}
                    onChange={(e) => handleFieldChange('first_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Middle Name(s)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kojo"
                    value={formData.middle_name}
                    onChange={(e) => handleFieldChange('middle_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Family / Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mensah"
                    value={formData.last_name}
                    onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Non-Binary / Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => handleFieldChange('dob', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Primary Mobile Phone *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      placeholder="+233 54 000 0000"
                      value={formData.student_phone}
                      onChange={(e) => handleFieldChange('student_phone', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Candidate Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="emmanuel.mensah@email.com"
                      value={formData.student_email}
                      onChange={(e) => handleFieldChange('student_email', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Residential Street Address *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Plot 14, Academic Ridge Avenue"
                      value={formData.residential_address}
                      onChange={(e) => handleFieldChange('residential_address', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">City / Region</label>
                  <input
                    type="text"
                    placeholder="Accra / Greater Accra"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: PREVIOUS INSTITUTION & ACADEMIC LEVEL */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className="mt-6 space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Current / Previous Educational School *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prempeh College or St. Augustine's"
                    value={formData.previous_institution}
                    onChange={(e) => handleFieldChange('previous_institution', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Academic Standing / Form Level</label>
                  <select
                    value={formData.current_level}
                    onChange={(e) => handleFieldChange('current_level', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="Level 100 / Form 1">Level 100 / Form 1 (Introductory)</option>
                    <option value="Level 200 / Form 2">Level 200 / Form 2 (Intermediate)</option>
                    <option value="Level 300 / Form 3">Level 300 / Form 3 (Pre-Tertiary Final)</option>
                    <option value="Undergraduate Sandwich">Undergraduate Vacation Sandwich</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Academic Track / Program Stream</label>
                  <select
                    value={formData.stream_track}
                    onChange={(e) => handleFieldChange('stream_track', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="General Science">General Science & Computing</option>
                    <option value="Business & Finance">Business & Accounting Track</option>
                    <option value="General Arts">General Arts & Humanities</option>
                    <option value="Engineering Technology">Applied Engineering Technology</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Existing Student Index Number <span className="text-slate-400 font-normal">(Optional if new student)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. STU-2025-0492"
                  value={formData.student_id_reference}
                  onChange={(e) => handleFieldChange('student_id_reference', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: COURSE SELECTION */}
          {/* ======================================================== */}
          {step === 3 && (
            <div className="mt-6 space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                <span className="text-xs font-bold text-blue-900">
                  Selected Modules: <strong className="text-blue-700">{formData.selected_courses.length} Courses</strong>
                </span>
                <span className="text-xs font-mono font-extrabold text-blue-800 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-xs">
                  {totalCreditHours} Total Credit Hours
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {availableCourses.map((course) => {
                  const isChecked = formData.selected_courses.includes(course.id);
                  return (
                    <div
                      key={course.id}
                      onClick={() => toggleCourseSelection(course.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/30 shadow-md shadow-blue-900/5'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border mt-0.5 transition-all ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {course.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {course.credit_hours} Credits
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">{course.name}</h4>
                        <span className="text-[10px] text-slate-400 font-medium">{course.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: GUARDIAN & SPONSOR CONTACT */}
          {/* ======================================================== */}
          {step === 4 && (
            <div className="mt-6 space-y-5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Parent / Sponsor Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Arthur Mensah"
                    value={formData.guardian_name}
                    onChange={(e) => handleFieldChange('guardian_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Relationship to Candidate</label>
                  <select
                    value={formData.guardian_relationship}
                    onChange={(e) => handleFieldChange('guardian_relationship', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="Parent">Parent / Legal Guardian</option>
                    <option value="Sponsor">Institutional / Corporate Sponsor</option>
                    <option value="Relative">Family Relative</option>
                    <option value="Self">Self-Sponsored</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Guardian Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="arthur.mensah@parent.com"
                    value={formData.guardian_email}
                    onChange={(e) => handleFieldChange('guardian_email', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Direct Phone Line *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+233 24 000 0000"
                    value={formData.guardian_phone}
                    onChange={(e) => handleFieldChange('guardian_phone', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">WhatsApp Alert Number</label>
                  <input
                    type="tel"
                    placeholder="+233 50 000 0000"
                    value={formData.guardian_whatsapp}
                    onChange={(e) => handleFieldChange('guardian_whatsapp', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: PORTAL SECURITY CREDENTIALS */}
          {/* ======================================================== */}
          {step === 5 && (
            <div className="mt-6 space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Create a personal password for your Student Dashboard access. Upon administrative verification and payment clearance, this password will allow you to sign in immediately.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Set Account Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={formData.password_confirmation}
                      onChange={(e) => handleFieldChange('password_confirmation', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 6: AUDIT SUMMARY & LEGAL CONFIRMATION */}
          {/* ======================================================== */}
          {step === 6 && (
            <div className="mt-6 space-y-6 animate-in fade-in duration-200">
              {/* Review Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Candidate Info */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900">1. Candidate Identity</span>
                    <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-blue-600 hover:underline">
                      Edit
                    </button>
                  </div>
                  <p className="text-xs text-slate-800">
                    <strong>Name:</strong> {formData.first_name} {formData.middle_name} {formData.last_name}
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Contact:</strong> {formData.student_email} ({formData.student_phone})
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Address:</strong> {formData.residential_address}, {formData.city}
                  </p>
                </div>

                {/* 2. Academic Info */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900">2. Academic Track</span>
                    <button type="button" onClick={() => setStep(2)} className="text-xs font-bold text-blue-600 hover:underline">
                      Edit
                    </button>
                  </div>
                  <p className="text-xs text-slate-800">
                    <strong>School:</strong> {formData.previous_institution}
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Standing:</strong> {formData.current_level} ({formData.stream_track})
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Cohort:</strong> {activeCohort.name}
                  </p>
                </div>
              </div>

              {/* 3. Selected Curriculum */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">3. Selected Curriculum Modules ({selectedCoursesDetails.length})</span>
                  <button type="button" onClick={() => setStep(3)} className="text-xs font-bold text-blue-600 hover:underline">
                    Edit
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedCoursesDetails.map((c) => (
                    <span
                      key={c.id}
                      className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-900 flex items-center gap-2 shadow-xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span>{c.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">({c.code})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* 4. Guardian Info */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">4. Guardian & Emergency Contact</span>
                  <button type="button" onClick={() => setStep(4)} className="text-xs font-bold text-blue-600 hover:underline">
                    Edit
                  </button>
                </div>
                <p className="text-xs text-slate-800">
                  <strong>Guardian Name:</strong> {formData.guardian_name} ({formData.guardian_relationship})
                </p>
                <p className="text-xs text-slate-800">
                  <strong>Phone / Email:</strong> {formData.guardian_phone} • {formData.guardian_email}
                </p>
              </div>

              {/* Legal Declarations & Checkboxes */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.declaration_confirmed}
                    onChange={(e) => handleFieldChange('declaration_confirmed', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-0 border-slate-300"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed font-medium">
                    I solemnly declare that all statements and credentials provided in this application are accurate and genuine to the best of my knowledge.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.privacy_accepted}
                    onChange={(e) => handleFieldChange('privacy_accepted', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-0 border-slate-300"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed font-medium">
                    I accept the <strong className="text-blue-600">Institutional Terms of Enrollment</strong> and acknowledge that access to live virtual lecture classes remains subject to administrative review and fee verification.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP CONTROLS / ACTION FOOTER */}
          {/* ======================================================== */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-900/20 flex items-center gap-2"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSubmitApplication}
                className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/30 flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting Application...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Transmit Application</span>
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 {INSTITUTION_CONFIG.name}. All rights reserved. Academic Management Infrastructure.</p>
      </footer>
    </div>
  );
};

// --- DOM Mount Point ---
const regContainer = document.getElementById('student-registration-root');
if (regContainer) {
  ReactDOM.createRoot(regContainer).render(
    <React.StrictMode>
      <StudentRegistration />
    </React.StrictMode>
  );
}

export default StudentRegistration;