import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  DollarSign,
  UserCheck,
  Calendar,
  FileText,
  Star,
  Clock,
  Settings,
  Shield,
  Home,
  BarChart,
  Award,
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
import { useNavigationMenu } from '../app';
import { useAppConfig } from '../lib/app-config';
import type { NavCategory } from '../lib/config-loader';

// Icon registry: maps icon name strings from config to Lucide React components.
// To add a new icon, just add it here and reference the name in apps.json.
const iconRegistry: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  DollarSign,
  UserCheck,
  Calendar,
  FileText,
  Star,
  Clock,
  Settings,
  Shield,
  Home,
  BarChart,
  Award,
};

function getIcon(name?: string): React.ComponentType<{ className?: string }> | undefined {
  if (!name) return undefined;
  return iconRegistry[name];
}

function SidebarNavContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { menu, loading: menuLoading } = useNavigationMenu();
  const { app, loading: appLoading } = useAppConfig();

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
            <span className="text-sm">{app?.logo || '👥'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {appLoading ? 'Loading...' : (app?.name || 'System')}
            </span>
            <span className="text-xs text-muted-foreground">
              {appLoading ? '' : (app?.subtitle || '')}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuLoading || appLoading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Loading navigation...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {(menu as NavCategory[]).map((navCategory) => {
              const CategoryIcon = getIcon(navCategory.icon);
              return (
                <div key={navCategory.id}>
                  <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {CategoryIcon && <CategoryIcon className="h-3 w-3" />}
                    <span>{navCategory.title}</span>
                  </div>
                  <SidebarMenu>
                    {navCategory.items.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive(item.path)}
                          onClick={() => navigate(item.path)}
                        >
                          {item.title}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              );
            })}
          </div>
        )}
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
