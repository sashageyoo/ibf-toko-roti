"use client";

import { useQueryState } from "nuqs";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
}

export function SearchInput({ placeholder = "Cari..." }: SearchInputProps) {
  const [search, setSearch] = useQueryState("q", {
    defaultValue: "",
    throttleMs: 500,
  });

  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}
