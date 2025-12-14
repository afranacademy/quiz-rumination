import { useEffect } from "react";
import { useParams } from "react-router-dom";

export default function CompareSessionPage() {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    console.log("[CompareSession] Session ID:", id);
  }, [id]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-xl text-foreground">Compare Session (Placeholder)</h1>
        <p className="text-sm text-foreground/80">
          Session ID: {id}
        </p>
        <p className="text-xs text-foreground/60">
          Check console for session details
        </p>
      </div>
    </div>
  );
}

