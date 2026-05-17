import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Car, LogOut, Plus, Pencil, Trash2, Search, ArrowLeft, FileText, Eye, Mail, Phone,
  Tag, Link2, Settings as SettingsIcon, Briefcase, BookOpen, Activity, Upload,
  Star, StarOff, Loader2, ScrollText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { API, adminApi, resolveAssetUrl } from "@/lib/adminApi";
import ImageUploader from "@/components/admin/ImageUploader";
import PdfUploader from "@/components/admin/PdfUploader";
import CsvImporter from "@/components/admin/CsvImporter";
import PromotionsManagement from "@/components/admin/PromotionsManagement";
import QuickLinksManagement from "@/components/admin/QuickLinksManagement";
import SettingsManagement from "@/components/admin/SettingsManagement";
import ProRegistrationsManagement from "@/components/admin/ProRegistrationsManagement";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import HowToGuide from "@/components/admin/HowToGuide";

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

const CATEGORIES = [
  { id: "carrosserie", name: "Carrosserie" },
  { id: "eclairage", name: "Éclairage" },
  { id: "retroviseur", name: "Rétroviseur" },
  { id: "refroidissement", name: "Refroidissement" },
  { id: "mecanique", name: "Mécanique/Entretien" },
  { id: "accessoires", name: "Accessoires" }
];
const STOCK_OPTIONS = ["En stock", "Sur commande (24-72h)", "Rupture"];

const StockBadge = ({ stock }) => {
  const variants = {
    "En stock": "bg-green-500 text-white",
    "Sur commande (24-72h)": "bg-amber-500 text-white",
    "Rupture": "bg-red-500 text-white"
  };
  return <Badge className={`${variants[stock] || variants["En stock"]} text-xs`}>{stock}</Badge>;
};

// ==================== LOGIN ====================
const LoginForm = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

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
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800" data-testid="admin-login-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4"><Logo /></div>
          <CardTitle className="text-white font-heading text-2xl">Administration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-gray-400">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@allopieces76.fr" className="bg-zinc-800 border-zinc-700 text-white" required data-testid="admin-email-input" />
            </div>
            <div>
              <Label className="text-gray-400">Mot de passe</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-zinc-800 border-zinc-700 text-white" required data-testid="admin-password-input" />
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading} data-testid="admin-login-btn">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
            <button type="button" onClick={() => setForgotOpen(true)} className="w-full text-center text-sm text-gray-400 hover:text-white" data-testid="forgot-password-link">
              Mot de passe oublié ?
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Par défaut: admin@allopieces76.fr / admin123
          </p>
        </CardContent>
      </Card>
      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  );
};

