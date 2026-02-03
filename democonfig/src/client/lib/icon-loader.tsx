/**
 * Dynamic Icon Loader using React Icons
 *
 * Uses Heroicons 2 for clean, modern icons.
 * Browse icons: https://react-icons.github.io/react-icons/
 */

import * as HeroIcons from 'react-icons/hi2';

interface IconProps {
  name: string;
  className?: string;
  size?: number | string;
}

// Map common icon names to Heroicons 2
const ICON_MAP: Record<string, keyof typeof HeroIcons> = {
  // Navigation
  LayoutDashboard: 'HiSquares2X2',
  House: 'HiHome',
  Home: 'HiHome',
  Menu: 'HiBars3',

  // People
  Users: 'HiUsers',
  User: 'HiUser',
  UserCircle: 'HiUserCircle',
  UserPlus: 'HiUserPlus',
  UserMinus: 'HiUserMinus',

  // Organization
  Building2: 'HiBuildingOffice2',
  Building: 'HiBuildingOffice',
  Briefcase: 'HiBriefcase',

  // Finance
  DollarSign: 'HiBanknotes',
  CreditCard: 'HiCreditCard',
  TrendingUp: 'HiArrowTrendingUp',
  TrendingDown: 'HiArrowTrendingDown',
  ChartColumn: 'HiChartBar',
  BarChart: 'HiChartBar',
  ChartBar: 'HiChartBar',
  ChartPie: 'HiChartPie',

  // Actions
  Plus: 'HiPlus',
  Edit: 'HiPencil',
  Trash2: 'HiTrash',
  Save: 'HiCheckCircle',
  Download: 'HiArrowDownTray',
  Upload: 'HiArrowUpTray',
  Copy: 'HiDocumentDuplicate',
  Check: 'HiCheck',
  X: 'HiXMark',

  // Files
  FileText: 'HiDocument',
  File: 'HiDocumentText',
  FolderOpen: 'HiFolderOpen',
  Folder: 'HiFolder',

  // Time
  Calendar: 'HiCalendar',
  Clock: 'HiClock',
  Timer: 'HiClock',

  // Status
  CircleCheck: 'HiCheckCircle',
  CheckCircle: 'HiCheckCircle',
  CircleX: 'HiXCircle',
  XCircle: 'HiXCircle',
  CircleAlert: 'HiExclamationCircle',
  AlertCircle: 'HiExclamationCircle',
  Info: 'HiInformationCircle',
  AlertTriangle: 'HiExclamationTriangle',
  Star: 'HiStar',

  // Other
  Settings: 'HiCog6Tooth',
  LogOut: 'HiArrowRightOnRectangle',
  Search: 'HiMagnifyingGlass',
  Filter: 'HiFunnel',
};

/**
 * Dynamic icon component using React Icons (Heroicons 2).
 */
export function Icon({ name, className, size }: IconProps) {
  const mappedName = ICON_MAP[name];
  const iconName = mappedName || name;
  const IconComponent = (HeroIcons as any)[iconName];

  if (!IconComponent) {
    // Return empty span instead of fallback icon
    return <span className={className} data-missing-icon={name} />;
  }

  return <IconComponent className={className} size={size} />;
}

/**
 * Get all available icon names.
 */
export function getAvailableIcons(): string[] {
  return [...Object.keys(ICON_MAP), ...Object.keys(HeroIcons)];
}

/**
 * Helper to get an icon component by name.
 */
export function getIcon(name?: string): any {
  if (!name) return undefined;
  const mappedName = ICON_MAP[name as keyof typeof ICON_MAP];
  const iconName = mappedName || name;
  return (HeroIcons as any)[iconName];
}
