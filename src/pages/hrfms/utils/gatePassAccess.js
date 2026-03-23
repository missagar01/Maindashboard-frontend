export const HOD_APPROVAL_DEPARTMENTS = {
  deepakbhalla: ['SMS ELECTRICAL'],
  s05777: ['SMS ELECTRICAL'],
  tejbahadur: ['SMS MAINTENANCE'],
  s00658: ['SMS MAINTENANCE'],
  danveersingh: ['CCM ELECTRICAL', 'STRIP MILL ELECTRICAL'],
  s00510: ['CCM ELECTRICAL', 'STRIP MILL ELECTRICAL'],
  shrirampatle: ['STRIP MILL MAINTENANCE'],
  s00061: ['STRIP MILL MAINTENANCE'],
  sparshjha: ['STRIP MILL PRODUCTION'],
  s03942: ['STRIP MILL PRODUCTION'],
  rohan: ['PIPE MILL ELECTRICAL'],
  s00037: ['PIPE MILL ELECTRICAL'],
  dhanjiyadav: ['WORKSHOP'],
  s02725: ['WORKSHOP'],
  anupbopche: ['PIPE MILL MAINTENANCE'],
  s00019: ['PIPE MILL MAINTENANCE'],
  hulas: ['PIPE MILL PRODUCTION'],
  s00045: ['PIPE MILL PRODUCTION'],
  mantuanandghosh: ['PIPE MILL PRODUCTION'],
  s04578: ['PIPE MILL PRODUCTION'],
  kavisingh: ['PIPE MILL PRODUCTION'],
  s09505: ['PIPE MILL PRODUCTION'],
  ravisingh: ['PIPE MILL PRODUCTION'],
  s00151: ['PIPE MILL PRODUCTION'],
  grammohanrao: ['PIPE MILL PRODUCTION'],
  s00016: ['PIPE MILL PRODUCTION'],
  mukeshpatle: ['LAB & QUALITY CONTROL'],
  s08547: ['LAB & QUALITY CONTROL'],
  krameshkumar: ['PC'],
  s09578: ['PC'],
  dcgoutam: ['DISPATCH', 'INWARD'],
  dcgautam: ['DISPATCH', 'INWARD'],
  s00006: ['DISPATCH', 'INWARD'],
  anilmishra: ['CRM', 'MARKETING'],
  s00143: ['CRM', 'MARKETING'],
  dineshbandhe: ['PROJECT'],
  s08377: ['PROJECT'],
  ambikapandey: ['TRANSPORT'],
  s08472: ['TRANSPORT'],
  jhaneshwarsahu: ['SECURITY'],
  s09698: ['SECURITY'],
  manishkurrey: ['SECURITY'],
  s00256: ['SECURITY'],
  amittiwari: ['STORE', 'PURCHASE', 'AUTOMATION', 'HR', 'ADMIN', 'CRUSHER', 'WB'],
};

export const MANAGER_APPROVAL_DEPARTMENTS = {
  ajitkumargupta: ['SMS ELECTRICAL', 'SMS MAINTENANCE', 'PROJECT'],
  shaileshchitre: [
    'CCM ELECTRICAL',
    'STRIP MILL ELECTRICAL',
    'STRIP MILL MAINTENANCE',
    'STRIP MILL PRODUCTION',
    'WORKSHOP',
  ],
  birbal: ['PIPE MILL ELECTRICAL', 'PIPE MILL MAINTENANCE', 'PIPE MILL PRODUCTION'],
  amittiwari: [
    'LAB & QUALITY CONTROL',
    'STORE',
    'PURCHASE',
    'PC',
    'AUTOMATION',
    'HR',
    'DISPATCH',
    'INWARD',
    'ADMIN',
    'CRM',
    'MARKETING',
    'CRUSHER',
    'TRANSPORT',
    'SECURITY',
    'WB',
  ],
};

export const normalizeDepartment = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeLookupKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

const normalizeTextKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizePhone = (value) => String(value || '').replace(/\D+/g, '');

export const getGatePassReviewAccess = (user) => {
  const lookupKeys = Array.from(
    new Set(
      [
        user?.user_name,
        user?.username,
        user?.employee_name,
        user?.Name,
        user?.employee_id,
      ]
        .map((value) => normalizeLookupKey(value))
        .filter(Boolean)
    )
  );

  for (const key of lookupKeys) {
    const departments = MANAGER_APPROVAL_DEPARTMENTS[key];
    if (departments) {
      return {
        role: 'hod',
        departments: [...departments],
      };
    }
  }

  for (const key of lookupKeys) {
    const departments = HOD_APPROVAL_DEPARTMENTS[key];
    if (departments) {
      return {
        role: 'hod',
        departments: [...departments],
      };
    }
  }

  return {
    role: 'none',
    departments: [],
  };
};

export const doesGatePassBelongToUser = (gatePass, user) => {
  const userMobile = normalizePhone(
    user?.number ||
      user?.mobile_number ||
      user?.mobilenumber ||
      user?.mobile ||
      user?.phone ||
      ''
  );
  const gatePassMobile = normalizePhone(gatePass?.mobile_number);

  if (userMobile && gatePassMobile) {
    return userMobile === gatePassMobile;
  }

  const userName = normalizeTextKey(
    user?.user_name ||
      user?.employee_name ||
      user?.username ||
      user?.Name ||
      ''
  );
  const userDepartment = normalizeDepartment(user?.department || user?.Department || '');
  const gatePassName = normalizeTextKey(gatePass?.name);
  const gatePassDepartment = normalizeDepartment(gatePass?.department);

  return Boolean(
    userName &&
      userDepartment &&
      gatePassName === userName &&
      gatePassDepartment === userDepartment
  );
};
