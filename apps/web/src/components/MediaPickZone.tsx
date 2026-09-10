import { useRef, useState, type DragEvent } from "react";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

type Props = {
  onFile: (file: File | undefined) => void;
  disabled?: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPickZone({ onFile, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | undefined>();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pickErr, setPickErr] = useState<string | null>(null);

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const applyFile = (next: File | undefined) => {
    clearPreview();
    setPickErr(null);
    if (!next) {
      setFile(undefined);
      onFile(undefined);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (!next.type.startsWith("image/") && !next.type.startsWith("video/")) {
      setPickErr("Choose a photo or short video (JPG, PNG, WebP, GIF, MP4, WebM).");
      return;
    }
    setFile(next);
    onFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    if (inputRef.current) inputRef.current.value = "";
  };

  const onInputChange = (list: FileList | null) => {
    applyFile(list?.[0]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    onInputChange(e.dataTransfer.files);
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const isVideo = file?.type.startsWith("video/");

  return (
    <div className="media-pick">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="media-pick-input"
        disabled={disabled}
        onChange={(e) => onInputChange(e.target.files)}
      />

      {!file ? (
        <button
          type="button"
          className={`media-pick-drop${dragOver ? " media-pick-drop--active" : ""}`}
          disabled={disabled}
          onClick={openPicker}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <span className="media-pick-icon" aria-hidden>
            📷
          </span>
          <span className="media-pick-title">Add photo or video</span>
          <span className="media-pick-hint">Tap to browse · or drop a file here</span>
        </button>
      ) : (
        <div className="media-pick-preview">
          <div className="media-pick-preview-media">
            {isVideo ? (
              <video src={previewUrl ?? ""} controls playsInline className="media-pick-preview-el" />
            ) : (
              <img src={previewUrl ?? ""} alt="" className="media-pick-preview-el" />
            )}
          </div>
          <div className="media-pick-preview-meta">
            <p className="media-pick-filename">{file.name}</p>
            <p className="small muted">
              {isVideo ? "Video" : "Photo"} · {formatSize(file.size)}
            </p>
            <div className="btn-row media-pick-preview-actions">
              <button type="button" className="btn-secondary" disabled={disabled} onClick={openPicker}>
                Change
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={disabled}
                onClick={() => applyFile(undefined)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {pickErr ? <p className="small media-pick-err">{pickErr}</p> : null}
    </div>
  );
}
