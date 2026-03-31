import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  startOfDay, endOfDay, 
  startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, 
  startOfYear, endOfYear, 
  parseISO, parse, format, isValid 
} from "date-fns";

export type FilterType = "All" | "Day" | "Week" | "Month" | "Year";

export interface DateRangeFilter {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

interface ReportFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (filter: DateRangeFilter) => void;
}

const ReportFilterModal = ({ open, onOpenChange, onApply }: ReportFilterModalProps) => {
  const [filterType, setFilterType] = useState<FilterType>("Month");
  const [dateValue, setDateValue] = useState("");
  const [yearValue, setYearValue] = useState(new Date().getFullYear().toString());

  const handleApply = () => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let label = "All Time";

    if (filterType !== "All") {
      let baseDate = new Date();
      
      if (filterType === "Year") {
        baseDate = new Date(parseInt(yearValue), 0, 1);
      } else {
        if (!dateValue) return; // Prevent applying without selecting
        
        if (filterType === "Week") {
          // input type="week" returns format "2023-W24"
          // We can parse it roughly or just use parseISO if we fix it up, but it's tricky.
          // Better approach: convert "2023-W24" to a date
          const [yr, wk] = dateValue.split("-W");
          if (yr && wk) {
            // A simple way to get a date in a given week is to find Jan 1, then add weeks
            const d = new Date(parseInt(yr), 0, 1 + (parseInt(wk) - 1) * 7);
            baseDate = d;
          }
        } else {
          baseDate = new Date(dateValue);
        }
        
        // Adjust for timezone offset
        baseDate = new Date(baseDate.getTime() + baseDate.getTimezoneOffset() * 60000);
      }

      if (!isValid(baseDate)) return;

      switch (filterType) {
        case "Day":
          startDate = startOfDay(baseDate);
          endDate = endOfDay(baseDate);
          label = format(startDate, "MMMM d, yyyy");
          break;
        case "Week":
          startDate = startOfWeek(baseDate, { weekStartsOn: 1 }); // Monday start
          endDate = endOfWeek(baseDate, { weekStartsOn: 1 });
          label = `Week of ${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
          break;
        case "Month":
          startDate = startOfMonth(baseDate);
          endDate = endOfMonth(baseDate);
          label = format(startDate, "MMMM yyyy");
          break;
        case "Year":
          startDate = startOfYear(baseDate);
          endDate = endOfYear(baseDate);
          label = `Year ${format(startDate, "yyyy")}`;
          break;
      }
    }

    onApply({ startDate, endDate, label });
    onOpenChange(false);
  };

  const getYears = () => {
    const current = new Date().getFullYear();
    const years = [];
    for (let i = current - 10; i <= current + 5; i++) {
        years.push(i.toString());
    }
    return years;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Date Filter</DialogTitle>
          <DialogDescription>
            Select a specific period to filter the report data before printing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Filter Type</Label>
            <Select value={filterType} onValueChange={(val) => setFilterType(val as FilterType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Time</SelectItem>
                <SelectItem value="Day">Specific Day</SelectItem>
                <SelectItem value="Week">Specific Week</SelectItem>
                <SelectItem value="Month">Specific Month</SelectItem>
                <SelectItem value="Year">Specific Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filterType !== "All" && (
            <div className="grid gap-2">
              <Label>Select {filterType}</Label>
              {filterType === "Day" && (
                <Input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
              )}
              {filterType === "Week" && (
                <Input type="week" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
              )}
              {filterType === "Month" && (
                <Input type="month" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
              )}
              {filterType === "Year" && (
                <Select value={yearValue} onValueChange={setYearValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {getYears().map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={filterType !== "All" && !dateValue && filterType !== "Year"}>
            Apply & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportFilterModal;
