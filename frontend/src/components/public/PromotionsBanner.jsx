import { useEffect, useState } from "react";
import axios from "axios";
import { Tag, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BASE = process.env.REACT_APP_BACKEND_URL;

const PromotionsBanner = () => {
  const [promos, setPromos] = useState([]);
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    axios.get(`${API}/promotions`)
      .then((res) => setPromos(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (promos.length < 2) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % promos.length), 5000);
    return () => clearInterval(id);
  }, [promos.length]);

  if (dismissed || promos.length === 0) return null;
  const p = promos[current];

  return (
    <section className="bg-gradient-to-r from-red-600 via-red-700 to-amber-500 text-white py-3 sm:py-4 relative overflow-hidden" data-testid="promotions-banner">
      <div className="container mx-auto px-4 flex items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          {p.image_url && (
            <img src={`${BASE}${p.image_url}`} alt="" className="h-12 w-12 sm:h-16 sm:w-16 object-cover rounded-md hidden sm:block flex-shrink-0" />
          )}
          {p.badge && <Badge className="bg-amber-400 text-black font-bold flex-shrink-0">{p.badge}</Badge>}
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-sm sm:text-base uppercase truncate">{p.title}</p>
            {p.description && <p className="text-xs sm:text-sm text-white/90 truncate">{p.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {p.link && (
            <a href={p.link} target={p.link.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer" className="hidden sm:inline-flex bg-white text-red-600 font-bold px-4 py-1.5 rounded-full text-sm hover:bg-gray-100" data-testid={`promo-cta-${p.id}`}>
              En profiter
            </a>
          )}
          {promos.length > 1 && (
            <>
              <button onClick={() => setCurrent((c) => (c - 1 + promos.length) % promos.length)} className="hover:bg-white/20 rounded-full p-1" aria-label="Précédent">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs">{current + 1}/{promos.length}</span>
              <button onClick={() => setCurrent((c) => (c + 1) % promos.length)} className="hover:bg-white/20 rounded-full p-1" aria-label="Suivant">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <button onClick={() => setDismissed(true)} className="hover:bg-white/20 rounded-full p-1" aria-label="Fermer" data-testid="dismiss-promo-btn">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default PromotionsBanner;
