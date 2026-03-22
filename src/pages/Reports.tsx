import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ClipboardList, Building2 } from "lucide-react";
import StockSummaryReport from "@/components/reports/StockSummaryReport";
import ItemMonitoringReportTab from "@/components/ItemMonitoringReportTab";
import PhysicalCountReport from "@/components/reports/PhysicalCountReport";

const REPORT_OPTIONS = [
  {
    id: "stock",
    label: "Stock Summary & Distribution Office",
    description: "View and print stock summary and distribution by office",
    icon: FileText,
  },
  {
    id: "monitoring",
    label: "Item Monitoring Reports",
    description: "View and print user item monitoring records",
    icon: ClipboardList,
  },
  {
    id: "physical-count",
    label: "Physical Count of Property, Plant and Equipment",
    description: "Formal report combining stock inventory, physical monitoring, and office distribution",
    icon: Building2,
  },
];

const Reports = () => {
  const [activeReport, setActiveReport] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Select a report to view and print</p>
      </div>

      {!activeReport ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORT_OPTIONS.map((opt) => (
            <Card
              key={opt.id}
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
              onClick={() => setActiveReport(opt.id)}
            >
              <CardContent className="p-6 flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <opt.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{opt.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                  <span className="text-xs text-muted-foreground mt-2 inline-block">Print Only</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setActiveReport(null)}
            className="text-sm text-primary hover:underline mb-4 inline-flex items-center gap-1"
          >
            ← Back to Reports
          </button>

          {activeReport === "stock" && <StockSummaryReport />}
          {activeReport === "monitoring" && <ItemMonitoringReportTab />}
          {activeReport === "physical-count" && <PhysicalCountReport />}
        </div>
      )}
    </div>
  );
};

export default Reports;
