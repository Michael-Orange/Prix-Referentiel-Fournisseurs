import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  FolderTree, 
  Package, 
  History,
  LogOut,
  User,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuthUser } from "@/pages/login";

const menuItems = [
  {
    title: "Tableau de bord",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Fournisseurs",
    url: "/fournisseurs",
    icon: Users,
  },
  {
    title: "Catégories",
    url: "/categories",
    icon: FolderTree,
  },
  {
    title: "Produits & Prix",
    url: "/produits",
    icon: Package,
  },
  {
    title: "Historique",
    url: "/historique",
    icon: History,
  },
];

interface AppSidebarProps {
  user: AuthUser;
  onLogout?: () => void;
}

export function AppSidebar({ user, onLogout }: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-lg">
            FP
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground">Filtreplante</span>
            <span className="text-xs text-muted-foreground">Référentiel Produits</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/utilisateurs"}
                    data-testid="nav-utilisateurs"
                  >
                    <Link href="/utilisateurs">
                      <Shield className="h-4 w-4" />
                      <span>Utilisateurs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-3" data-testid="text-user-info">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate" data-testid="text-user-name">{user.nom}</span>
            <span className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">{user.role}</span>
          </div>
        </div>
        {onLogout && (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
