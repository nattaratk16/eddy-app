interface FloatingShapesProps {
  className?: string;
}

/**
 * A scattering of soft pastel blobs/stars used to fill empty space behind
 * Eddy on the login screen and section headers - reinforces the "3D pastel" feel.
 */
export default function FloatingShapes({ className = '' }: FloatingShapesProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute left-[8%] top-[12%] h-16 w-16 rounded-clay bg-pastel-yellow shadow-clay-sm animate-float" />
      <div className="absolute right-[12%] top-[20%] h-10 w-10 rounded-full bg-pastel-pink shadow-clay-sm animate-floatSlow" />
      <div className="absolute left-[18%] bottom-[18%] h-12 w-12 rounded-full bg-pastel-mint shadow-clay-sm animate-float" />
      <div className="absolute right-[18%] bottom-[14%] h-20 w-20 rounded-clay bg-pastel-blue shadow-clay-sm animate-floatSlow" />
      <div className="absolute left-[42%] top-[6%] h-8 w-8 rotate-45 rounded-md bg-pastel-peach shadow-clay-sm animate-float" />
    </div>
  );
}
