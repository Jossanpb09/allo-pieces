import { useEffect, useState } from "react";
import { Activity, Package, FileText, Upload, Briefcase, ImageIcon, Tag, RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminApi } from "@/lib/adminApi";

const StatCard = ({ icon: Icon, label, value, color = "red", sub }) => (
  <Card className="bg-white hover:shadow-md transition-shadow" data-testid={`stat-${label.replace(/\s+/g, "-")}`}>
    <CardContent className="p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
        <Icon className={`h-5 w-5 text-${color}-600`} />
      </div>
      <p className="text-3xl font-heading font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get("/admin/analytics");
      setData(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-600" /></div>;

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      <div className="flex justify-between items-center">
        <h2 className="font-heading text-xl font-bold flex items-center gap-2"><Activity className="h-5 w-5" /> Tableau de bord</h2>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-3 w-3 mr-1" />Actualiser</Button>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Catalogue</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Package} label="Total produits" value={data.products.total} color="red" />
          <StatCard icon={Package} label="En stock" value={data.products.in_stock} color="green" />
          <StatCard icon={Package} label="Sur commande" value={data.products.on_order} color="amber" />
          <StatCard icon={Package} label="Rupture" value={data.products.out_of_stock} color="red" />
          <StatCard icon={Tag} label="Épinglés" value={data.products.featured} color="blue" />
          <StatCard icon={Package} label="Corbeille" value={data.products.trashed} color="gray" />
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Médias & Demandes</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={ImageIcon} label="Images" value={data.uploads.images} color="blue" sub="téléversées" />
          <StatCard icon={Upload} label="PDFs" value={data.uploads.pdfs} color="blue" />
          <StatCard icon={FileText} label="Devis" value={data.quotes.total} sub={`${data.quotes.pending} en attente`} />
          <StatCard icon={Tag} label="Promotions actives" value={data.promotions.active} sub={`/ ${data.promotions.total} total`} />
          <StatCard icon={Briefcase} label="Demandes Pro" value={data.pro_registrations.total} sub={`${data.pro_registrations.pending} en attente`} />
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Activité récente (10 dernières actions)</p>
        <Card>
          <CardContent className="p-0">
            {(data.recent_actions || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Aucune activité enregistrée</div>
            ) : (
              <ul className="divide-y">
                {(data.recent_actions || []).map((a, i) => (
                  <li key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{a.summary}</p>
                      <p className="text-xs text-gray-500">{a.admin_email} · {a.target_type}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleString("fr-FR")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
