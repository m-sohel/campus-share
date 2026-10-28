import { calculateListingCompleteness } from "@/lib/rules/completeness";
import { Resource } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface ListingCompletenessProps {
  resource: Partial<Resource>;
}

export function ListingCompleteness({ resource }: ListingCompletenessProps) {
  const { percentage, isComplete, missing } = calculateListingCompleteness(resource);

  return (
    <div className="rounded-2xl border border-dusty-olive-200/90 bg-white p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-celadon-700" />
          <span className="font-semibold text-sm text-dusty-olive-950">
            Listing Completeness
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-celadon-800">{percentage}%</span>
          <Badge variant={isComplete ? "success" : "warning"} className="text-[10px]">
            {isComplete ? "Ready to Publish" : "Incomplete"}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-dusty-olive-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            percentage >= 80 ? "bg-celadon-600" : percentage >= 50 ? "bg-amber-500" : "bg-muted-teal-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Missing Items Feedback */}
      {missing.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-dusty-olive-500 block">
            Suggested additions to improve trust &amp; safety:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-dusty-olive-50 text-dusty-olive-700 border border-dusty-olive-200/80"
              >
                <AlertCircle className="w-3 h-3 text-amber-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-celadon-800 pt-1 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-celadon-700" />
          <span>Listing contains all recommended safety, rule, and inspection details!</span>
        </div>
      )}
    </div>
  );
}
