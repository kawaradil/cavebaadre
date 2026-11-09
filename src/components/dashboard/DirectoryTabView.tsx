import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Users,
  Search,
  Plus,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  CivicReport,
  SECTOR_META,
  ReportSector,
  MunicipalDepartment,
  RegisteredCitizen,
} from '../../types/baadre';
import { AdminCitizenDTO } from '../../types/dto';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  enforcePhoneLimit,
  FieldLimitBadge,
} from '../../lib/inputLimits';
import { playClickSound, playSuccessSound } from '../../lib/sound';
import {
  CitizenAccordionCard,
  DepartmentAccordionCard,
  formatWaNumberHelper,
} from './AccordionCards';

interface DirectoryTabViewProps {
  reports: CivicReport[];
  departments: MunicipalDepartment[];
  citizens: RegisteredCitizen[];
  registeredUsersList: AdminCitizenDTO[];
  currentUser: any;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isRTL: boolean;
  language: 'ar' | 'ku' | 'en';
  tr: (ar: string, ku: string, en: string) => string;
  addDepartment: (dept: Omit<MunicipalDepartment, 'id'>) => void;
  updateDepartment?: (deptId: string, updates: Partial<MunicipalDepartment>) => void;
  deleteDepartment: (deptId: string) => void;
  toggleBlockCitizen: (citizenId: string) => void;
  onSelectForRole: (cit: AdminCitizenDTO) => void;
  onGrantAdminDirect: (cit: AdminCitizenDTO) => void;
  onRevertCitizenDirect: (cit: AdminCitizenDTO) => void;
  onSelectForRecovery: (cit: AdminCitizenDTO) => void;
  onDeleteCitizen?: (cit: AdminCitizenDTO) => void;
}

