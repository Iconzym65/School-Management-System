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
  RefreshCw
} from 'lucide-react';

// --- API Fetch Client Helper ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

export const AdminPortalDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState({
    teachers: false,
    students: false,
    cohorts: false
  });

  const [activeTab, setActiveTab] = useState('dashboard');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const dropdownRef = useRef(null);

  const [adminUser, setAdminUser] = useState(null);
  const [cohorts, setCohorts] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [assignmentAudits, setAssignmentAudits] = useState([]);

  const [showCohortModal, setShowCohortModal] = useState(false);
  const [showAssignCohortModal, setShowAssignCohortModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('all');
  const [createdTeacherCreds, setCreatedTeacherCreds] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const [cohortForm, setCohortForm] = useState({ name: '', code: '', starts_on: '', ends_on: '', is_active: true });
  const [assignForm, setAssignForm] = useState({ student_id: '', cohort_id: '' });
  const [teacherForm, setTeacherForm] = useState({ id: 0, name: '', email: '', phone: '', employee_id: '' });
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', email: '', phone: '', cohort_id: '', status: 'ACTIVE' });
  const [courseForm, setCourseForm] = useState({ code: '', title: '', credit_hours: 3, description: '', cohort_id: '', teacher_id: '' });
  const [timetableForm, setTimetableForm] = useState({
    id: 0,
    course_id: '',
    teacher_id: '',
    day_of_week: 'MONDAY',
    start_time: '09:00',
    end_time: '10:30',
    classroom: 'Virtual Alpha',
    delivery_mode: 'VIRTUAL',
    virtual_platform: 'zoom',
    meeting_link: ''
  });
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToastNotification = (message, type) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [userRes, cohortsRes, teachersRes, studentsRes, coursesRes, ttRes] = await Promise.allSettled([
        apiFetch('/auth/me'),
        apiFetch('/admin/cohorts'),
        apiFetch('/admin/teachers'),
        apiFetch('/admin/students'),
        apiFetch('/admin/courses'),
        apiFetch('/admin/timetables')
      ]);

      if (userRes.status === 'fulfilled') setAdminUser(userRes.value?.user || userRes.value);
      if (cohortsRes.status === 'fulfilled') setCohorts(Array.isArray(cohortsRes.value) ? cohortsRes.value : []);
      if (teachersRes.status === 'fulfilled') setTeachers(Array.isArray(teachersRes.value) ? teachersRes.value : []);
      if (studentsRes.status === 'fulfilled') setStudents(Array.isArray(studentsRes.value) ? studentsRes.value : []);
      if (coursesRes.status === 'fulfilled') setCourses(Array.isArray(coursesRes.value) ? coursesRes.value : []);
      if (ttRes.status === 'fulfilled') setTimetables(Array.isArray(ttRes.value) ? ttRes.value : []);

      apiFetch('/admin/attendance')
        .then(res => setAttendanceLogs(Array.isArray(res) ? res : []))
        .catch(() => {});

      apiFetch('/admin/assignments')
        .then(res => setAssignmentAudits(Array.isArray(res) ? res : []))
        .catch(() => {});

    } catch (err) {
      showToastNotification(err.message || 'Failed to synchronize with server.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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

  const activeStudentsCount = students.filter((s) => s.status === 'ACTIVE').length;
  const inactiveStudentsCount = students.filter((s) => s.status === 'INACTIVE_PAYMENT_PENDING').length;

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.student_number && s.student_number.toLowerCase().includes(studentSearch.toLowerCase()));
      const matchStatus = studentStatusFilter === 'all' ? true : s.status === studentStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [students, studentSearch, studentStatusFilter]);

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
          is_active: Boolean(cohortForm.is_active)
        })
      });
      showToastNotification(`Cohort ${cohortForm.name} created!`, 'success');
      setShowCohortModal(false);
      setCohortForm({ name: '', code: '', starts_on: '', ends_on: '', is_active: true });
      loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to create cohort', 'error');
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
        body: JSON.stringify({ cohort_id: parseInt(assignForm.cohort_id, 10) })
      });
      showToastNotification('Student assigned to cohort!', 'success');
      setShowAssignCohortModal(false);
      loadAllData();
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
            employee_id: teacherForm.employee_id
          })
        });
        showToastNotification('Lecturer updated successfully!', 'success');
        setShowTeacherModal(false);
      } else {
        const payload = {
          name: teacherForm.name,
          email: teacherForm.email,
          phone: teacherForm.phone || '+233 00 000 0000',
          employee_id: teacherForm.employee_id || `STF-${Math.floor(1000 + Math.random() * 9000)}`
        };

        const res = await apiFetch('/admin/teachers', {
          method: 'POST',
          body: JSON.stringify(payload)
        });

        const tempPass = res.temporary_password || 'Dispatched via Email';
        setCreatedTeacherCreds({
          login_email: payload.email,
          temporary_password: tempPass,
          staff_id: payload.employee_id
        });

        showToastNotification('Teacher provisioned & credentials issued!', 'success');
        setShowTeacherModal(false);
      }
      loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to save teacher', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/admin/students', {
        method: 'POST',
        body: JSON.stringify({
          name: studentForm.name,
          email: studentForm.email,
          phone: studentForm.phone,
          status: studentForm.status,
          cohort_id: studentForm.cohort_id ? parseInt(studentForm.cohort_id, 10) : undefined
        })
      });
      showToastNotification('Student enrolled successfully!', 'success');
      setShowStudentModal(false);
      setStudentForm({ name: '', email: '', phone: '', cohort_id: '', status: 'ACTIVE' });
      loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to enroll student', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStudentStatus = async (student) => {
    const nextStatus = student.status === 'ACTIVE' ? 'INACTIVE_PAYMENT_PENDING' : 'ACTIVE';
    try {
      await apiFetch(`/admin/students/${student.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      showToastNotification(`Student status changed to ${nextStatus === 'ACTIVE' ? 'ACTIVE' : 'GATED'}`, 'success');
      loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to update student firewall status', 'error');
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiFetch('/admin/courses', {
        method: 'POST',
        body: JSON.stringify({
          code: courseForm.code.toUpperCase(),
          title: courseForm.title,
          credit_hours: Number(courseForm.credit_hours),
          description: courseForm.description,
          cohort_id: parseInt(courseForm.cohort_id, 10),
          teacher_id: courseForm.teacher_id ? parseInt(courseForm.teacher_id, 10) : undefined
        })
      });
      showToastNotification(`Course ${courseForm.code} created!`, 'success');
      setShowCourseModal(false);
      setCourseForm({ code: '', title: '', credit_hours: 3, description: '', cohort_id: '', teacher_id: '' });
      loadAllData();
    } catch (err) {
      showToastNotification(err.message || 'Failed to create course', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTimetable = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      course_id: parseInt(timetableForm.course_id, 10),
      teacher_id: parseInt(timetableForm.teacher_id, 10),
      day_of_week: timetableForm.day_of_week,
      start_time: timetableForm.start_time,
      end_time: timetableForm.end_time,
      classroom: timetableForm.classroom,
      delivery_mode: timetableForm.delivery_mode,
      meeting_link: timetableForm.meeting_link,
      meeting_opens_minutes_before: 15
    };

    try {
      if (isEditingTimetable) {
        await apiFetch(`/admin/timetables/${timetableForm.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToastNotification('Timetable session updated!', 'success');
      } else {
        await apiFetch('/admin/timetables', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToastNotification('Timetable slot scheduled with virtual link!', 'success');
      }
      setShowTimetableModal(false);
      setIsEditingTimetable(false);
      loadAllData();
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
      loadAllData();
    } catch (err) {
      showToastNotification(err.message || `Failed to delete ${deleteTarget.type}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) {
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs h-16 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-slate-900 capitalize">
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab.replace('-', ' ')}
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Admin Control Center
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 disabled:opacity-50"
            title="Sync API Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {adminUser?.name ? adminUser.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-tight">{adminUser?.name || 'Administrator'}</p>
                <p className="text-[10px] font-medium text-slate-500">Super Admin</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {adminDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{adminUser?.name || 'Admin User'}</p>
                  <p className="text-xs font-semibold text-blue-600">{adminUser?.email || 'admin@school.test'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setAdminDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setAdminDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2.5"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </button>
                </div>
                <div className="pt-1 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800 ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <div className="p-4 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
              S
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="text-sm font-bold text-white tracking-wide">CampusAdmin</h1>
                <p className="text-[10px] text-slate-400 font-mono">Academic Portal</p>
              </div>
            )}
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'profile' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>Admin Profile</span>}
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span>Dashboard</span>}
            </button>

            {/* Teachers Sub-menu */}
            <div>
              <button
                onClick={() => (sidebarOpen ? toggleSubMenu('teachers') : setActiveTab('teachers'))}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'teachers' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-blue-400 shrink-0" />
                  {sidebarOpen && <span>Teachers</span>}
                </div>
                {sidebarOpen && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSubMenus.teachers ? 'rotate-180' : ''}`} />
                )}
              </button>
              {sidebarOpen && openSubMenus.teachers && (
                <div className="mt-1 ml-6 pl-2 border-l border-slate-800 space-y-1">
                  <button
                    onClick={() => setActiveTab('teachers')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60"
                  >
                    All Teachers ({teachers.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('teachers');
                      setIsEditingTeacher(false);
                      setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '' });
                      setShowTeacherModal(true);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 flex items-center justify-between"
                  >
                    <span>Provision Teacher</span>
                    <Plus className="w-3 h-3 text-blue-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Students Sub-menu */}
            <div>
              <button
                onClick={() => (sidebarOpen ? toggleSubMenu('students') : setActiveTab('students'))}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'students' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                  {sidebarOpen && <span>Students</span>}
                </div>
                {sidebarOpen && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSubMenus.students ? 'rotate-180' : ''}`} />
                )}
              </button>
              {sidebarOpen && openSubMenus.students && (
                <div className="mt-1 ml-6 pl-2 border-l border-slate-800 space-y-1">
                  <button
                    onClick={() => setActiveTab('students')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60"
                  >
                    All Students ({students.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('students');
                      setShowStudentModal(true);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 flex items-center justify-between"
                  >
                    <span>Add Student</span>
                    <Plus className="w-3 h-3 text-emerald-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Cohorts Sub-menu */}
            <div>
              <button
                onClick={() => (sidebarOpen ? toggleSubMenu('cohorts') : setActiveTab('cohorts'))}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'cohorts' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                  {sidebarOpen && <span>Cohorts</span>}
                </div>
                {sidebarOpen && (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSubMenus.cohorts ? 'rotate-180' : ''}`} />
                )}
              </button>
              {sidebarOpen && openSubMenus.cohorts && (
                <div className="mt-1 ml-6 pl-2 border-l border-slate-800 space-y-1">
                  <button
                    onClick={() => setActiveTab('cohorts')}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60"
                  >
                    All Cohorts ({cohorts.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('cohorts');
                      setShowCohortModal(true);
                    }}
                    className="w-full text-left py-1.5 px-2.5 rounded-lg text-xs hover:text-white hover:bg-slate-800/60 flex items-center justify-between"
                  >
                    <span>Create Cohort</span>
                    <Plus className="w-3 h-3 text-purple-400" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'courses' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              {sidebarOpen && <span>Courses ({courses.length})</span>}
            </button>

            <button
              onClick={() => setActiveTab('timetables')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'timetables' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Video className="w-4 h-4 text-rose-400 shrink-0" />
              {sidebarOpen && <span>Timetable & Live Links</span>}
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0" />
              {sidebarOpen && <span>Attendance Logs</span>}
            </button>

            <button
              onClick={() => setActiveTab('assignments')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'assignments' ? 'bg-blue-600 text-white shadow-xs' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Award className="w-4 h-4 text-yellow-400 shrink-0" />
              {sidebarOpen && <span>Assignments & Grades</span>}
            </button>
          </nav>
        </aside>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {toast && (
            <div
              className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all ${
                toast.type === 'success'
                  ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
                  : 'bg-rose-900 text-rose-50 border-rose-700'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-rose-400" />}
                <span>{toast.message}</span>
              </div>
              <button onClick={() => setToast(null)} className="text-xs text-white/70 hover:text-white font-bold ml-2">✕</button>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Total Students</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{students.length}</p>
                </div>
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 shadow-xs">
                  <p className="text-emerald-700 text-[10px] font-bold uppercase">Active (Paid)</p>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{activeStudentsCount}</p>
                </div>
                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 shadow-xs">
                  <p className="text-amber-700 text-[10px] font-bold uppercase">Gated (Unpaid)</p>
                  <p className="text-2xl font-black text-amber-900 mt-1">{inactiveStudentsCount}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Faculty Staff</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{teachers.length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Total Courses</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{courses.length}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <p className="text-slate-500 text-[10px] font-bold uppercase">Cohorts</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{cohorts.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Teacher Administration</h3>
                  <p className="text-xs text-slate-500">Provision instructor accounts and auto-generate login credentials.</p>
                  <button
                    onClick={() => {
                      setActiveTab('teachers');
                      setIsEditingTeacher(false);
                      setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '' });
                      setShowTeacherModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                  >
                    Provision Teacher
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Vacation Cohorts</h3>
                  <p className="text-xs text-slate-500">Manage intake sessions, terms, and active vacation batches.</p>
                  <button
                    onClick={() => {
                      setActiveTab('cohorts');
                      setShowCohortModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    New Cohort
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <Video className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Virtual Schedules</h3>
                  <p className="text-xs text-slate-500">Attach Zoom or Google Meet URLs to weekly academic schedules.</p>
                  <button
                    onClick={() => {
                      setActiveTab('timetables');
                      setIsEditingTimetable(false);
                      setShowTimetableModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                  >
                    Create Slot
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TEACHERS TAB */}
          {activeTab === 'teachers' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Faculty & Instructional Staff</h2>
                  <p className="text-xs text-slate-500">Provision instructor accounts or update existing details.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingTeacher(false);
                    setTeacherForm({ id: 0, name: '', email: '', phone: '', employee_id: '' });
                    setShowTeacherModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs"
                >
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>Provision Teacher</span>
                </button>
              </div>

              {createdTeacherCreds && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      Teacher Account Provisioned & Logins Dispatched!
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                        <strong>Email:</strong> {createdTeacherCreds.login_email}
                      </span>
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                        <strong>Staff ID:</strong> {createdTeacherCreds.staff_id}
                      </span>
                      <span className="bg-white px-2.5 py-1 rounded-lg border border-emerald-200 text-blue-700 font-bold">
                        <strong>Temp Pass:</strong> {createdTeacherCreds.temporary_password}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Email: ${createdTeacherCreds.login_email}\nStaff ID: ${createdTeacherCreds.staff_id}\nTemp Pass: ${createdTeacherCreds.temporary_password}`
                      );
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedKey ? 'Copied' : 'Copy Logins'}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.map((teacher) => {
                  const assigned = courses.filter((c) => c.teacher_id === teacher.id);
                  return (
                    <div key={teacher.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                              {teacher.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{teacher.name}</h4>
                              <p className="text-[11px] font-mono text-slate-500">ID: {teacher.employee_id || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-1 text-xs text-slate-600">
                          <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {teacher.email}</p>
                          <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {teacher.phone || 'No phone'}</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200">
                          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Assigned Courses ({assigned.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {assigned.map((c) => (
                              <span key={c.id} className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold">
                                {c.code}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setTeacherForm({
                              id: teacher.id,
                              name: teacher.name,
                              email: teacher.email,
                              phone: teacher.phone || '',
                              employee_id: teacher.employee_id || ''
                            });
                            setIsEditingTeacher(true);
                            setShowTeacherModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'teacher', id: teacher.id, title: `Teacher: ${teacher.name}` })}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1"
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

          {/* STUDENTS TAB */}
          {activeTab === 'students' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Student Enrollment & Payment Firewall</h2>
                  <p className="text-xs text-slate-500">Filter students and toggle payment firewall permissions.</p>
                </div>
                <button
                  onClick={() => setShowStudentModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Create Student</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or STU..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-500">Filter:</span>
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold"
                  >
                    <option value="all">All Students ({students.length})</option>
                    <option value="ACTIVE">Active (Paid) ({activeStudentsCount})</option>
                    <option value="INACTIVE_PAYMENT_PENDING">Gated (Unpaid) ({inactiveStudentsCount})</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStudents.map((s) => {
                      const isActive = s.status === 'ACTIVE';
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{s.name}</p>
                            <p className="text-[11px] font-mono text-slate-500">{s.student_number || 'STU-Auto'}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{s.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {isActive ? 'Active (Paid)' : 'Gated (Unpaid)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleToggleStudentStatus(s)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                isActive ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                              }`}
                            >
                              {isActive ? 'Gate Access' : 'Activate (Paid)'}
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'student', id: s.id, title: `Student: ${s.name}` })}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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

          {/* COHORTS TAB */}
          {activeTab === 'cohorts' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Vacation Cohorts & Batches</h2>
                  <p className="text-xs text-slate-500">Manage vacation terms and assign students to cohorts.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAssignCohortModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                  >
                    Assign Student
                  </button>
                  <button
                    onClick={() => setShowCohortModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    Create Cohort
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cohorts.map((cohort) => {
                  const regCount = students.filter((s) => s.cohort_id === cohort.id).length;
                  return (
                    <div key={cohort.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-purple-100 text-purple-800">
                            {cohort.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cohort.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                            {cohort.is_active ? 'Active' : 'Closed'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-2">{cohort.name}</h3>
                        <div className="mt-3 text-xs text-slate-600 space-y-1">
                          <p>Start: {cohort.starts_on || 'N/A'}</p>
                          <p>End: {cohort.ends_on || 'N/A'}</p>
                          <p className="font-bold text-purple-700">{regCount} Enrolled</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={() => setDeleteTarget({ type: 'cohort', id: cohort.id, title: `Cohort: ${cohort.name}` })}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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

          {/* COURSES TAB */}
          {activeTab === 'courses' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Curricula & Courses</h2>
                  <p className="text-xs text-slate-500">Manage vacation courses and assigned instructors.</p>
                </div>
                <button
                  onClick={() => setShowCourseModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Create Course
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {courses.map((course) => {
                  const teacher = teachers.find((t) => t.id === course.teacher_id);
                  const cohort = cohorts.find((c) => c.id === course.cohort_id);
                  return (
                    <div key={course.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {course.code}
                          </span>
                          {cohort && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {cohort.code}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 mt-2">{course.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{course.description || 'No description provided.'}</p>
                        <p className="text-xs font-semibold text-blue-600 mt-2">Lecturer: {teacher?.name || 'Unassigned'}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={() => setDeleteTarget({ type: 'course', id: course.id, title: `Course: ${course.code}` })}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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

          {/* TIMETABLES TAB */}
          {activeTab === 'timetables' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Course Timetable & Virtual Links</h2>
                  <p className="text-xs text-slate-500">Attach Zoom or Google Meet classroom URLs for active students.</p>
                </div>
                <button
                  onClick={() => {
                    setIsEditingTimetable(false);
                    setTimetableForm({
                      id: 0,
                      course_id: courses[0]?.id.toString() || '',
                      teacher_id: teachers[0]?.id.toString() || '',
                      day_of_week: 'MONDAY',
                      start_time: '09:00',
                      end_time: '10:30',
                      classroom: 'Virtual Studio Alpha',
                      delivery_mode: 'VIRTUAL',
                      virtual_platform: 'zoom',
                      meeting_link: ''
                    });
                    setShowTimetableModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                >
                  Create Schedule Slot
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timetables.map((slot) => {
                  const course = courses.find((c) => c.id === slot.course_id);
                  const teacher = teachers.find((t) => t.id === slot.teacher_id);
                  return (
                    <div key={slot.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {course?.code || slot.course_code || 'SLOT'}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {slot.virtual_platform || 'Virtual'} Attached
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 mt-2">{course?.title || slot.course_title || 'Class Session'}</h4>
                        <p className="text-xs text-slate-600">Lecturer: {teacher?.name || slot.teacher_name || 'Unassigned'}</p>
                        <div className="mt-2 text-xs text-slate-600">
                          <p>{slot.day_of_week}: {slot.start_time} - {slot.end_time}</p>
                        </div>
                        <div className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-xs font-mono text-blue-600 truncate">
                          <a href={slot.meeting_link} target="_blank" rel="noreferrer">{slot.meeting_link || 'No URL Attached'}</a>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setTimetableForm({
                              id: slot.id,
                              course_id: slot.course_id.toString(),
                              teacher_id: slot.teacher_id.toString(),
                              day_of_week: slot.day_of_week,
                              start_time: slot.start_time,
                              end_time: slot.end_time,
                              classroom: slot.classroom || '',
                              delivery_mode: slot.delivery_mode || 'VIRTUAL',
                              virtual_platform: slot.virtual_platform || 'zoom',
                              meeting_link: slot.meeting_link || ''
                            });
                            setIsEditingTimetable(true);
                            setShowTimetableModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ type: 'timetable', id: slot.id, title: `Slot: ${course?.code || slot.id}` })}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">System-Wide Attendance Audit Trail</h2>
                <p className="text-xs text-slate-500">Real-time log of attendance rosters marked by instructors.</p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Marked By</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {attendanceLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">No attendance records logged yet.</td>
                      </tr>
                    ) : (
                      attendanceLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-3 px-4 font-mono font-bold">{log.session_date}</td>
                          <td className="py-3 px-4 font-mono">{log.course_code}</td>
                          <td className="py-3 px-4">{log.student_name} ({log.student_number})</td>
                          <td className="py-3 px-4 uppercase font-bold text-emerald-700">{log.status}</td>
                          <td className="py-3 px-4">{log.marked_by}</td>
                          <td className="py-3 px-4 text-slate-500 italic">{log.notes}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ASSIGNMENTS TAB */}
          {activeTab === 'assignments' && (
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900">Assignments & Grades Oversight</h2>
                <p className="text-xs text-slate-500">Centralized view of teacher assignments and grading activity.</p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Assignment Title</th>
                      <th className="py-3 px-4">Lecturer</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Submissions</th>
                      <th className="py-3 px-4">Average Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {assignmentAudits.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">No assignment records to display.</td>
                      </tr>
                    ) : (
                      assignmentAudits.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-4 font-mono font-bold text-blue-700">{item.course_code}</td>
                          <td className="py-3 px-4 font-bold">{item.title}</td>
                          <td className="py-3 px-4">{item.teacher_name}</td>
                          <td className="py-3 px-4 font-mono">{item.due_date}</td>
                          <td className="py-3 px-4">{item.graded_count} / {item.total_submissions}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700">{item.average_score}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Modal: Provision Teacher */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isEditingTeacher ? 'Edit Teacher' : 'Provision Teacher Account'}
              </h3>
              <button onClick={() => setShowTeacherModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Alan Turing"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. turing@school.edu"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+233 54 112 3344"
                  value={teacherForm.phone}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowTeacherModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Student */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Enroll Student</h3>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="student@school.test"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vacation Cohort</label>
                <select
                  value={studentForm.cohort_id}
                  onChange={(e) => setStudentForm({ ...studentForm, cohort_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="">Select Cohort...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Payment Status</label>
                <select
                  value={studentForm.status}
                  onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="ACTIVE">ACTIVE (Tuition Paid)</option>
                  <option value="INACTIVE_PAYMENT_PENDING">GATED (Tuition Unpaid)</option>
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowStudentModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">
                  {isSubmitting ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Cohort */}
      {showCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Vacation Cohort</h3>
              <button onClick={() => setShowCohortModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveCohort} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cohort Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. August 2026 Vacation Batch"
                  value={cohortForm.name}
                  onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Code</label>
                <input
                  type="text"
                  required
                  placeholder="VAC-2026-AUG"
                  value={cohortForm.code}
                  onChange={(e) => setCohortForm({ ...cohortForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={cohortForm.starts_on}
                    onChange={(e) => setCohortForm({ ...cohortForm, starts_on: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={cohortForm.ends_on}
                    onChange={(e) => setCohortForm({ ...cohortForm, ends_on: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowCohortModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Save Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Cohort */}
      {showAssignCohortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Assign Student to Cohort</h3>
              <button onClick={() => setShowAssignCohortModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleAssignStudentToCohort} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Student</label>
                <select
                  required
                  value={assignForm.student_id}
                  onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="">Choose student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.student_number || s.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Cohort</label>
                <select
                  required
                  value={assignForm.cohort_id}
                  onChange={(e) => setAssignForm({ ...assignForm, cohort_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="">Choose cohort...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAssignCohortModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold disabled:opacity-50">
                  {isSubmitting ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Course */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create Course</h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveCourse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101"
                  value={courseForm.code}
                  onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures & Algorithms"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Vacation Cohort</label>
                <select
                  required
                  value={courseForm.cohort_id}
                  onChange={(e) => setCourseForm({ ...courseForm, cohort_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="">Select Cohort...</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Lecturer</label>
                <select
                  value={courseForm.teacher_id}
                  onChange={(e) => setCourseForm({ ...courseForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="">Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employee_id})</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Timetable Slot */}
      {showTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isEditingTimetable ? 'Edit Timetable Slot' : 'Create Timetable Slot'}
              </h3>
              <button onClick={() => setShowTimetableModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleSaveTimetable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Course</label>
                <select
                  required
                  value={timetableForm.course_id}
                  onChange={(e) => setTimetableForm({ ...timetableForm, course_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="">Select Course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lecturer</label>
                <select
                  required
                  value={timetableForm.teacher_id}
                  onChange={(e) => setTimetableForm({ ...timetableForm, teacher_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="">Select Lecturer...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Day of Week</label>
                  <select
                    value={timetableForm.day_of_week}
                    onChange={(e) => setTimetableForm({ ...timetableForm, day_of_week: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  >
                    {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Platform</label>
                  <select
                    value={timetableForm.virtual_platform}
                    onChange={(e) => setTimetableForm({ ...timetableForm, virtual_platform: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  >
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={timetableForm.start_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, start_time: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={timetableForm.end_time}
                    onChange={(e) => setTimetableForm({ ...timetableForm, end_time: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Virtual URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://zoom.us/j/..."
                  value={timetableForm.meeting_link}
                  onChange={(e) => setTimetableForm({ ...timetableForm, meeting_link: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-blue-700"
                />
              </div>
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowTimetableModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
                <p className="text-xs text-slate-500">{deleteTarget.title}</p>
              </div>
            </div>
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold">Cancel</button>
              <button
                onClick={handleExecuteDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
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

// --- DOM Mount ---
const container = document.getElementById('admin-portal-root') || document.getElementById('app');
if (container) {
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <AdminPortalDashboard />
    </React.StrictMode>
  );
}

export default AdminPortalDashboard;