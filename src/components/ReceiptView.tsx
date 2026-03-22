import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Download, X } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export interface ReceiptData {
  id: string;
  receipt_number: string;
  transaction_id: string | null;
  date_approved: string;
  user_name: string;
  department: string;
  item_name: string;
  category: string;
  quantity: number;
  unit_value: number;
  total_value: number;
  status: string;
  approved_by_name: string;
  created_at: string;
}

export interface ReceiptViewProps {
  receipt: ReceiptData;
  onClose: () => void;
  autoPrint?: boolean;
}

const ReceiptView = ({ receipt, onClose, autoPrint = false }: ReceiptViewProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const receiptCss = `
    @page { size: A4 portrait; margin: 25.4mm; } /* ~1 inch */
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; padding: 0; font-family: Inter, Arial, "Segoe UI", sans-serif; color: #111827; }

    /* Print centering */
    .print-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    /* Receipt shell */
    .receipt-print {
      width: 460px;
      max-width: 100%;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 20px 18px;
      background: #ffffff;
    }

    .receipt-header { text-align: center; margin-bottom: 10px; }
    .receipt-title { font-size: 18px; font-weight: 800; margin: 0; letter-spacing: 0.2px; }
    .receipt-subtitle { font-size: 12px; color: #4b5563; margin: 4px 0 0 0; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }

    .meta-grid { display: grid; gap: 8px; }
    .kv-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      line-height: 1.35;
      padding: 2px 0;
    }
    .kv-label { color: #374151; }
    .kv-value { font-weight: 600; text-align: right; color: #111827; }

    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #111827;
      margin: 2px 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .item-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
      margin-top: 6px;
    }
    .item-table th, .item-table td {
      border: 1px solid #e5e7eb;
      padding: 8px 8px;
      vertical-align: top;
    }
    .item-table th {
      text-align: left;
      background: #f9fafb;
      font-weight: 800;
      color: #111827;
    }
    .num { text-align: right; white-space: nowrap; }

    .status-strong { font-weight: 800; color: #111827; }

    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #6b7280;
      margin-top: 12px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt-print { border-color: #d1d5db; }
    }
  `;

  const formatMoney = (v: number) => `₱${Number(v || 0).toLocaleString("en-PH")}`;

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Receipt ${receipt.receipt_number}</title>
      <style>
        ${receiptCss}
      </style></head><body>
      <div class="print-page">${content.outerHTML}</div>
      <script>window.print(); window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (!autoPrint) return;
    const t = window.setTimeout(() => handlePrint(), 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint]);

  const handleDownloadPDF = async () => {
    const content = receiptRef.current;
    if (!content) return;
    const canvas = await html2canvas(content, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
    pdf.save(`Receipt-${receipt.receipt_number}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl my-6">
        <Card className="border-2 max-h-[90vh] overflow-hidden">
          <CardContent className="p-0 max-h-[90vh] flex flex-col">
            {/* Action bar (sticky) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b bg-muted/30 sticky top-0 z-10">
              <h2 className="font-semibold text-lg leading-tight">Transaction Receipt</h2>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-1" /> PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Receipt content */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-6 sm:p-8">
                <style>{receiptCss}</style>

                <div ref={receiptRef} className="receipt-print">
                  <div className="receipt-header">
                    <h1 className="receipt-title">Campus Supply Hub</h1>
                    <p className="receipt-subtitle">Supply Room Office — Transaction Receipt</p>
                  </div>

                  <hr className="divider" />

                  <div className="meta-grid">
                    <div className="kv-row">
                      <span className="kv-label">Receipt No</span>
                      <span className="kv-value">{receipt.receipt_number}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Transaction ID</span>
                      <span className="kv-value">{receipt.transaction_id?.slice(0, 8) || "—"}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Date</span>
                      <span className="kv-value">{new Date(receipt.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">User Name</span>
                      <span className="kv-value">{receipt.user_name}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Department</span>
                      <span className="kv-value">{receipt.department}</span>
                    </div>
                  </div>

                  <hr className="divider" />

                  <div className="section-title">Item Information</div>
                  <table className="item-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th className="num">Qty</th>
                        <th className="num">Unit Value</th>
                        <th className="num">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{receipt.item_name}</td>
                        <td>{receipt.category || "—"}</td>
                        <td className="num">{receipt.quantity}</td>
                        <td className="num">{formatMoney(receipt.unit_value)}</td>
                        <td className="num">{formatMoney(receipt.total_value)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <hr className="divider" />

                  <div className="section-title">Approval Information</div>
                  <div className="meta-grid">
                    <div className="kv-row">
                      <span className="kv-label">Status</span>
                      <span className="kv-value status-strong">{receipt.status}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Approved By</span>
                      <span className="kv-value">{receipt.approved_by_name || "—"}</span>
                    </div>
                    <div className="kv-row">
                      <span className="kv-label">Date Approved</span>
                      <span className="kv-value">{new Date(receipt.date_approved).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="footer-note">
                    This is a system-generated receipt. No signature required.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReceiptView;
