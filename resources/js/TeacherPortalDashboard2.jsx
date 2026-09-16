import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  BookOpen,
  Calendar,
  Clock,
  Video,
  Award,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Trash2,
  ExternalLink,
  Save,
  Users,
  Check,
  X,
  RefreshCw,
  Eye,
  ChevronRight,
  Download,
  Sun,
  Moon,
  Search,
  Filter,
  Mail,
  Phone,
  GraduationCap,
  Paperclip
} from 'lucide-react';
import { validatePortalAccess, clearAuth } from './utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Normalizes raw arrays, paginated responses, and Laravel Resource wrappers
const unwrapList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (Array.isArray(res.items)) return res.items;
  return [];
};

// Formats virtual classroom links safely
const formatExternalUrl = (url) => {
  if (!url) return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

// Core API Fetch Helper
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
  const isFormData = options.body instanceof FormData;

  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const resJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth();
      window.location.replace('/login');
    }
    const errorMessage = resJson.message || resJson.error || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMessage);
  }

  return resJson.data !== undefined ? resJson.data : resJson;
}

// Authenticated File Downloader (Injects Sanctum Bearer Token)
const downloadAuthenticatedFile = async (url, fallbackName = 'assignment_brief.docx') => {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed with HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;

    const disposition = response.headers.get('content-disposition');
    let filename = fallbackName;
    if (disposition && disposition.includes('filename=')) {
      filename = disposition.split('filename=')[1].replace(/["']/g, '').trim();
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    alert(err.message || 'Unable to download file.');
  }
};

export const TeacherPortalDashboard = () => {
  useEffect(() => {
    validatePortalAccess('teacher').catch(() => {});
  }, []);

  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  });

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Navigation & UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  // Operating Cohort Filter State
  const [selectedCohortId, setSelectedCohortId] = useState(
    localStorage.getItem('teacher_selected_cohort_id') || ''
  );
  const [availableCohorts, setAvailableCohorts] = useState([]);

  // Data States
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');

  // Attendance State
  const [selectedTimetableId, setSelectedTimetableId] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRoster, setAttendanceRoster] = useState([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // Grading State
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [gradingTarget, setGradingTarget] = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });

  // Modals State
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    course_id: '',
    title: '',
    description: '',
    due_date: '',
    max_score: 100,
    file: null
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: ''
  });

  const showToast = (message, type = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary Data Loader
  const loadTeacherData = useCallback(async () => {
    setIsLoading(true);
    try {
      const cohortQuery = selectedCohortId ? `?cohort_id=${selectedCohortId}` : '';

      const [profileRes, coursesRes, studentsRes, timetableRes, assignmentsRes] = await Promise.allSettled([
        apiFetch('/auth/me'),
        apiFetch(`/teacher/courses${cohortQuery}`),
        apiFetch(`/teacher/students${cohortQuery}`),
        apiFetch(`/teacher/timetable${cohortQuery}`),
        apiFetch(`/teacher/assignments${cohortQuery}`)
      ]);

      if (profileRes.status === 'fulfilled') {
        const prof = profileRes.value?.user || profileRes.value;
        setTeacherProfile(prof);
      }

      if (coursesRes.status === 'fulfilled') {
        const courseData = unwrapList(coursesRes.value);
        setCourses(courseData);

        const cohortsMap = new Map();
        courseData.forEach((c) => {
          if (c.cohort) cohortsMap.set(c.cohort.id, c.cohort);
        });
        setAvailableCohorts(Array.from(cohortsMap.values()));
      }

      if (studentsRes.status === 'fulfilled') {
        setStudents(unwrapList(studentsRes.value));
      }

      if (timetableRes.status === 'fulfilled') {
        const slots = unwrapList(timetableRes.value);
        setTimetableSlots(slots);
        if (slots.length > 0 && !selectedTimetableId) {
          setSelectedTimetableId(slots[0].id.toString());
        }
      }

      if (assignmentsRes.status === 'fulfilled') {
        const asgData = unwrapList(assignmentsRes.value);
        setAssignments(asgData);
        if (asgData.length > 0 && !selectedAssignmentId) {
          setSelectedAssignmentId(asgData[0].id.toString());
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to sync vacation class data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCohortId, selectedTimetableId, selectedAssignmentId]);

  useEffect(() => {
    loadTeacherData();
  }, [loadTeacherData]);

  // Attendance Roster Loader
  const fetchAttendanceRoster = useCallback(async () => {
    if (!selectedTimetableId) return;
    setIsLoadingRoster(true);
    try {
      const res = await apiFetch(
        `/teacher/timetables/${selectedTimetableId}/attendance?session_date=${attendanceDate}`
      );
      const rawList = Array.isArray(res?.roster) ? res.roster : unwrapList(res);
      const mapped = rawList.map((item) => {
        const student = item.student || item;
        const att = item.attendance;
        const savedStatus = att?.status?.value || att?.status || item.status?.value || item.status;
        return {
          ...item,
          student,
          student_id: student.id || item.student_id,
          status: savedStatus ? String(savedStatus).toUpperCase() : 'PRESENT',
          notes: att?.notes ?? item.notes ?? '',
          is_saved: Boolean(att),
        };
      });
      setAttendanceRoster(mapped);
    } catch (_) {
      setAttendanceRoster([]);
    } finally {
      setIsLoadingRoster(false);
    }
  }, [selectedTimetableId, attendanceDate]);

  useEffect(() => {
    if (activeTab === 'attendance' && selectedTimetableId) {
      fetchAttendanceRoster();
    }
  }, [activeTab, selectedTimetableId, attendanceDate, fetchAttendanceRoster]);

  // Submissions Loader with Dual Key Normalization
  const fetchSubmissions = useCallback(async () => {
    if (!selectedAssignmentId) return;
    setIsLoadingSubmissions(true);
    try {
      const res = await apiFetch(`/teacher/assignments/${selectedAssignmentId}/submissions`);
      const rawList = unwrapList(res?.submissions || res);

      const normalized = rawList.map((sub) => {
        const mark = sub.score !== undefined && sub.score !== null ? sub.score : sub.grade;
        return {
          ...sub,
          score: mark !== undefined && mark !== null && mark !== '' ? Number(mark) : null,
          submission_text: sub.submission_text || sub.text_entry || '',
          file_path: sub.file_path || sub.file_url || null,
        };
      });

      setSubmissions(normalized);
    } catch (_) {
      setSubmissions([]);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [selectedAssignmentId]);

  useEffect(() => {
    if (activeTab === 'grading' && selectedAssignmentId) {
      fetchSubmissions();
    }
  }, [activeTab, selectedAssignmentId, fetchSubmissions]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        !studentSearch ||
        student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.student_number?.toLowerCase().includes(studentSearch.toLowerCase());

      const matchesCourse =
        !selectedCourseFilter ||
        student.enrollments?.some((en) => String(en.course_id) === String(selectedCourseFilter));

      return matchesSearch && matchesCourse;
    });
  }, [students, studentSearch, selectedCourseFilter]);

  const totalStudentsCount = useMemo(() => {
    if (students.length > 0) return students.length;
    return courses.reduce(
      (sum, c) => sum + (c.enrollments_count || c.enrolled_students_count || c.students_count || 0),
      0
    );
  }, [students, courses]);

  // Handlers
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formattedDueAt = assignmentForm.due_date.includes(' ')
        ? assignmentForm.due_date
        : `${assignmentForm.due_date} 23:59:59`;

      const formData = new FormData();
      formData.append('course_id', parseInt(assignmentForm.course_id, 10));
      formData.append('title', assignmentForm.title);
      formData.append('description', assignmentForm.description);
      formData.append('instructions', assignmentForm.description);
      formData.append('due_date', assignmentForm.due_date);
      formData.append('due_at', formattedDueAt);
      formData.append('max_score', Number(assignmentForm.max_score));
      formData.append('is_published', '1');
      formData.append('allow_late', '0');

      if (selectedCohortId) {
        formData.append('cohort_id', selectedCohortId);
      }

      if (assignmentForm.file) {
        formData.append('file', assignmentForm.file);
        formData.append('attachment', assignmentForm.file);
      }

      await apiFetch('/teacher/assignments', {
        method: 'POST',
        body: formData,
      });

      showToast('Assignment and document brief published successfully.');
      setShowCreateAssignmentModal(false);
      setAssignmentForm({
        course_id: '',
        title: '',
        description: '',
        due_date: '',
        max_score: 100,
        file: null
      });
      loadTeacherData();
    } catch (err) {
      showToast(err.message || 'Failed to publish assignment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingTarget) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/teacher/submissions/${gradingTarget.id}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          score: Number(gradeForm.score),
          feedback: gradeForm.feedback,
          grades_published: true,
        }),
      });

      showToast('Grade recorded and published to student.');
      setGradingTarget(null);
      setGradeForm({ score: '', feedback: '' });
      await fetchSubmissions();
      loadTeacherData();
    } catch (err) {
      showToast(err.message || 'Failed to submit grade.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAttendanceStatus = (studentId, status) => {
    setAttendanceRoster((prev) =>
      prev.map((item) => {
        const currentId = item.student_id || item.student?.id;
        return currentId === studentId ? { ...item, status: status.toUpperCase() } : item;
      })
    );
  };

  const handleUpdateAttendanceNotes = (studentId, notes) => {
    setAttendanceRoster((prev) =>
      prev.map((item) => {
        const currentId = item.student_id || item.student?.id;
        return currentId === studentId ? { ...item, notes } : item;
      })
    );
  };

  const handleSaveAttendance = async () => {
    if (!selectedTimetableId) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/teacher/timetables/${selectedTimetableId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({
          session_date: attendanceDate,
          records: attendanceRoster.map((r) => ({
            student_id: r.student_id || r.student?.id,
            status: (r.status || 'present').toUpperCase(),
            notes: r.notes || '',
          })),
        }),
      });
      showToast('Attendance register successfully saved.');
      await fetchAttendanceRoster();
    } catch (err) {
      showToast(err.message || 'Failed to save attendance register.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.password_confirmation) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiFetch('/auth/password', {
        method: 'POST',
        body: JSON.stringify(passwordForm),
      });
      showToast('Password updated successfully.');
      setShowPasswordModal(false);
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (err) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) {}
    clearAuth();
    window.location.replace('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans antialiased transition-colors duration-200">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xl transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : 'bg-rose-950 text-rose-200 border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-lg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 px-4 sm:px-6 flex items-center justify-between shadow-xs transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
              SHS Tutor Desk
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 uppercase tracking-wide">
              Vacation Class Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Operating Batch Selector */}
          {availableCohorts.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch:</span>
              <select
                value={selectedCohortId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCohortId(newId);
                  if (newId) localStorage.setItem('teacher_selected_cohort_id', newId);
                  else localStorage.removeItem('teacher_selected_cohort_id');
                }}
                className="bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="">All Active Cohorts</option>
                {availableCohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code || 'VAC'})</option>
                ))}
              </select>
            </div>
          )}

          {/* Light/Dark Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            onClick={loadTeacherData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            title="Sync Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Tutor Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                {teacherProfile?.name ? teacherProfile.name.slice(0, 2).toUpperCase() : 'TR'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{teacherProfile?.name || 'Class Tutor'}</p>
                <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">ID: {teacherProfile?.employee_id || 'STF-Auto'}</p>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 text-xs">
                <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-white">{teacherProfile?.name}</p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">{teacherProfile?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setActiveTab('profile'); setDropdownOpen(false); }}
                    className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-blue-500" />
                    <span>My Profile</span>
                  </button>
                  <button
                    onClick={() => { setShowPasswordModal(true); setDropdownOpen(false); }}
                    className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-blue-500" />
                    <span>Change Password</span>
                  </button>
                </div>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 font-bold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Structural Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className={`bg-slate-900 dark:bg-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'courses', label: `Teaching Subjects (${courses.length})`, icon: BookOpen },
              { id: 'students', label: `Students Roster (${totalStudentsCount})`, icon: Users },
              { id: 'timetable', label: 'Online Live Classes', icon: Video },
              { id: 'attendance', label: 'Roll Call Register', icon: FileSpreadsheet },
              { id: 'assignments', label: 'Tasks & Homework', icon: FileText },
              { id: 'grading', label: 'Score Submission', icon: Award },
              { id: 'profile', label: 'Tutor Profile', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  title={tab.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {sidebarOpen && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* TAB 1: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned Subjects</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{courses.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enrolled Students</span>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalStudentsCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Lecture Periods</span>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{timetableSlots.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-1 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Homework & Projects</span>
                  <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{assignments.length}</p>
                </div>
              </div>

              {/* Weekly Timetable & Action Desk */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>Live Virtual Classes Timetable</span>
                    </h3>
                    <button onClick={() => setActiveTab('timetable')} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                      View Full Schedule
                    </button>
                  </div>

                  <div className="space-y-3">
                    {timetableSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                              {slot.course?.code || 'CRS'}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{slot.course?.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {slot.day_of_week} • {slot.start_time} - {slot.end_time} • {slot.classroom || 'Online Classroom'}
                          </p>
                        </div>
                        {slot.meeting_link ? (
                          <a
                            href={formatExternalUrl(slot.meeting_link)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer select-none"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Start Class</span>
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            No Link Set
                          </span>
                        )}
                      </div>
                    ))}
                    {timetableSlots.length === 0 && (
                      <p className="text-xs text-slate-500 italic py-4 text-center">No assigned vacation class periods found.</p>
                    )}
                  </div>
                </div>

                {/* Direct Actions Drawer */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">Tutor Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveTab('students')}
                      className="w-full p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 flex items-center gap-3 text-left transition-all cursor-pointer"
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">SHS Students Roster</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">View enrolled students in your subjects</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setAssignmentForm({
                          course_id: courses[0]?.id || '',
                          title: '',
                          description: '',
                          due_date: '',
                          max_score: 100,
                          file: null
                        });
                        setShowCreateAssignmentModal(true);
                      }}
                      className="w-full p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-600/20 text-blue-700 dark:text-blue-400 flex items-center gap-3 text-left transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Post Assignment</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Publish coursework, PDF briefs & deadlines</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('attendance')}
                      className="w-full p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-3 text-left transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Take Roll Call</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Mark daily attendance for class sessions</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('grading')}
                      className="w-full p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-600/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-600/20 text-amber-700 dark:text-amber-400 flex items-center gap-3 text-left transition-all cursor-pointer"
                    >
                      <Award className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Score Homework</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Review student answers and attach feedback</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ASSIGNED SUBJECTS */}
          {activeTab === 'courses' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Allocated SHS Subjects</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Vacation class subjects and batches assigned to your tutor account.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
                  <div key={course.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                          {course.code}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                          {course.cohort?.name || 'Vacation Batch'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2.5">{course.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{course.description || 'No subject syllabus provided.'}</p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                        <span>Weekly Syllabus</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {course.enrollments_count || course.enrolled_students_count || 0} Registered Students
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setSelectedCourseFilter(course.id.toString());
                            setActiveTab('students');
                          }}
                          className="py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>Student List</span>
                        </button>
                        <button
                          onClick={() => {
                            const slot = timetableSlots.find((s) => s.course_id === course.id);
                            if (slot) setSelectedTimetableId(slot.id.toString());
                            setActiveTab('attendance');
                          }}
                          className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Roll Call</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400 text-xs italic">
                    No subjects allocated to your tutor profile.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 3: STUDENTS DIRECTORY */}
          {activeTab === 'students' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Enrolled SHS Students</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Class roster of students enrolled in your vacation teaching subjects.</p>
                </div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Total Students: <strong className="text-blue-600 dark:text-blue-400">{filteredStudents.length}</strong>
                </div>
              </div>

              {/* Search & Course Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student name, email, or index number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <select
                    value={selectedCourseFilter}
                    onChange={(e) => setSelectedCourseFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    <option value="">All Assigned Subjects</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code} — {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Student Index No.</th>
                      <th className="py-3.5 px-4">Vacation Batch</th>
                      <th className="py-3.5 px-4">Registered Subject(s)</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredStudents.map((stu) => (
                      <tr key={stu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{stu.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{stu.email}</span>
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {stu.student_number || 'STU-Auto'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                            {stu.cohort?.name || 'Vacation Batch'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(stu.enrollments || []).map((en) => (
                              <span
                                key={en.id || en.course_id}
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {en.course?.code || `SUB-${en.course_id}`}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              stu.status === 'ACTIVE' || stu.status === 'active'
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                            }`}
                          >
                            {stu.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          {isLoading ? 'Loading student roster...' : 'No students found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 4: SCHEDULE & VIRTUAL CLASSES */}
          {activeTab === 'timetable' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Vacation Timetable & Virtual Classroom Links</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Class times and video conferencing links for live virtual sessions.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timetableSlots.map((slot) => (
                  <div key={slot.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{slot.course?.code}</span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{slot.course?.title}</h4>

                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1 font-mono text-slate-700 dark:text-slate-300">
                        <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-500" /> {slot.day_of_week}</p>
                        <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-500" /> {slot.start_time} - {slot.end_time}</p>
                      </div>
                    </div>

                    {slot.meeting_link ? (
                      <a
                        href={formatExternalUrl(slot.meeting_link)}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer select-none"
                      >
                        <Video className="w-4 h-4" />
                        <span>Join / Host Class</span>
                      </a>
                    ) : (
                      <div className="w-full py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed select-none">
                        <span>No Video URL Configured</span>
                      </div>
                    )}
                  </div>
                ))}
                {timetableSlots.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400 text-xs italic">
                    No scheduled lecture periods configured.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 5: ROLL CALL ATTENDANCE */}
          {activeTab === 'attendance' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Daily Attendance Roll Call</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Record attendance registers for your active vacation classes.</p>
                </div>
                <button
                  onClick={handleSaveAttendance}
                  disabled={isSubmitting || attendanceRoster.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving Register...' : 'Save Register'}</span>
                </button>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase mb-1.5">Select Lecture Period</label>
                  <select
                    value={selectedTimetableId}
                    onChange={(e) => setSelectedTimetableId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                  >
                    {timetableSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.course?.code} — {slot.day_of_week} ({slot.start_time})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase mb-1.5">Class Date</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.target.showPicker?.();
                      } catch (_) {}
                    }}
                    style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Roll Call Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Index No.</th>
                      <th className="py-3.5 px-4">Attendance Status</th>
                      <th className="py-3.5 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {attendanceRoster.map((row) => {
                      const student = row.student || row;
                      const studentId = row.student_id || student.id;
                      const status = (row.status || 'PRESENT').toLowerCase();

                      return (
                        <tr key={studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{student.name}</span>
                              {row.is_saved && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  Saved
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">{student.student_number || 'STU-Auto'}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {['present', 'absent', 'late', 'excused'].map((statusOption) => (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => handleToggleAttendanceStatus(studentId, statusOption)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                    status === statusOption
                                      ? statusOption === 'present'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : statusOption === 'absent'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                                  }`}
                                >
                                  {statusOption}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="Optional remarks..."
                              value={row.notes || ''}
                              onChange={(e) => handleUpdateAttendanceNotes(studentId, e.target.value)}
                              className="w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {attendanceRoster.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                          {isLoadingRoster ? 'Loading attendance roster...' : 'No enrolled students found for this lecture period.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 6: TASKS & HOMEWORK */}
          {activeTab === 'assignments' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Assignments & Homework Tasks</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Post assessment briefs, problem sets, and set deadlines.</p>
                </div>
                <button
                  onClick={() => {
                    setAssignmentForm({
                      course_id: courses[0]?.id || '',
                      title: '',
                      description: '',
                      due_date: '',
                      max_score: 100,
                      file: null
                    });
                    setShowCreateAssignmentModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Assignment</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((item) => {
                  const hasAttachment = Boolean(item.file_path || item.attachment_url || item.file_url || item.has_attachment);

                  return (
                    <div key={item.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{item.course?.code}</span>
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/20">
                            Due: {item.due_at?.slice(0, 10) || item.due_date}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">{item.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{item.instructions || item.description}</p>

                        {/* Direct, clean authenticated download URL */}
                        {hasAttachment && (
                          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => {
                                const url = `/api/v1/teacher/assignments/${item.id}/download`;
                                downloadAuthenticatedFile(url, `${item.title.replace(/\s+/g, '_')}_brief.docx`);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[11px] font-bold border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Download Task Brief</span>
                              <Download className="w-3 h-3 ml-0.5 opacity-70" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Max Score: <strong className="text-slate-900 dark:text-white">{item.max_score || 100}</strong></span>
                        <button
                          onClick={() => {
                            setSelectedAssignmentId(item.id.toString());
                            setActiveTab('grading');
                          }}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Submissions</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {assignments.length === 0 && (
                  <div className="col-span-full p-8 text-center text-slate-400 text-xs italic">
                    No homework assignments published yet.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 7: GRADING & SUBMISSIONS */}
          {activeTab === 'grading' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Homework Submissions & Grading Desk</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Evaluate completed work, enter marks, and add constructive feedback.</p>
              </div>

              <div className="max-w-md">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase mb-1.5">Filter by Assignment</label>
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                >
                  {assignments.map((asg) => (
                    <option key={asg.id} value={asg.id}>
                      {asg.course?.code} — {asg.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Response / Uploaded Work</th>
                      <th className="py-3.5 px-4">Score</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {submissions.map((sub) => {
                      const rawMark = sub.score ?? sub.grade;
                      const isGraded = rawMark !== null && rawMark !== undefined && rawMark !== '';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            <p>{sub.student?.name || 'Student'}</p>
                            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{sub.student?.student_number}</p>
                          </td>
                          <td className="py-3 px-4 max-w-sm">
                            <p className="truncate text-slate-700 dark:text-slate-300">{sub.submission_text || sub.text_entry || 'No written response.'}</p>
                            {(sub.file_path || sub.file_url) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const url = `/api/v1/teacher/submissions/${sub.id}/file`;
                                  downloadAuthenticatedFile(url, `student_${sub.student?.student_number || sub.id}_submission.pdf`);
                                }}
                                className="text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 mt-1 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Submission Attachment</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            {isGraded ? (
                              <span className="text-emerald-600 dark:text-emerald-400">{rawMark}%</span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded text-[10px]">Ungraded</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setGradingTarget(sub);
                                setGradeForm({ score: rawMark ?? '', feedback: sub.feedback || '' });
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              {isGraded ? 'Update Mark' : 'Score Submission'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {submissions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                          {isLoadingSubmissions ? 'Loading student work...' : 'No submissions received for this assignment yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 8: PROFILE */}
          {activeTab === 'profile' && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 max-w-2xl shadow-xs">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Tutor Account Profile</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Official vacation class instructor profile and security options.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Full Legal Name</label>
                  <input type="text" readOnly value={teacherProfile?.name || ''} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium outline-none" />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Email Address</label>
                  <input type="email" readOnly value={teacherProfile?.email || ''} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium outline-none" />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Tutor Staff ID</label>
                  <input type="text" readOnly value={teacherProfile?.employee_id || 'STF-Auto'} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold text-blue-600 dark:text-blue-400 outline-none" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Change Account Password
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* MODAL: PUBLISH ASSIGNMENT */}
      {showCreateAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Publish Vacation Homework Task</h3>
              <button onClick={() => setShowCreateAssignmentModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Target Subject *</label>
                <select
                  required
                  value={assignmentForm.course_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, course_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium outline-none focus:border-blue-500"
                >
                  <option value="">Select Target Subject...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Homework Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Mathematics Exercise 3"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Instructions & Problem Sets *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the questions, instructions, or reading tasks..."
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* Task Brief Upload */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Assignment Brief / Document (PDF, DOCX - Optional)
                </label>
                <div className="relative flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, file: e.target.files[0] || null })}
                    className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {assignmentForm.file && (
                    <button
                      type="button"
                      onClick={() => setAssignmentForm({ ...assignmentForm, file: null })}
                      className="text-slate-400 hover:text-rose-500 ml-2 cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {assignmentForm.file && (
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selected: {assignmentForm.file.name}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Submission Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={assignmentForm.due_date}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, due_date: e.target.value })}
                    onClick={(e) => {
                      try {
                        e.target.showPicker?.();
                      } catch (_) {}
                    }}
                    style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Total Marks *</label>
                  <input
                    type="number"
                    required
                    value={assignmentForm.max_score}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, max_score: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateAssignmentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GRADE SUBMISSION */}
      {gradingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Score Student Task</h3>
                <p className="text-slate-500 dark:text-slate-400 font-mono">{gradingTarget.student?.name}</p>
              </div>
              <button onClick={() => setGradingTarget(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="font-bold text-slate-700 dark:text-slate-300">Submitted Work:</p>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{gradingTarget.submission_text || gradingTarget.text_entry || 'No written response provided.'}</p>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Mark Awarded (0 - 100) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={gradeForm.score}
                  onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono font-bold outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Tutor Feedback / Comments</label>
                <textarea
                  rows={3}
                  placeholder="Add feedback or corrections..."
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setGradingTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Recording...' : 'Commit Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Update Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={passwordForm.password_confirmation}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const teacherRoot = document.getElementById('teacher-portal-root');
if (teacherRoot) {
  ReactDOM.createRoot(teacherRoot).render(
    <React.StrictMode>
      <TeacherPortalDashboard />
    </React.StrictMode>
  );
}

export default TeacherPortalDashboard;