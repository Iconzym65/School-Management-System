import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Building,
  Check,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Clock,
  Send,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

export const INSTITUTION_CONFIG = {
  name: import.meta.env.VITE_INSTITUTION_NAME || 'SHS Vacation Classes',
  shortName: import.meta.env.VITE_INSTITUTION_SHORT_NAME || 'SHS Portal',
  portalTagline: 'SHS Vacation Classes Online Admission & Enrollment',
  supportEmail: 'admissions@shsvacation.edu',
  logoIcon: GraduationCap,
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

const STORAGE_KEY = 'shs_student_reg_draft_v1';
const DRAFT_TIME_KEY = 'shs_student_reg_draft_timestamp_v1';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? dateString : parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const StudentRegistration = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [draftTimestamp, setDraftTimestamp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Live Backend Data
  const [activeCohort, setActiveCohort] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);

  // New Student Registration State (Exclusively for New SHS Candidates)
  const [formData, setFormData] = useState({
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
    current_level: 'SHS 2 / Form 2',
    stream_track: 'General Science',
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

  // Load Active Cohort and Real Courses from Database
  useEffect(() => {
    const bootstrap = async () => {
      setIsInitializing(true);
      try {
        const cohortData = await apiFetch('/public/active-cohort');
        if (cohortData && cohortData.id) {
          setActiveCohort(cohortData);
        }

        const coursesData = await apiFetch('/public/courses');
        const courseList = Array.isArray(coursesData) ? coursesData : [];
        setAvailableCourses(courseList);

        // Restore draft from local storage
        const savedDraft = localStorage.getItem(STORAGE_KEY);
        const savedTime = localStorage.getItem(DRAFT_TIME_KEY);

        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            const validIds = Array.isArray(parsed.selected_courses)
              ? parsed.selected_courses.filter((id) => courseList.some((c) => c.id === id))
              : [];

            setFormData({ ...parsed, selected_courses: validIds });
          } catch (_) {}
        }

        if (savedTime) setDraftTimestamp(savedTime);
      } catch (err) {
        setErrorMessage('Unable to load the current SHS admissions intake. Please reload or contact support.');
      } finally {
        setIsInitializing(false);
      }
    };

    bootstrap();
  }, []);

  const recordDraftTime = () => {
    const now = new Date();
    const formatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + now.toLocaleDateString();
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

  const handleClearDraft = () => {
    if (window.confirm('Clear all entries and restart your SHS registration?')) {
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
        current_level: 'SHS 2 / Form 2',
        stream_track: 'General Science',
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
      setErrorMessage('');
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
        setErrorMessage('A valid student email and WhatsApp/mobile phone number are required.');
        return false;
      }
      if (!formData.dob) {
        setErrorMessage('Please provide your date of birth.');
        return false;
      }
      if (!formData.residential_address.trim()) {
        setErrorMessage('Please enter your residential location or street address.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.previous_institution.trim()) {
        setErrorMessage('Please provide your current Junior High or Senior High School.');
        return false;
      }
    }

    if (step === 3) {
      if (formData.selected_courses.length === 0 && availableCourses.length > 0) {
        setErrorMessage('Please select at least one SHS subject module for this term.');
        return false;
      }
    }

    if (step === 4) {
      if (!formData.guardian_name.trim() || !formData.guardian_phone.trim() || !formData.guardian_email.trim()) {
        setErrorMessage('Parent/guardian contact name, phone number, and email address are required.');
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
      setErrorMessage('You must review and accept the institutional declarations to proceed.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const validCourseIds = formData.selected_courses.filter((id) =>
      availableCourses.some((c) => c.id === id)
    );

    try {
      await apiFetch('/public/student/register', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          selected_courses: validCourseIds,
          cohort_id: activeCohort?.id,
        }),
      });

      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(DRAFT_TIME_KEY);
      setIsSubmitted(true);
    } catch (err) {
      setErrorMessage(err.message || 'Submission failed. Please verify your entries or contact campus administration.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCoursesDetails = useMemo(() => {
    return availableCourses.filter((c) => formData.selected_courses.includes(c.id));
  }, [availableCourses, formData.selected_courses]);

  const totalCreditHours = useMemo(() => {
    return selectedCoursesDetails.reduce((sum, c) => sum + (c.credit_hours || c.credits || 3), 0);
  }, [selectedCoursesDetails]);

  // Screen 1: Submission Successful Notice
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans text-slate-100 relative overflow-hidden">
        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 relative z-10">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Registration Recorded
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Welcome to {activeCohort?.name || 'SHS Vacation Classes'}!</h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              Your student application has been submitted to the academic admissions desk.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-3 text-slate-300">
            <div className="flex items-center gap-2 font-bold text-blue-400 text-sm">
              <ShieldCheck className="w-4 h-4" /> Next Steps for Access Activation
            </div>
            <p className="text-slate-400 leading-relaxed">
              1. An administrative officer will verify your course selections and approve your enrollment.
            </p>
            <p className="text-slate-400 leading-relaxed">
              2. You can sign in to your dashboard anytime using your registered email (<strong className="text-slate-200">{formData.student_email}</strong>) and password. Live Zoom/Meet links will unlock once tuition is cleared.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all w-full shadow-md shadow-blue-900/30"
            >
              <span>Go to Student Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: 'Student Bio & Contact' },
    { num: 2, label: 'SHS Background & Stream' },
    { num: 3, label: 'Subject Enrollment' },
    { num: 4, label: 'Parent / Guardian Contact' },
    { num: 5, label: 'Account Password' },
    { num: 6, label: 'Verification & Submit' },
  ];

  const LogoIcon = INSTITUTION_CONFIG.logoIcon;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-800 antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-900/30">
            <LogoIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-white tracking-tight">
                {INSTITUTION_CONFIG.name}
              </span>
              <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wide">
                New Student Enrollment
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {INSTITUTION_CONFIG.portalTagline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            Sign In Instead
          </a>
        </div>
      </header>

      {/* Main Responsive Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Progress Stepper & Active Cohort Card */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
          {/* Active Intake Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {activeCohort?.code || 'SHS-VACATION'}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Active Enrollment Intake
              </span>
            </div>

            <div>
              <h2 className="text-base font-black text-white leading-snug">
                {activeCohort ? activeCohort.name : (isInitializing ? 'Detecting Active Cohort...' : 'Active Vacation Session')}
              </h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                {activeCohort?.description || 'All registered SHS students will be automatically enrolled in this active learning term.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Term Commences:</span>
                <span className="font-semibold text-slate-200">{formatDate(activeCohort?.starts_on)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Term Ends:</span>
                <span className="font-semibold text-slate-200">{formatDate(activeCohort?.ends_on)}</span>
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Registration Steps</span>
              <span className="text-xs font-mono font-bold text-blue-400">Step {step} of 6</span>
            </div>

            <div className="space-y-2.5">
              {stepsList.map((st) => {
                const isComplete = step > st.num;
                const isCurrent = step === st.num;

                return (
                  <div
                    key={st.num}
                    onClick={() => { if (isComplete) setStep(st.num); }}
                    className={`flex items-center gap-3.5 p-2.5 rounded-2xl transition-all ${
                      isCurrent
                        ? 'bg-blue-600/10 border border-blue-500/30'
                        : isComplete
                        ? 'cursor-pointer hover:bg-slate-800/50 text-slate-400'
                        : 'opacity-40 text-slate-600'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
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

            {/* Autosave Tag */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Local Progress:</span>
              <span className="text-slate-400">{draftTimestamp || 'Autosaved'}</span>
            </div>
          </div>
        </aside>

        {/* Right Column: Application Form */}
        <section className="lg:col-span-8 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative">
          <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider font-mono">
                Step 0{step} of 06
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                {stepsList[step - 1]?.label}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleClearDraft}
              className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all self-start sm:self-auto cursor-pointer"
              title="Reset application draft"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Alert Box */}
          {errorMessage && (
            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: SHS STUDENT BIO */}
          {step === 1 && (
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel"
                    value={formData.first_name}
                    onChange={(e) => handleFieldChange('first_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Middle Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Kwabena"
                    value={formData.middle_name}
                    onChange={(e) => handleFieldChange('middle_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Osei"
                    value={formData.last_name}
                    onChange={(e) => handleFieldChange('last_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">WhatsApp / Mobile Phone *</label>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Student Email Address *</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={formData.student_email}
                      onChange={(e) => handleFieldChange('student_email', e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Residential Address / Town *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. House No. 12, Adum"
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
                    placeholder="Kumasi / Ashanti Region"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SHS ACADEMIC BACKGROUND */}
          {step === 2 && (
            <div className="mt-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Current or Previous School (JHS / SHS) *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prempeh College, Wesley Girls, Opoku Ware, etc."
                    value={formData.previous_institution}
                    onChange={(e) => handleFieldChange('previous_institution', e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">SHS Form / Academic Level *</label>
                  <select
                    value={formData.current_level}
                    onChange={(e) => handleFieldChange('current_level', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="SHS 1">SHS 1</option>
                    <option value="SHS 2 ">SHS 2</option>
                    <option value="SHS 3 ">SHS 3</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">SHS Program / Stream *</label>
                  <select
                    value={formData.stream_track}
                    onChange={(e) => handleFieldChange('stream_track', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="General Science">General Science</option>
                    <option value="General Arts">General Arts</option>
                    <option value="Business">Business</option>
                    <option value="Home Economics">Home Economics</option>
                    <option value="Visual Arts">Visual Arts</option>
                    <option value="Agricultural Science">Agricultural Science</option>
                    <option value="Technical">Applied Technical Track</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUBJECT ENROLLMENT */}
          {step === 3 && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                <span className="text-xs font-bold text-blue-900">
                  Selected Subjects: <strong className="text-blue-700">{formData.selected_courses.length} Modules</strong>
                </span>
                <span className="text-xs font-mono font-extrabold text-blue-800 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-xs">
                  {totalCreditHours} Total Credit Units
                </span>
              </div>

              {availableCourses.length === 0 ? (
                <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-center space-y-2">
                  <BookOpen className="w-6 h-6 mx-auto text-amber-600" />
                  <p className="font-bold">No Subjects Cataloged for this Vacation Term</p>
                  <p className="text-[11px] text-amber-700 max-w-sm mx-auto">
                    The administration is configuring class subjects. You may continue, and your timetable will be mapped upon registration approval.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {availableCourses.map((course) => {
                    const isChecked = formData.selected_courses.includes(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => toggleCourseSelection(course.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3.5 select-none ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50/40 shadow-md shadow-blue-900/5'
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
                              {course.credit_hours || course.credits || 3} Credits
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                            {course.title || course.name}
                          </h4>
                          {course.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{course.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: GUARDIAN CONTACT */}
          {step === 4 && (
            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Parent / Guardian Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Robert Osei"
                    value={formData.guardian_name}
                    onChange={(e) => handleFieldChange('guardian_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Relationship *</label>
                  <select
                    value={formData.guardian_relationship}
                    onChange={(e) => handleFieldChange('guardian_relationship', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none bg-white"
                  >
                    <option value="Parent">Parent / Father / Mother</option>
                    <option value="Guardian">Legal Guardian</option>
                    <option value="Relative">Family Relative / Sponsor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Guardian Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    value={formData.guardian_email}
                    onChange={(e) => handleFieldChange('guardian_email', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Guardian Phone *</label>
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

          {/* STEP 5: SECURITY PASSWORD */}
          {step === 5 && (
            <div className="mt-6 space-y-5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Choose a strong, memorable password for your student portal. You will use this password alongside your email (<strong className="text-slate-900">{formData.student_email || 'your email'}</strong>) to access live lessons, timetables, and task briefs.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Create Password *</label>
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
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
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

          {/* STEP 6: VERIFICATION & DECLARATION */}
          {step === 6 && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900">1. Student Information</span>
                    <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <p className="text-xs text-slate-800">
                    <strong>Full Name:</strong> {formData.first_name} {formData.middle_name} {formData.last_name}
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Contacts:</strong> {formData.student_email} • {formData.student_phone}
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Location:</strong> {formData.residential_address}, {formData.city}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-900">2. School & Class Track</span>
                    <button type="button" onClick={() => setStep(2)} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <p className="text-xs text-slate-800">
                    <strong>School:</strong> {formData.previous_institution}
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Class Level:</strong> {formData.current_level}
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Program Stream:</strong> {formData.stream_track}
                  </p>
                  <p className="text-xs text-slate-800">
                    <strong>Intake Term:</strong> {activeCohort?.name || 'Active Vacation Session'}
                  </p>
                </div>
              </div>

              {/* Selected Modules Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">3. Selected Subjects ({selectedCoursesDetails.length})</span>
                  <button type="button" onClick={() => setStep(3)} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                    Edit
                  </button>
                </div>

                {selectedCoursesDetails.length === 0 ? (
                  <p className="text-xs italic text-slate-500">No subjects chosen.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedCoursesDetails.map((c) => (
                      <span
                        key={c.id}
                        className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-900 flex items-center gap-2 shadow-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>{c.title || c.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">({c.code})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Guardian Summary */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">4. Guardian Contact</span>
                  <button type="button" onClick={() => setStep(4)} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                    Edit
                  </button>
                </div>
                <p className="text-xs text-slate-800">
                  <strong>Name:</strong> {formData.guardian_name} ({formData.guardian_relationship})
                </p>
                <p className="text-xs text-slate-800">
                  <strong>Phone / Email:</strong> {formData.guardian_phone} • {formData.guardian_email}
                </p>
              </div>

              {/* Declarations */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.declaration_confirmed}
                    onChange={(e) => handleFieldChange('declaration_confirmed', e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-0 border-slate-300"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed font-medium">
                    I declare that I am registering as an SHS student and that all personal and academic details provided are accurate.
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
                    I accept the <strong className="text-blue-600">Student Code of Conduct & Enrollment Policies</strong> and understand that virtual lecture coordinates unlock once tuition status is verified.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Action Navigation Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            ) : <div />}

            {step < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-900/20 flex items-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleSubmitApplication}
                className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm & Create Student Account</span>
                  </>
                )}
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 {INSTITUTION_CONFIG.name}. All rights reserved. Senior High School Academic Portal.</p>
      </footer>
    </div>
  );
};

// Mount to the student registration root container
const regContainer = document.getElementById('student-registration-root');
if (regContainer) {
  ReactDOM.createRoot(regContainer).render(
    <React.StrictMode>
      <StudentRegistration />
    </React.StrictMode>
  );
}

export default StudentRegistration;