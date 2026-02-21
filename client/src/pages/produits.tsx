import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { RegimeBadge } from "@/components/tva-badge";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/utils";
import {
  Plus,
  Package,
  DollarSign,
  History,
  Star,
  StarOff,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  User,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  XCircle,
  CheckCircle,
  Ban,
  RotateCcw,
} from "lucide-react";
import type {
  ProduitWithPrixDefaut,
  ProduitDetail,
  Categorie,
  Fournisseur,
  PrixFournisseur,
  HistoriquePrix,
  REGIMES_FISCAUX,
} from "@shared/schema";
import { calculerPrix, normalizeProductName } from "@shared/schema";

interface DuplicateResult {
  id: number;
  nom: string;
  categorie: string;
  score: number;
}

export default function Produits() {
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const categorieFromUrl = urlParams.get("categorie");

  const [search, setSearch] = useState("");
  const [filterCategorie, setFilterCategorie] = useState<string>(categorieFromUrl || "all");
  const [filterPrix, setFilterPrix] = useState<string>("all");
  const [filterStockable, setFilterStockable] = useState<string>("all");
  const [includeInactifs, setIncludeInactifs] = useState(false);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [historyPrixId, setHistoryPrixId] = useState<number | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);

  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc' | null;
  }>({ key: '', direction: null });

  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    produitId: number;
    nom: string;
    estStockable: boolean;
    fournisseurId: number | null;
    prixHt: number;
    regimeFiscal: string;
  }>({
    produitId: 0,
    nom: "",
    estStockable: false,
    fournisseurId: null,
    prixHt: 0,
    regimeFiscal: "tva_18",
  });

  const [validationErrors, setValidationErrors] = useState<{
    fournisseur?: boolean;
    regimeFiscal?: boolean;
  }>({});

  const [productForm, setProductForm] = useState({
    nom: "",
    categorie: "",
    sousSection: "",
    unite: "u",
    estStockable: false,
    sourceApp: "prix",
  });

  const [priceForm, setPriceForm] = useState({
    fournisseur_id: 0,
    prix_ht: 0,
    regime_fiscal: "tva_18",
    est_fournisseur_defaut: false,
  });

  const produitsUrl = includeInactifs ? "/api/referentiel/produits?includeInactifs=true" : "/api/referentiel/produits";
  const { data: produitsData, isLoading } = useQuery<{ produits: ProduitWithPrixDefaut[] }>({
    queryKey: ["/api/referentiel/produits", { includeInactifs }],
    queryFn: async () => {
      const res = await fetch(produitsUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Erreur chargement produits");
      return res.json();
    },
  });
  const produits = produitsData?.produits ?? [];

  const { data: categoriesData } = useQuery<{ categories: Categorie[] }>({
    queryKey: ["/api/referentiel/categories"],
  });
  const categoriesList = categoriesData?.categories ?? [];

  const { data: fournisseurs = [] } = useQuery<FournisseurWithStats[]>({
    queryKey: ["/api/fournisseurs"],
  });

  const { data: detailData, isLoading: isLoadingDetail } = useQuery<{ produit: ProduitDetail }>({
    queryKey: ["/api/referentiel/produits", selectedProductId],
    enabled: !!selectedProductId,
  });
  const selectedProduct = detailData?.produit;

  const { data: historyData } = useQuery<{ historique: HistoriquePrix[] }>({
    queryKey: ["/api/prix/fournisseurs", historyPrixId, "historique"],
    enabled: !!historyPrixId,
  });
  const historique = historyData?.historique ?? [];

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof productForm) => {
      const res = await apiRequest("POST", "/api/referentiel/produits", {
        ...data,
        nomNormalise: data.nom.toLowerCase(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Produit créé", description: "Le produit a été ajouté avec succès" });
      setIsProductDialogOpen(false);
      setDuplicates([]);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le produit", variant: "destructive" });
    },
  });

  const toggleStockableMutation = useMutation({
    mutationFn: async ({ id, estStockable }: { id: number; estStockable: boolean }) => {
      return apiRequest("PATCH", `/api/referentiel/produits/${id}/stockable`, { est_stockable: estStockable });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits"] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits", selectedProductId] });
      }
      toast({ title: "Statut stockable mis à jour" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de modifier le statut", variant: "destructive" });
    },
  });

  const addPriceMutation = useMutation({
    mutationFn: async ({ produitId, data }: { produitId: number; data: typeof priceForm }) => {
      return apiRequest("POST", `/api/prix/produits/${produitId}/fournisseurs`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits"] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits", selectedProductId] });
      }
      toast({ title: "Prix ajouté", description: "Le nouveau prix a été enregistré" });
      setIsPriceDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'ajouter le prix", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (prixId: number) => {
      return apiRequest("PATCH", `/api/prix/fournisseurs/${prixId}/defaut`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits"] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits", selectedProductId] });
      }
      toast({ title: "Fournisseur par défaut mis à jour" });
    },
  });

  const desactiverMutation = useMutation({
    mutationFn: async (produitId: number) => {
      return apiRequest("PATCH", `/api/referentiel/produits/${produitId}/desactiver`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits", selectedProductId] });
      }
      toast({ title: "Produit désactivé", description: "Le produit a été masqué de la liste par défaut" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de désactiver le produit", variant: "destructive" });
    },
  });

  const reactiverMutation = useMutation({
    mutationFn: async (produitId: number) => {
      return apiRequest("PATCH", `/api/referentiel/produits/${produitId}/reactiver`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits", selectedProductId] });
      }
      toast({ title: "Produit réactivé", description: "Le produit est de nouveau visible" });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de réactiver le produit", variant: "destructive" });
    },
  });

  const updateProductPriceMutation = useMutation({
    mutationFn: async (data: {
      produitId: number;
      produitNom?: string;
      estStockable?: boolean;
      fournisseurId?: number;
      prixHt?: number;
      regimeFiscal?: string;
    }) => {
      if (data.produitNom !== undefined || data.estStockable !== undefined) {
        const updateData: any = {};
        if (data.produitNom !== undefined) updateData.nom = data.produitNom;
        if (data.estStockable !== undefined) updateData.estStockable = data.estStockable;
        await apiRequest("PATCH", `/api/referentiel/produits/${data.produitId}`, updateData);
      }
      if (data.fournisseurId && data.prixHt && data.regimeFiscal) {
        return apiRequest("POST", `/api/prix/produits/${data.produitId}/fournisseurs`, {
          fournisseur_id: data.fournisseurId,
          prix_ht: data.prixHt,
          regime_fiscal: data.regimeFiscal,
          est_fournisseur_defaut: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      if (selectedProductId) {
        queryClient.invalidateQueries({ queryKey: ["/api/referentiel/produits", selectedProductId] });
      }
      toast({ title: "Modifications enregistrées" });
      setEditingRow(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'enregistrer les modifications", variant: "destructive" });
    },
  });

  const checkDuplicates = async (nom: string) => {
    if (nom.length < 3) {
      setDuplicates([]);
      return;
    }
    try {
      const res = await fetch(`/api/referentiel/produits/search?q=${encodeURIComponent(nom)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDuplicates(data.resultats || []);
      }
    } catch { /* ignore */ }
  };

  const filteredProduits = produits.filter((p) => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase());
    const matchCategorie = filterCategorie === "all" || p.categorie === filterCategorie;
    const matchPrix = filterPrix === "all" ||
      (filterPrix === "avec" && p.fournisseurDefaut) ||
      (filterPrix === "sans" && !p.fournisseurDefaut);
    const matchStockable = filterStockable === "all" ||
      (filterStockable === "oui" && p.estStockable) ||
      (filterStockable === "non" && !p.estStockable);
    return matchSearch && matchCategorie && matchPrix && matchStockable;
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key, direction });
  };

  const sortedProduits = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) return filteredProduits;

    return [...filteredProduits].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortConfig.key) {
        case 'nom':
          aVal = a.nom.toLowerCase();
          bVal = b.nom.toLowerCase();
          break;
        case 'categorie':
          aVal = a.categorie.toLowerCase();
          bVal = b.categorie.toLowerCase();
          break;
        case 'prixHT':
          aVal = a.fournisseurDefaut?.prixHt ?? 0;
          bVal = b.fournisseurDefaut?.prixHt ?? 0;
          break;
        case 'regimeFiscal':
          aVal = a.fournisseurDefaut?.regimeFiscal || '';
          bVal = b.fournisseurDefaut?.regimeFiscal || '';
          break;
        case 'derniereMAJ':
          aVal = a.prixDateModification ? new Date(a.prixDateModification).getTime() : 0;
          bVal = b.prixDateModification ? new Date(b.prixDateModification).getTime() : 0;
          break;
        case 'creePar':
          aVal = (a.creePar || '').toLowerCase();
          bVal = (b.creePar || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProduits, sortConfig]);

  const prixCalc = calculerPrix(priceForm.prix_ht || 0, priceForm.regime_fiscal);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      return <ChevronUp className="h-4 w-4 text-primary" />;
    }
    if (sortConfig.key === columnKey && sortConfig.direction === 'desc') {
      return <ChevronDown className="h-4 w-4 text-primary" />;
    }
    return <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />;
  };

  const startEditing = (produit: ProduitWithPrixDefaut) => {
    setEditingRow(produit.id);
    setEditForm({
      produitId: produit.id,
      nom: produit.nom,
      estStockable: produit.estStockable,
      fournisseurId: produit.fournisseurDefaut?.id || null,
      prixHt: produit.fournisseurDefaut?.prixHt || 0,
      regimeFiscal: produit.fournisseurDefaut?.regimeFiscal || "tva_18",
    });
    setTimeout(() => {
      const firstInput = document.querySelector(`tr[data-editing-id="${produit.id}"] input`) as HTMLInputElement | null;
      if (firstInput) {
        firstInput.focus();
        firstInput.select();
      }
    }, 50);
  };

  const handleRowClick = (produit: ProduitWithPrixDefaut, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]') || target.closest('input') || target.closest('[role="combobox"]')) {
      return;
    }
    if (editingRow === produit.id) {
      return;
    }
    startEditing(produit);
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setValidationErrors({});
  };

  const validateEditForm = (): boolean => {
    const errors: typeof validationErrors = {};
    if (editForm.prixHt && editForm.prixHt > 0) {
      if (!editForm.fournisseurId) {
        errors.fournisseur = true;
      }
      if (!editForm.regimeFiscal) {
        errors.regimeFiscal = true;
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveEditing = () => {
    if (!validateEditForm()) {
      toast({
        title: "Validation échouée",
        description: "Si vous saisissez un prix, vous devez sélectionner un fournisseur et un régime fiscal.",
        variant: "destructive",
      });
      return;
    }

    const changes: any = { produitId: editForm.produitId };
    const originalProduct = sortedProduits.find(p => p.id === editForm.produitId);
    if (!originalProduct) return;

    if (editForm.nom !== originalProduct.nom) {
      changes.produitNom = editForm.nom;
    }
    if (editForm.estStockable !== originalProduct.estStockable) {
      changes.estStockable = editForm.estStockable;
    }
    if (editForm.prixHt > 0 && editForm.fournisseurId && editForm.regimeFiscal) {
      const origFourn = originalProduct.fournisseurDefaut?.id;
      const origPrix = originalProduct.fournisseurDefaut?.prixHt;
      const origRegime = originalProduct.fournisseurDefaut?.regimeFiscal;
      if (
        editForm.fournisseurId !== origFourn ||
        editForm.prixHt !== origPrix ||
        editForm.regimeFiscal !== origRegime
      ) {
        changes.fournisseurId = editForm.fournisseurId;
        changes.prixHt = editForm.prixHt;
        changes.regimeFiscal = editForm.regimeFiscal;
      }
    }

    if (Object.keys(changes).length === 1) {
      setEditingRow(null);
      setValidationErrors({});
      return;
    }

    updateProductPriceMutation.mutate(changes);
  };

  const columns = [
    {
      key: "nom",
      header: (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('nom')} data-testid="sort-nom">
          <span>Produit</span>
          <SortIcon columnKey="nom" />
        </div>
      ),
      render: (p: ProduitWithPrixDefaut) => {
        const isEditing = editingRow === p.id;
        if (isEditing) {
          return (
            <Input
              value={editForm.nom}
              onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="h-8 text-sm"
              data-testid={`input-edit-nom-${p.id}`}
            />
          );
        }
        return (
          <div className="flex items-center gap-2">
            <span
              className={`font-medium ${!p.actif ? 'text-muted-foreground line-through' : ''}`}
              data-testid={`text-produit-${p.id}`}
            >
              {p.nom}
            </span>
            {!p.actif && <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600" data-testid={`badge-inactif-${p.id}`}>Inactif</Badge>}
          </div>
        );
      },
    },
    {
      key: "stockage",
      header: "Stockage",
      render: (p: ProduitWithPrixDefaut) => {
        const isEditing = editingRow === p.id;
        const catInfo = categoriesList.find(c => c.nom === p.categorie);
        const categorieNonStockable = catInfo && !catInfo.estStockable;
        if (isEditing) {
          if (categorieNonStockable) {
            return (
              <Badge variant="secondary" className="bg-gray-100 text-gray-500 cursor-not-allowed" title="Catégorie non stockable">
                Non (catégorie)
              </Badge>
            );
          }
          return (
            <Select
              value={editForm.estStockable ? "oui" : "non"}
              onValueChange={(v) => setEditForm({ ...editForm, estStockable: v === "oui" })}
            >
              <SelectTrigger className="h-8 text-sm w-[120px]" onClick={(e) => e.stopPropagation()} data-testid={`select-edit-stockage-${p.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oui">Stockable</SelectItem>
                <SelectItem value="non">Non</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return (
          <Badge
            variant={p.estStockable ? "default" : "secondary"}
            className={p.estStockable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
          >
            {p.estStockable ? "Stockable" : "Non"}
          </Badge>
        );
      },
    },
    {
      key: "categorie",
      header: (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('categorie')} data-testid="sort-categorie">
          <span>Catégorie</span>
          <SortIcon columnKey="categorie" />
        </div>
      ),
      render: (p: ProduitWithPrixDefaut) => (
        <span className="text-sm text-muted-foreground">{p.categorie}</span>
      ),
    },
    {
      key: "unite",
      header: "Unité",
      render: (p: ProduitWithPrixDefaut) => <Badge variant="outline">{p.unite}</Badge>,
    },
    {
      key: "fournisseur",
      header: "Fournisseur défaut",
      render: (p: ProduitWithPrixDefaut) => {
        const isEditing = editingRow === p.id;
        if (isEditing) {
          return (
            <Select
              value={editForm.fournisseurId?.toString() || ""}
              onValueChange={(v) => {
                setEditForm({ ...editForm, fournisseurId: parseInt(v) });
                setValidationErrors({ ...validationErrors, fournisseur: false });
              }}
            >
              <SelectTrigger className={`h-8 text-sm ${validationErrors.fournisseur ? 'border-red-500 ring-2 ring-red-200' : ''}`} onClick={(e) => e.stopPropagation()} data-testid={`select-edit-fournisseur-${p.id}`}>
                <SelectValue placeholder={editForm.prixHt > 0 ? "⚠️ Fournisseur requis" : "Choisir..."} />
              </SelectTrigger>
              <SelectContent>
                {fournisseurs.map((f: any) => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return p.fournisseurDefaut ? (
          <div className="text-sm">
            <span className="font-medium">{p.fournisseurDefaut.nom}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      key: "prixHT",
      header: (
        <div className="flex items-center gap-1 cursor-pointer select-none justify-end" onClick={() => handleSort('prixHT')} data-testid="sort-prixHT">
          <span>Prix HT</span>
          <SortIcon columnKey="prixHT" />
        </div>
      ),
      className: "text-right",
      render: (p: ProduitWithPrixDefaut) => {
        const isEditing = editingRow === p.id;
        if (isEditing) {
          return (
            <Input
              type="number"
              min="0"
              value={editForm.prixHt || ""}
              onChange={(e) => {
                setEditForm({ ...editForm, prixHt: parseFloat(e.target.value) || 0 });
                setValidationErrors({});
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-8 text-sm text-right"
              data-testid={`input-edit-prix-${p.id}`}
            />
          );
        }
        return (
          <span className="font-medium">
            {p.fournisseurDefaut ? formatFCFA(p.fournisseurDefaut.prixHt) : "-"}
          </span>
        );
      },
    },
    {
      key: "regimeFiscal",
      header: "Régime fiscal",
      className: "text-center",
      render: (p: ProduitWithPrixDefaut) => {
        const isEditing = editingRow === p.id;
        if (isEditing) {
          return (
            <Select
              value={editForm.regimeFiscal}
              onValueChange={(v) => {
                setEditForm({ ...editForm, regimeFiscal: v });
                setValidationErrors({ ...validationErrors, regimeFiscal: false });
              }}
            >
              <SelectTrigger className={`h-8 text-sm ${validationErrors.regimeFiscal ? 'border-red-500 ring-2 ring-red-200' : ''}`} onClick={(e) => e.stopPropagation()} data-testid={`select-edit-regime-${p.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tva_18">TVA 18%</SelectItem>
                <SelectItem value="sans_tva">Sans TVA</SelectItem>
                <SelectItem value="brs_5">BRS 5%</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        return p.fournisseurDefaut ? (
          <div>
            <RegimeBadge regime={p.fournisseurDefaut.regimeFiscal} size="sm" />
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      key: "derniereMAJ",
      header: (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('derniereMAJ')} data-testid="sort-derniereMAJ">
          <span>Dernière MAJ</span>
          <SortIcon columnKey="derniereMAJ" />
        </div>
      ),
      className: "min-w-[150px]",
      render: (p: ProduitWithPrixDefaut) => (
        <span className="text-sm text-muted-foreground" data-testid={`text-derniere-maj-${p.id}`}>
          {p.prixDateModification ? formatDateTime(p.prixDateModification) : '-'}
        </span>
      ),
    },
    {
      key: "creePar",
      header: (
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('creePar')} data-testid="sort-creePar">
          <span>Créé par</span>
          <SortIcon columnKey="creePar" />
        </div>
      ),
      render: (p: ProduitWithPrixDefaut) => (
        <span className="text-sm text-muted-foreground" data-testid={`text-creepar-${p.id}`}>
          {p.creePar || '-'}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p: ProduitWithPrixDefaut) => {
        const isEditing = editingRow === p.id;
        if (isEditing) {
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={saveEditing}
                disabled={
                  updateProductPriceMutation.isPending ||
                  (editForm.prixHt > 0 && (!editForm.fournisseurId || !editForm.regimeFiscal))
                }
                className="text-green-600 hover:text-green-700"
                title={
                  editForm.prixHt > 0 && (!editForm.fournisseurId || !editForm.regimeFiscal)
                    ? "Fournisseur et régime fiscal requis"
                    : "Valider les modifications"
                }
                data-testid={`button-save-${p.id}`}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelEditing}
                disabled={updateProductPriceMutation.isPending}
                className="text-red-500 hover:text-red-700"
                data-testid={`button-cancel-${p.id}`}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); setSelectedProductId(p.id); }}
              data-testid={`button-view-${p.id}`}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            {p.actif ? (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Désactiver ce produit ? Il sera masqué de la liste par défaut.")) {
                    desactiverMutation.mutate(p.id);
                  }
                }}
                data-testid={`button-desactiver-${p.id}`}
              >
                <Ban className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="text-green-600 hover:text-green-800"
                onClick={(e) => {
                  e.stopPropagation();
                  reactiverMutation.mutate(p.id);
                }}
                data-testid={`button-reactiver-${p.id}`}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Produits & Prix" description={`${produits.length} produits référencés`}>
        <Button onClick={() => { setProductForm({ nom: "", categorie: "", sousSection: "", unite: "u", estStockable: false, sourceApp: "prix" }); setDuplicates([]); setIsProductDialogOpen(true); }} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un produit
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 flex-wrap items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un produit..." className="flex-1 min-w-[200px] max-w-sm" />
        <Select value={filterCategorie} onValueChange={setFilterCategorie}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-categorie">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categoriesList.map((cat) => (
              <SelectItem key={cat.id} value={cat.nom}>{cat.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPrix} onValueChange={setFilterPrix}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-prix">
            <SelectValue placeholder="Prix" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="avec">Avec prix</SelectItem>
            <SelectItem value="sans">Sans prix</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStockable} onValueChange={setFilterStockable}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-stockable">
            <SelectValue placeholder="Statut stockage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="oui">Stockable</SelectItem>
            <SelectItem value="non">Non stockable</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap" data-testid="label-include-inactifs">
          <Checkbox
            checked={includeInactifs}
            onCheckedChange={(checked) => setIncludeInactifs(!!checked)}
            data-testid="checkbox-include-inactifs"
          />
          <span className="text-muted-foreground">Afficher inactifs</span>
        </label>
      </div>

      <DataTable
        columns={columns}
        data={sortedProduits}
        isLoading={isLoading}
        emptyIcon={Package}
        emptyTitle="Aucun produit"
        emptyDescription="Aucun produit ne correspond aux filtres"
        onRowClick={(p, e) => handleRowClick(p, e)}
        rowClassName={(p) => {
          const classes: string[] = [];
          if (!p.actif) classes.push("opacity-60 bg-gray-50");
          if (editingRow === p.id) classes.push("bg-blue-50 ring-2 ring-blue-300");
          return classes.join(" ");
        }}
        rowDataAttributes={(p) => editingRow === p.id ? { "data-editing-id": p.id.toString() } : {}}
      />

      {/* Create Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau produit</DialogTitle>
            <DialogDescription>Ajoutez un produit au référentiel centralisé</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createProductMutation.mutate(productForm); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prod-nom">Nom du produit *</Label>
              <Input
                id="prod-nom"
                value={productForm.nom}
                onChange={(e) => {
                  setProductForm({ ...productForm, nom: e.target.value });
                  checkDuplicates(e.target.value);
                }}
                placeholder="Ex: Ciment CEM II 42.5"
                data-testid="input-product-nom"
              />
              {productForm.nom && normalizeProductName(productForm.nom) !== productForm.nom && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sera enregistré : <span className="font-medium">{normalizeProductName(productForm.nom)}</span>
                </p>
              )}
            </div>

            {duplicates.length > 0 && (
              <div className="rounded-lg border border-orange-300 bg-orange-50 p-3">
                <div className="flex items-center gap-2 text-orange-800 font-medium text-sm mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Produits similaires détectés
                </div>
                <div className="space-y-1">
                  {duplicates.map((d) => {
                    const scorePercent = Math.round(d.score * 100);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setIsProductDialogOpen(false);
                          setDuplicates([]);
                          setSelectedProductId(d.id);
                        }}
                        className="w-full flex items-center justify-between text-sm p-2 rounded-md bg-orange-100/50 border border-transparent cursor-pointer text-left hover-elevate active-elevate-2"
                        data-testid={`duplicate-${d.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{d.nom}</span>
                          <span className="text-muted-foreground ml-1">({d.categorie})</span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <Badge variant="outline" className={
                            scorePercent >= 70 ? "text-orange-700 border-orange-400" :
                            scorePercent >= 50 ? "text-yellow-700 border-yellow-400" :
                            "text-muted-foreground"
                          }>{scorePercent}%</Badge>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-orange-700 mt-2">Cliquez pour voir le détail du produit</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prod-cat">Catégorie *</Label>
                <Select value={productForm.categorie} onValueChange={(v) => setProductForm({ ...productForm, categorie: v })}>
                  <SelectTrigger data-testid="select-product-categorie">
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesList.map((cat) => (
                      <SelectItem key={cat.id} value={cat.nom}>{cat.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-unite">Unité *</Label>
                <Select value={productForm.unite} onValueChange={(v) => setProductForm({ ...productForm, unite: v })}>
                  <SelectTrigger data-testid="select-product-unite">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="u">Unité (u)</SelectItem>
                    <SelectItem value="kg">Kilogramme (kg)</SelectItem>
                    <SelectItem value="m">Mètre (m)</SelectItem>
                    <SelectItem value="m2">Mètre carré (m²)</SelectItem>
                    <SelectItem value="m3">Mètre cube (m³)</SelectItem>
                    <SelectItem value="l">Litre (l)</SelectItem>
                    <SelectItem value="sac">Sac</SelectItem>
                    <SelectItem value="rouleau">Rouleau</SelectItem>
                    <SelectItem value="barre">Barre</SelectItem>
                    <SelectItem value="plaque">Plaque</SelectItem>
                    <SelectItem value="t">Tonne (t)</SelectItem>
                    <SelectItem value="lot">Lot</SelectItem>
                    <SelectItem value="boite">Boîte</SelectItem>
                    <SelectItem value="bidon">Bidon</SelectItem>
                    <SelectItem value="paquet">Paquet</SelectItem>
                    <SelectItem value="feuille">Feuille</SelectItem>
                    <SelectItem value="ml">Mètre linéaire (ml)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-ss">Sous-section (optionnel)</Label>
              <Input
                id="prod-ss"
                value={productForm.sousSection}
                onChange={(e) => setProductForm({ ...productForm, sousSection: e.target.value })}
                placeholder="Ex: Tubes PVC"
                data-testid="input-product-soussection"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={!productForm.nom.trim() || !productForm.categorie || createProductMutation.isPending} data-testid="button-submit-product">
                {createProductMutation.isPending ? "Création..." : "Créer le produit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Price Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un prix fournisseur</DialogTitle>
            <DialogDescription>
              {selectedProduct ? `Pour: ${selectedProduct.nom}` : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (selectedProductId && priceForm.fournisseur_id && priceForm.prix_ht > 0) {
              addPriceMutation.mutate({ produitId: selectedProductId, data: priceForm });
            }
          }} className="space-y-4">
            {selectedProduct?.prixFournisseurs?.some(pf => pf.fournisseur.id === priceForm.fournisseur_id) && priceForm.fournisseur_id > 0 && (
              <div className="rounded-lg border border-orange-300 bg-orange-50 p-3">
                <div className="flex items-center gap-2 text-orange-800 font-medium text-sm mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Ce fournisseur a déjà un prix
                </div>
                <p className="text-sm text-orange-700">
                  Un nouveau prix sera créé et l'ancien restera dans l'historique.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Fournisseur *</Label>
              <Select value={priceForm.fournisseur_id ? priceForm.fournisseur_id.toString() : ""} onValueChange={(v) => setPriceForm({ ...priceForm, fournisseur_id: parseInt(v) })}>
                <SelectTrigger data-testid="select-price-fournisseur">
                  <SelectValue placeholder="Choisir un fournisseur..." />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs.map((f: any) => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix HT (FCFA) *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={priceForm.prix_ht || ""}
                    onChange={(e) => setPriceForm({ ...priceForm, prix_ht: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    data-testid="input-price-ht"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Régime fiscal *</Label>
                  <Select value={priceForm.regime_fiscal} onValueChange={(v) => setPriceForm({ ...priceForm, regime_fiscal: v })}>
                    <SelectTrigger data-testid="select-price-regime">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tva_18">TVA 18%</SelectItem>
                      <SelectItem value="sans_tva">Sans TVA</SelectItem>
                      <SelectItem value="brs_5">BRS 5%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {priceForm.prix_ht > 0 && (
                <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Prix HT:</span><span className="font-medium">{formatFCFA(prixCalc.prixHt)}</span></div>
                  {prixCalc.prixTtc !== null && <div className="flex justify-between"><span>Prix TTC:</span><span className="font-medium">{formatFCFA(prixCalc.prixTtc)}</span></div>}
                  {prixCalc.prixBrs !== null && <div className="flex justify-between"><span>Prix BRS:</span><span className="font-medium">{formatFCFA(prixCalc.prixBrs)}</span></div>}
                </div>
              )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPriceDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={!priceForm.fournisseur_id || priceForm.prix_ht <= 0 || addPriceMutation.isPending} data-testid="button-submit-price">
                {addPriceMutation.isPending ? "Ajout..." : "Ajouter le prix"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historique des prix</DialogTitle>
          </DialogHeader>
          {historique.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Aucun historique de modification</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {historique.map((h) => (
                <div key={h.id} className="p-3 rounded-lg border" data-testid={`history-${h.id}`}>
                  <div className="flex items-center gap-2 text-sm">
                    {h.prixHtAncien !== null && (
                      <>
                        <span className="text-muted-foreground line-through">{formatFCFA(h.prixHtAncien)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <span className="font-medium">{formatFCFA(h.prixHtNouveau)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {h.regimeFiscalAncien && h.regimeFiscalAncien !== h.regimeFiscalNouveau && (
                      <>
                        <RegimeBadge regime={h.regimeFiscalAncien} size="sm" />
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </>
                    )}
                    <RegimeBadge regime={h.regimeFiscalNouveau} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatDateTime(h.dateModification)}</span>
                    {h.modifiePar && (
                      <span className="text-xs text-primary font-medium" data-testid={`text-history-par-${h.id}`}>Par {h.modifiePar}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Detail Sheet */}
      <Sheet open={!!selectedProductId} onOpenChange={(open) => { if (!open) setSelectedProductId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          <SheetHeader>
            <SheetTitle>{selectedProduct?.nom || "Chargement..."}</SheetTitle>
          </SheetHeader>

          {selectedProduct && (
            <div className="mt-6 space-y-6">
              {!selectedProduct.actif && (
                <div className="rounded-lg border border-gray-300 bg-gray-50 p-3 flex items-center justify-between" data-testid="banner-inactif">
                  <div className="flex items-center gap-2 text-gray-600">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Produit inactif</span>
                  </div>
                  <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50" onClick={() => reactiverMutation.mutate(selectedProduct.id)} data-testid="button-reactiver-detail">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Réactiver
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Catégorie:</span><p className="font-medium">{selectedProduct.categorie}</p></div>
                <div><span className="text-muted-foreground">Unité:</span><p className="font-medium">{selectedProduct.unite}</p></div>
                {selectedProduct.sousSection && <div><span className="text-muted-foreground">Sous-section:</span><p className="font-medium">{selectedProduct.sousSection}</p></div>}
                <div><span className="text-muted-foreground">Source:</span><p className="font-medium">{selectedProduct.sourceApp}</p></div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stockable-toggle"
                  checked={selectedProduct.estStockable}
                  disabled={!selectedProduct.actif}
                  onCheckedChange={(checked) => {
                    toggleStockableMutation.mutate({ id: selectedProduct.id, estStockable: !!checked });
                  }}
                  data-testid="checkbox-stockable"
                />
                <Label htmlFor="stockable-toggle" className={`cursor-pointer text-sm ${!selectedProduct.actif ? 'text-muted-foreground' : ''}`}>
                  Produit stockable {!selectedProduct.actif && "(inactif)"}
                </Label>
              </div>

              <div className="pt-3 border-t" data-testid="section-audit-info">
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Informations de suivi
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    Créé par <span className="font-medium" data-testid="text-detail-creepar">{selectedProduct.creePar || 'Inconnu'}</span>
                    {' '}le {formatDateTime(selectedProduct.dateCreation)}
                  </p>
                  {selectedProduct.dateModification && selectedProduct.dateModification !== selectedProduct.dateCreation && (
                    <p className="text-muted-foreground">
                      Dernière modification : {formatDateTime(selectedProduct.dateModification)}
                    </p>
                  )}
                </div>
              </div>

              {selectedProduct.actif && (
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => {
                    if (confirm("Désactiver ce produit ? Il sera masqué de la liste par défaut.")) {
                      desactiverMutation.mutate(selectedProduct.id);
                    }
                  }} data-testid="button-desactiver-detail">
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    Désactiver ce produit
                  </Button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Prix fournisseurs ({selectedProduct.prixFournisseurs?.length || 0})
                  </h3>
                  <Button size="sm" onClick={() => {
                    setPriceForm({ fournisseur_id: 0, prix_ht: 0, regime_fiscal: "tva_18", est_fournisseur_defaut: false });
                    setIsPriceDialogOpen(true);
                  }} data-testid="button-add-price">
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {(!selectedProduct.prixFournisseurs || selectedProduct.prixFournisseurs.length === 0) ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Aucun prix fournisseur</p>
                ) : (
                  <div className="space-y-2">
                    {selectedProduct.prixFournisseurs.map((pf) => (
                      <Card key={pf.id} className={pf.estFournisseurDefaut ? "border-primary" : ""} data-testid={`card-prix-${pf.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{pf.fournisseur.nom}</span>
                                {pf.estFournisseurDefaut && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                              </div>
                              <div className="mt-1">
                                <RegimeBadge regime={pf.regimeFiscal} size="sm" />
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatFCFA(pf.prixHt)} HT</div>
                              {pf.prixTtc && <div className="text-xs text-muted-foreground">{formatFCFA(pf.prixTtc)} TTC</div>}
                              {pf.prixBrs && <div className="text-xs text-muted-foreground">{formatFCFA(pf.prixBrs)} BRS</div>}
                            </div>
                          </div>
                          {pf.creePar && (
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-prix-creepar-${pf.id}`}>
                              Créé par {pf.creePar} le {formatDateTime(pf.dateCreation)}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-2">
                            {!pf.estFournisseurDefaut && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDefaultMutation.mutate(pf.id)} data-testid={`button-set-default-${pf.id}`}>
                                <Star className="h-3 w-3 mr-1" />
                                Défaut
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                              setHistoryPrixId(pf.id);
                              setIsHistoryOpen(true);
                            }} data-testid={`button-history-${pf.id}`}>
                              <History className="h-3 w-3 mr-1" />
                              Historique
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

interface FournisseurWithStats extends Fournisseur {
  produitsCount: number;
}
