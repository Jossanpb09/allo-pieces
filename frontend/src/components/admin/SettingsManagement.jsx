import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { adminApi, resolveAssetUrl } from "@/lib/adminApi";

const SettingsManagement = () => {
  const [settings, setSettings] = useState(null);
  const [toggles, setToggles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const inputRef = useRef(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        adminApi.get("/settings"),
        adminApi.get("/admin/feature-toggles")
      ]);
      setSettings(s.data);
      setToggles(t.data);
    } catch { toast.error("Erreur chargement paramètres"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const updateField = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.put("/admin/settings", {
        logo_animation_enabled: settings.logo_animation_enabled,
        logo_animation_type: settings.logo_animation_type,
        brand_primary_color: settings.brand_primary_color,
        brand_accent_color: settings.brand_accent_color,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        contact_whatsapp: settings.contact_whatsapp
      });
      toast.success("Paramètres enregistrés");
    } catch { toast.error("Erreur sauvegarde"); }
    finally { setSaving(false); }
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo > 5 Mo"); return; }
    const fd = new FormData(); fd.append("file", file);
    setUploadingLogo(true);
    try {
      const res = await adminApi.post("/admin/upload/logo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSettings((s) => ({ ...s, logo_url: res.data.url }));
      toast.success("Logo mis à jour");
    } catch (err) { toast.error(err.response?.data?.detail || "Erreur upload"); }
    finally {
      setUploadingLogo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const toggle = async (key, enabled) => {
    try {
      await adminApi.put(`/admin/feature-toggles/${key}`, { enabled });
      setToggles((s) => s.map((t) => (t.key === key ? { ...t, enabled } : t)));
      toast.success(`${key}: ${enabled ? "Activé" : "Désactivé"}`);
    } catch { toast.error("Erreur"); }
  };

  if (loading || !settings) return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></div>;

  return (
    <div className="space-y-6" data-testid="settings-management">
      <h2 className="font-heading text-xl font-bold">Paramètres du site</h2>

      <Card>
        <CardHeader><CardTitle className="text-lg">Logo & Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Logo actuel</Label>
            <div className="flex items-center gap-4 mt-2">
              {settings.logo_url ? (
                <div className="bg-zinc-900 p-3 rounded-lg">
                  <img src={resolveAssetUrl(settings.logo_url)} alt="Logo" className="h-12 object-contain" />
                </div>
              ) : (
                <div className="bg-gray-100 p-4 rounded-lg text-gray-400 italic text-sm">Logo texte par défaut (ALLO PIECES 76)</div>
              )}
              <Button onClick={() => inputRef.current?.click()} disabled={uploadingLogo} variant="outline" data-testid="upload-logo-btn">
                {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Téléverser un logo
              </Button>
              {settings.logo_url && (
                <Button variant="ghost" className="text-red-600" onClick={() => updateField("logo_url", null)}>Retirer</Button>
              )}
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} />
            </div>
            <p className="text-xs text-gray-500 mt-2">PNG/JPG/WebP avec ou sans transparence — max 5 Mo, redimensionné automatiquement.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Switch checked={settings.logo_animation_enabled} onCheckedChange={(v) => updateField("logo_animation_enabled", v)} data-testid="logo-animation-switch" />
              <Label>Animation du logo</Label>
            </div>
            <div>
              <Label>Type d'animation</Label>
              <Select value={settings.logo_animation_type} onValueChange={(v) => updateField("logo_animation_type", v)} disabled={!settings.logo_animation_enabled}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pulse">Pulse (battement)</SelectItem>
                  <SelectItem value="slide-in">Slide-in (glissement)</SelectItem>
                  <SelectItem value="bounce">Bounce (rebond)</SelectItem>
                  <SelectItem value="none">Aucune</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Couleur principale</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={settings.brand_primary_color} onChange={(e) => updateField("brand_primary_color", e.target.value)} className="h-10 w-12 rounded border" />
                <Input value={settings.brand_primary_color} onChange={(e) => updateField("brand_primary_color", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Couleur accent</Label>
              <div className="flex gap-2 mt-1">
                <input type="color" value={settings.brand_accent_color} onChange={(e) => updateField("brand_accent_color", e.target.value)} className="h-10 w-12 rounded border" />
                <Input value={settings.brand_accent_color} onChange={(e) => updateField("brand_accent_color", e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Coordonnées de contact</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Email</Label>
              <Input value={settings.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} data-testid="contact-email-input" />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={settings.contact_phone} onChange={(e) => updateField("contact_phone", e.target.value)} data-testid="contact-phone-input" />
            </div>
            <div>
              <Label>WhatsApp (avec +indicatif)</Label>
              <Input value={settings.contact_whatsapp} onChange={(e) => updateField("contact_whatsapp", e.target.value)} data-testid="contact-whatsapp-input" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Options du site (activer / désactiver)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {toggles.map((t) => (
              <div key={t.key} className="flex items-start justify-between p-3 border rounded-lg" data-testid={`toggle-${t.key}`}>
                <div className="flex-1 pr-3">
                  <p className="font-medium text-sm">{t.label}</p>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                </div>
                <Switch checked={t.enabled} onCheckedChange={(v) => toggle(t.key, v)} data-testid={`toggle-switch-${t.key}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-0 bg-white py-3 border-t">
        <Button className="bg-red-600 hover:bg-red-700" onClick={save} disabled={saving} data-testid="save-settings-btn">
          {saving ? "Sauvegarde..." : "Enregistrer les paramètres"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsManagement;
