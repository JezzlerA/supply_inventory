"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "lucide-react";

export type FilterType = "daily" | "weekly" | "monthly" | "custom";

export interface PrintFilterState {
  filterType: FilterType;
  startDate: string;
  endDate: string;
}

interface PrintFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filter: PrintFilterState) => void;
  title?: string;
  description?: string;
}

const getDateRangeForFilter = (filterType: FilterType): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filterType) {
    case "daily":
      return { start: today, end: today };
    case "weekly": {
      // Get start of week (Sunday)
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      // Get end of week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { start: startOfWeek, end: endOfWeek };
    }
    case "monthly": {
      // Get start of month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      // Get end of month
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: startOfMonth, end: endOfMonth };
    }
    default:
      return { start: today, end: today };
  }
};

const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const PrintFilterModal: React.FC<PrintFilterModalProps> = ({
  open,
  onOpenChange,
  onApply,
  title = "Print Filter Configuration",
  description = "Select the date range and filter type for printing",
}) => {
  const [filterType, setFilterType] = useState<FilterType>("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  // Auto-populate dates based on filter type
  useEffect(() => {
    if (filterType !== "custom") {
      const { start, end } = getDateRangeForFilter(filterType);
      setStartDate(formatDateForInput(start));
      setEndDate(formatDateForInput(end));
      setError("");
    }
  }, [filterType]);

  const handleApply = () => {
    // Validation
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date cannot be after end date");
      return;
    }

    setError("");
    onApply({
      filterType,
      startDate,
      endDate,
    });
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setError("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Filter Type */}
          <div className="grid gap-2">
            <Label htmlFor="filterType">Filter Type</Label>
            <Select
              value={filterType}
              onValueChange={(value) => setFilterType(value as FilterType)}
            >
              <SelectTrigger id="filterType">
                <SelectValue placeholder="Select filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setFilterType("custom");
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFilterType("custom");
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}

          {/* Date Range Preview */}
          {startDate && endDate && (
            <p className="text-sm text-muted-foreground">
              Printing records from{" "}
              <span className="font-medium text-foreground">
                {new Date(startDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {new Date(endDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} className="gap-1.5">
            <Calendar className="w-4 h-4" />
            Apply & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintFilterModal;
