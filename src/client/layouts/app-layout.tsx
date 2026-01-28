import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import { Icon } from '../lib/icon-loader';
import { ThemeToggle } from '../lib/theme-provider';
import type { NavCategory } from '../lib/config-loader';

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

  const branding = app?.branding;
  const iconConfig = app?.icons;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.companyName || 'Logo'}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm">{branding?.logo || app?.name?.charAt(0) || '👥'}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {appLoading ? 'Loading...' : (app?.name || 'System')}
            </span>
            {(app?.subtitle || branding?.tagline) && (
              <span className="text-xs text-muted-foreground">
                {appLoading ? '' : (app?.subtitle || branding?.tagline || '')}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuLoading || appLoading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Loading navigation...</div>
        ) : (
          <div className="flex flex-col gap-4">
            {(menu as NavCategory[]).map((navCategory) => (
              <div key={navCategory.id}>
                <div className="mb-1 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon
                    name={navCategory.icon}
                    library={navCategory.iconLibrary as any || iconConfig?.library}
                    className="h-3 w-3"
                  />
                  <span>{navCategory.title}</span>
                </div>
                <SidebarMenu>
                  {navCategory.items.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive(item.path)}
                        onClick={() => navigate(item.path)}
                        icon={
                          item.icon ? (
                            <Icon
                              name={item.icon}
                              library={item.iconLibrary as any || iconConfig?.library}
                              className="h-4 w-4"
                            />
                          ) : undefined
                        }
                      >
                        {item.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
            ))}
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
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleLogout}
            title="Sign out"
          >
            <Icon name="LogOut" className="h-4 w-4" />
          </Button>
        </div>
        {branding?.showPoweredBy && (
          <div className="mt-2 px-3 text-xs text-muted-foreground">
            Powered by JSON Config System
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout() {
  const { app } = useAppConfig();
  const layout = app?.layout;

  // Support different layout types
  if (layout?.type === 'topnav') {
    // Future: Implement top navigation layout
    return <SidebarLayoutImpl />;
  }

  if (layout?.type === 'hybrid') {
    // Future: Implement hybrid layout (top nav + sidebar)
    return <SidebarLayoutImpl />;
  }

  // Default: sidebar layout
  return <SidebarLayoutImpl />;
}

function SidebarLayoutImpl() {
  const { app } = useAppConfig();
  const layout = app?.layout;

  // Apply sidebar width via CSS variable in theme provider instead
  return (
    <SidebarProvider
      defaultOpen={!layout?.sidebarDefaultCollapsed}
    >
      {layout?.sidebarPosition === 'right' ? (
        <>
          <main className="flex-1 overflow-auto">
            <LayoutContent />
          </main>
          <SidebarNavContent />
        </>
      ) : (
        <>
          <SidebarNavContent />
          <main className="flex-1 overflow-auto">
            <LayoutContent />
          </main>
        </>
      )}
    </SidebarProvider>
  );
}

function LayoutContent() {
  const { app } = useAppConfig();
  const layout = app?.layout;

  return (
    <>
      {layout?.showHeader !== false && (
        <div
          className="flex items-center border-b px-4"
          style={{ height: layout?.headerHeight || '56px' }}
        >
          <SidebarTrigger />
          {/* Future: Add breadcrumbs, page title, actions here */}
        </div>
      )}
      <div
        style={{
          padding: layout?.contentPadding || '24px',
          maxWidth: layout?.contentMaxWidth || undefined,
          margin: layout?.contentMaxWidth ? '0 auto' : undefined,
        }}
      >
        <Outlet />
      </div>
      {layout?.showFooter && layout?.footerText && (
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground">
          {layout.footerText}
        </div>
      )}
    </>
  );
}
