// مجوزهای ریزدانه برای کارکنان. مالک (owner) همیشه به همه چیز دسترسی دارد.
export const PERMISSIONS = {
  PRODUCTS_READ: 'products.read',
  PRODUCTS_WRITE: 'products.write',
  INVENTORY_MANAGE: 'inventory.manage',
  SALES_CREATE: 'sales.create',
  SALES_VOID: 'sales.void', // ابطال و ویرایش فاکتورهای ثبت‌شده
  PURCHASES_CREATE: 'purchases.create',
  PARTIES_READ: 'parties.read',
  PARTIES_WRITE: 'parties.write',
  CHEQUES_MANAGE: 'cheques.manage',
  RECIPES_MANAGE: 'recipes.manage',
  REPORTS_VIEW: 'reports.view',
  REMINDERS_MANAGE: 'reminders.manage',
  VOICE_USE: 'voice.use',
  STAFF_MANAGE: 'staff.manage',
  SETTINGS_MANAGE: 'settings.manage',
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

// مجوزهایی که مالک می‌تواند به کارمند بدهد (مدیریت کارکنان فقط برای مالک است)
export const ASSIGNABLE_PERMISSIONS = ALL_PERMISSIONS.filter((p) => p !== PERMISSIONS.STAFF_MANAGE);

const P = PERMISSIONS;
export const ROLE_PRESETS = {
  cashier: [P.PRODUCTS_READ, P.SALES_CREATE, P.PARTIES_READ, P.VOICE_USE],
  warehouse: [P.PRODUCTS_READ, P.PRODUCTS_WRITE, P.INVENTORY_MANAGE, P.PURCHASES_CREATE, P.PARTIES_READ],
  manager: ASSIGNABLE_PERMISSIONS,
};
