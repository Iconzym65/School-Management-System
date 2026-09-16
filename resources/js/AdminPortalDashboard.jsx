import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  Calendar,
  Clock,
  Video,
  Award,
  Search,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileSpreadsheet,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  X,
  Moon,
  Sun,
  FileText
} from 'lucide-react';
import { validatePortalAccess, clearAuth } from './utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const unwrapList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (res.data && Array.isArray(res.data.data)) return res.data.data;
  if (Array.isArray(res.teachers)) return res.teachers;
  if (Array.isArray(res.students)) return res.students;
  if (Array.isArray(res.courses)) return res.courses;
  if (Array.isArray(res.timetables)) return res.timetables;
  if (Array.isArray(res.cohorts)) return res.cohorts;
  if (Array.isArray(res.items)) return res.items;
  return [];
};

const formatExternalUrl = (url) => {
  if (!url) return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
};

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
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
    const errorMessage = resJson.message || resJson.error || `HTTP ${response.status}: Request failed`;
    throw new Error(errorMessage);
  }

  return resJson.data !== undefined ? resJson.data : resJson;
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  return new Promise((resolve, reject) => {
    document.execCommand('copy') ? resolve() : reject(new Error('Copy failed'));
    textArea.remove();
  });
}

export const AdminPortalDashboard = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('sms_theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState({
    teachers: false,
    students: false,
    cohorts: false,
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  const [globalCohortId, setGlobalCohortId] = useState(localStorage.getItem('active_cohort_id') || '');

  // Core Data Stores
  const [adminUser, setAdminUser] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [assignmentAudits, setAssignmentAudits] = useState([]);
  const [studentApplications, setStudentApplications] = useState([]);
  const [settings, setSettings] = useState({ attendance_edit_window_hours: 24, meeting_link_opens_minutes_before: 15 });

  // Modals
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [showAssignCohortModal, setShowAssignCohortModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);

  // Filters & State
  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [createdTeacherCreds, setCreatedTeacherCreds] = useState(null);
  const [createdStudentCreds, setCreatedStudentCreds] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedStudentKey, setCopiedStudentKey] = useState(false);

  // Forms
  const [cohortForm, setCohortForm] = useState({ name: '', code: '', starts_on: '', ends_on: '', is_active: true });
  const [assignForm, setAssignForm] = useState({ student_id: '', cohort_id: '' });
  const [teacherForm, setTeacherForm] = useState({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [studentForm, setStudentForm] = useState({ id: 0, name: '', email: '', phone: '', cohort_id: '', status: 'ACTIVE', course_ids: [] });
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [courseForm, setCourseForm] = useState({ id: 0, code: '', title: '', credit_hours: 3, description: '', cohort_id: '', teacher_id: '' });
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [timetableForm, setTimetableForm] = useState({
    id: 0,
    course_id: '',
    teacher_id: '',
    day_of_week: 'MONDAY',
    start_time: '09:00',
    end_time: '10:30',
    classroom: 'Virtual Studio Alpha',
    delivery_mode: 'VIRTUAL',
    virtual_platform: 'zoom',
    meeting_link: '',
  });
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('sms_theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const showToastNotification = (message, type = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allCohortQuery = globalCohortId ? `?cohort_id=${globalCohortId}&all=1` : '?all=1';
      const cohortQuery = globalCohortId ? `?cohort_id=${globalCohortId}` : '';

      const [userRes, cohortsRes, teachersRes, studentsRes, coursesRes, ttRes, attendanceRes, settingsRes] = await Promise.allSettled([
        apiFetch('/auth/me'),
        apiFetch('/admin/cohorts?all=1'),
        apiFetch('/admin/teachers?all=1'),
        apiFetch(`/admin/students${allCohortQuery}`),
        apiFetch(`/admin/courses${allCohortQuery}`),
        apiFetch(`/admin/timetables${allCohortQuery}`),
        apiFetch(`/admin/attendance${cohortQuery}`),
        apiFetch('/admin/settings'),
      ]);

      if (userRes.status === 'fulfilled') {
        const u = userRes.value?.user || userRes.value?.data || userRes.value;
        setAdminUser(u);
        setProfileForm((prev) => ({
          ...prev,
          name: u?.name || '',
          email: u?.email || '',
          phone: u?.phone || '',
        }));
      }

      if (cohortsRes.status === 'fulfilled') setCohorts(unwrapList(cohortsRes.value));
      if (teachersRes.status === 'fulfilled') setTeachers(unwrapList(teachersRes.value));
      if (studentsRes.status === 'fulfilled') setStudents(unwrapList(studentsRes.value));
      if (coursesRes.status === 'fulfilled') setCourses(unwrapList(coursesRes.value));
      if (ttRes.status === 'fulfilled') setTimetables(unwrapList(ttRes.value));
      if (attendanceRes.status === 'fulfilled') setAttendanceLogs(unwrapList(attendanceRes.value));
      if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value || { attendance_edit_window_hours: 24, meeting_link_opens_minutes_before: 15 });

      apiFetch(`/admin/student-applications?status=PENDING_APPROVAL${globalCohortId ? `&cohort_id=${globalCohortId}` : ''}`)
        .then((res) => setStudentApplications(unwrapList(res)))
        .catch(() => {});
    } catch (err) {
      showToastNotification(err.message || 'Failed to sync with server.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [globalCohortId]);

  useEffect(() => {
    validatePortalAccess('admin').catch(() => {});
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSubMenu = (menu) => {
    setOpenSubMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const activeStudentsCount = students.filter((s) => s.status === 'ACTIVE' || s.status === 'active').length;
  const inactiveStudentsCount = students.filter((s) => s.status === 'INACTIVE_PAYMENT_PENDING' || s.status === 'INACTIVE').length;

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        (s.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.student_number && s.student_number.toLowerCase().includes(studentSearch.toLowerCase()));
      const matchStatus = studentStatusFilter === 'all' ? true : s.status === studentStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, studentSearch, studentStatusFilter]);

  // Handlers
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (profileForm.password) {
        if (profileForm.password !== profileForm.password_confirmation) {
          throw new Error('New passwords do not match.');
        }
        await apiFetch('/auth/password', {
          method: 'POST',
          body: JSON.stringify({
            current_password: profileForm.current_password,
            password: profileForm.password,
            password_confirmation: profileForm.password_confirmation,
          }),
        });
      }

      showToastNotification('Admin profile updated successfully!', 'success');
      setProfileForm((prev) => ({
        ...prev,
        current_password: '',
        password: '',
        password_confirmation: '',
      }));
    } catch (err) {
      showToastNotification(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCohort = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/admin/cohorts', {
        method: 'POST',
        body: JSON.stringify({
          name: cohortForm.name,
          code: cohortForm.code.toUpperCase(),
          starts_on: cohortForm.starts_on,
          ends_on: cohortForm.ends_on,
          is_active: Boolean(cohortForm.is_active),
        }),
      });
      showToastNotification(`Batch ${cohortForm.name} created!`, 'success');
      setShowCohortModal(false);
      setCohortForm({ name: '', code: '', starts_on: '', ends_on: '', is_active: true });
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to create vacation batch', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignStudentToCohort = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch(`/admin/students/${assignForm.student_id}`, {
        method: 'PUT',
        body: JSON.stringify({ cohort_id: parseInt(assignForm.cohort_id, 10) }),
      });
      showToastNotification('Student assigned to batch!', 'success');
      setShowAssignCohortModal(false);
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to assign student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTeacher = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isEditingTeacher) {
        await apiFetch(`/admin/teachers/${teacherForm.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: teacherForm.name,
            email: teacherForm.email,
            phone: teacherForm.phone,
            employee_id: teacherForm.employee_id,
          }),
        });
        showToastNotification('Teacher details updated!', 'success');
      } else {
        const payload = {
          name: teacherForm.name,
          email: teacherForm.email,
          phone: teacherForm.phone || '+233 00 000 0000',
          employee_id: teacherForm.employee_id || `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
        };

        const res = await apiFetch('/admin/teachers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const tempPass = res?.temporary_password || res?.data?.temporary_password || 'Dispatched via Email';
        setCreatedTeacherCreds({
          login_email: payload.email,
          temporary_password: tempPass,
          staff_id: payload.employee_id,
        });

        showToastNotification('Teacher provisioned & credentials issued!', 'success');
      }
      setShowTeacherModal(false);
      setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save teacher', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name: studentForm.name,
        email: studentForm.email,
        phone: studentForm.phone,
        status: studentForm.status,
        cohort_id: studentForm.cohort_id ? parseInt(studentForm.cohort_id, 10) : (globalCohortId ? parseInt(globalCohortId, 10) : undefined),
        course_ids: (studentForm.course_ids || []).map((id) => parseInt(id, 10)),
      };

      if (isEditingStudent) {
        await apiFetch(`/admin/students/${studentForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToastNotification('Student profile updated!', 'success');
      } else {
        const res = await apiFetch('/admin/students', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        const tempPass = res?.temporary_password || res?.data?.temporary_password || 'Student@2026';
        const stNum = res?.student?.student_number || res?.data?.student?.student_number || 'STU-Auto';

        setCreatedStudentCreds({
          name: payload.name,
          email: payload.email,
          student_number: stNum,
          temporary_password: tempPass,
        });

        showToastNotification('Student enrolled successfully!', 'success');
      }

      setShowStudentModal(false);
      setStudentForm({ id: 0, name: '', email: '', phone: '', cohort_id: '', status: 'ACTIVE', course_ids: [] });
      setIsEditingStudent(false);
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStudentStatus = async (student) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE_PAYMENT_PENDING' : 'ACTIVE';
    try {
      await apiFetch(`/admin/students/${student.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToastNotification(`Student status toggled to ${nextStatus === 'ACTIVE' ? 'ACTIVE' : 'GATED'}`, 'success');
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to update student status', 'error');
    }
  };

  const handleApproveApplication = async (application) => {
    try {
      await apiFetch(`/admin/student-applications/${application.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status: 'INACTIVE_PAYMENT_PENDING' }),
      });
      showToastNotification('Application approved.', 'success');
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to approve application.', 'error');
    }
  };

  const handleRejectApplication = async (application) => {
    const rejection_reason = window.prompt('Reason for rejecting this application:');
    if (!rejection_reason?.trim()) return;

    try {
      await apiFetch(`/admin/student-applications/${application.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejection_reason: rejection_reason.trim() }),
      });
      showToastNotification('Application rejected.', 'success');
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to reject application.', 'error');
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        code: courseForm.code.toUpperCase(),
        title: courseForm.title,
        credit_hours: Number(courseForm.credit_hours),
        description: courseForm.description,
        cohort_id: parseInt(courseForm.cohort_id || globalCohortId, 10),
        teacher_id: courseForm.teacher_id ? parseInt(courseForm.teacher_id, 10) : undefined,
      };

      if (isEditingCourse) {
        await apiFetch(`/admin/courses/${courseForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToastNotification(`Subject ${courseForm.code} updated!`, 'success');
      } else {
        await apiFetch('/admin/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToastNotification(`Subject ${courseForm.code} created!`, 'success');
      }

      setShowCourseModal(false);
      setIsEditingCourse(false);
      setCourseForm({ id: 0, code: '', title: '', credit_hours: 3, description: '', cohort_id: '', teacher_id: '' });
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save subject', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTimetable = async (e) => {
    e.preventDefault();
    if (!timetableForm.course_id || !timetableForm.teacher_id) {
      showToastNotification('Please select both a Subject and a Teacher.', 'error');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      course_id: parseInt(timetableForm.course_id, 10),
      teacher_id: parseInt(timetableForm.teacher_id, 10),
      day_of_week: timetableForm.day_of_week,
      start_time: timetableForm.start_time,
      end_time: timetableForm.end_time,
      classroom: timetableForm.classroom,
      delivery_mode: timetableForm.delivery_mode,
      virtual_platform: timetableForm.virtual_platform,
      meeting_link: timetableForm.meeting_link,
      meeting_opens_minutes_before: 15,
    };

    try {
      if (isEditingTimetable) {
        await apiFetch(`/admin/timetables/${timetableForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToastNotification('Timetable lesson updated!', 'success');
      } else {
        await apiFetch('/admin/timetables', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToastNotification('Lesson scheduled with meeting link!', 'success');
      }
      setShowTimetableModal(false);
      setIsEditingTimetable(false);
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save timetable slot', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const endpointMap = {
        cohort: `/admin/cohorts/${deleteTarget.id}`,
        teacher: `/admin/teachers/${deleteTarget.id}`,
        student: `/admin/students/${deleteTarget.id}`,
        course: `/admin/courses/${deleteTarget.id}`,
        timetable: `/admin/timetables/${deleteTarget.id}`,
      };

      await apiFetch(endpointMap[deleteTarget.type], { method: 'DELETE' });
      showToastNotification(`${deleteTarget.title} was removed successfully.`, 'success');
      setDeleteTarget(null);
      await loadAllData();
    } catch (err) {
      showToastNotification(err.message || `Failed to delete ${deleteTarget.type}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    } antialiased selection:bg-emerald-600 selection:text-white`}>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs h-16 px-4 sm:px-6 flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white capitalize tracking-tight">
              {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SHS Admin Workspace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Operating Cohort Dropdown */}
          <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-2.5 sm:pr-3">
            <span className="hidden lg:inline text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch:</span>
            <select
              value={globalCohortId}
              onChange={(e) => {
                const newId = e.target.value;
                setGlobalCohortId(newId);
                if (newId) localStorage.setItem('active_cohort_id', newId);
                else localStorage.removeItem('active_cohort_id');
              }}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none max-w-[150px] sm:max-w-none transition-colors"
            >
              <option value="">-- All Batches --</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
            title="Reload Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
              className="flex items-center gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {adminUser?.name ? adminUser.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{adminUser?.name || 'Administrator'}</p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Super Admin</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${adminDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {adminDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{adminUser?.name || 'Admin User'}</p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">{adminUser?.email || 'admin@school.test'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setAdminDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>My Profile & Security</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setAdminDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Institution Settings</span>
                  </button>
                </div>
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      clearAuth();
                      window.location.replace('/login');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 cursor-pointer"
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

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-slate-900 dark:bg-slate-950 text-slate-300 flex flex-col transition-all duration-300 ease-in-out md:static md:translate-x-0 border-r border-slate-800/80 ${
            mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
          } ${sidebarOpen ? 'md:w-64' : 'md:w-20'}`}
        >
          <div className="p-4 flex items-center justify-between border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                S
              </div>
              {(sidebarOpen || mobileMenuOpen) && (
                <div className="overflow-hidden whitespace-nowrap">
                  <h1 className="text-sm font-bold text-white tracking-wide">SHS Portal</h1>
                  <p className="text-[10px] text-emerald-400 font-mono">Vacation Classes Admin</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {(sidebarOpen || mobileMenuOpen) && <span>Dashboard Overview</span>}
            </button>

            {/* Teachers Submenu */}
            <div>
              <button
                onClick={() => {
                  if (sidebarOpen || mobileMenuOpen) toggleSubMenu('teachers');
                  else setActiveTab('teachers');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'teachers' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-sky-400 shrink-0" />
                  {(sidebarOpen || mobileMenuOpen) && <span>Teaching Staff</span>}
                </div>
                {(sidebarOpen || mobileMenuOpen) && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSubMenus.teachers ? 'rotate-180' : ''}`} />
                )}
              </button>
              {(sidebarOpen || mobileMenuOpen) && openSubMenus.teachers && (
                <div className="mt-1 ml-6 pl-2 border-l border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('teachers');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 cursor-pointer"
                  >
                    All Tutors ({teachers.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('teachers');
                      setIsEditingTeacher(false);
                      setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
                      setShowTeacherModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 flex items-center justify-between text-emerald-400 font-semibold cursor-pointer"
                  >
                    <span>Provision Teacher</span>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Students Submenu */}
            <div>
              <button
                onClick={() => {
                  if (sidebarOpen || mobileMenuOpen) toggleSubMenu('students');
                  else setActiveTab('students');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'students' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                  {(sidebarOpen || mobileMenuOpen) && <span>Students</span>}
                </div>
                {(sidebarOpen || mobileMenuOpen) && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSubMenus.students ? 'rotate-180' : ''}`} />
                )}
              </button>
              {(sidebarOpen || mobileMenuOpen) && openSubMenus.students && (
                <div className="mt-1 ml-6 pl-2 border-l border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('students');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 cursor-pointer"
                  >
                    All SHS Students ({students.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('students');
                      setIsEditingStudent(false);
                      setStudentForm({ id: 0, name: '', email: '', phone: '', cohort_id: globalCohortId || '', status: 'ACTIVE', course_ids: [] });
                      setShowStudentModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 flex items-center justify-between text-emerald-400 font-semibold cursor-pointer"
                  >
                    <span>Enroll Student</span>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Cohorts Submenu */}
            <div>
              <button
                onClick={() => {
                  if (sidebarOpen || mobileMenuOpen) toggleSubMenu('cohorts');
                  else setActiveTab('cohorts');
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'cohorts' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                  {(sidebarOpen || mobileMenuOpen) && <span>Vacation Batches</span>}
                </div>
                {(sidebarOpen || mobileMenuOpen) && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openSubMenus.cohorts ? 'rotate-180' : ''}`} />
                )}
              </button>
              {(sidebarOpen || mobileMenuOpen) && openSubMenus.cohorts && (
                <div className="mt-1 ml-6 pl-2 border-l border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('cohorts');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 cursor-pointer"
                  >
                    All Batches ({cohorts.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('cohorts');
                      setShowCohortModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 flex items-center justify-between text-purple-400 font-semibold cursor-pointer"
                  >
                    <span>Create Batch</span>
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setActiveTab('courses');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'courses' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              {(sidebarOpen || mobileMenuOpen) && <span>Subjects ({courses.length})</span>}
            </button>

            <button
              onClick={() => {
                setActiveTab('timetables');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'timetables' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <Video className="w-4 h-4 text-rose-400 shrink-0" />
              {(sidebarOpen || mobileMenuOpen) && <span>Live Links & Timetable</span>}
            </button>

            <button
              onClick={() => {
                setActiveTab('attendance');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'attendance' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0" />
              {(sidebarOpen || mobileMenuOpen) && <span>Attendance Audits</span>}
            </button>

            <button
              onClick={() => {
                setActiveTab('assignments');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'assignments' ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <Award className="w-4 h-4 text-yellow-400 shrink-0" />
              {(sidebarOpen || mobileMenuOpen) && <span>Grades & Tasks</span>}
            </button>
          </nav>
        </aside>

        {/* Dynamic Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {toast && (
            <div
              className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xl transition-all animate-in slide-in-from-bottom-5 duration-200 ${
                toast.type === 'success'
                  ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
                  : 'bg-rose-950 text-rose-100 border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button onClick={() => setToast(null)} className="text-white/60 hover:text-white text-xs font-bold ml-2 cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-linear-to-r from-slate-900 via-slate-900 to-slate-950 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
                <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SHS Vacation Academic Operations</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Welcome back, {adminUser?.name || 'Administrator'}! 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Operating Batch: <strong className="text-emerald-400">{cohorts.find(c => Number(c.id) === Number(globalCohortId))?.name || 'All Vacation Batches'}</strong>.
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total SHS Students</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{students.length}</p>
                </div>
                <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 shadow-xs">
                  <p className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Active (Paid)</p>
                  <p className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-1">{activeStudentsCount}</p>
                </div>
                <div className="bg-amber-50/60 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/60 shadow-xs">
                  <p className="text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">Gated (Unpaid)</p>
                  <p className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">{inactiveStudentsCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Teaching Staff</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{teachers.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Subjects</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{courses.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Batches</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{cohorts.length}</p>
                </div>
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Teacher Administration</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Provision instructor accounts, assign subjects, and auto-generate login credentials.</p>
                  <button
                    onClick={() => {
                      setActiveTab('teachers');
                      setIsEditingTeacher(false);
                      setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
                      setShowTeacherModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Provision Teacher
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Vacation Batches</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage intake sessions, vacation terms, and student cohort allocations.</p>
                  <button
                    onClick={() => {
                      setActiveTab('cohorts');
                      setShowCohortModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                  >
                    New Batch
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                    <Video className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Virtual Schedules</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Attach Zoom or Google Meet URLs to weekly SHS lesson slots.</p>
                  <button
                    onClick={() => {
                      setActiveTab('timetables');
                      setIsEditingTimetable(false);
                      setShowTimetableModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Create Lesson Slot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TEACHING STAFF */}
          {activeTab === 'teachers' && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Teaching Staff & Tutors</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Provision tutor accounts or update existing details.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingTeacher(false);
                    setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '', course_id: '' });
                    setShowTeacherModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Provision Teacher</span>
                </button>
              </div>

              {createdTeacherCreds && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Teacher Account Provisioned & Logins Ready!
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Email:</strong> {createdTeacherCreds.login_email}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Staff ID:</strong> {createdTeacherCreds.staff_id}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-blue-700 dark:text-blue-400 font-bold">
                        <strong>Temp Pass:</strong> {createdTeacherCreds.temporary_password}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const credText = `Teacher Portal Login:\nEmail: ${createdTeacherCreds.login_email}\nStaff ID: ${createdTeacherCreds.staff_id}\nPassword: ${createdTeacherCreds.temporary_password}`;
                      try {
                        await copyToClipboard(credText);
                        setCopiedKey(true);
                        showToastNotification('Credentials copied!', 'success');
                        setTimeout(() => setCopiedKey(false), 3000);
                      } catch (err) {
                        showToastNotification('Please copy credentials manually.', 'error');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedKey ? 'Copied' : 'Copy Logins'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.map((teacher) => {
                  const assigned = courses.filter((c) => {
                    const assignedSlot = timetables.find((tt) => Number(tt.course_id) === Number(c.id));
                    const teacherId = c.teacher_id || c.teacher?.id || assignedSlot?.teacher_id;
                    return Number(teacherId) === Number(teacher.id);
                  });

                  return (
                    <div key={teacher.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                              {(teacher.name || 'T').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{teacher.name}</h4>
                              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">ID: {teacher.employee_id || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {teacher.email}</p>
                          <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {teacher.phone || 'No phone'}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Assigned Subjects ({assigned.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {assigned.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">No assigned subjects</span>
                            ) : (
                              assigned.map((c) => (
                                <span key={c.id} className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {c.code}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setTeacherForm({
                              id: teacher.id,
                              name: teacher.name,
                              email: teacher.email,
                              phone: teacher.phone || '',
                              employee_id: teacher.employee_id || '',
                              course_id: '',
                            });
                            setIsEditingTeacher(true);
                            setShowTeacherModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'teacher', id: teacher.id, title: `Teacher: ${teacher.name}` })}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB: STUDENTS */}
          {activeTab === 'students' && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
              {studentApplications.length > 0 && (
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pending Admission Applications</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Audit candidates before creating their student accounts.</p>
                  </div>
                  <div className="grid gap-3">
                    {studentApplications.map((application) => (
                      <div key={application.id} className="flex flex-col gap-3 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {application.first_name} {application.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{application.student_email} · {application.cohort?.name || 'Standard Vacation'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveApplication(application)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 cursor-pointer">
                            Approve & Gate
                          </button>
                          <button onClick={() => handleRejectApplication(application)} className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 cursor-pointer">
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {createdStudentCreds && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Student Registered & Credentials Ready!
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Name:</strong> {createdStudentCreds.name}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Login:</strong> {createdStudentCreds.email}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <strong>Index No:</strong> {createdStudentCreds.student_number}
                      </span>
                      <span className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold">
                        <strong>Password:</strong> {createdStudentCreds.temporary_password}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const credText = `Student Credentials:\nName: ${createdStudentCreds.name}\nLogin: ${createdStudentCreds.email}\nPassword: ${createdStudentCreds.temporary_password}`;
                      try {
                        await copyToClipboard(credText);
                        setCopiedStudentKey(true);
                        showToastNotification('Credentials copied!', 'success');
                        setTimeout(() => setCopiedStudentKey(false), 3000);
                      } catch (err) {
                        showToastNotification('Please copy credentials manually.', 'error');
                      }
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    {copiedStudentKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedStudentKey ? 'Copied' : 'Copy Student Logins'}
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">SHS Student Enrollment & Payment Firewall</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Filter students and toggle payment firewall permissions.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingStudent(false);
                    setStudentForm({ id: 0, name: '', email: '', phone: '', cohort_id: globalCohortId || '', status: 'ACTIVE', course_ids: [] });
                    setShowStudentModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enroll Student</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search student by name, email, index..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Filter:</span>
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold outline-none"
                  >
                    <option value="all">All Students ({students.length})</option>
                    <option value="ACTIVE">Active (Paid) ({activeStudentsCount})</option>
                    <option value="INACTIVE_PAYMENT_PENDING">Gated (Unpaid) ({inactiveStudentsCount})</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Vacation Batch</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {filteredStudents.map((s) => {
                      const isActive = s.status === 'ACTIVE';
                      const studentCohort = cohorts.find((c) => Number(c.id) === Number(s.cohort_id));
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{s.student_number || 'STU-Auto'}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            <p>{s.email}</p>
                            <p className="text-[11px] text-slate-400">{s.phone || 'No phone'}</p>
                          </td>
                          <td className="py-3 px-4">
                            {studentCohort ? (
                              <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                {studentCohort.code}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isActive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {isActive ? 'Active (Paid)' : 'Gated (Unpaid)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleStudentStatus(s)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isActive ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isActive ? 'Gate Access' : 'Activate (Paid)'}
                            </button>
                            <button
                              onClick={() => {
                                const enrolledIds = (s.enrollments || []).map((e) => e.course_id || e.course?.id).filter(Boolean);
                                setStudentForm({
                                  id: s.id,
                                  name: s.name,
                                  email: s.email,
                                  phone: s.phone || '',
                                  cohort_id: s.cohort_id || '',
                                  status: s.status || 'ACTIVE',
                                  course_ids: enrolledIds,
                                });
                                setIsEditingStudent(true);
                                setShowStudentModal(true);
                              }}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'student', id: s.id, title: `Student: ${s.name}` })}
                              className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg inline-block cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB: VACATION BATCHES */}
          {activeTab === 'cohorts' && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vacation Batches & Intakes</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage vacation terms and assign SHS students to batches.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAssignCohortModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Assign Student
                  </button>
                  <button
                    onClick={() => setShowCohortModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Create Batch
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cohorts.map((cohort) => {
                  const regCount = students.filter((s) => Number(s.cohort_id) === Number(cohort.id)).length;
                  return (
                    <div key={cohort.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                            {cohort.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cohort.is_active ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                            {cohort.is_active ? 'Active' : 'Closed'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">{cohort.name}</h3>
                        <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          <p>Start: {cohort.starts_on || 'N/A'}</p>
                          <p>End: {cohort.ends_on || 'N/A'}</p>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{regCount} SHS Students Enrolled</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                        <button
                          onClick={() => setDeleteTarget({ type: 'cohort', id: cohort.id, title: `Batch: ${cohort.name}` })}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB: SUBJECTS (COURSES) */}
          {activeTab === 'courses' && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">SHS Subjects & Syllabi</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage vacation subjects and assigned teachers.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingCourse(false);
                    setCourseForm({ id: 0, code: '', title: '', credit_hours: 3, description: '', cohort_id: globalCohortId || cohorts[0]?.id || '', teacher_id: '' });
                    setShowCourseModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Add Subject
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const cohort = cohorts.find((c) => Number(c.id) === Number(course.cohort_id)) || course.cohort;
                  const assignedSlot = timetables.find((tt) => Number(tt.course_id) === Number(course.id));
                  const teacherId = course.teacher_id || course.teacher?.id || assignedSlot?.teacher_id;
                  const teacher = teachers.find((t) => Number(t.id) === Number(teacherId)) || course.teacher || assignedSlot?.teacher;

                  const enrolledCount =
                    course.enrollments_count ??
                    course.students_count ??
                    students.filter(
                      (s) => s.enrollments && s.enrollments.some((e) => Number(e.course_id) === Number(course.id))
                    ).length;

                  return (
                    <div key={course.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between hover:border-emerald-500/50 transition-all shadow-xs">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {course.code}
                          </span>
                          {cohort && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono">
                              {cohort.code}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-900 dark:text-white text-base mt-3">{course.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{course.description || 'No syllabus overview provided.'}</p>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Batch:</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{cohort?.name || 'Unassigned Batch'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Teacher:</span>
                            <span className={`font-semibold flex items-center gap-1 ${teacher ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 italic'}`}>
                              {teacher?.name || 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Enrolled:</span>
                            <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              {enrolledCount} Registered
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setCourseForm({
                              id: course.id,
                              code: course.code,
                              title: course.title,
                              credit_hours: course.credit_hours || 3,
                              description: course.description || '',
                              cohort_id: course.cohort_id || '',
                              teacher_id: course.teacher_id || assignedSlot?.teacher_id || '',
                            });
                            setIsEditingCourse(true);
                            setShowCourseModal(true);
                          }}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'course', id: course.id, title: `Subject: ${course.code}` })}
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB: TIMETABLES */}
          {activeTab === 'timetables' && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Subject Timetables & Virtual Classrooms</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Attach Zoom or Google Meet classroom URLs for active SHS students.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingTimetable(false);
                    setTimetableForm({
                      id: 0,
                      course_id: courses[0]?.id?.toString() || '',
                      teacher_id: teachers[0]?.id?.toString() || '',
                      day_of_week: 'MONDAY',
                      start_time: '09:00',
                      end_time: '10:30',
                      classroom: 'Virtual Studio Alpha',
                      delivery_mode: 'VIRTUAL',
                      virtual_platform: 'zoom',
                      meeting_link: '',
                    });
                    setShowTimetableModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Create Lesson Slot
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timetables.map((slot) => {
                  const course = courses.find((c) => Number(c.id) === Number(slot.course_id));
                  const teacher = teachers.find((t) => Number(t.id) === Number(slot.teacher_id));
                  return (
                    <div key={slot.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300">
                            {course?.code || slot.course_code || 'SUBJECT'}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            {slot.virtual_platform || 'Virtual'} Attached
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white mt-2">{course?.title || slot.course_title || 'Class Lesson'}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300">Teacher: {teacher?.name || slot.teacher_name || 'Unassigned'}</p>
                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          <p>{slot.day_of_week}: {slot.start_time} - {slot.end_time}</p>
                        </div>
                        <div className="mt-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-emerald-600 dark:text-emerald-400 truncate flex items-center justify-between">
                          <a href={formatExternalUrl(slot.meeting_link)} target="_blank" rel="noreferrer" className="truncate hover:underline">
                            {slot.meeting_link || 'No URL Attached'}
                          </a>
                          {slot.meeting_link && <ExternalLink className="w-3 h-3 shrink-0 ml-1" />}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setTimetableForm({
                              id: slot.id,
                              course_id: slot.course_id?.toString() || '',
                              teacher_id: slot.teacher_id?.toString() || '',
                              day_of_week: slot.day_of_week,
                              start_time: slot.start_time,
                              end_time: slot.end_time,
                              classroom: slot.classroom || '',
                              delivery_mode: slot.delivery_mode || 'VIRTUAL',
                              virtual_platform: slot.virtual_platform || 'zoom',
                              meeting_link: slot.meeting_link || '',
                            });
                            setIsEditingTimetable(true);
                            setShowTimetableModal(true);
                          }}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'timetable', id: slot.id, title: `Slot: ${course?.code || slot.id}` })}
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB: ATTENDANCE AUDIT LOGS */}
          {activeTab === 'attendance' && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">System-Wide Attendance Audit Trail</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Real-time log of attendance rosters marked by teachers.</p>
                </div>
                <button
                  onClick={loadAllData}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
                  <span>Refresh Logs</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Marked By</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {attendanceLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 italic">No attendance records logged yet.</td>
                      </tr>
                    ) : (
                      attendanceLogs.map((log) => {
                        const isPresent = String(log.status).toUpperCase() === 'PRESENT';
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{log.session_date}</td>
                            <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{log.course_code}</td>
                            <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                              {log.student_name} <span className="font-mono text-slate-400">({log.student_number})</span>
                            </td>
                            <td className="py-3 px-4 uppercase font-bold">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${
                                isPresent
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{log.marked_by}</td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 italic">{log.notes}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB: GRADES & TASKS */}
          {activeTab === 'assignments' && (
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Exercises, Tasks & Performance Oversight</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Centralized view of tutor assignments, test scores, and grading activity.</p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Exercise / Task Title</th>
                      <th className="py-3 px-4">Teacher</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Submissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {assignmentAudits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">No assignment records to display.</td>
                      </tr>
                    ) : (
                      assignmentAudits.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.course_code || item.course?.code}</td>
                          <td className="py-3 px-4 font-bold">{item.title}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{item.teacher_name || item.teacher?.name}</td>
                          <td className="py-3 px-4 font-mono">{item.due_date || item.due_at?.slice(0, 10)}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.graded_count ?? 0} / {item.total_submissions ?? 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <section className="max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 space-y-8">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Admin Profile & Security</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage your administrative identity, email notifications, and credentials.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                  Role: Super Admin
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Account Email</label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                      placeholder="+233 24 000 0000"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Admin Password</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Leave these fields blank if you do not wish to change your password.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Current Password</label>
                      <input
                        type="password"
                        value={profileForm.current_password}
                        onChange={(e) => setProfileForm({ ...profileForm, current_password: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">New Password</label>
                      <input
                        type="password"
                        value={profileForm.password}
                        onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Confirm New Password</label>
                      <input
                        type="password"
                        value={profileForm.password_confirmation}
                        onChange={(e) => setProfileForm({ ...profileForm, password_confirmation: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Saving Updates...' : 'Update Admin Profile'}
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <section className="max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Institutional Configuration</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure global application behavior, vacation batch presets, and system options.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Dark Theme Interface</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Reduce eye strain by enabling low-light background contrasts.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className={`w-12 h-6.5 rounded-full p-1 transition-colors flex items-center cursor-pointer ${
                      darkMode ? 'bg-emerald-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="bg-white w-4.5 h-4.5 rounded-full shadow-sm" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Attendance Edit Window</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Hours after session during which attendance can be updated by teachers.</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                    {settings.attendance_edit_window_hours} Hours
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Virtual Session Early Access Window</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Number of minutes before scheduled time that Zoom/Meet links become accessible.</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                    {settings.meeting_link_opens_minutes_before} Minutes
                  </span>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modal: Provision / Edit Teacher */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditingTeacher ? 'Edit Teacher Details' : 'Provision Teacher Account'}
              </h3>
              <button onClick={() => setShowTeacherModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Kojo Mensah"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. mensah@school.edu"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+233 54 112 3344"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Staff ID</label>
                <input
                  type="text"
                  placeholder="e.g. TCH-8890"
                  value={teacherForm.employee_id}
                  onChange={(e) => setTeacherForm({ ...teacherForm, employee_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowTeacherModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? 'Saving...' : isEditingTeacher ? 'Update Teacher' : 'Save Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enroll / Edit Student with Manual Subject Selection */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{isEditingStudent ? 'Edit Student Details' : 'Enroll SHS Student'}</h3>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame Mensah"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="kwame@shs.test"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+233 24 100 0000"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Vacation Batch</label>
                <select
                  value={studentForm.cohort_id}
                  onChange={(e) => setStudentForm({ ...studentForm, cohort_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold outline-none"
                >
                  <option value="">Select Batch...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Assign Subjects (Manual Selection)
                </label>
                <div className="max-h-36 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 bg-slate-50 dark:bg-slate-800/50">
                  {courses
                    .filter(c => !studentForm.cohort_id || Number(c.cohort_id) === Number(studentForm.cohort_id))
                    .map((course) => {
                      const isChecked = (studentForm.course_ids || []).includes(course.id);
                      return (
                        <label
                          key={course.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                            isChecked ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100 font-bold' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setStudentForm({ ...studentForm, course_ids: [...(studentForm.course_ids || []), course.id] });
                                } else {
                                  setStudentForm({ ...studentForm, course_ids: (studentForm.course_ids || []).filter((id) => id !== course.id) });
                                }
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>{course.title}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400">{course.code}</span>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Tuition Status</label>
                <select
                  value={studentForm.status}
                  onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold outline-none"
                >
                  <option value="ACTIVE">ACTIVE (Tuition Paid)</option>
                  <option value="INACTIVE_PAYMENT_PENDING">GATED (Tuition Pending)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowStudentModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? 'Saving...' : isEditingStudent ? 'Update Student' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Cohort */}
      {showCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Vacation Batch</h3>
              <button onClick={() => setShowCohortModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveCohort} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. August 2026 SHS Vacation Classes"
                  value={cohortForm.name}
                  onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Batch Code</label>
                <input
                  type="text"
                  required
                  placeholder="VAC-2026-AUG"
                  value={cohortForm.code}
                  onChange={(e) => setCohortForm({ ...cohortForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={cohortForm.starts_on}
                    onChange={(e) => setCohortForm({ ...cohortForm, starts_on: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={cohortForm.ends_on}
                    onChange={(e) => setCohortForm({ ...cohortForm, ends_on: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowCohortModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? 'Creating...' : 'Save Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Cohort */}
      {showAssignCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Student to Vacation Batch</h3>
              <button onClick={() => setShowAssignCohortModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAssignStudentToCohort} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Select Student</label>
                <select
                  required
                  value={assignForm.student_id}
                  onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">Choose student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.student_number || s.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Select Batch</label>
                <select
                  required
                  value={assignForm.cohort_id}
                  onChange={(e) => setAssignForm({ ...assignForm, cohort_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">Choose batch...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowAssignCohortModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Subject (Course) */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{isEditingCourse ? 'Edit Subject' : 'Add New Subject'}</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CORE-MATH"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Subject Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Mathematics (SHS 1-3)"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Vacation Batch</label>
                <select
                  required
                  value={courseForm.cohort_id}
                  onChange={(e) => setCourseForm({ ...courseForm, cohort_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">Select Batch...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Assign Subject Teacher</label>
                <select
                  value={courseForm.teacher_id}
                  onChange={(e) => setCourseForm({ ...courseForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employee_id || 'Staff'})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Syllabus Overview</label>
                <textarea
                  rows={2}
                  placeholder="Brief overview of curriculum..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? 'Saving...' : isEditingCourse ? 'Update Subject' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Timetable Slot */}
      {showTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditingTimetable ? 'Edit Lesson Slot' : 'Create Lesson Slot'}
              </h3>
              <button onClick={() => setShowTimetableModal(false)} className="text-slate-400 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSaveTimetable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Subject</label>
                <select
                  required
                  value={timetableForm.course_id}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const matchedCourse = courses.find((c) => String(c.id) === String(cId));
                    setTimetableForm({
                      ...timetableForm,
                      course_id: cId,
                      teacher_id: matchedCourse?.teacher_id ? String(matchedCourse.teacher_id) : timetableForm.teacher_id,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">-- Choose Subject --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Subject Teacher / Tutor</label>
                <select
                  required
                  value={timetableForm.teacher_id}
                  onChange={(e) => setTimetableForm({ ...timetableForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                >
                  <option value="">-- Choose Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employee_id || 'Tutor'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Day of Week</label>
                  <select
                    value={timetableForm.day_of_week}
                    onChange={(e) => setTimetableForm({ ...timetableForm, day_of_week: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                  >
                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Platform</label>
                  <select
                    value={timetableForm.virtual_platform}
                    onChange={(e) => setTimetableForm({ ...timetableForm, virtual_platform: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold"
                  >
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={timetableForm.start_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, start_time: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={timetableForm.end_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, end_time: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">Virtual URL (Zoom/Meet)</label>
                <input
                  type="url"
                  required
                  placeholder="https://zoom.us/j/..."
                  value={timetableForm.meeting_link}
                  onChange={(e) => setTimetableForm({ ...timetableForm, meeting_link: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-mono text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowTimetableModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
                  {isSubmitting ? 'Saving...' : 'Save Lesson Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Deletion</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{deleteTarget.title}</p>
              </div>
            </div>
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">Cancel</button>
              <button
                onClick={handleExecuteDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('admin-portal-root') || document.getElementById('app');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <AdminPortalDashboard />
    </React.StrictMode>
  );
}

export default AdminPortalDashboard;