// ==================== FORGOT PASSWORD ====================
const ForgotPasswordDialog = ({ open, onClose }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setStep(1); setEmail(""); setToken(""); setNewPassword("");
  };

  const requestToken = async () => {
    if (!email) { toast.error("Email requis"); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { email });
      if (res.data.reset_token) {
        setToken(res.data.reset_token);
        toast.success("Code généré (valide 2h)");
      } else {
        toast.success("Si l'email existe, un code a été généré");
      }
      setStep(2);
    } catch {
      toast.error("Erreur");
    } finally { setLoading(false); }
  };

  const submitReset = async () => {
    if (!token || newPassword.length < 6) { toast.error("Code et nouveau mot de passe requis (min 6 caractères)"); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: newPassword });
      toast.success("Mot de passe réinitialisé. Connectez-vous.");
      reset();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="bg-white" data-testid="forgot-password-dialog">
        <DialogHeader>
          <DialogTitle>Mot de passe oublié</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Entrez votre email pour générer un code de réinitialisation." : "Entrez le code reçu et votre nouveau mot de passe."}
          </DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <div className="space-y-3">
            <div>
              <Label>Email admin</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@allopieces76.fr" data-testid="forgot-email-input" />
            </div>
            <Button onClick={requestToken} disabled={loading} className="w-full bg-red-600 hover:bg-red-700" data-testid="forgot-submit-btn">
              {loading ? "..." : "Générer un code"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {token && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs">
                <p className="font-bold mb-1">Code (dev mode — copiez ci-dessous) :</p>
                <code className="break-all text-amber-900">{token}</code>
              </div>
            )}
            <div>
              <Label>Code de réinitialisation</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} data-testid="reset-token-input" />
            </div>
            <div>
              <Label>Nouveau mot de passe (min 6 caractères)</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="reset-password-input" />
            </div>
            <Button onClick={submitReset} disabled={loading} className="w-full bg-red-600 hover:bg-red-700" data-testid="reset-submit-btn">
              {loading ? "..." : "Réinitialiser"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ==================== PRODUCT FORM ====================
const ProductFormDialog = ({ open, onClose, product, onSave }) => {
  const [formData, setFormData] = useState({
    reference: "", name: "", price: "", stock: "En stock", category: "", vehicle: "",
    description: "", images: [], pdf: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        reference: product.reference || "",
        name: product.name || "",
        price: product.price?.toString() || "",
        stock: product.stock || "En stock",
        category: product.category || "",
        vehicle: product.vehicle || "",
        description: product.description || "",
        images: product.images || [],
        pdf: product.pdf || null
      });
    } else {
      setFormData({ reference: "", name: "", price: "", stock: "En stock", category: "", vehicle: "", description: "", images: [], pdf: null });
    }
  }, [product, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reference || !formData.name || !formData.price) {
      toast.error("Référence, nom et prix sont obligatoires");
      return;
    }
    setLoading(true);
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        category: formData.category || null,
        vehicle: formData.vehicle || null,
        description: formData.description || null,
        pdf: formData.pdf || null
      };
      if (product) {
        await adminApi.put(`/products/${product.id}`, data);
        toast.success("Produit modifié");
      } else {
        await adminApi.post("/products", data);
        toast.success("Produit ajouté");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-form-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{product ? "Modifier le produit" : "Ajouter un produit"}</DialogTitle>
          <DialogDescription>Les champs avec * sont obligatoires.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Référence *</Label>
              <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="PC-CLIO4-AV" required data-testid="product-reference-input" />
            </div>
            <div>
              <Label>Prix (€) *</Label>
              <Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="89.90" required data-testid="product-price-input" />
            </div>
          </div>
          <div>
            <Label>Nom de la pièce *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Pare-choc avant Renault Clio 4" required data-testid="product-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Stock *</Label>
              <Select value={formData.stock} onValueChange={(value) => setFormData({ ...formData, stock: value })}>
                <SelectTrigger data-testid="product-stock-select"><SelectValue /></SelectTrigger>
                <SelectContent>{STOCK_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger data-testid="product-category-select"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Véhicule (optionnel)</Label>
            <Input value={formData.vehicle} onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })} placeholder="Renault Clio 4" data-testid="product-vehicle-input" />
          </div>
          <div>
            <Label>Description (optionnel)</Label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails techniques, compatibilités, garantie..."
              className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="border-t pt-3">
            <Label className="text-base font-bold">Photos du produit</Label>
            <p className="text-xs text-gray-500 mb-2">Téléverser jusqu'à 8 images. Resize 2048px max, conversion WebP + thumbnails 300x300 automatiques.</p>
            <ImageUploader images={formData.images} onChange={(imgs) => setFormData({ ...formData, images: imgs })} />
          </div>
          <div className="border-t pt-3">
            <Label className="text-base font-bold">Document PDF (optionnel)</Label>
            <PdfUploader pdf={formData.pdf} onChange={(p) => setFormData({ ...formData, pdf: p })} />
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

