import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { TVABadge } from "@/components/tva-badge";
import { StatusBadge } from "@/components/status-badge";
import { SearchInput } from "@/components/search-input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  SheetDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatFCFA, formatDate, calculateTTC, calculateHT } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Eye,
  DollarSign,
  History,
  AlertTriangle,
} from "lucide-react";
import type {
  ProduitWithDetails,
  Categorie,
  SousSection,
  Fournisseur,
  PrixFournisseur,
  InsertProduit,
  InsertPrixFournisseur,
} from "@shared/schema";
import { unitesMesure } from "@shared/schema";

interface PrixWithFournisseur extends PrixFournisseur {
  fournisseur: Fournisseur;
}

interface ProduitDetails extends ProduitWithDetails {
  prix: PrixWithFournisseur[];
}

export default function Produits() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterCategorie, setFilterCategorie] = useState<string>("all");
  const [filterFournisseur, setFilterFournisseur] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isPriceDialogOpen, setIsPriceDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProduitDetails | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProduitWithDetails | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ProduitWithDetails | null>(null);
  const [deletePriceConfirm, setDeletePriceConfirm] = useState<PrixWithFournisseur | null>(null);
  const [editingPrice, setEditingPrice] = useState<PrixWithFournisseur | null>(null);

  const [productForm, setProductForm] = useState({
    nom: "",
    description: "",
    categorieId: 0,
    sousSectionId: null as number | null,
    uniteMesure: "u",
    actif: true,
  });

  const [addPriceWithProduct, setAddPriceWithProduct] = useState(false);
  const [productPriceForm, setProductPriceForm] = useState({
    fournisseurId: 0,
    prixHT: 0,
    tauxTVA: 18,
    prixTTC: 0,
    dateDebutValidite: new Date().toISOString().split("T")[0],
    remarques: "",
  });
  const [productPriceInputMode, setProductPriceInputMode] = useState<"HT" | "TTC">("HT");

  const [priceForm, setPriceForm] = useState({
    fournisseurId: 0,
    prixHT: 0,
    tauxTVA: 18,
    prixTTC: 0,
    dateDebutValidite: new Date().toISOString().split("T")[0],
    dateFinValidite: "",
    remarques: "",
    actif: true,
  });

  const [priceInputMode, setPriceInputMode] = useState<"HT" | "TTC">("HT");

  const { data: produits = [], isLoading } = useQuery<ProduitWithDetails[]>({
    queryKey: ["/api/produits"],
  });

  const { data: categories = [] } = useQuery<Categorie[]>({
    queryKey: ["/api/categories/list"],
  });

  const { data: sousSections = [] } = useQuery<SousSection[]>({
    queryKey: ["/api/sous-sections", filterCategorie],
    enabled: filterCategorie !== "all" || productForm.categorieId > 0,
  });

  const { data: fournisseurs = [] } = useQuery<Fournisseur[]>({
    queryKey: ["/api/fournisseurs/list"],
  });

  const { data: productDetails, isLoading: isLoadingDetails } = useQuery<ProduitDetails>({
    queryKey: ["/api/produits", selectedProduct?.id],
    enabled: !!selectedProduct?.id,
  });

  const createProductMutation = useMutation({
    mutationFn: (data: InsertProduit) => apiRequest("POST", "/api/produits", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Produit créé", description: "Le produit a été ajouté avec succès" });
      closeProductDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de créer le produit", variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProduit> }) =>
      apiRequest("PATCH", `/api/produits/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produits"] });
      toast({ title: "Produit modifié" });
      closeProductDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de modifier le produit", variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/produits/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Produit supprimé" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer le produit", variant: "destructive" });
    },
  });

  const createPriceMutation = useMutation({
    mutationFn: (data: InsertPrixFournisseur) => apiRequest("POST", "/api/prix", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produits"] });
      if (selectedProduct) {
        queryClient.invalidateQueries({ queryKey: ["/api/produits", selectedProduct.id] });
      }
      toast({ title: "Prix ajouté" });
      closePriceDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible d'ajouter le prix", variant: "destructive" });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertPrixFournisseur> }) =>
      apiRequest("PATCH", `/api/prix/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produits"] });
      if (selectedProduct) {
        queryClient.invalidateQueries({ queryKey: ["/api/produits", selectedProduct.id] });
      }
      toast({ title: "Prix modifié" });
      closePriceDialog();
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de modifier le prix", variant: "destructive" });
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/prix/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/produits"] });
      if (selectedProduct) {
        queryClient.invalidateQueries({ queryKey: ["/api/produits", selectedProduct.id] });
      }
      toast({ title: "Prix supprimé" });
      setDeletePriceConfirm(null);
    },
    onError: () => {
      toast({ title: "Erreur", description: "Impossible de supprimer le prix", variant: "destructive" });
    },
  });

  const openProductDialog = (product?: ProduitWithDetails) => {
    setEditingProduct(product || null);
    setProductForm({
      nom: product?.nom || "",
      description: product?.description || "",
      categorieId: product?.categorieId || 0,
      sousSectionId: product?.sousSectionId || null,
      uniteMesure: product?.uniteMesure || "u",
      actif: product?.actif ?? true,
    });
    setAddPriceWithProduct(false);
    setProductPriceForm({
      fournisseurId: 0,
      prixHT: 0,
      tauxTVA: 18,
      prixTTC: 0,
      dateDebutValidite: new Date().toISOString().split("T")[0],
      remarques: "",
    });
    setProductPriceInputMode("HT");
    setIsProductDialogOpen(true);
  };

  const closeProductDialog = () => {
    setIsProductDialogOpen(false);
    setEditingProduct(null);
    setProductForm({
      nom: "",
      description: "",
      categorieId: 0,
      sousSectionId: null,
      uniteMesure: "u",
      actif: true,
    });
    setAddPriceWithProduct(false);
  };

  const handleProductPriceFournisseurChange = (fournisseurId: string) => {
    const id = parseInt(fournisseurId);
    const fournisseur = fournisseurs.find((f) => f.id === id);
    const tauxTVA = fournisseur?.tvaApplicable ? 18 : 0;
    setProductPriceForm({
      ...productPriceForm,
      fournisseurId: id,
      tauxTVA,
      prixTTC: productPriceInputMode === "HT" ? calculateTTC(productPriceForm.prixHT, tauxTVA) : productPriceForm.prixTTC,
      prixHT: productPriceInputMode === "TTC" ? calculateHT(productPriceForm.prixTTC, tauxTVA) : productPriceForm.prixHT,
    });
  };

  const handleProductPrixHTChange = (value: number) => {
    setProductPriceForm({
      ...productPriceForm,
      prixHT: value,
      prixTTC: calculateTTC(value, productPriceForm.tauxTVA),
    });
  };

  const handleProductPrixTTCChange = (value: number) => {
    setProductPriceForm({
      ...productPriceForm,
      prixTTC: value,
      prixHT: calculateHT(value, productPriceForm.tauxTVA),
    });
  };

  const handleProductTauxTVAChange = (value: number) => {
    const newTTC = calculateTTC(productPriceForm.prixHT, value);
    setProductPriceForm({
      ...productPriceForm,
      tauxTVA: value,
      prixTTC: productPriceInputMode === "HT" ? newTTC : productPriceForm.prixTTC,
      prixHT: productPriceInputMode === "TTC" ? calculateHT(productPriceForm.prixTTC, value) : productPriceForm.prixHT,
    });
  };

  const openPriceDialog = (price?: PrixWithFournisseur) => {
    setEditingPrice(price || null);
    if (price) {
      setPriceForm({
        fournisseurId: price.fournisseurId,
        prixHT: price.prixHT,
        tauxTVA: price.tauxTVA,
        prixTTC: price.prixTTC,
        dateDebutValidite: price.dateDebutValidite
          ? new Date(price.dateDebutValidite).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        dateFinValidite: price.dateFinValidite
          ? new Date(price.dateFinValidite).toISOString().split("T")[0]
          : "",
        remarques: price.remarques || "",
        actif: price.actif,
      });
    } else {
      setPriceForm({
        fournisseurId: 0,
        prixHT: 0,
        tauxTVA: 18,
        prixTTC: 0,
        dateDebutValidite: new Date().toISOString().split("T")[0],
        dateFinValidite: "",
        remarques: "",
        actif: true,
      });
    }
    setIsPriceDialogOpen(true);
  };

  const closePriceDialog = () => {
    setIsPriceDialogOpen(false);
    setEditingPrice(null);
  };

  const handleFournisseurChange = (fournisseurId: string) => {
    const id = parseInt(fournisseurId);
    const fournisseur = fournisseurs.find((f) => f.id === id);
    const tauxTVA = fournisseur?.tvaApplicable ? 18 : 0;
    setPriceForm({
      ...priceForm,
      fournisseurId: id,
      tauxTVA,
      prixTTC: priceInputMode === "HT" ? calculateTTC(priceForm.prixHT, tauxTVA) : priceForm.prixTTC,
      prixHT: priceInputMode === "TTC" ? calculateHT(priceForm.prixTTC, tauxTVA) : priceForm.prixHT,
    });
  };

  const handlePrixHTChange = (value: number) => {
    setPriceForm({
      ...priceForm,
      prixHT: value,
      prixTTC: calculateTTC(value, priceForm.tauxTVA),
    });
  };

  const handlePrixTTCChange = (value: number) => {
    setPriceForm({
      ...priceForm,
      prixTTC: value,
      prixHT: calculateHT(value, priceForm.tauxTVA),
    });
  };

  const handleTauxTVAChange = (value: number) => {
    const newTTC = calculateTTC(priceForm.prixHT, value);
    setPriceForm({
      ...priceForm,
      tauxTVA: value,
      prixTTC: priceInputMode === "HT" ? newTTC : priceForm.prixTTC,
      prixHT: priceInputMode === "TTC" ? calculateHT(priceForm.prixTTC, value) : priceForm.prixHT,
    });
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.nom.trim() || !productForm.categorieId || !productForm.uniteMesure) return;

    if (addPriceWithProduct && !editingProduct) {
      if (!productPriceForm.fournisseurId || productPriceForm.prixHT <= 0) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir les champs du prix fournisseur",
          variant: "destructive",
        });
        return;
      }
    }

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productForm });
    } else {
      try {
        const response = await apiRequest("POST", "/api/produits", productForm);
        const newProduct = await response.json();
        
        if (addPriceWithProduct && newProduct.id) {
          const selectedFournisseur = fournisseurs.find((f) => f.id === productPriceForm.fournisseurId);
          const expectedTaux = selectedFournisseur?.tvaApplicable ? 18 : 0;
          const tvaOverride = productPriceForm.tauxTVA !== expectedTaux;

          await apiRequest("POST", "/api/prix", {
            produitId: newProduct.id,
            fournisseurId: productPriceForm.fournisseurId,
            prixHT: productPriceForm.prixHT,
            tauxTVA: productPriceForm.tauxTVA,
            prixTTC: productPriceForm.prixTTC,
            dateDebutValidite: new Date(productPriceForm.dateDebutValidite),
            remarques: productPriceForm.remarques || null,
            actif: true,
            tvaOverride,
          });
          
          toast({
            title: "Produit créé avec prix",
            description: `${newProduct.reference} - ${newProduct.nom} créé avec prix ${formatFCFA(productPriceForm.prixHT)} HT`,
          });
        } else {
          toast({ title: "Produit créé", description: "Le produit a été ajouté avec succès" });
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/produits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
        closeProductDialog();
      } catch {
        toast({ title: "Erreur", description: "Impossible de créer le produit", variant: "destructive" });
      }
    }
  };

  const handlePriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceForm.fournisseurId || priceForm.prixHT <= 0 || !selectedProduct) return;

    const selectedFournisseur = fournisseurs.find((f) => f.id === priceForm.fournisseurId);
    const expectedTaux = selectedFournisseur?.tvaApplicable ? 18 : 0;
    const tvaOverride = priceForm.tauxTVA !== expectedTaux;

    const data: InsertPrixFournisseur = {
      produitId: selectedProduct.id,
      fournisseurId: priceForm.fournisseurId,
      prixHT: priceForm.prixHT,
      tauxTVA: priceForm.tauxTVA,
      prixTTC: priceForm.prixTTC,
      dateDebutValidite: new Date(priceForm.dateDebutValidite),
      dateFinValidite: priceForm.dateFinValidite ? new Date(priceForm.dateFinValidite) : null,
      remarques: priceForm.remarques || null,
      actif: priceForm.actif,
      tvaOverride,
    };

    if (editingPrice) {
      updatePriceMutation.mutate({ id: editingPrice.id, data });
    } else {
      createPriceMutation.mutate(data);
    }
  };

  const filteredProduits = produits.filter((p) => {
    const matchSearch =
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase());
    const matchCategorie = filterCategorie === "all" || p.categorieId === parseInt(filterCategorie);
    const matchFournisseur = filterFournisseur === "all"; // TODO: filter by fournisseur
    const matchStatut =
      filterStatut === "all" ||
      (filterStatut === "actif" && p.actif) ||
      (filterStatut === "inactif" && !p.actif);
    return matchSearch && matchCategorie && matchFournisseur && matchStatut;
  });

  const columns = [
    {
      key: "reference",
      header: "Référence",
      render: (p: ProduitWithDetails) => (
        <span className="font-mono text-sm font-medium text-primary">{p.reference}</span>
      ),
    },
    {
      key: "nom",
      header: "Nom",
      render: (p: ProduitWithDetails) => <span className="font-medium">{p.nom}</span>,
    },
    {
      key: "categorie",
      header: "Catégorie",
      render: (p: ProduitWithDetails) => (
        <div className="text-sm">
          <span>{p.categorie?.nom}</span>
          {p.sousSection && (
            <span className="text-muted-foreground"> / {p.sousSection.nom}</span>
          )}
        </div>
      ),
    },
    {
      key: "unite",
      header: "Unité",
      render: (p: ProduitWithDetails) => (
        <Badge variant="outline">{p.uniteMesure}</Badge>
      ),
    },
    {
      key: "prixHT",
      header: "Prix min HT",
      className: "text-right",
      render: (p: ProduitWithDetails) => (
        <span className="font-medium">
          {p.prixMin ? formatFCFA(p.prixMin) : "-"}
        </span>
      ),
    },
    {
      key: "prixTTC",
      header: "Prix min TTC",
      className: "text-right",
      render: (p: ProduitWithDetails) => (
        <span className="text-muted-foreground">
          {p.prixMinTTC ? formatFCFA(p.prixMinTTC) : "-"}
        </span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (p: ProduitWithDetails) => <StatusBadge actif={p.actif} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (p: ProduitWithDetails) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProduct(p as ProduitDetails);
            }}
            data-testid={`button-view-${p.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              openProductDialog(p);
            }}
            data-testid={`button-edit-${p.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(p);
            }}
            data-testid={`button-delete-${p.id}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const availableSousSections = sousSections.filter(
    (ss) => ss.categorieId === productForm.categorieId
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Produits & Prix"
        description="Gérez vos produits et leurs prix fournisseurs"
      >
        <Button onClick={() => openProductDialog()} data-testid="button-add-product">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un produit
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par nom ou référence..."
          className="flex-1 min-w-[200px] max-w-sm"
        />
        <Select value={filterCategorie} onValueChange={setFilterCategorie}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-categorie">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-statut">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="actif">Actifs</SelectItem>
            <SelectItem value="inactif">Inactifs</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredProduits}
        isLoading={isLoading}
        emptyIcon={Package}
        emptyTitle="Aucun produit"
        emptyDescription="Commencez par ajouter votre premier produit"
        emptyActionLabel="Ajouter un produit"
        onEmptyAction={() => openProductDialog()}
        onRowClick={(p) => setSelectedProduct(p as ProduitDetails)}
      />

      {/* Product Form Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? `Modifiez les informations de ${editingProduct.reference}`
                : "La référence sera générée automatiquement (FP-XXX)"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            {editingProduct && (
              <div className="p-3 rounded-md bg-muted/50">
                <Label className="text-xs text-muted-foreground">Référence</Label>
                <p className="font-mono font-medium text-primary">{editingProduct.reference}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="prod-nom">Nom *</Label>
              <Input
                id="prod-nom"
                value={productForm.nom}
                onChange={(e) => setProductForm({ ...productForm, nom: e.target.value })}
                placeholder="Ex: PELLE"
                data-testid="input-product-nom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea
                id="prod-desc"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Description optionnelle..."
                data-testid="input-product-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select
                  value={productForm.categorieId ? productForm.categorieId.toString() : ""}
                  onValueChange={(v) =>
                    setProductForm({ ...productForm, categorieId: parseInt(v), sousSectionId: null })
                  }
                >
                  <SelectTrigger data-testid="select-product-categorie">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sous-section</Label>
                <Select
                  value={productForm.sousSectionId?.toString() || "none"}
                  onValueChange={(v) =>
                    setProductForm({ ...productForm, sousSectionId: v === "none" ? null : parseInt(v) })
                  }
                  disabled={!productForm.categorieId}
                >
                  <SelectTrigger data-testid="select-product-soussection">
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {availableSousSections.map((ss) => (
                      <SelectItem key={ss.id} value={ss.id.toString()}>
                        {ss.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Unité de mesure *</Label>
              <Select
                value={productForm.uniteMesure}
                onValueChange={(v) => setProductForm({ ...productForm, uniteMesure: v })}
              >
                <SelectTrigger data-testid="select-product-unite">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitesMesure.map((unite) => (
                    <SelectItem key={unite} value={unite}>
                      {unite}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="prod-actif">Produit actif</Label>
              <Switch
                id="prod-actif"
                checked={productForm.actif}
                onCheckedChange={(checked) => setProductForm({ ...productForm, actif: checked })}
                data-testid="switch-product-actif"
              />
            </div>

            {!editingProduct && (
              <div className="border-t border-dashed pt-4 mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="add-price-toggle" className="text-sm font-medium">
                    Ajouter un prix fournisseur maintenant
                  </Label>
                  <Switch
                    id="add-price-toggle"
                    checked={addPriceWithProduct}
                    onCheckedChange={setAddPriceWithProduct}
                    data-testid="switch-add-price"
                  />
                </div>

                {addPriceWithProduct && (
                  <div className="space-y-4 p-4 rounded-md bg-muted/50 border border-dashed">
                    <div className="space-y-2">
                      <Label>Fournisseur *</Label>
                      <Select
                        value={productPriceForm.fournisseurId ? productPriceForm.fournisseurId.toString() : ""}
                        onValueChange={handleProductPriceFournisseurChange}
                      >
                        <SelectTrigger data-testid="select-product-price-fournisseur">
                          <SelectValue placeholder="Sélectionner un fournisseur..." />
                        </SelectTrigger>
                        <SelectContent>
                          {fournisseurs.filter((f) => f.actif).length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              Aucun fournisseur disponible
                            </div>
                          ) : (
                            fournisseurs
                              .filter((f) => f.actif)
                              .map((f) => (
                                <SelectItem key={f.id} value={f.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    {f.nom}
                                    <TVABadge tvaApplicable={f.tvaApplicable} size="sm" />
                                  </div>
                                </SelectItem>
                              ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 p-1 rounded-md bg-background">
                      <Button
                        type="button"
                        variant={productPriceInputMode === "HT" ? "default" : "ghost"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setProductPriceInputMode("HT")}
                      >
                        Saisie HT
                      </Button>
                      <Button
                        type="button"
                        variant={productPriceInputMode === "TTC" ? "default" : "ghost"}
                        size="sm"
                        className="flex-1"
                        onClick={() => setProductPriceInputMode("TTC")}
                      >
                        Saisie TTC
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prod-prix-ht">Prix HT (FCFA) *</Label>
                        <Input
                          id="prod-prix-ht"
                          type="number"
                          value={productPriceForm.prixHT || ""}
                          onChange={(e) => handleProductPrixHTChange(parseFloat(e.target.value) || 0)}
                          disabled={productPriceInputMode === "TTC"}
                          className={productPriceInputMode === "TTC" ? "bg-muted" : ""}
                          placeholder="Ex: 7000"
                          data-testid="input-product-prix-ht"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prod-taux-tva">Taux TVA (%)</Label>
                        <Input
                          id="prod-taux-tva"
                          type="number"
                          value={productPriceForm.tauxTVA}
                          onChange={(e) => handleProductTauxTVAChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-product-taux-tva"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prod-prix-ttc">Prix TTC (FCFA)</Label>
                      <Input
                        id="prod-prix-ttc"
                        type="number"
                        value={productPriceForm.prixTTC || ""}
                        onChange={(e) => handleProductPrixTTCChange(parseFloat(e.target.value) || 0)}
                        disabled={productPriceInputMode === "HT"}
                        className={productPriceInputMode === "HT" ? "bg-muted" : ""}
                        data-testid="input-product-prix-ttc"
                      />
                    </div>

                    {productPriceForm.fournisseurId > 0 && (() => {
                      const selectedFournisseur = fournisseurs.find((f) => f.id === productPriceForm.fournisseurId);
                      const expectedTaux = selectedFournisseur?.tvaApplicable ? 18 : 0;
                      if (productPriceForm.tauxTVA !== expectedTaux) {
                        return (
                          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>TVA différente du profil fournisseur</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="prod-date-debut">Date début validité</Label>
                        <Input
                          id="prod-date-debut"
                          type="date"
                          value={productPriceForm.dateDebutValidite}
                          onChange={(e) => setProductPriceForm({ ...productPriceForm, dateDebutValidite: e.target.value })}
                          data-testid="input-product-date-debut"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="prod-remarques">Remarques</Label>
                        <Input
                          id="prod-remarques"
                          value={productPriceForm.remarques}
                          onChange={(e) => setProductPriceForm({ ...productPriceForm, remarques: e.target.value })}
                          placeholder="Notes..."
                          data-testid="input-product-remarques"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeProductDialog}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  !productForm.nom.trim() ||
                  !productForm.categorieId ||
                  createProductMutation.isPending ||
                  updateProductMutation.isPending
                }
                data-testid="button-submit-product"
              >
                {editingProduct ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Details Sheet */}
      <Sheet open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <span className="font-mono text-primary">{selectedProduct?.reference}</span>
              <span>{selectedProduct?.nom}</span>
            </SheetTitle>
            <SheetDescription>
              {selectedProduct?.categorie?.nom}
              {selectedProduct?.sousSection && ` / ${selectedProduct.sousSection.nom}`}
            </SheetDescription>
          </SheetHeader>

          {isLoadingDetails ? (
            <LoadingState message="Chargement des détails..." />
          ) : (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selectedProduct?.uniteMesure}</Badge>
                <StatusBadge actif={selectedProduct?.actif ?? true} />
              </div>

              {selectedProduct?.description && (
                <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
              )}

              <Tabs defaultValue="prix" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="prix" className="gap-2">
                    <DollarSign className="h-4 w-4" />
                    Prix
                  </TabsTrigger>
                  <TabsTrigger value="historique" className="gap-2">
                    <History className="h-4 w-4" />
                    Historique
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="prix" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Prix fournisseurs</h3>
                    <Button size="sm" onClick={() => openPriceDialog()} data-testid="button-add-price">
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  {productDetails?.prix && productDetails.prix.length > 0 ? (
                    <div className="space-y-3">
                      {productDetails.prix
                        .filter((p) => p.actif)
                        .map((prix) => (
                          <Card key={prix.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{prix.fournisseur.nom}</span>
                                    <TVABadge
                                      tvaApplicable={prix.fournisseur.tvaApplicable}
                                      tauxTVA={prix.tauxTVA}
                                      tvaOverride={prix.tvaOverride}
                                      size="sm"
                                    />
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-medium">{formatFCFA(prix.prixHT)}</span>
                                    <span className="text-muted-foreground"> HT</span>
                                    <span className="mx-2">→</span>
                                    <span className="font-medium">{formatFCFA(prix.prixTTC)}</span>
                                    <span className="text-muted-foreground"> TTC</span>
                                  </div>
                                  {prix.remarques && (
                                    <p className="text-xs text-muted-foreground">{prix.remarques}</p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openPriceDialog(prix)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletePriceConfirm(prix)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun prix défini pour ce produit
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="historique">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    L'historique des modifications de prix sera affiché ici
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Price Form Dialog */}
      <Dialog open={isPriceDialogOpen} onOpenChange={setIsPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPrice ? "Modifier le prix" : "Nouveau prix fournisseur"}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.reference} - {selectedProduct?.nom}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePriceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Fournisseur *</Label>
              <Select
                value={priceForm.fournisseurId ? priceForm.fournisseurId.toString() : ""}
                onValueChange={handleFournisseurChange}
              >
                <SelectTrigger data-testid="select-price-fournisseur">
                  <SelectValue placeholder="Sélectionner un fournisseur..." />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs
                    .filter((f) => f.actif)
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        <div className="flex items-center gap-2">
                          {f.nom}
                          <TVABadge tvaApplicable={f.tvaApplicable} size="sm" />
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 p-1 rounded-md bg-muted">
              <Button
                type="button"
                variant={priceInputMode === "HT" ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setPriceInputMode("HT")}
              >
                Saisie Prix HT
              </Button>
              <Button
                type="button"
                variant={priceInputMode === "TTC" ? "default" : "ghost"}
                size="sm"
                className="flex-1"
                onClick={() => setPriceInputMode("TTC")}
              >
                Saisie Prix TTC
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prix-ht">Prix HT (FCFA) *</Label>
                <Input
                  id="prix-ht"
                  type="number"
                  value={priceForm.prixHT || ""}
                  onChange={(e) => handlePrixHTChange(parseFloat(e.target.value) || 0)}
                  disabled={priceInputMode === "TTC"}
                  className={priceInputMode === "TTC" ? "bg-muted" : ""}
                  data-testid="input-prix-ht"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taux-tva">Taux TVA (%)</Label>
                <Input
                  id="taux-tva"
                  type="number"
                  value={priceForm.tauxTVA}
                  onChange={(e) => handleTauxTVAChange(parseFloat(e.target.value) || 0)}
                  data-testid="input-taux-tva"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prix-ttc">Prix TTC (FCFA)</Label>
              <Input
                id="prix-ttc"
                type="number"
                value={priceForm.prixTTC || ""}
                onChange={(e) => handlePrixTTCChange(parseFloat(e.target.value) || 0)}
                disabled={priceInputMode === "HT"}
                className={priceInputMode === "HT" ? "bg-muted" : ""}
                data-testid="input-prix-ttc"
              />
              {priceForm.tauxTVA === 0 && (
                <p className="text-xs text-muted-foreground">
                  Prix HT = Prix TTC (sans TVA)
                </p>
              )}
            </div>

            {priceForm.fournisseurId > 0 && (() => {
              const selectedFournisseur = fournisseurs.find((f) => f.id === priceForm.fournisseurId);
              const expectedTaux = selectedFournisseur?.tvaApplicable ? 18 : 0;
              if (priceForm.tauxTVA !== expectedTaux) {
                return (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>TVA modifiée manuellement (différent du profil fournisseur)</span>
                  </div>
                );
              }
              return null;
            })()}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-debut">Date début validité</Label>
                <Input
                  id="date-debut"
                  type="date"
                  value={priceForm.dateDebutValidite}
                  onChange={(e) => setPriceForm({ ...priceForm, dateDebutValidite: e.target.value })}
                  data-testid="input-date-debut"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-fin">Date fin validité</Label>
                <Input
                  id="date-fin"
                  type="date"
                  value={priceForm.dateFinValidite}
                  onChange={(e) => setPriceForm({ ...priceForm, dateFinValidite: e.target.value })}
                  data-testid="input-date-fin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarques">Remarques</Label>
              <Textarea
                id="remarques"
                value={priceForm.remarques}
                onChange={(e) => setPriceForm({ ...priceForm, remarques: e.target.value })}
                placeholder="Notes optionnelles..."
                data-testid="input-remarques"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="prix-actif">Prix actif</Label>
              <Switch
                id="prix-actif"
                checked={priceForm.actif}
                onCheckedChange={(checked) => setPriceForm({ ...priceForm, actif: checked })}
                data-testid="switch-prix-actif"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closePriceDialog}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  !priceForm.fournisseurId ||
                  priceForm.prixHT <= 0 ||
                  createPriceMutation.isPending ||
                  updatePriceMutation.isPending
                }
                data-testid="button-submit-price"
              >
                {editingPrice ? "Enregistrer" : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Supprimer le produit"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteConfirm?.reference} - ${deleteConfirm?.nom}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={() => deleteConfirm && deleteProductMutation.mutate(deleteConfirm.id)}
        variant="destructive"
      />

      {/* Delete Price Confirm */}
      <ConfirmDialog
        open={!!deletePriceConfirm}
        onOpenChange={(open) => !open && setDeletePriceConfirm(null)}
        title="Supprimer le prix"
        description={`Êtes-vous sûr de vouloir supprimer ce prix fournisseur ?`}
        confirmLabel="Supprimer"
        onConfirm={() => deletePriceConfirm && deletePriceMutation.mutate(deletePriceConfirm.id)}
        variant="destructive"
      />
    </div>
  );
}
