import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, EyeOff, Shield, User as UserIcon, Package, DollarSign, Pencil, Loader2 } from "lucide-react";

interface UserRecord {
  id: number;
  username: string;
  nom: string;
  email: string | null;
  peutAccesStock: boolean;
  peutAccesPrix: boolean;
  role: string;
  actif: boolean;
  dateCreation: string;
  derniereConnexion: string | null;
  createdBy: string | null;
  password?: string;
}

function CreateUserDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    nom: "",
    email: "",
    password: "",
    role: "user",
    peutAccesStock: true,
    peutAccesPrix: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Utilisateur créé", description: `${data.user.nom} a été créé avec succès` });
      setOpen(false);
      setForm({ username: "", nom: "", email: "", password: "", role: "user", peutAccesStock: true, peutAccesPrix: false });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Erreur lors de la création", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-user">
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Identifiant</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                placeholder="prenom"
                data-testid="input-new-username"
              />
            </div>
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Prénom Nom"
                data-testid="input-new-nom"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email (optionnel)</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@filtreplante.com"
                data-testid="input-new-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <Input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mot de passe"
                data-testid="input-new-password"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="select-new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.peutAccesStock}
                onCheckedChange={(v) => setForm({ ...form, peutAccesStock: v })}
                data-testid="switch-new-stock"
              />
              <Label className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Stock</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.peutAccesPrix}
                onCheckedChange={(v) => setForm({ ...form, peutAccesPrix: v })}
                data-testid="switch-new-prix"
              />
              <Label className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Prix</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={createMutation.isPending || !form.username || !form.nom || !form.password}
            data-testid="button-submit-create-user"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user }: { user: UserRecord }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nom: user.nom,
    email: user.email || "",
    password: "",
    role: user.role,
    peutAccesStock: user.peutAccesStock,
    peutAccesPrix: user.peutAccesPrix,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload: any = { ...data };
      if (!payload.password) delete payload.password;
      if (!payload.email) payload.email = null;
      const res = await apiRequest("PATCH", `/api/admin/users/${user.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Utilisateur modifié", description: `${form.nom} a été mis à jour` });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message || "Erreur lors de la modification", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setForm({ nom: user.nom, email: user.email || "", password: "", role: user.role, peutAccesStock: user.peutAccesStock, peutAccesPrix: user.peutAccesPrix }); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-edit-user-${user.id}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier {user.nom}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Identifiant</Label>
              <Input value={user.username} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                data-testid="input-edit-nom"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email (optionnel)</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label>Nouveau mot de passe</Label>
              <Input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Laisser vide pour ne pas changer"
                data-testid="input-edit-password"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="select-edit-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Utilisateur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.peutAccesStock}
                onCheckedChange={(v) => setForm({ ...form, peutAccesStock: v })}
                data-testid="switch-edit-stock"
              />
              <Label className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Stock</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.peutAccesPrix}
                onCheckedChange={(v) => setForm({ ...form, peutAccesPrix: v })}
                data-testid="switch-edit-prix"
              />
              <Label className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Prix</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Annuler</Button>
          </DialogClose>
          <Button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending || !form.nom}
            data-testid="button-submit-edit-user"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordCell({ user }: { user: UserRecord }) {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (visible) {
      setVisible(false);
      return;
    }
    if (password) {
      setVisible(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPassword(data.password);
        setVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm" data-testid={`text-password-${user.id}`}>
        {visible ? password : "••••••••"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={toggle}
        disabled={loading}
        data-testid={`button-toggle-password-${user.id}`}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

export default function UsersPage() {
  const { toast } = useToast();

  const { data: usersData, isLoading } = useQuery<{ users: UserRecord[] }>({
    queryKey: ["/api/admin/users"],
  });
  const users = usersData?.users || [];

  const toggleMutation = useMutation({
    mutationFn: async ({ id, actif }: { id: number; actif: boolean }) => {
      const endpoint = actif ? "reactiver" : "desactiver";
      const res = await apiRequest("PATCH", `/api/admin/users/${id}/${endpoint}`);
      return res.json();
    },
    onSuccess: (_, { actif }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: actif ? "Utilisateur réactivé" : "Utilisateur désactivé" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les comptes utilisateurs et leurs permissions</p>
        </div>
        <CreateUserDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Mot de passe</TableHead>
                  <TableHead>Accès</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={!user.actif ? "opacity-50" : ""} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium" data-testid={`text-user-nom-${user.id}`}>{user.nom}</span>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                        {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} data-testid={`badge-role-${user.id}`}>
                        {user.role === "admin" ? <Shield className="h-3 w-3 mr-1" /> : <UserIcon className="h-3 w-3 mr-1" />}
                        {user.role === "admin" ? "Admin" : "Utilisateur"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <PasswordCell user={user} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        {user.peutAccesStock && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-stock-${user.id}`}>
                            <Package className="h-3 w-3 mr-1" />Stock
                          </Badge>
                        )}
                        {user.peutAccesPrix && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-prix-${user.id}`}>
                            <DollarSign className="h-3 w-3 mr-1" />Prix
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.actif ? "default" : "destructive"}
                        className="cursor-pointer"
                        onClick={() => toggleMutation.mutate({ id: user.id, actif: !user.actif })}
                        data-testid={`badge-actif-${user.id}`}
                      >
                        {user.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.derniereConnexion
                        ? new Date(user.derniereConnexion).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "Jamais"}
                    </TableCell>
                    <TableCell>
                      <EditUserDialog user={user} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
