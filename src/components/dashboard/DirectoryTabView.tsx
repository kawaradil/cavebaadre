import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Search,
  AlertTriangle,
  Check,
  Users,
  Plus,
  X,
} from 'lucide-react';
import { AdminCitizenDTO } from '../../types/dto';
import {
  SECTOR_META,
  ReportSector,
  MunicipalDepartment,
} from '../../types/baadre';
import { OFFICIAL_PHONE_LOCAL, toWhatsAppIntlNumber } from '../../constants/officialContact';
import {
  FIELD_LIMITS,
  enforceInputLimit,
  enforcePhoneLimit,
  FieldLimitBadge,
} from '../../lib/inputLimits';
import { playClickSound, playSuccessSound } from '../../lib/sound';
import { CitizenAccordionCard, DepartmentAccordionCard } from './AccordionCards';

export interface DirectoryTabViewProps {
  isRTL: boolean;
  currentUser: any;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  departments: MunicipalDepartment[];
  filteredDepartments: MunicipalDepartment[];
  deptSearch: string;
  setDeptSearch: (val: string) => void;
  citizensCount: number;
  filteredCitizens: AdminCitizenDTO[];
  displayedCitizens: AdminCitizenDTO[];
  regularCitizensCount: number;
  adminVisibleCitizensCount: number;
  setAdminVisibleCitizensCount: React.Dispatch<React.SetStateAction<number>>;
  citizenSearch: string;
  setCitizenSearch: (val: string) => void;
  tr: (ar: string, ku: string, en: string) => string;
  getSectorLabel: (secKey: ReportSector) => string;
  getDeptDisplayName: (dept: MunicipalDepartment) => string;
  getDepartmentCompletedCount: (dept: MunicipalDepartment) => number;
  addDepartment: (dept: Omit<MunicipalDepartment, 'id'>) => void;
  updateDepartment: (id: string, updates: Partial<MunicipalDepartment>) => void;
  deleteDepartment: (id: string) => void;
  onSelectForRole: (cit: AdminCitizenDTO) => void;
  onGrantAdminDirect: (cit: AdminCitizenDTO) => void;
  onRevertCitizenDirect: (cit: AdminCitizenDTO) => void;
  onSelectForRecovery: (cit: AdminCitizenDTO) => void;
  onToggleBlockCitizen: (citId: string) => void;
  onRequestDeleteCitizen: (cit: AdminCitizenDTO) => void;
}

