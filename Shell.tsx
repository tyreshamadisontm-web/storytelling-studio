import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarProvider, 
  SidebarGroup, 
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter
} from '@/components/ui/sidebar';
import { LayoutDashboard, Film, PlusCircle, Tv2, Plus, Scissors, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { canInstall, install } = usePWAInstall();

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background dark">
        <Sidebar className="border-r border-border bg-sidebar">
          <SidebarHeader className="h-16 flex items-center px-4 border-b border-border">
            <div className="flex items-center gap-2 font-bold text-lg text-primary tracking-tight">
              <Scissors className="w-5 h-5" />
              <span>Tymotive Studio</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-mono">Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/')}>
                      <Link href="/">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/projects') && location !== '/projects/new'}>
                      <Link href="/projects">
                        <Film className="w-4 h-4 mr-2" />
                        <span>All Projects</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === '/projects/new'}>
                      <Link href="/projects/new">
                        <PlusCircle className="w-4 h-4 mr-2 text-primary" />
                        <span className="text-primary font-medium">New Project</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-muted-foreground uppercase tracking-wider text-xs font-mono">Brand & Assets</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/channels') && location !== '/channels/new'}>
                      <Link href="/channels">
                        <Tv2 className="w-4 h-4 mr-2" />
                        <span>Channels</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === '/channels/new'}>
                      <Link href="/channels/new">
                        <Plus className="w-4 h-4 mr-2" />
                        <span>Add Channel</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {canInstall && (
            <SidebarFooter className="p-3 border-t border-border">
              <Button
                onClick={install}
                variant="outline"
                className="w-full text-xs font-mono uppercase tracking-wider border-primary/40 text-primary hover:bg-primary/10 gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </Button>
            </SidebarFooter>
          )}
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
