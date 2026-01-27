import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  DollarSign,
  Receipt,
  FileText,
  Star,
  Clock,
  Calendar,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '../components/ui/sidebar';
import { Button } from '../components/ui/button';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Employee Data',
    items: [
      { label: 'Employees', path: '/employees', icon: <Users className="h-4 w-4" /> },
      { label: 'Departments', path: '/departments', icon: <Building2 className="h-4 w-4" /> },
      { label: 'Positions', path: '/positions', icon: <Briefcase className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Payroll',
    items: [
      { label: 'Payroll Runs', path: '/payroll', icon: <DollarSign className="h-4 w-4" /> },
      { label: 'Salary Structures', path: '/payroll/structures', icon: <Receipt className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Talent Management',
    items: [
      { label: 'Job Postings', path: '/talent/jobs', icon: <FileText className="h-4 w-4" /> },
      { label: 'Performance Reviews', path: '/talent/reviews', icon: <Star className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Workforce',
    items: [
      { label: 'Attendance', path: '/workforce/attendance', icon: <Clock className="h-4 w-4" /> },
      { label: 'Leave Management', path: '/workforce/leave', icon: <Calendar className="h-4 w-4" /> },
    ],
  },
];

function SidebarNavContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">HRM System</span>
            <span className="text-xs text-muted-foreground">Human Resources</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="flex flex-col gap-4">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <div className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </div>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      icon={item.icon}
                      isActive={isActive(item.path)}
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </div>
          ))}
        </div>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{user?.name || 'User'}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.email || ''}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <SidebarNavContent />
      <main className="flex-1 overflow-auto">
        <div className="flex h-14 items-center border-b px-4">
          <SidebarTrigger />
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