export const DirectoryTabView: React.FC<DirectoryTabViewProps> = React.memo(
  ({
    reports,
    departments,
    citizens,
    registeredUsersList,
    currentUser,
    isAdmin,
    isSuperAdmin,
    isRTL,
    language,
    tr,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    toggleBlockCitizen,
    onSelectForRole,
    onGrantAdminDirect,
    onRevertCitizenDirect,
    onSelectForRecovery,
    onDeleteCitizen,
  }) => {
    const [directoryChip, setDirectoryChip] = useState<'departments' | 'citizens'>('departments');
    const [deptSearch, setDeptSearch] = useState('');
    const [citizenSearch, setCitizenSearch] = useState('');
    const [deptToDelete, setDeptToDelete] = useState<MunicipalDepartment | null>(null);
    const [adminVisibleCitizensCount, setAdminVisibleCitizensCount] = useState<number>(5);

    // Add Department Form State (2 numbers only + owner names)
    const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptSector, setNewDeptSector] = useState<ReportSector>('roads');
    const [newPhone1, setNewPhone1] = useState('');
    const [newPhone1Owner, setNewPhone1Owner] = useState('');
    const [newPhone2, setNewPhone2] = useState('');
    const [newPhone2Owner, setNewPhone2Owner] = useState('');

    // Edit Department Form State
    const [editingDept, setEditingDept] = useState<MunicipalDepartment | null>(null);
    const [editDeptName, setEditDeptName] = useState('');
    const [editDeptSector, setEditDeptSector] = useState<ReportSector>('roads');
    const [editPhone1, setEditPhone1] = useState('');
    const [editPhone1Owner, setEditPhone1Owner] = useState('');
    const [editPhone2, setEditPhone2] = useState('');
    const [editPhone2Owner, setEditPhone2Owner] = useState('');

    const openEditDeptModal = (dept: MunicipalDepartment) => {
      setEditingDept(dept);
      setEditDeptName(dept.nameAr || dept.name || '');
      setEditDeptSector(dept.sector || 'roads');
      setEditPhone1(dept.phone1 || dept.engineerPhone || dept.phone || '');
      setEditPhone1Owner(dept.phone1Owner || dept.engineerName || dept.headName || '');
      setEditPhone2(dept.phone2 || dept.managerPhone || dept.deputyPhone || '');
      setEditPhone2Owner(dept.phone2Owner || dept.managerName || dept.deputyName || '');
    };

    const getSectorLabel = (secKey: ReportSector) => {
      const sec = SECTOR_META[secKey];
      if (!sec) return secKey;
      return language === 'ku' ? sec.ku : language === 'en' ? sec.en : sec.ar;
    };

    const getDeptDisplayName = (dept: MunicipalDepartment) => {
      if (language === 'ku') return dept.nameKu || dept.nameAr;
      if (language === 'en') return dept.nameEn || dept.nameAr;
      return dept.nameAr;
    };

    const getDepartmentCompletedCount = useCallback(
      (dept: MunicipalDepartment) => {
        return reports.filter(
          (r) =>
            r.status === 'resolved' &&
            (r.assignedDepartmentId === dept.id ||
              r.assignedTeam === dept.nameAr ||
              r.assignedTeam === dept.fieldTeamName ||
              r.sector === dept.sector)
        ).length;
      },
      [reports]
    );

    const filteredDepartments = useMemo(() => {
      if (!deptSearch.trim()) return departments;
      const q = deptSearch.trim().toLowerCase();
      return departments.filter(
        (d) =>
          d.nameAr.toLowerCase().includes(q) ||
          (d.nameKu && d.nameKu.toLowerCase().includes(q)) ||
          (d.nameEn && d.nameEn.toLowerCase().includes(q)) ||
          (d.engineerName && d.engineerName.toLowerCase().includes(q)) ||
          (d.engineerPhone && d.engineerPhone.includes(q)) ||
          (d.deputyName && d.deputyName.toLowerCase().includes(q)) ||
          (d.deputyPhone && d.deputyPhone.includes(q)) ||
          (d.managerName && d.managerName.toLowerCase().includes(q)) ||
          (d.managerPhone && d.managerPhone.includes(q)) ||
          d.phone.includes(q)
      );
    }, [departments, deptSearch]);

    const filteredCitizens = useMemo<AdminCitizenDTO[]>(() => {
      const submittedByUid: Record<string, number> = {};
      const resolvedByUid: Record<string, number> = {};

      reports.forEach((r) => {
        const owner = String(r.ownerUid || r.citizenId || '').trim();
        if (owner) {
          submittedByUid[owner] = (submittedByUid[owner] || 0) + 1;
          if (r.status === 'resolved') {
            resolvedByUid[owner] = (resolvedByUid[owner] || 0) + 1;
          }
        }
      });

      const mergedMap = new Map<string, AdminCitizenDTO>();

      // 1. Registered users from users collection (primary source of truth for app accounts)
      registeredUsersList.forEach((ru) => {
        const cMatch = citizens.find(
          (c) => c.id === ru.uid || (ru.phone && c.phone && ru.phone === c.phone)
        );
        const isDesig = ru.email?.trim().toLowerCase() === '11kattak11@gmail.com';
        mergedMap.set(ru.uid, {
          ...ru,
          fullName: isDesig
            ? 'كاوار عادل طاهر'
            : ru.fullName || cMatch?.name || 'مواطن مسجل',
          phone: ru.phone || cMatch?.phone || '',
          neighborhood: ru.neighborhood || cMatch?.neighborhood || 'ناحية باعدرى',
          role: isDesig ? 'super_admin' : ru.role || 'citizen',
          reportsSubmittedCount: Math.max(
            ru.reportsSubmittedCount || 0,
            cMatch?.reportsSubmittedCount || 0,
            submittedByUid[ru.uid] || 0
          ),
          resolvedReportsCount: Math.max(
            ru.resolvedReportsCount || 0,
            cMatch?.resolvedReportsCount || 0,
            resolvedByUid[ru.uid] || 0
          ),
          joinedAt: ru.joinedAt || cMatch?.joinedAt || new Date().toISOString(),
          isBlocked: Boolean(ru.isBlocked ?? cMatch?.isBlocked ?? false),
        });
      });

      // 2. Also include any records in citizens collection not yet in mergedMap
      citizens.forEach((c) => {
        if (!mergedMap.has(c.id)) {
          const match = registeredUsersList.find(
            (u) => u.uid === c.id || (u.phone && c.phone && u.phone.includes(c.phone))
          );
          if (match && mergedMap.has(match.uid)) return;

          mergedMap.set(c.id, {
            uid: c.id,
            fullName: c.name || 'مواطن مسجل',
            email: match?.email || '',
            phone: c.phone || '',
            birthDate: match?.birthDate || '',
            role: match?.role || 'citizen',
            neighborhood: c.neighborhood || 'ناحية باعدرى',
            reportsSubmittedCount: Math.max(
              c.reportsSubmittedCount || 0,
              submittedByUid[c.id] || 0
            ),
            resolvedReportsCount: Math.max(
              c.resolvedReportsCount || 0,
              resolvedByUid[c.id] || 0
            ),
            joinedAt: c.joinedAt || new Date().toISOString(),
            isBlocked: Boolean(c.isBlocked),
            hasRecoveryCodeConfigured: match?.hasRecoveryCodeConfigured,
          });
        }
      });

      const allMerged = Array.from(mergedMap.values()).filter((c) => {
        // إخفاء حسابات سوبر أدمن عن غير السوبر أدمن (عن الأدمن والمواطنين والآخرين)
        const isSuper =
          c.role === 'super_admin' ||
          c.email?.trim().toLowerCase() === '11kattak11@gmail.com';
        if (!isSuperAdmin && isSuper) return false;
        return true;
      });

      // تثبيت الأدمن والسوبر أدمن دائماً في أعلى قائمة المواطنين (Pinned)
      const pinnedAdmins = allMerged
        .filter(
          (c) =>
            c.role === 'admin' ||
            c.role === 'super_admin'
        )
        .sort(
          (a, b) =>
            new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        );

      const regularCitizens = allMerged
        .filter(
          (c) =>
            c.role !== 'admin' &&
            c.role !== 'super_admin'
        )
        .sort(
          (a, b) =>
            new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        );

      const list = [...pinnedAdmins, ...regularCitizens];

      if (!citizenSearch.trim()) return list;
      const q = citizenSearch.trim().toLowerCase();
      return list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.neighborhood.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }, [citizens, registeredUsersList, reports, citizenSearch, isSuperAdmin]);

    const regularCitizensList = useMemo(() => {
      return filteredCitizens.filter(
        (c) =>
          c.role !== 'admin' &&
          c.role !== 'super_admin'
      );
    }, [filteredCitizens]);

    const displayedCitizens = useMemo(() => {
      const pinnedAdminsList = filteredCitizens.filter(
        (c) =>
          c.role === 'admin' ||
          c.role === 'super_admin'
      );
      return [
        ...pinnedAdminsList,
        ...regularCitizensList.slice(0, adminVisibleCitizensCount),
      ];
    }, [filteredCitizens, regularCitizensList, adminVisibleCitizensCount]);

    const handleCreateDepartment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDeptName.trim()) return;
      playSuccessSound();
      const p1 = newPhone1.trim() || '07504738358';
      const waNum = formatWaNumberHelper(p1);

      addDepartment({
        nameAr: newDeptName.trim(),
        nameKu: newDeptName.trim(),
        nameEn: newDeptName.trim(),
        sector: newDeptSector,
        phone1: p1,
        phone1Owner:
          newPhone1Owner.trim() || tr('مسؤول التواصل', 'بەرپرسی پەیوەندی', 'Contact Official'),
        phone2: newPhone2.trim(),
        phone2Owner:
          newPhone2Owner.trim() || (newPhone2.trim() ? tr('مسؤول إضافي', 'بەرپرسی تر', 'Secondary Official') : ''),
        headName: newPhone1Owner.trim() || tr('مسؤول الدائرة', 'بەرپرسی فەرمانگە', 'Department Official'),
        fieldTeamName: `${tr('فرقة', 'تیمی', 'Team')} ${newDeptName.trim()}`,
        phone: p1,
        emergencyPhone: newPhone2.trim() || p1,
        whatsapp: waNum,
        whatsappPhone: waNum,
        availability: 'available',
        vehiclesCount: 4,
        activeTeamsCount: 3,
        workingHours: '08:00 AM - 04:00 PM',
        locationAr: tr('ناحية باعدرى', 'ناحیا باعەدرێ', 'Baadre District'),
      });

      setNewDeptName('');
      setNewPhone1('');
      setNewPhone1Owner('');
      setNewPhone2('');
      setNewPhone2Owner('');
      setIsAddDeptOpen(false);
    };

    const handleUpdateDepartment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingDept || !editDeptName.trim()) return;
      playSuccessSound();
      const p1 = editPhone1.trim() || '07504738358';
      const waNum = formatWaNumberHelper(p1);

      updateDepartment?.(editingDept.id, {
        nameAr: editDeptName.trim(),
        nameKu: editDeptName.trim(),
        nameEn: editDeptName.trim(),
        sector: editDeptSector,
        phone1: p1,
        phone1Owner: editPhone1Owner.trim() || tr('مسؤول التواصل', 'بەرپرسی پەیوەندی', 'Contact Official'),
        phone2: editPhone2.trim(),
        phone2Owner: editPhone2Owner.trim(),
        phone: p1,
        whatsapp: waNum,
        whatsappPhone: waNum,
      });

      setEditingDept(null);
    };

    return (
      <div className="space-y-4">
        {/* 1. شريط الأقسام الفرعية (2 Chips) */}
        <div className="p-2 rounded-3xl bg-white/95 shadow-[0_8px_24px_rgba(70,103,77,0.06)] flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setDirectoryChip('departments');
            }}
            className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              directoryChip === 'departments'
                ? 'bg-[#46674D] text-white shadow-xs'
                : 'bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{tr('الدوائر الخدمية', 'فەرمانگە خزمەتگوزارییەکان', 'Service Departments')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                directoryChip === 'departments'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#E8F4EA] text-[#1E3725]'
              }`}
            >
              {departments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setDirectoryChip('citizens');
            }}
            className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              directoryChip === 'citizens'
                ? 'bg-[#46674D] text-white shadow-xs'
                : 'bg-[#F4F9F5] text-[#2D4833] hover:bg-[#E8F4EA]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{tr('المواطنين المسجلين', 'هاوڵاتیانی تۆمارکراو', 'Registered Citizens')}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                directoryChip === 'citizens'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#E8F4EA] text-[#1E3725]'
              }`}
            >
              {citizens.length}
            </span>
          </button>
        </div>

        {/* 2. الشريط الذي تحت شريط الأقسام الفرعية */}
        <div className="p-2.5 rounded-3xl bg-white/95 shadow-[0_8px_24px_rgba(70,103,77,0.06)] flex items-center gap-2.5">
          {directoryChip === 'departments' ? (
            <>
              <div className="relative flex-1">
                <Search
                  className={`w-4 h-4 text-[#46674D] absolute ${
                    isRTL ? 'right-3.5' : 'left-3.5'
                  } top-1/2 -translate-y-1/2`}
                />
                <input
                  type="text"
                  maxLength={FIELD_LIMITS.SEARCH.maxChars}
                  value={deptSearch}
                  onChange={(e) =>
                    setDeptSearch(
                      enforceInputLimit(
                        e.target.value,
                        FIELD_LIMITS.SEARCH.maxWords,
                        FIELD_LIMITS.SEARCH.maxChars
                      )
                    )
                  }
                  placeholder={tr('ابحث...', 'بگەڕێ...', 'Search...')}
                  className={`w-full bg-[#F4F9F5] rounded-2xl ${
                    isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
                  } py-2.5 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/45 focus:outline-none`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setIsAddDeptOpen((prev) => !prev);
                }}
                title={tr('إضافة دائرة جديدة', 'زیادکردنی فەرمانگەی نوێ', 'Add New Department')}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#33553C] to-[#46674D] hover:brightness-110 text-white flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(70,103,77,0.25)] hover:scale-105 active:scale-95 transition-all cursor-pointer border-0 outline-none"
              >
                {isAddDeptOpen ? (
                  <X className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>
            </>
          ) : (
            <div className="relative w-full">
              <Search
                className={`w-4 h-4 text-[#46674D] absolute ${
                  isRTL ? 'right-3.5' : 'left-3.5'
                } top-1/2 -translate-y-1/2`}
              />
              <input
                type="text"
                maxLength={FIELD_LIMITS.SEARCH.maxChars}
                value={citizenSearch}
                onChange={(e) =>
                  setCitizenSearch(
                    enforceInputLimit(
                      e.target.value,
                      FIELD_LIMITS.SEARCH.maxWords,
                      FIELD_LIMITS.SEARCH.maxChars
                    )
                  )
                }
                placeholder={tr('ابحث...', 'بگەڕێ...', 'Search...')}
                className={`w-full bg-[#F4F9F5] rounded-2xl ${
                  isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
                } py-2.5 text-xs font-bold text-[#1E3725] placeholder-[#46674D]/45 focus:outline-none`}
              />
            </div>
          )}
        </div>

        {/* Chip 1 Content: الدوائر الخدمية */}
        {directoryChip === 'departments' && (
          <div className="space-y-4">
            {isAddDeptOpen && (
              <form
                onSubmit={handleCreateDepartment}
                className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-[#88B793] shadow-[0_14px_36px_rgba(70,103,77,0.12)] space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#BBDDC6]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#E8F4EA] border border-[#88B793] text-[#46674D] flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-[#1E3725]">
                        {tr(
                          'إضافة دائرة خدمية جديدة',
                          'زیادکردنی فەرمانگەی خزمەتگوزاری نوێ',
                          'Add New Service Department'
                        )}
                      </h4>
                      <p className="text-[11px] text-[#46674D] font-bold">
                        {tr(
                          'أرقام التواصل: رقم دائرة 1 ورقم دائرة 2 مع أسماء أصحاب الأرقام للإحالة المباشرة',
                          'ژمارەی پەیوەندی: ژمارەی فەرمانگە ١ و ژمارەی فەرمانگە ٢ لەگەڵ ناوی خاوەنەکان',
                          'Contact Numbers: Department 1 and Department 2 with owner names'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Row 1: Department Name & Sector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-black text-[#1E3725]">
                        {tr('اسم الدائرة *', 'ناوی فەرمانگە *', 'Department Name *')}
                      </label>
                      <FieldLimitBadge
                        value={newDeptName}
                        maxWords={FIELD_LIMITS.DEPT_NAME.maxWords}
                        maxChars={FIELD_LIMITS.DEPT_NAME.maxChars}
                      />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={FIELD_LIMITS.DEPT_NAME.maxChars}
                      value={newDeptName}
                      onChange={(e) =>
                        setNewDeptName(
                          enforceInputLimit(
                            e.target.value,
                            FIELD_LIMITS.DEPT_NAME.maxWords,
                            FIELD_LIMITS.DEPT_NAME.maxChars
                          )
                        )
                      }
                      placeholder={tr(
                        'مثال: مديرية ماء ناحية باعدرى',
                        'نموونە: بەڕێوەبەرایەتی ئاوی باعەدرێ',
                        'e.g. Baadre Water Directorate'
                      )}
                      className="w-full bg-[#F4F9F5] border-2 border-[#BBDDC6] focus:border-[#46674D] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#1E3725] mb-1.5">
                      {tr('القطاع الخدمي للدائرة', 'کەرتی خزمەتگوزاری فەرمانگە', 'Service Sector')}
                    </label>
                    <select
                      value={newDeptSector}
                      onChange={(e) => setNewDeptSector(e.target.value as ReportSector)}
                      className="w-full bg-[#F4F9F5] border-2 border-[#BBDDC6] focus:border-[#46674D] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors"
                    >
                      {Object.values(SECTOR_META).map((sec) => (
                        <option key={sec.key} value={sec.key}>
                          {sec.badgeEmoji} {getSectorLabel(sec.key)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2 Contact Numbers only: رقم دائرة 1 ورقم دائرة 2 مع أصحاب الأرقام */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* بيانات المسؤول وهاتف الدائرة (رقم واحد فقط للدائرة) */}
                  <div className="p-4 rounded-2xl bg-[#F4F9F5] border-2 border-[#BBDDC6] space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="block text-[11px] font-bold text-[#46674D]">
                          {tr('الاسم / مسؤول التواصل *', 'ناو / بەرپرسی پەیوەندی *', 'Name / Contact Official *')}
                        </label>
                        <FieldLimitBadge
                          value={newPhone1Owner}
                          maxWords={FIELD_LIMITS.NAME.maxWords}
                          maxChars={FIELD_LIMITS.NAME.maxChars}
                        />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={FIELD_LIMITS.NAME.maxChars}
                        value={newPhone1Owner}
                        onChange={(e) =>
                          setNewPhone1Owner(
                            enforceInputLimit(
                              e.target.value,
                              FIELD_LIMITS.NAME.maxWords,
                              FIELD_LIMITS.NAME.maxChars
                            )
                          )
                        }
                        placeholder={tr('مثال: المهندس أحمد / مسؤول الدائرة', 'نموونە: ئەندازیار ئەحمەد', 'e.g. Eng. Ahmed')}
                        className="w-full bg-white border border-[#88B793] focus:border-[#46674D] rounded-xl px-3.5 py-2 text-xs font-bold text-[#1E3725] focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="block text-[11px] font-bold text-[#46674D]">
                          {tr('رقم الهاتف / الواتساب *', 'ژمارەی تەلەفۆن / واتسئەپ *', 'Phone / WhatsApp *')}
                        </label>
                        <FieldLimitBadge
                          value={newPhone1}
                          maxWords={FIELD_LIMITS.PHONE.maxWords}
                          maxChars={FIELD_LIMITS.PHONE.maxChars}
                          isPhone
                        />
                      </div>
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        maxLength={FIELD_LIMITS.PHONE.maxChars}
                        value={newPhone1}
                        onChange={(e) =>
                          setNewPhone1(
                            enforcePhoneLimit(e.target.value, FIELD_LIMITS.PHONE.maxChars)
                          )
                        }
                        placeholder="0750XXXXXXX"
                        className="w-full bg-white border border-[#88B793] focus:border-[#46674D] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-[#1E3725] text-right focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#BBDDC6]">
                  <button
                    type="button"
                    onClick={() => setIsAddDeptOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#F4F9F5] border border-[#BBDDC6] text-[#2D4833] text-xs font-black hover:bg-[#E8F4EA] cursor-pointer"
                  >
                    {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {tr(
                        'حفظ وإضافة الدائرة',
                        'پاشەکەوتکردن و زیادکردنی فەرمانگە',
                        'Save & Add Department'
                      )}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* نافذة تعديل بيانات الدائرة (الاسم، القطاع، والأرقام وأصحابها) */}
            {editingDept &&
              createPortal(
                <div
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pb-28 sm:pb-6 overflow-y-auto"
                  onClick={() => setEditingDept(null)}
                >
                  <form
                    onSubmit={handleUpdateDepartment}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg max-h-[82vh] flex flex-col rounded-3xl bg-white border-2 border-[#88B793] shadow-2xl overflow-hidden text-start my-auto"
                  >
                    <div className="p-4 sm:p-5 flex items-center justify-between pb-3 border-b border-[#BBDDC6] shrink-0 bg-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-[#1E3725]">
                            {tr('تعديل بيانات الدائرة', 'دەستکاری زانیاری فەرمانگە', 'Edit Department')}
                          </h4>
                          <p className="text-[11px] font-bold text-[#46674D]">
                            {tr('تحديث اسم الدائرة وأرقام التواصل وأصحابها بدقة', 'نوێکردنەوەی ژمارەکان و خاوەنەکانیان', 'Update department and contacts accurately')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingDept(null)}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black text-[#1E3725] mb-1">
                            {tr('اسم الدائرة *', 'ناوی فەرمانگە *', 'Department Name *')}
                          </label>
                          <input
                            type="text"
                            required
                            value={editDeptName}
                            onChange={(e) => setEditDeptName(e.target.value)}
                            className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3 py-2 text-xs font-bold text-[#1E3725] focus:outline-none focus:border-[#46674D]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black text-[#1E3725] mb-1">
                            {tr('القطاع الخدمي', 'کەرتی خزمەتگوزاری', 'Sector')}
                          </label>
                          <select
                            value={editDeptSector}
                            onChange={(e) => setEditDeptSector(e.target.value as ReportSector)}
                            className="w-full bg-[#F4F9F5] border border-[#BBDDC6] rounded-xl px-3 py-2 text-xs font-bold text-[#1E3725] focus:outline-none focus:border-[#46674D]"
                          >
                            {Object.values(SECTOR_META).map((sec) => (
                              <option key={sec.key} value={sec.key}>
                                {sec.badgeEmoji} {getSectorLabel(sec.key)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#F4F9F5] border border-[#BBDDC6] space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                            {tr('الاسم / مسؤول التواصل *', 'ناو / بەرپرسی پەیوەندی *', 'Name / Contact Official *')}
                          </label>
                          <input
                            type="text"
                            required
                            value={editPhone1Owner}
                            onChange={(e) => setEditPhone1Owner(e.target.value)}
                            className="w-full bg-white border border-[#88B793] rounded-lg px-3 py-2 text-xs font-bold text-[#1E3725]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#46674D] mb-1">
                            {tr('رقم الهاتف / الواتساب *', 'ژمارەی تەلەفۆن / واتسئەپ *', 'Phone / WhatsApp *')}
                          </label>
                          <input
                            type="tel"
                            required
                            dir="ltr"
                            value={editPhone1}
                            onChange={(e) => setEditPhone1(enforcePhoneLimit(e.target.value, 15))}
                            className="w-full bg-white border border-[#88B793] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#1E3725] text-right"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 sm:p-4 bg-[#F4F9F5] border-t border-[#BBDDC6] flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingDept(null)}
                        className="px-4 py-2 rounded-xl bg-white border border-[#BBDDC6] text-slate-700 text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>{tr('حفظ التعديلات', 'پاشەکەوتکردن', 'Save Changes')}</span>
                      </button>
                    </div>
                  </form>
                </div>,
                document.body
              )}

            {/* كروت الدوائر على شكل أكورديون تفاعلي */}
            <div
              dir={isRTL ? 'rtl' : 'ltr'}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredDepartments.map((dept) => {
                const completedCount = getDepartmentCompletedCount(dept);

                return (
                  <DepartmentAccordionCard
                    key={dept.id}
                    dept={dept}
                    isRTL={isRTL}
                    tr={tr}
                    completedCount={completedCount}
                    displayName={getDeptDisplayName(dept)}
                    formatWaNumber={formatWaNumberHelper}
                    onDeleteDept={(d) => setDeptToDelete(d)}
                    onEditDept={openEditDeptModal}
                  />
                );
              })}
            </div>

            {/* نافذة تأكيد حذف الدائرة */}
            {deptToDelete && (
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                onClick={() => setDeptToDelete(null)}
                className="fixed inset-0 z-[170] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-3xl bg-white border border-rose-200 shadow-2xl p-6 text-center space-y-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-black text-[#1E3725]">
                      {tr(
                        'تأكيد حذف الدائرة',
                        'پشتڕاستکردنەوەی سڕینەوەی فەرمانگە',
                        'Confirm Delete Department'
                      )}
                    </h4>
                    <p className="text-xs font-bold text-[#46674D] leading-relaxed">
                      {tr(
                        'هل أنت متأكد من حذف هذه الدائرة الخدمية من الدليل؟',
                        'ئایا دڵنیایت لە سڕینەوەی ئەم فەرمانگەیە؟',
                        'Are you sure you want to delete this department?'
                      )}
                    </p>
                    <p className="text-xs font-black text-rose-700">
                      {getDeptDisplayName(deptToDelete)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        deleteDepartment(deptToDelete.id);
                        setDeptToDelete(null);
                      }}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer transition-colors shadow-xs"
                    >
                      {tr('نعم، حذف الدائرة', 'بەڵێ، سڕینەوە', 'Yes, Delete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeptToDelete(null)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#F4F9F5] hover:bg-[#E8F4EA] text-[#2D4833] font-bold text-xs cursor-pointer transition-colors"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chip 2 Content: المواطنين المسجلين في التطبيق */}
        {directoryChip === 'citizens' && (
          <div className="space-y-4">
            {filteredCitizens.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white/95 text-center space-y-2 shadow-[0_8px_26px_rgba(70,103,77,0.06)]">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F4EA] text-[#46674D] flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-black text-[#1E3725]">
                  {tr(
                    'لا يوجد مواطنون مسجلون مطابقون للبحث',
                    'هیچ هاووڵاتییەکی تۆمارکراو نەدۆزرایەوە',
                    'No registered citizens found'
                  )}
                </p>
              </div>
            ) : (
              <>
                <div
                  dir={isRTL ? 'rtl' : 'ltr'}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {displayedCitizens.map((cit) => (
                    <CitizenAccordionCard
                      key={cit.uid || (cit as any).id}
                      cit={cit}
                      currentUser={currentUser}
                      isAdmin={isAdmin}
                      isSuperAdmin={isSuperAdmin}
                      isRTL={isRTL}
                      tr={tr}
                      onSelectForRole={onSelectForRole}
                      onGrantAdminDirect={onGrantAdminDirect}
                      onRevertCitizenDirect={onRevertCitizenDirect}
                      onSelectForRecovery={onSelectForRecovery}
                      onToggleBlock={toggleBlockCitizen}
                      onDeleteCitizen={onDeleteCitizen}
                    />
                  ))}
                </div>

                {regularCitizensList.length > adminVisibleCitizensCount && (
                  <div className="flex items-center justify-center pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setAdminVisibleCitizensCount((prev) => prev + 5);
                      }}
                      className="px-6 py-2.5 rounded-2xl bg-[#46674D] text-white font-black text-xs inline-flex items-center gap-2 hover:bg-[#33553C] transition-all cursor-pointer shadow-sm border-0"
                    >
                      <span>
                        {tr(
                          `عرض المزيد من المواطنين (+5 مواطنين) — تم عرض ${Math.min(adminVisibleCitizensCount, regularCitizensList.length)} من ${regularCitizensList.length}`,
                          `پیشاندانی هاووڵاتی زیاتر (+٥)`,
                          `Show More Citizens (+5)`
                        )}
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);
