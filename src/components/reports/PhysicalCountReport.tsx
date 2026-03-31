import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import { format } from "date-fns";
import ReportFilterModal, { DateRangeFilter } from "./ReportFilterModal";

interface ReportRow {
  article: string;
  description: string;
  propertyNumber: string;
  unitOfMeasure: string;
  unitValue: number;
  qtyPropertyCard: number;
  qtyPhysicalCount: number;
  shortageQty: number;
  shortageValue: number;
  remarks: string;
}

interface OfficeDistribution {
  office: string;
  items: Record<string, number>;
  total: number;
}

const PhysicalCountReport = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [assignedItems, setAssignedItems] = useState<any[]>([]);
  const [receiving, setReceiving] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateRangeFilter | null>(null);

  // Editable header fields
  const [officeName, setOfficeName] = useState("CAS OFFICE & FACULTY OFFICE");
  const [fundCluster, setFundCluster] = useState("1");
  const [accountablePerson, setAccountablePerson] = useState("");
  const [accountabilityDate, setAccountabilityDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [invRes, distRes, assignRes, recvRes] = await Promise.all([
        supabase.from("inventory_items").select("*, categories(name)").order("item_name"),
        supabase.from("distributions").select("*").order("created_at", { ascending: false }),
        supabase.from("assigned_items").select("*, inventory_items:inventory_item_id(serial_number, unit_cost, description)").order("created_at", { ascending: false }),
        supabase.from("receiving_records").select("*"),
      ]);
      setInventory(invRes.data || []);
      setDistributions(distRes.data || []);
      setAssignedItems(assignRes.data || []);
      setReceiving(recvRes.data || []);
      setLoading(false);
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

  const getFilteredReceiving = () => receiving.filter(r => isWithinDateRange(r.date_received || r.created_at));
  const getFilteredDistributions = () => distributions.filter(d => isWithinDateRange(d.date_issued || d.created_at));
  const getFilteredAssignedItems = () => assignedItems.filter(a => isWithinDateRange(a.date_assigned || a.created_at));

  const getReportRows = (): ReportRow[] => {
    const filteredReceiving = getFilteredReceiving();
    const filteredDistributions = getFilteredDistributions();
    const filteredAssignedItems = getFilteredAssignedItems();

    return inventory.map((item) => {
      const totalReceived = filteredReceiving
        .filter((r) => r.inventory_item_id === item.id)
        .reduce((s, r) => s + r.quantity, 0);

      const totalDistributed = filteredDistributions
        .filter((d) => d.inventory_item_id === item.id)
        .reduce((s, d) => s + d.quantity, 0);

      const physicalCount = filteredAssignedItems
        .filter((a) => a.inventory_item_id === item.id && a.possession_status === "With User")
        .length;

      const qtyPropertyCard = item.unit_cost || 0;
      const shortage = totalReceived - physicalCount - item.stock_quantity;
      const shortageQty = shortage > 0 ? shortage : 0;

      const assignedForItem = filteredAssignedItems.filter((a) => a.inventory_item_id === item.id);
      const conditions = [...new Set(assignedForItem.map((a) => a.condition_status))];
      const locations = [...new Set(assignedForItem.map((a) => a.current_location).filter(Boolean))];
      const remarks = [...conditions, ...locations].filter(Boolean).join(", ") || "Functional";

      return {
        article: item.item_name,
        description: `${item.description || ""}${item.serial_number ? ` / ${item.serial_number}` : ""}`.trim() || "—",
        propertyNumber: item.serial_number || "—",
        unitOfMeasure: item.unit_of_measure?.toUpperCase() || "UNIT",
        unitValue: item.unit_cost || 0,
        qtyPropertyCard: item.stock_quantity || 0,
        qtyPhysicalCount: physicalCount || totalDistributed,
        shortageQty: shortageQty,
        shortageValue: shortageQty * (item.unit_cost || 0),
        remarks,
      };
    });
  };

  const getDistributionByOffice = (): OfficeDistribution[] => {
    const byOffice: Record<string, OfficeDistribution> = {};
    const filteredDistributions = getFilteredDistributions();
    filteredDistributions.forEach((d) => {
      if (!byOffice[d.receiving_office]) {
        byOffice[d.receiving_office] = { office: d.receiving_office, items: {}, total: 0 };
      }
      byOffice[d.receiving_office].items[d.item_name] =
        (byOffice[d.receiving_office].items[d.item_name] || 0) + d.quantity;
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

  const reportRows = getReportRows().filter(r => dateFilter ? (r.qtyPhysicalCount > 0 || r.qtyPropertyCard > 0 || r.shortageQty > 0) : true);
  const officeData = getDistributionByOffice();

  return (
    <div>
      {/* Screen View */}
      <div className="print:hidden space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Physical Count of Property, Plant and Equipment</h2>
          <Button onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" /> Print Report
          </Button>
        </div>

        {/* Report Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report Header Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="officeName">Office Name</Label>
              <Input
                id="officeName"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="e.g. CAS OFFICE & FACULTY OFFICE"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fundCluster">Fund Cluster</Label>
              <Input
                id="fundCluster"
                value={fundCluster}
                onChange={(e) => setFundCluster(e.target.value)}
                placeholder="e.g. 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountablePerson">Accountable Person</Label>
              <Input
                id="accountablePerson"
                value={accountablePerson}
                onChange={(e) => setAccountablePerson(e.target.value)}
                placeholder="e.g. ZENAIDA D. CALUMPANG – OIC – CAS DEAN"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountabilityDate">Accountability Date</Label>
              <Input
                id="accountabilityDate"
                type="date"
                value={accountabilityDate}
                onChange={(e) => setAccountabilityDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Report Preview ({reportRows.length} items)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading data...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Property Number</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Unit Value</TableHead>
                      <TableHead className="text-center">Qty (Property Card)</TableHead>
                      <TableHead className="text-center">Qty (Physical Count)</TableHead>
                      <TableHead className="text-center">Shortage</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.article}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{row.description}</TableCell>
                        <TableCell>{row.propertyNumber}</TableCell>
                        <TableCell>{row.unitOfMeasure}</TableCell>
                        <TableCell className="text-right">{row.unitValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-center">{row.qtyPropertyCard}</TableCell>
                        <TableCell className="text-center">{row.qtyPhysicalCount}</TableCell>
                        <TableCell className="text-center">{row.shortageQty}</TableCell>
                        <TableCell>{row.remarks}</TableCell>
                      </TableRow>
                    ))}
                    {reportRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">No inventory data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribution Preview */}
        <Card className="print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribution by Office</CardTitle>
          </CardHeader>
          <CardContent>
            {officeData.map((o) => (
              <div key={o.office} className="mb-6">
                <h4 className="font-medium text-primary mb-2">{o.office} ({o.total} items total)</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Quantity Issued</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(o.items).map(([item, qty]) => (
                      <TableRow key={item}>
                        <TableCell>{item}</TableCell>
                        <TableCell className="text-center font-medium">{qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
            {officeData.length === 0 && (
              <p className="text-sm text-muted-foreground">No distribution data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== PRINT LAYOUT ===== */}
      <div className="hidden print:block print-report font-serif text-black bg-white" style={{ padding: "0.5in", fontSize: "10pt" }}>
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .print-report, .print-report * { visibility: visible !important; }
            .print-report {
              position: absolute !important;
              left: 0; top: 0;
              width: 100%;
              font-family: 'Times New Roman', Times, serif;
              font-size: 10pt;
              color: #000;
              background: #fff;
            }
            @page { 
              size: A4 landscape; 
              margin: 15mm 10mm 80mm 10mm;
            }
            
            /* Repeating Header on Each Page */
            thead { 
              display: table-header-group;
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
              text-align: center;
              margin-bottom: 12px;
            }
            
            /* Fixed Footer - Signature section on every page */
            .fixed-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              padding: 20px 10mm;
              background: #fff;
              page-break-inside: avoid;
            }
          }
        `}</style>

        {/* Page Header - Repeats on every page */}
        <div className="page-header">
          <h1
            style={{
              fontSize: "13pt",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "1px",
              margin: 0,
            }}
          >
            Report on the Physical Count of Property, Plant and Equipment
          </h1>
          <h2
            style={{
              fontSize: "12pt",
              fontWeight: "bold",
              textTransform: "uppercase",
              marginTop: "4px",
            }}
          >
            {officeName}
          </h2>
        </div>

        <div style={{ marginBottom: "12px", fontSize: "10pt" }}>
          {dateFilter && dateFilter.label !== "All Time" && (
            <p style={{ margin: "2px 0", fontWeight: "bold" }}>Period Covered: {dateFilter.label}</p>
          )}
          <p style={{ margin: "2px 0" }}><strong>Fund Cluster: {fundCluster}</strong></p>
          {accountablePerson && (
            <p style={{ margin: "6px 0" }}>
              For which <strong>{accountablePerson}</strong>, Negros Oriental State University, is having assumed to such accountability on{" "}
              <strong>{accountabilityDate ? format(new Date(accountabilityDate), "MMMM d, yyyy") : "_______________"}</strong>.
            </p>
          )}
        </div>

        {/* Main Table with repeating header */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", marginTop: "8px" }}>
          <thead>
            <tr>
              <th rowSpan={3} style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", verticalAlign: "middle" }}>
                ARTICLE
              </th>
              <th rowSpan={3} style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", verticalAlign: "middle" }}>
                DESCRIPTION
              </th>
              <th rowSpan={3} style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", verticalAlign: "middle" }}>
                PROPERTY<br />NUMBER
              </th>
              <th rowSpan={3} style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", verticalAlign: "middle" }}>
                UNIT OF<br />MEASURE
              </th>
              <th rowSpan={3} style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", verticalAlign: "middle" }}>
                UNIT<br />VALUE
              </th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", textAlign: "center" }}>
                QUANTITY
              </th>
              <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", textAlign: "center" }}>
                QUANTITY
              </th>
              <th colSpan={2} style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", textAlign: "center" }}>
                SHORTAGE/<br />OVERAGE
              </th>
              <th rowSpan={3} style={{ border: "1px solid #000", padding: "4px 6px", background: "#f0f0f0", fontWeight: "bold", textTransform: "uppercase", fontSize: "8pt", verticalAlign: "middle" }}>
                REMARKS
              </th>
            </tr>
            <tr>
              <th style={{ border: "1px solid #000", padding: "2px 6px", background: "#f0f0f0", fontWeight: "bold", fontSize: "7pt", textAlign: "center" }}>
                per
              </th>
              <th style={{ border: "1px solid #000", padding: "2px 6px", background: "#f0f0f0", fontWeight: "bold", fontSize: "7pt", textAlign: "center" }}>
                per
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "2px 6px", background: "#f0f0f0", fontWeight: "bold", fontSize: "7pt", textAlign: "center", verticalAlign: "middle" }}>
                Quantity
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "2px 6px", background: "#f0f0f0", fontWeight: "bold", fontSize: "7pt", textAlign: "center", verticalAlign: "middle" }}>
                Value
              </th>
            </tr>
            <tr>
              <th style={{ border: "1px solid #000", padding: "2px 6px", background: "#f0f0f0", fontWeight: "bold", fontSize: "7pt", textAlign: "center" }}>
                PROPERTY CARD
              </th>
              <th style={{ border: "1px solid #000", padding: "2px 6px", background: "#f0f0f0", fontWeight: "bold", fontSize: "7pt", textAlign: "center" }}>
                PHYSICAL COUNT
              </th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row, i) => (
              <tr key={i}>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{row.article}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: "8pt" }}>{row.description}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{row.propertyNumber}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.unitOfMeasure}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "right" }}>
                  {row.unitValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>
                  {row.qtyPropertyCard}
                </td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.qtyPhysicalCount}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.shortageQty}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.shortageValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px" }}>{row.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Fixed Footer - Signature Section (appears on every page) */}
        <div className="fixed-footer">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                {/* Property Officer */}
                <td style={{ width: "50%", textAlign: "center", verticalAlign: "top" }}>
                  <div
                    style={{
                      borderBottom: "1px solid #000",
                      marginBottom: "4px",
                      height: "50px",
                      width: "80%",
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  ></div>
                  <p style={{ fontWeight: "bold", fontSize: "11pt", margin: "5px 0 0 0" }}>
                    Property Officer
                  </p>
                  <p style={{ fontSize: "9pt", fontStyle: "italic", margin: "2px 0 0 0" }}>
                    Certified Correct
                  </p>
                </td>

                {/* Head of Office */}
                <td style={{ width: "50%", textAlign: "center", verticalAlign: "top" }}>
                  <div
                    style={{
                      borderBottom: "1px solid #000",
                      marginBottom: "4px",
                      height: "50px",
                      width: "80%",
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                  ></div>
                  <p style={{ fontWeight: "bold", fontSize: "11pt", margin: "5px 0 0 0" }}>
                    Head of Office
                  </p>
                  <p style={{ fontSize: "9pt", fontStyle: "italic", margin: "2px 0 0 0" }}>
                    Approved
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal */}
      <ReportFilterModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onApply={applyFilterAndPrint} 
      />
    </div>
  );
};

export default PhysicalCountReport;
