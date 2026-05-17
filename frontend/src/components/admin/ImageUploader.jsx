import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminApi, resolveAssetUrl } from "@/lib/adminApi";

/**
 * Multi-image uploader with preview. Calls onChange(images[]) when list changes.
 * Each image: { id, url, thumbnail_url, filename }
 */
const ImageUploader = ({ images = [], onChange, max = 8 }) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    if (images.length + files.length > max) {
      toast.error(`Maximum ${max} images par produit`);
      return;
    }
    const formData = new FormData();
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: dépasse 5 Mo`);
        return;
      }
      formData.append("files", f);
    }
    setUploading(true);
    try {
      const res = await adminApi.post("/admin/upload/images", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const newImages = [...images, ...res.data.images];
      onChange(newImages);
      toast.success(`${res.data.images.length} image(s) téléversée(s)`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors du téléversement");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = (id) => {
    onChange(images.filter((img) => img.id !== id));
  };

  return (
    <div data-testid="image-uploader">
      <div className="flex flex-wrap gap-3 mb-3">
        {images.map((img) => (
          <div key={img.id} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50" data-testid={`uploaded-image-${img.id}`}>
            <img src={resolveAssetUrl(img.thumbnail_url || img.url)} alt={img.alt || img.filename || ""} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(img.id)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`remove-image-${img.id}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-red-600 hover:bg-red-50 transition-colors flex flex-col items-center justify-center text-gray-500"
            data-testid="add-image-btn"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImageIcon className="h-5 w-5 mb-1" /><span className="text-xs">Ajouter</span></>}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        data-testid="image-upload-input"
      />
      <p className="text-xs text-gray-500">
        <Upload className="inline h-3 w-3 mr-1" />
        JPG, PNG ou WebP — max 5 Mo par image, {max} images max. Redimensionnement et conversion WebP automatiques.
      </p>
    </div>
  );
};

export default ImageUploader;
