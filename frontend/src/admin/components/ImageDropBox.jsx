import { useRef, useState } from "react";

export default function ImageDropBox({ preview, onFileSelected }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelected(file);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center text-center p-6 min-h-[180px] ${
        dragOver ? "border-primary bg-primary-container/20" : "border-outline-variant bg-surface-container-low"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {preview ? (
        <img src={preview} alt="Announcement preview" className="max-h-40 rounded-lg object-cover" />
      ) : (
        <>
          <span className="material-symbols-outlined text-primary text-[36px] mb-2">cloud_upload</span>
          <p className="text-sm font-semibold text-on-surface">Drag &amp; drop an image, or click to browse</p>
          <p className="text-xs text-on-surface-variant mt-1">PNG, JPG up to 10MB</p>
        </>
      )}
    </div>
  );
}
