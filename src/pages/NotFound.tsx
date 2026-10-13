import { useNavigate } from "react-router-dom";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { vibrate } from "../lib/utils";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6 animate-in fade-in zoom-in-95 duration-250">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-lg shadow-primary/10">
        <Compass className="w-10 h-10 stroke-[1.8] animate-pulse" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The page you are looking for doesn't exist or has moved. Let's get you back on track.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          className="rounded-2xl h-11 px-6 font-semibold shadow-md shadow-primary/20 cursor-pointer flex items-center gap-2"
          onClick={() => {
            vibrate(15);
            navigate("/");
          }}
        >
          <Home className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Button>

        <Button
          variant="outline"
          className="rounded-2xl h-11 px-5 font-medium cursor-pointer"
          onClick={() => {
            vibrate(10);
            window.history.back();
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Go Back</span>
        </Button>
      </div>
    </div>
  );
}
