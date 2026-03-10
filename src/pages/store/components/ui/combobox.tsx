import { useState } from 'react';

import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandGroup,
  CommandEmpty,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';


type ComboboxProps = {
  multiple?: boolean;
  options: { label: string; value: string }[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function ComboBox({
  multiple,
  options,
  value,
  onChange,
  placeholder = "Select option(s)",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleSelect = (val: string) => {
    if (disabled) return;

    if (multiple) {
      if (value.includes(val)) {
        onChange(value.filter((v) => v !== val));
      } else {
        onChange([...value, val]);
      }
    } else {
      onChange([val]);
      setOpen(false);
    }
  };

  const displayLabel = () => {
    if (value.length === 0) return placeholder;
    if (multiple) return `${value.length} selected`;
    return options.find((opt) => opt.value === value[0])?.label ?? placeholder;
  };

  const MAX_VISIBLE = 100;

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const needle = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(needle) ||
      opt.value.toLowerCase().includes(needle)
    );
  });

  const visibleOptions = filteredOptions.slice(0, MAX_VISIBLE);
  const hiddenCount = filteredOptions.length - visibleOptions.length;

  return (
    <Popover open={open && !disabled} onOpenChange={(val) => !disabled && setOpen(val)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between bg-white border-gray-300 hover:bg-gray-50", className)}
          disabled={disabled}
        >
          <span className="text-gray-900">{displayLabel()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] max-w-full p-0 bg-white border-gray-200 shadow-lg"
      >
        <Command className="!bg-white">
          <CommandInput
            placeholder="Search..."
            value={search}
            onValueChange={setSearch}
            className="!bg-white border-b border-gray-200"
          />
          <CommandList className="!bg-white max-h-[300px]">
            <CommandEmpty className="!bg-white py-4">No options found.</CommandEmpty>
            <CommandGroup className="!bg-white">
              {visibleOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => handleSelect(opt.value)}
                  className="!bg-white hover:!bg-gray-100 data-[selected=true]:!bg-gray-100 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(opt.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {hiddenCount > 0 && (
            <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400 text-center select-none">
              Showing {MAX_VISIBLE} of {filteredOptions.length} — type to narrow down
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
