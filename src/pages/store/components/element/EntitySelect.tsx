import { Building2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ENTITY_OPTIONS,
  type EntityCode,
} from "../../utils/entityOptions";

interface EntitySelectProps {
  value: EntityCode;
  onChange: (value: EntityCode) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Small dropdown to pick the ERP entity (SR / AL / PA) a report is scoped to.
 */
export default function EntitySelect({
  value,
  onChange,
  disabled = false,
  className,
  label = "Entity",
}: EntitySelectProps) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      {label ? (
        <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-xs sm:tracking-[0.22em]">
          {label}
        </label>
      ) : null}
      <Select
        value={value}
        onValueChange={(next) => onChange(next as EntityCode)}
        disabled={disabled}
      >
        <SelectTrigger
          data-size="sm"
          className="h-10 w-full min-w-[110px] border-slate-200 !bg-white text-slate-900 shadow-sm sm:h-11"
        >
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <SelectValue placeholder="Entity" />
          </span>
        </SelectTrigger>
        <SelectContent className="border-slate-200 !bg-white text-slate-900 shadow-lg">
          {ENTITY_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-slate-900 focus:bg-slate-100 focus:text-slate-900"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
