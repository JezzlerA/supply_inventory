import { forwardRef } from "react";
import { format } from "date-fns";

interface ReportItem {
  item_name: string;
  serial_number: string;
  transaction_type: string;
  possession_status: string;
  condition_status: string;
  date: string;
  status: string;
}

interface Props {
  userName: string;
  items: ReportItem[];
  dateLabel?: string;
}

const ItemMonitoringReport = forwardRef<HTMLDivElement, Props>(({ userName, items, dateLabel }, ref) => {
  return (
    <div ref={ref} className="hidden print:block print-report p-8 font-serif text-black bg-white">
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
          <h2 className="text-base font-semibold mt-1">User Transaction Report</h2>
        </div>
      </div>

      <div className="flex justify-between text-sm mb-4">
        <div>
          <div><strong>User:</strong> {userName}</div>
          {dateLabel && <div><strong>Period Covered:</strong> {dateLabel}</div>}
        </div>
        <div><strong>Date Generated:</strong> {format(new Date(), "MMMM d, yyyy")}</div>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left py-2 px-1">#</th>
            <th className="text-left py-2 px-1">Item Name</th>
            <th className="text-left py-2 px-1">Serial Number</th>
            <th className="text-left py-2 px-1">Transaction Type</th>
            <th className="text-left py-2 px-1">Possession Status</th>
            <th className="text-left py-2 px-1">Condition Status</th>
            <th className="text-left py-2 px-1">Date</th>
            <th className="text-left py-2 px-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-300">
              <td className="py-1.5 px-1">{i + 1}</td>
              <td className="py-1.5 px-1">{item.item_name}</td>
              <td className="py-1.5 px-1">{item.serial_number || "—"}</td>
              <td className="py-1.5 px-1">{item.transaction_type}</td>
              <td className="py-1.5 px-1">{item.possession_status}</td>
              <td className="py-1.5 px-1">{item.condition_status}</td>
              <td className="py-1.5 px-1">{item.date}</td>
              <td className="py-1.5 px-1">{item.status}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={8} className="pt-4 text-sm font-semibold">
              Total Transactions: {items.length}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
});

ItemMonitoringReport.displayName = "ItemMonitoringReport";

export default ItemMonitoringReport;