// ==================== DELETE DIALOG ====================
const DeleteDialog = ({ open, onClose, onConfirm, productName }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="bg-white sm:max-w-md" data-testid="delete-dialog">
      <DialogHeader>
        <DialogTitle className="text-red-600">Mettre à la corbeille ?</DialogTitle>
        <DialogDescription>
          <strong>{productName}</strong> sera déplacé vers la corbeille. Vous pourrez le restaurer depuis l'onglet "Corbeille".
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm} data-testid="delete-confirm-btn">Supprimer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ==================== TRASH ====================
const ProductsTrash = ({ onRestored }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get("/products/trash/list");
      setList(res.data);
    } catch { toast.error("Erreur chargement"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTrash(); }, []);

  const restore = async (id) => {
    try {
      await adminApi.post(`/products/${id}/restore`);
      toast.success("Restauré");
      fetchTrash();
      onRestored?.();
    } catch { toast.error("Erreur"); }
  };

  const permDelete = async (id, name) => {
    if (!window.confirm(`Supprimer DÉFINITIVEMENT "${name}" ? Cette action est irréversible.`)) return;
    try {
      await adminApi.delete(`/products/${id}/permanent`);
      toast.success("Supprimé définitivement");
      fetchTrash();
    } catch { toast.error("Erreur"); }
  };

  return (
    <div data-testid="trash-management">
      <h2 className="font-heading text-xl font-bold mb-4">Corbeille</h2>
      <p className="text-sm text-gray-600 mb-3">Les produits supprimés sont conservés ici. Vous pouvez les restaurer ou les supprimer définitivement.</p>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-gray-50">
              <TableHead>Réf.</TableHead><TableHead>Nom</TableHead><TableHead>Prix</TableHead><TableHead>Supprimé le</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></TableCell></TableRow> :
                list.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Corbeille vide</TableCell></TableRow> :
                list.map((p) => (
                  <TableRow key={p.id} data-testid={`trash-row-${p.id}`}>
                    <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-red-600 font-bold">{p.price.toFixed(2)} €</TableCell>
                    <TableCell className="text-xs">{p.deleted_at ? new Date(p.deleted_at).toLocaleString("fr-FR") : "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => restore(p.id)} data-testid={`restore-${p.id}`}>Restaurer</Button>
                      <Button size="sm" variant="ghost" className="text-red-600 ml-2" onClick={() => permDelete(p.id, p.name)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== AUDIT LOG ====================
const AuditLogView = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get("/admin/audit-log?limit=200").then((r) => setList(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div data-testid="audit-log">
      <h2 className="font-heading text-xl font-bold mb-4 flex items-center gap-2"><ScrollText className="h-5 w-5" /> Journal d'audit</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-gray-50">
              <TableHead>Date</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Type</TableHead><TableHead>Résumé</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></TableCell></TableRow> :
                list.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Aucune action enregistrée</TableCell></TableRow> :
                list.map((a, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{new Date(a.timestamp).toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-xs">{a.admin_email}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.action}</Badge></TableCell>
                    <TableCell className="text-xs">{a.target_type}</TableCell>
                    <TableCell className="text-sm">{a.summary}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== QUOTES MANAGEMENT (existing) ====================
const QuoteStatusBadge = ({ status }) => {
  const variants = { pending: "bg-amber-500 text-white", processed: "bg-blue-500 text-white", quoted: "bg-green-500 text-white", rejected: "bg-red-500 text-white" };
  const labels = { pending: "En attente", processed: "Traité", quoted: "Devis envoyé", rejected: "Refusé" };
  return <Badge className={`${variants[status] || variants.pending} text-xs`}>{labels[status] || status}</Badge>;
};

const QuoteDetailDialog = ({ open, onClose, quote, onStatusUpdate }) => {
  const [status, setStatus] = useState(quote?.status || "pending");
  const [notes, setNotes] = useState(quote?.admin_notes || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (quote) { setStatus(quote.status); setNotes(quote.admin_notes || ""); }
  }, [quote]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await adminApi.put(`/quotes/${quote.id}`, { status, admin_notes: notes });
      toast.success("Mis à jour");
      onStatusUpdate(); onClose();
    } catch { toast.error("Erreur"); }
    finally { setLoading(false); }
  };

  if (!quote) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-lg" data-testid="quote-detail-dialog">
        <DialogHeader><DialogTitle className="font-heading text-xl flex items-center gap-2"><FileText className="h-5 w-5 text-red-600" />Détail demande</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-gray-500">Nom</Label><p>{quote.name}</p></div>
            <div><Label className="text-xs text-gray-500">Téléphone</Label><a href={`tel:${quote.phone}`} className="text-blue-600 flex items-center gap-1"><Phone className="h-3 w-3" />{quote.phone}</a></div>
          </div>
          <div><Label className="text-xs text-gray-500">Email</Label><a href={`mailto:${quote.email}`} className="text-blue-600 flex items-center gap-1"><Mail className="h-3 w-3" />{quote.email}</a></div>
          <div><Label className="text-xs text-gray-500">Plaque / VIN</Label><p className="font-mono font-bold bg-gray-100 px-3 py-2 rounded">{quote.plate_or_vin}</p></div>
          <div><Label className="text-xs text-gray-500">Pièce</Label><p className="bg-gray-50 p-3 rounded border text-sm">{quote.part_description}</p></div>
          <div className="grid grid-cols-2 gap-3 border-t pt-3">
            <div>
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="processed">Traité</SelectItem>
                  <SelectItem value="quoted">Devis envoyé</SelectItem>
                  <SelectItem value="rejected">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-gray-500">Date</Label><p className="text-sm">{new Date(quote.created_at).toLocaleString("fr-FR")}</p></div>
          </div>
          <div>
            <Label>Notes admin</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[60px] p-2 border rounded text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleSave} disabled={loading}>{loading ? "..." : "Sauvegarder"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const QuotesManagement = () => {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, processed: 0, quoted: 0 });

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const r = await adminApi.get("/quotes");
      setQuotes(r.data);
    } catch { toast.error("Erreur"); }
    finally { setLoading(false); }
  };
  const fetchStats = async () => {
    try { const r = await adminApi.get("/quotes/stats/summary"); setStats(r.data); } catch {}
  };

  useEffect(() => { fetchQuotes(); fetchStats(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette demande ?")) return;
    try { await adminApi.delete(`/quotes/${id}`); toast.success("Supprimé"); fetchQuotes(); fetchStats(); }
    catch { toast.error("Erreur"); }
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{stats.total}</p><p className="text-sm text-gray-500">Total</p></CardContent></Card>
        <Card className="bg-amber-50 border-amber-200"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-amber-600">{stats.pending}</p><p className="text-sm text-amber-700">En attente</p></CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-blue-600">{stats.processed}</p><p className="text-sm text-blue-700">Traités</p></CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-green-600">{stats.quoted}</p><p className="text-sm text-green-700">Envoyés</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-gray-50">
              <TableHead>Date</TableHead><TableHead>Client</TableHead><TableHead>Plaque/VIN</TableHead><TableHead>Pièce</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></TableCell></TableRow> :
                quotes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Aucune demande</TableCell></TableRow> :
                quotes.map((q) => (
                  <TableRow key={q.id} className={q.status === "pending" ? "bg-amber-50" : ""} data-testid={`quote-row-${q.id}`}>
                    <TableCell className="text-xs">{new Date(q.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell><div className="font-medium">{q.name}</div><div className="text-xs text-gray-500">{q.email}</div></TableCell>
                    <TableCell className="font-mono text-xs">{q.plate_or_vin}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{q.part_description}</TableCell>
                    <TableCell><QuoteStatusBadge status={q.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedQuote(q); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(q.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <QuoteDetailDialog open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedQuote(null); }} quote={selectedQuote} onStatusUpdate={() => { fetchQuotes(); fetchStats(); }} />
    </div>
  );
};

// ==================== PRODUCTS MANAGEMENT ====================
const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "";
      const r = await adminApi.get(`/products${params}`);
      setProducts(r.data);
    } catch { toast.error("Erreur"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [searchQuery]);

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await adminApi.delete(`/products/${selected.id}`);
      toast.success("Mis en corbeille");
      fetchProducts();
      setDeleteOpen(false); setSelected(null);
    } catch { toast.error("Erreur"); }
  };

  const togglePin = async (p) => {
    try {
      const r = await adminApi.post(`/products/${p.id}/pin`);
      toast.success(r.data.featured ? "Produit épinglé" : "Désépinglé");
      fetchProducts();
    } catch { toast.error("Erreur"); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="font-heading text-2xl font-bold text-gray-900 uppercase">Gestion des produits</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(!showImport)} data-testid="toggle-csv-import">
            <Upload className="h-4 w-4 mr-2" />{showImport ? "Masquer l'import" : "Import CSV"}
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => { setSelected(null); setFormOpen(true); }} data-testid="add-product-btn">
            <Plus className="h-4 w-4 mr-2" /> Ajouter
          </Button>
        </div>
      </div>

      {showImport && (
        <div className="mb-6">
          <CsvImporter onImported={() => { fetchProducts(); setShowImport(false); }} />
        </div>
      )}

      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input type="text" placeholder="Rechercher par référence, nom..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="admin-search-input" />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="bg-gray-50">
              <TableHead>Image</TableHead><TableHead>Référence</TableHead><TableHead>Nom</TableHead><TableHead>Prix</TableHead><TableHead>Stock</TableHead><TableHead>Catégorie</TableHead><TableHead>Vedette</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></TableCell></TableRow> :
                products.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">Aucun produit</TableCell></TableRow> :
                products.map((p) => (
                  <TableRow key={p.id} data-testid={`product-row-${p.id}`}>
                    <TableCell>
                      {p.images?.[0] ? <img src={resolveAssetUrl(p.images[0].thumbnail_url)} alt="" className="w-10 h-10 object-cover rounded" /> : <span className="text-gray-300 text-xs">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                    <TableCell className="max-w-xs truncate">{p.name}</TableCell>
                    <TableCell className="font-bold text-red-600">{p.price.toFixed(2)} €</TableCell>
                    <TableCell><StockBadge stock={p.stock} /></TableCell>
                    <TableCell className="text-xs text-gray-500">{CATEGORIES.find((c) => c.id === p.category)?.name || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => togglePin(p)} data-testid={`pin-${p.id}`} title={p.featured ? "Désépingler" : "Épingler"}>
                        {p.featured ? <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : <StarOff className="h-4 w-4 text-gray-300" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSelected(p); setFormOpen(true); }} data-testid={`edit-product-${p.id}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => { setSelected(p); setDeleteOpen(true); }} data-testid={`delete-product-${p.id}`}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-sm text-gray-500 mt-3">Total: {products.length} produit{products.length > 1 ? "s" : ""}</p>

      <ProductFormDialog open={formOpen} onClose={() => { setFormOpen(false); setSelected(null); }} product={selected} onSave={fetchProducts} />
      <DeleteDialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setSelected(null); }} onConfirm={handleDelete} productName={selected?.name} />
    </div>
  );
};

// ==================== MAIN DASHBOARD ====================
const AdminDashboard = ({ onLogout }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-100" data-testid="admin-dashboard">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <Badge className="bg-red-600 text-white">ADMIN</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Site
            </Button>
            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={onLogout} data-testid="admin-logout-btn">
              <LogOut className="h-4 w-4 mr-2" /> Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto p-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-1" data-testid="tab-dashboard"><Activity className="h-4 w-4" /> Tableau de bord</TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1" data-testid="tab-products"><Car className="h-4 w-4" /> Produits</TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-1" data-testid="tab-quotes"><FileText className="h-4 w-4" /> Devis</TabsTrigger>
            <TabsTrigger value="pros" className="flex items-center gap-1" data-testid="tab-pros"><Briefcase className="h-4 w-4" /> Demandes Pro</TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-1" data-testid="tab-promotions"><Tag className="h-4 w-4" /> Promotions</TabsTrigger>
            <TabsTrigger value="quicklinks" className="flex items-center gap-1" data-testid="tab-quicklinks"><Link2 className="h-4 w-4" /> Liens rapides</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1" data-testid="tab-settings"><SettingsIcon className="h-4 w-4" /> Paramètres</TabsTrigger>
            <TabsTrigger value="trash" className="flex items-center gap-1" data-testid="tab-trash"><Trash2 className="h-4 w-4" /> Corbeille</TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1" data-testid="tab-audit"><ScrollText className="h-4 w-4" /> Journal</TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-1" data-testid="tab-help"><BookOpen className="h-4 w-4" /> Aide</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard"><AnalyticsDashboard /></TabsContent>
            <TabsContent value="products"><ProductsManagement /></TabsContent>
            <TabsContent value="quotes"><h1 className="font-heading text-2xl font-bold uppercase mb-4">Demandes de devis</h1><QuotesManagement /></TabsContent>
            <TabsContent value="pros"><ProRegistrationsManagement /></TabsContent>
            <TabsContent value="promotions"><PromotionsManagement /></TabsContent>
            <TabsContent value="quicklinks"><QuickLinksManagement /></TabsContent>
            <TabsContent value="settings"><SettingsManagement /></TabsContent>
            <TabsContent value="trash"><ProductsTrash /></TabsContent>
            <TabsContent value="audit"><AuditLogView /></TabsContent>
            <TabsContent value="help"><HowToGuide /></TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

// ==================== MAIN ADMIN PAGE ====================
const AdminPage = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) { setLoading(false); return; }
    axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => setIsAuth(true))
      .catch(() => localStorage.removeItem("admin_token"))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuth(false);
    toast.success("Déconnexion réussie");
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-red-600" /></div>;
  }
  if (!isAuth) return <LoginForm onLogin={() => setIsAuth(true)} />;
  return <AdminDashboard onLogout={handleLogout} />;
};

export default AdminPage;
