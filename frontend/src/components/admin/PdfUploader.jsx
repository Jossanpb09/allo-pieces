import { useState, useRef } from "react";
import { FileText, X, Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { adminApi, resolveAssetUrl } from "@/lib/adminApi";

const PdfUploader = ({ pdf, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("PDF trop volumineux (max 10 Mo)");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const res = await adminApi.post("/admin/upload/pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      onChange({ id: res.data.id, url: res.data.url, filename: res.data.filename });
      toast.success("PDF téléversé");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors du téléversement");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div data-testid="pdf-uploader">
      {pdf ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-6 w-6 text-red-600 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{pdf.filename || "document.pdf"}</span>
          </div>
          <div className="flex items-center gap-1">
            <a
              href={resolveAssetUrl(pdf.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:bg-blue-50 p-2 rounded"
              data-testid="download-pdf-btn"
              title="Télécharger"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-red-600 hover:bg-red-50 p-2 rounded"
              data-testid="remove-pdf-btn"
              title="Retirer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-red-600 hover:bg-red-50 transition-colors text-gray-600 flex items-center justify-center gap-2"
          data-testid="add-pdf-btn"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Téléversement..." : "Téléverser un PDF (fiche technique, garantie...)"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        data-testid="pdf-upload-input"
      />
      <p className="text-xs text-gray-500 mt-2">PDF uniquement — max 10 Mo</p>
    </div>
  );
};

export default PdfUploader;
