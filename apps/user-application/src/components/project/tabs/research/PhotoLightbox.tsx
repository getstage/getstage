type PhotoLightboxProps = {
  src: string;
  onClose: () => void;
};

export function PhotoLightbox({ src, onClose }: PhotoLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-6 backdrop-blur-[5px]"
      role="dialog"
      aria-modal="true"
      aria-label="Research reference preview"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-zoom-out"
        aria-label="Close photo preview"
        onClick={onClose}
      />
      <div className="relative h-[min(828px,calc(100vh-48px))] w-[min(1200px,calc(100vw-48px))] rounded-[4px] shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
        <img
          src={src}
          alt=""
          className="h-full w-full rounded-[4px] object-cover"
        />
      </div>
    </div>
  );
}
