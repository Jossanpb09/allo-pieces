import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Car, LogOut, Plus, Pencil, Trash2, Search, ArrowLeft, FileText, Eye, Clock, CheckCircle, XCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Logo component
const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="bg-red-600 rounded-md p-2">
      <Car className="h-5 w-5 text-white" />
    </div>
    <div className="font-heading font-bold text-lg uppercase tracking-tight">
      <span className="text-red-600">ALLO</span>
      <span className="text-white"> PIECES </span>
      <span className="text-red-600">76</span>
    </div>
  </div>
);

// Categories
const CATEGORIES = [
  { id: "carrosserie", name: "Carrosserie" },
  { id: "eclairage", name: "Éclairage" },
  { id: "retroviseur", name: "Rétroviseur" },
  { id: "refroidissement", name: "Refroidissement" },
  { id: "mecanique", name: "Mécanique/Entretien" },
  { id: "accessoires", name: "Accessoires" }
];

const STOCK_OPTIONS = ["En stock", "Sur commande (24-72h)", "Rupture"];

// Stock badge
const StockBadge = ({ stock }) => {
  const variants = {
    "En stock": "bg-green-500 text-white",
    "Sur commande (24-72h)": "bg-amber-500 text-white",
    "Rupture": "bg-red-500 text-white"
  };
  return <Badge className={`${variants[stock] || variants["En stock"]} text-xs`}>{stock}</Badge>;
};

// Login form component
const LoginForm = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem("admin_token", response.data.access_token);
      onLogin();
      toast.success("Connexion réussie");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800" data-testid="admin-login-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-white font-heading text-2xl">Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-400">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@allopieces76.fr"
                className="bg-zinc-800 border-zinc-700 text-white"
                required
                data-testid="admin-email-input"
              />
            </div>
            <div>
              <Label className="text-gray-400">Mot de passe</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-zinc-800 border-zinc-700 text-white"
                required
                data-testid="admin-password-input"
              />
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading} data-testid="admin-login-btn">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Identifiants par défaut: admin@allopieces76.fr / admin123
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Product form dialog
const ProductFormDialog = ({ open, onClose, product, onSave }) => {
  const [formData, setFormData] = useState({
    reference: "",
    name: "",
    price: "",
    stock: "En stock",
    category: "",
    vehicle: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        reference: product.reference,
        name: product.name,
        price: product.price.toString(),
        stock: product.stock,
        category: product.category || "",
        vehicle: product.vehicle || ""
      });
    } else {
      setFormData({
        reference: "",
        name: "",
        price: "",
        stock: "En stock",
        category: "",
        vehicle: ""
      });
    }
  }, [product, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reference || !formData.name || !formData.price) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const data = {
        ...formData,
        price: parseFloat(formData.price)
      };

      if (product) {
        await axios.put(`${API}/products/${product.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Produit modifié");
      } else {
        await axios.post(`${API}/products`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Produit ajouté");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-lg" data-testid="product-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {product ? "Modifier le produit" : "Ajouter un produit"}
          </DialogTitle>
          <DialogDescription>
            Remplissez les informations du produit. Les champs avec * sont obligatoires.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Référence *</Label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="PC-CLIO4-AV"
                required
                data-testid="product-reference-input"
              />
            </div>
            <div>
              <Label>Prix (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="89.90"
                required
                data-testid="product-price-input"
              />
            </div>
          </div>
          <div>
            <Label>Nom de la pièce *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Pare-choc avant Renault Clio 4"
              required
              data-testid="product-name-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Stock *</Label>
              <Select value={formData.stock} onValueChange={(value) => setFormData({ ...formData, stock: value })}>
                <SelectTrigger data-testid="product-stock-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger data-testid="product-category-select">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Véhicule (optionnel)</Label>
            <Input
              value={formData.vehicle}
              onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
              placeholder="Renault Clio 4"
              data-testid="product-vehicle-input"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={loading} data-testid="product-save-btn">
              {loading ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Delete confirmation dialog
const DeleteDialog = ({ open, onClose, onConfirm, productName }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="bg-white sm:max-w-md" data-testid="delete-dialog">
      <DialogHeader>
        <DialogTitle className="text-red-600">Supprimer le produit ?</DialogTitle>
        <DialogDescription>
          Êtes-vous sûr de vouloir supprimer <strong>{productName}</strong> ? Cette action est irréversible.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm} data-testid="delete-confirm-btn">
          Supprimer
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// Main Admin Dashboard
const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [searchQuery]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
      const response = await axios.get(`${API}/products${params}`);
      setProducts(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`${API}/products/${selectedProduct.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Produit supprimé");
      fetchProducts();
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const openEditDialog = (product) => {
    setSelectedProduct(product);
    setFormDialogOpen(true);
  };

  const openDeleteDialog = (product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <Badge className="bg-red-600 text-white">ADMIN</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour au site
            </Button>
            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={onLogout} data-testid="admin-logout-btn">
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="font-heading text-2xl font-bold text-gray-900 uppercase">Gestion des produits</h1>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setSelectedProduct(null); setFormDialogOpen(true); }} data-testid="add-product-btn">
            <Plus className="h-4 w-4 mr-2" /> Ajouter un produit
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher par référence, nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="admin-search-input"
          />
        </div>

        {/* Products table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-bold">Référence</TableHead>
                  <TableHead className="font-bold">Nom</TableHead>
                  <TableHead className="font-bold">Prix</TableHead>
                  <TableHead className="font-bold">Stock</TableHead>
                  <TableHead className="font-bold">Catégorie</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucun produit trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                      <TableCell className="font-mono font-bold text-sm">{product.reference}</TableCell>
                      <TableCell className="max-w-xs truncate">{product.name}</TableCell>
                      <TableCell className="font-bold text-red-600">{product.price.toFixed(2)} €</TableCell>
                      <TableCell><StockBadge stock={product.stock} /></TableCell>
                      <TableCell className="text-gray-500">{CATEGORIES.find(c => c.id === product.category)?.name || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)} data-testid={`edit-product-${product.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => openDeleteDialog(product)} data-testid={`delete-product-${product.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-sm text-gray-500 mt-4">
          Total: {products.length} produit{products.length > 1 ? "s" : ""}
        </p>
      </main>

      <ProductFormDialog
        open={formDialogOpen}
        onClose={() => { setFormDialogOpen(false); setSelectedProduct(null); }}
        product={selectedProduct}
        onSave={fetchProducts}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => { setDeleteDialogOpen(false); setSelectedProduct(null); }}
        onConfirm={handleDelete}
        productName={selectedProduct?.name}
      />
    </div>
  );
};

// Main Admin Page
const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem("admin_token");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    toast.success("Déconnexion réussie");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard onLogout={handleLogout} />;
};

export default AdminPage;
