import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import ReportFilterModal, { DateRangeFilter } from "./ReportFilterModal";

const StockSummaryReport = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [receiving, setReceiving] = useState<any[]>([]);
  const [offices, setOffices] = useState<string[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string>("All Offices");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [invRes, distRes, recvRes] = await Promise.all([
        supabase.from("inventory_items").select("*, categories(name)").order("item_name"),
        supabase.from("distributions").select("*").order("created_at", { ascending: false }),
        supabase.from("receiving_records").select("*"),
      ]);
      setInventory(invRes.data || []);
      setDistributions(distRes.data || []);
      setReceiving(recvRes.data || []);

      const uniqueOffices = [...new Set((distRes.data || []).map(d => d.receiving_office))].filter(Boolean) as string[];
      setOffices(uniqueOffices.sort());
    };
    fetchData();
  }, []);

  const isWithinDateRange = (dateStr: string) => {
    if (!dateFilter || (!dateFilter.startDate && !dateFilter.endDate)) return true;
    const date = new Date(dateStr);
    if (dateFilter.startDate && dateFilter.endDate) {
      return date >= dateFilter.startDate && date <= dateFilter.endDate;
    }
    return true;
  };

  const getFilteredDistributions = () => {
    return distributions.filter((d) => isWithinDateRange(d.date_issued || d.created_at));
  };

  const getFilteredReceiving = () => {
    return receiving.filter((r) => isWithinDateRange(r.date_received || r.created_at));
  };

  const getStockSummary = () => {
    const filteredReceiving = getFilteredReceiving();
    const filteredDistributions = getFilteredDistributions();
    
    return inventory.map(item => {
      const totalReceived = filteredReceiving.filter(r => r.inventory_item_id === item.id).reduce((s, r) => s + r.quantity, 0);
      const totalDistributed = filteredDistributions.filter(d => d.inventory_item_id === item.id).reduce((s, d) => s + d.quantity, 0);
      const remaining = item.stock_quantity;
      return { ...item, totalReceived, totalDistributed, remaining };
    }).filter(item => dateFilter ? (item.totalReceived > 0 || item.totalDistributed > 0) : true) || [];
  };

  const getDistributionByOffice = () => {
    const byOffice: Record<string, { office: string; items: Record<string, number>; total: number }> = {};
    const filteredDistributions = getFilteredDistributions();
    filteredDistributions.forEach(d => {
      if (!byOffice[d.receiving_office]) byOffice[d.receiving_office] = { office: d.receiving_office, items: {}, total: 0 };
      byOffice[d.receiving_office].items[d.item_name] = (byOffice[d.receiving_office].items[d.item_name] || 0) + d.quantity;
      byOffice[d.receiving_office].total += d.quantity;
    });
    return Object.values(byOffice);
  };

  const handlePrint = () => setIsModalOpen(true);

  const applyFilterAndPrint = (filter: DateRangeFilter) => {
    setDateFilter(filter);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const summary = getStockSummary();
  const officeData = getDistributionByOffice();
  const today = format(new Date(), "MMMM d, yyyy");

  return (
    <div>
      {/* Screen View */}
      <div className="print:hidden space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Stock Summary & Distribution Office</h2>
          <div className="flex items-center gap-3">
            <select 
              className="h-9 px-3 rounded-md border text-sm"
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
            >
              <option value="All Offices">All Offices</option>
              {offices.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <Button onClick={handlePrint} className="gap-1.5 py-2">
              <Printer className="w-4 h-4" /> Print Report
            </Button>
          </div>
        </div>

        {/* Stock Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Stock Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-center">Total Received</TableHead>
                    <TableHead className="text-center">Distributed</TableHead>
                    <TableHead className="text-center">Remaining Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.item_name}</TableCell>
                      <TableCell>{(s as any).categories?.name || "—"}</TableCell>
                      <TableCell>{s.unit_of_measure}</TableCell>
                      <TableCell className="text-center">{s.totalReceived}</TableCell>
                      <TableCell className="text-center">{s.totalDistributed}</TableCell>
                      <TableCell className="text-center font-semibold">{s.remaining}</TableCell>
                    </TableRow>
                  ))}
                  {summary.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Distribution by Office */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base">Distribution by Office</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {officeData.filter(o => selectedOffice === "All Offices" || o.office === selectedOffice).map(o => (
              <div key={o.office} className="mb-6 border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium text-primary flex justify-between">
                  <span>{o.office}</span>
                  <span>{o.total} items total</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-2/3">Item</TableHead>
                      <TableHead className="text-center">Quantity Issued</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(o.items).map(([item, qty]) => (
                      <TableRow key={item}>
                        <TableCell>{item}</TableCell>
                        <TableCell className="text-center font-medium">{qty as number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
            {officeData.filter(o => selectedOffice === "All Offices" || o.office === selectedOffice).length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No distributions found for this office</p>
            )}
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground">
          Total Items: {summary.length}
        </div>
      </div>

      {/* Print Layout */}
      <div className="hidden print:block print-report p-8 font-serif text-black bg-white">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .print-report, .print-report * { visibility: visible !important; }
            .print-report {
              position: absolute !important;
              left: 0; top: 0;
              width: 100%;
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              color: #000;
              background: #fff;
            }
            @page { 
              size: A4 portrait; 
              margin: 15mm;
            }
            
            /* Repeating Header on Each Page */
            thead { 
              display: table-header-group;
            }
            
            /* Repeating Footer on Each Page */
            tfoot { 
              display: table-footer-group;
            }
            
            /* Prevent page breaks inside table rows */
            tr { 
              page-break-inside: avoid;
              break-inside: avoid;
            }
            
            /* Allow page breaks between rows */
            tbody tr {
              page-break-after: auto;
              break-after: auto;
            }
            
            /* Ensure table structure is maintained */
            table {
              border-collapse: collapse;
              width: 100%;
            }
            
            /* Page header that repeats */
            .page-header {
              text-align: left;
              margin-bottom: 16px;
            }
            
            /* Section headers */
            .section-header {
              page-break-after: avoid;
              margin-top: 20px;
              margin-bottom: 8px;
            }
          }
        `}</style>

        <div className="page-header flex items-center gap-4 mb-6">
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
            }}
            title="Negros Oriental State University"
          >
            <img
              src="/norsu-logo.png"
              alt="Negros Oriental State University"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div className="flex-1 text-left">
            <h1 className="text-lg font-bold uppercase tracking-wide">Inventory Management System</h1>
            <h2 className="text-base font-semibold mt-1">Stock Summary &amp; Distribution Office Report</h2>
            {dateFilter && dateFilter.label !== "All Time" && (
              <p className="text-sm mt-1 font-medium">Period Covered: {dateFilter.label}</p>
            )}
            <p className="text-sm mt-1">Date Generated: {today}</p>
          </div>
        </div>

        {/* Stock Summary Table */}
        <h3 className="section-header font-bold text-sm mt-6 mb-2">Stock Summary</h3>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 px-1">Item Name</th>
              <th className="text-left py-2 px-1">Category</th>
              <th className="text-left py-2 px-1">Unit</th>
              <th className="text-center py-2 px-1">Total Received</th>
              <th className="text-center py-2 px-1">Distributed</th>
              <th className="text-center py-2 px-1">Remaining Stock</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(s => (
              <tr key={s.id} className="border-b border-gray-300">
                <td className="py-1.5 px-1">{s.item_name}</td>
                <td className="py-1.5 px-1">{(s as any).categories?.name || "—"}</td>
                <td className="py-1.5 px-1">{s.unit_of_measure}</td>
                <td className="py-1.5 px-1 text-center">{s.totalReceived}</td>
                <td className="py-1.5 px-1 text-center">{s.totalDistributed}</td>
                <td className="py-1.5 px-1 text-center font-bold">{s.remaining}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="text-xs pt-2 font-semibold">Total Items: {summary.length}</td>
            </tr>
          </tfoot>
        </table>

        {/* Distribution by Office */}
        <h3 className="section-header font-bold text-sm mt-8 mb-2">
          {selectedOffice === "All Offices" ? "Distribution by Office" : `Distribution for ${selectedOffice}`}
        </h3>
        {officeData.filter(o => selectedOffice === "All Offices" || o.office === selectedOffice).map(o => (
          <div key={o.office} className="mb-4" style={{ pageBreakInside: "avoid" }}>
            <p className="font-bold text-xs mb-1 bg-gray-100 p-1">{o.office} ({o.total} items total)</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left py-1 px-1">Item</th>
                  <th className="text-center py-1 px-1">Quantity Issued</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(o.items).map(([item, qty]) => (
                  <tr key={item} className="border-b border-gray-300">
                    <td className="py-1 px-1">{item}</td>
                    <td className="py-1 px-1 text-center font-bold">{qty as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <ReportFilterModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onApply={applyFilterAndPrint} 
      />
    </div>
  );
};

export default StockSummaryReport;
