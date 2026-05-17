import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Power, Loader2, Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { adminApi, resolveAssetUrl } from "@/lib/adminApi";

const empty = { title: "", description: "", image_url: "", link: "", badge: "", active: true, start_date: "", end_date: "", order: 0 };

const PromotionsManagement = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get("/admin/promotions");
      setList(res.data);
    } catch {
      toast.error("Erreur chargement promotions");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, []);

  const openCreate = () => { setEditing(null); setFormData(empty); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setFormData({
      title: p.title || "",
      description: p.description || "",
      image_url: p.image_url || "",
      link: p.link || "",
      badge: p.badge || "",
      active: !!p.active,
      start_date: p.start_date ? p.start_date.substring(0, 16) : "",
      end_date: p.end_date ? p.end_date.substring(0, 16) : "",
      order: p.order || 0
    });
    setOpen(true);
  };

  const uploadImage = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image > 5 Mo"); return; }
    const fd = new FormData(); fd.append("file", file);
    setUploading(true);
    try {
      const res = await adminApi.post("/admin/upload/promotion-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFormData((s) => ({ ...s, image_url: res.data.url }));
      toast.success("Image téléversée");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const save = async () => {
    if (!formData.title.trim()) { toast.error("Titre requis"); return; }
    setSaving(true);
    try {
      const payload = { ...formData };
      payload.start_date = payload.start_date ? new Date(payload.start_date).toISOString() : null;
      payload.end_date = payload.end_date ? new Date(payload.end_date).toISOString() : null;
      payload.order = Number(payload.order) || 0;
      if (editing) {
        await adminApi.put(`/admin/promotions/${editing.id}`, payload);
        toast.success("Promotion mise à jour");
      } else {
        await adminApi.post("/admin/promotions", payload);
        toast.success("Promotion créée");
      }
      setOpen(false);
      fetchList();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur sauvegarde");
    } finally { setSaving(false); }
  };

  const toggleActive = async (p) => {
    try {
      await adminApi.put(`/admin/promotions/${p.id}`, { active: !p.active });
      fetchList();
    } catch { toast.error("Erreur"); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Supprimer la promotion "${p.title}" ?`)) return;
    try {
      await adminApi.delete(`/admin/promotions/${p.id}`);
      toast.success("Supprimée");
      fetchList();
    } catch { toast.error("Erreur"); }
  };

  return (
    <div data-testid="promotions-management">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading text-xl font-bold">Promotions & bannières</h2>
        <Button className="bg-red-600 hover:bg-red-700" onClick={openCreate} data-testid="add-promotion-btn">
          <Plus className="h-4 w-4 mr-2" /> Nouvelle promotion
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Image</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Ordre</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></TableCell></TableRow>
              ) : list.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">Aucune promotion. Cliquez sur "Nouvelle promotion" pour commencer.</TableCell></TableRow>
              ) : list.map((p) => (
                <TableRow key={p.id} data-testid={`promo-row-${p.id}`}>
                  <TableCell>
                    {p.image_url ? <img src={resolveAssetUrl(p.image_url)} alt="" className="w-16 h-12 object-cover rounded" /> : <span className="text-gray-300 text-xs">—</span>}
                  </TableCell>
                  <TableCell><div className="font-bold">{p.title}</div>{p.description && <div className="text-xs text-gray-500 max-w-xs truncate">{p.description}</div>}</TableCell>
                  <TableCell>{p.badge && <Badge className="bg-amber-500">{p.badge}</Badge>}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {p.start_date && <div>Du: {new Date(p.start_date).toLocaleDateString("fr-FR")}</div>}
                    {p.end_date && <div>Au: {new Date(p.end_date).toLocaleDateString("fr-FR")}</div>}
                  </TableCell>
                  <TableCell>{p.order}</TableCell>
                  <TableCell>
                    <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} data-testid={`promo-toggle-${p.id}`} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid="promotion-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier" : "Nouvelle"} promotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: -20% sur tous les pare-chocs" data-testid="promo-title-input" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full min-h-[60px] px-3 py-2 border rounded-md text-sm"
                placeholder="Texte court visible sur la bannière"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Badge (court)</Label>
                <Input value={formData.badge} onChange={(e) => setFormData({ ...formData, badge: e.target.value })} placeholder="-20%, NOUVEAU..." />
              </div>
              <div>
                <Label>Lien (optionnel)</Label>
                <Input value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Image bannière</Label>
              <div className="flex items-center gap-3 mt-1">
                {formData.image_url ? (
                  <div className="relative">
                    <img src={resolveAssetUrl(formData.image_url)} alt="" className="w-32 h-20 object-cover rounded border" />
                    <button type="button" onClick={() => setFormData({ ...formData, image_url: "" })} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
                  </div>
                ) : (
                  <button type="button" onClick={() => inputRef.current?.click()} className="w-32 h-20 border-2 border-dashed rounded flex items-center justify-center text-gray-500 hover:border-red-600">
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  </button>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e.target.files?.[0])} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Début (planifier)</Label>
                <Input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="datetime-local" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formData.active} onCheckedChange={(v) => setFormData({ ...formData, active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving} data-testid="promo-save-btn">
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromotionsManagement;