export const DirectoryTabView: React.FC<DirectoryTabViewProps> = ({
  isRTL,
  currentUser,
  isAdmin,
  isSuperAdmin,
  departments,
  filteredDepartments,
  deptSearch,
  setDeptSearch,
  citizensCount,
  filteredCitizens,
  displayedCitizens,
  regularCitizensCount,
  adminVisibleCitizensCount,
  setAdminVisibleCitizensCount,
  citizenSearch,
  setCitizenSearch,
  tr,
  getSectorLabel,
  getDeptDisplayName,
  getDepartmentCompletedCount,
  addDepartment,
  updateDepartment,
  deleteDepartment,
  onSelectForRole,
  onGrantAdminDirect,
  onRevertCitizenDirect,
  onSelectForRecovery,
  onToggleBlockCitizen,
  onRequestDeleteCitizen,
}) => {
  const [directoryChip, setDirectoryChip] = useState<'departments' | 'citizens'>('departments');

  // Add Department Form State
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptSector, setNewDeptSector] = useState<ReportSector>('roads');
  const [newPhone1, setNewPhone1] = useState('');
  const [newPhone1Owner, setNewPhone1Owner] = useState('');
  const [newPhone2, setNewPhone2] = useState('');
  const [newPhone2Owner, setNewPhone2Owner] = useState('');

  // Edit & Delete Department State
  const [editingDept, setEditingDept] = useState<MunicipalDepartment | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptSector, setEditDeptSector] = useState<ReportSector>('roads');
  const [editPhone1, setEditPhone1] = useState('');
  const [editPhone1Owner, setEditPhone1Owner] = useState('');
  const [editPhone2, setEditPhone2] = useState('');
  const [editPhone2Owner, setEditPhone2Owner] = useState('');
  const [deptToDelete, setDeptToDelete] = useState<MunicipalDepartment | null>(null);

  const openEditDeptModal = (dept: MunicipalDepartment) => {
    setEditingDept(dept);
    setEditDeptName(dept.nameAr || dept.name || '');
    setEditDeptSector(dept.sector || 'roads');
    setEditPhone1(dept.phone1 || dept.engineerPhone || dept.phone || '');
    setEditPhone1Owner(dept.phone1Owner || dept.engineerName || dept.headName || '');
    setEditPhone2(dept.phone2 || dept.managerPhone || dept.deputyPhone || '');
    setEditPhone2Owner(dept.phone2Owner || dept.managerName || dept.deputyName || '');
  };

  const handleCreateDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    playSuccessSound();
    const p1 = newPhone1.trim() || OFFICIAL_PHONE_LOCAL;
    const waNum = toWhatsAppIntlNumber(p1);

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
        newPhone2Owner.trim() ||
        (newPhone2.trim() ? tr('مسؤول إضافي', 'بەرپرسی تر', 'Secondary Official') : ''),
      headName:
        newPhone1Owner.trim() || tr('مسؤول الدائرة', 'بەرپرسی فەرمانگە', 'Department Official'),
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
    const p1 = editPhone1.trim() || OFFICIAL_PHONE_LOCAL;
    const waNum = toWhatsAppIntlNumber(p1);

    updateDepartment(editingDept.id, {
      nameAr: editDeptName.trim(),
      nameKu: editDeptName.trim(),
      nameEn: editDeptName.trim(),
      sector: editDeptSector,
      phone1: p1,
      phone1Owner:
        editPhone1Owner.trim() || tr('مسؤول التواصل', 'بەرپرسی پەیوەندی', 'Contact Official'),
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
            {citizensCount}
          </span>
        </button>
      </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#F4F9F5] border-2 border-[#BBDDC6] space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label className="block text-[11px] font-bold text-[#46674D]">
                        {tr(
                          'الاسم / مسؤول التواصل *',
                          'ناو / بەرپرسی پەیوەندی *',
                          'Name / Contact Official *'
                        )}
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
                      placeholder={tr(
                        'مثال: المهندس أحمد / مسؤول الدائرة',
                        'نموونە: ئەندازیار ئەحمەد',
                        'e.g. Eng. Ahmed'
                      )}
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
                          {tr(
                            'تعديل بيانات الدائرة',
                            'دەستکاری زانیاری فەرمانگە',
                            'Edit Department'
                          )}
                        </h4>
                        <p className="text-[11px] font-bold text-[#46674D]">
                          {tr(
                            'تحديث اسم الدائرة وأرقام التواصل وأصحابها بدقة',
                            'نوێکردنەوەی ژمارەکان و خاوەنەکانیان',
                            'Update department and contacts accurately'
                          )}
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
                          {tr(
                            'الاسم / مسؤول التواصل *',
                            'ناو / بەرپرسی پەیوەندی *',
                            'Name / Contact Official *'
                          )}
                        </label>
                        <input
                          type="text"
                          required
                          value={editPhone1Owner}
                          onChange={(e) => setEditPhone1Owner(e.target.value)}
                          className="w-full bg-white border border-[#88B793] rounded-lg px-3 py-2 text-xs font-bold text-[#1E3725] focus:outline-none focus:border-[#46674D]"
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
                          className="w-full bg-white border border-[#88B793] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#1E3725] text-right focus:outline-none focus:border-[#46674D]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 flex items-center justify-end gap-2 border-t border-[#BBDDC6] shrink-0 bg-[#F4F9F5]">
                    <button
                      type="button"
                      onClick={() => setEditingDept(null)}
                      className="px-4 py-2 rounded-xl bg-white border border-[#BBDDC6] text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      {tr('إلغاء', 'پاشگەزبوونەوە', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#46674D] hover:bg-[#36593F] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>{tr('حفظ التعديلات', 'پاشەکەوتکردن', 'Save Changes')}</span>
                    </button>
                  </div>
                </form>
              </div>,
              document.body
            )}

          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredDepartments.map((dept) => (
              <DepartmentAccordionCard
                key={dept.id}
                dept={dept}
                isRTL={isRTL}
                tr={tr}
                completedCount={getDepartmentCompletedCount(dept)}
                displayName={getDeptDisplayName(dept)}
                formatWaNumber={toWhatsAppIntlNumber}
                onDeleteDept={(d) => setDeptToDelete(d)}
                onEditDept={openEditDeptModal}
              />
            ))}
          </div>

          {deptToDelete &&
            createPortal(
              <div
                dir={isRTL ? 'rtl' : 'ltr'}
                onClick={() => setDeptToDelete(null)}
                className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 pb-20 sm:pb-4"
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
              </div>,
              document.body
            )}
        </div>
      )}

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
                    onToggleBlock={onToggleBlockCitizen}
                    onDeleteCitizen={onRequestDeleteCitizen}
                  />
                ))}
              </div>

              {regularCitizensCount > adminVisibleCitizensCount && (
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
                        `عرض المزيد من المواطنين (+5 مواطنين) — تم عرض ${Math.min(
                          adminVisibleCitizensCount,
                          regularCitizensCount
                        )} من ${regularCitizensCount}`,
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
};
