import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { exportToCSV, exportToExcel, buildExportRows } from './reportUtils';

export default function ExportActions({ data }) {
  const rows = buildExportRows(data);

  const exportAll = (type) => {
    const flat = [
      ...rows.leadSources.map((r) => ({ section: 'Lead Source', ...r })),
      ...rows.executives.map((r) => ({ section: 'Executive', ...r })),
      ...rows.destinations.map((r) => ({ section: 'Destination', ...r })),
      ...rows.packages.map((r) => ({ section: 'Package', ...r })),
    ];
    if (type === 'csv') exportToCSV('him-journey-report.csv', flat);
    else if (type === 'excel') exportToExcel('him-journey-report.xls', flat);
    else window.print();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => exportAll('pdf')} className="rounded-xl gap-2 text-red-700 border-red-400/40 bg-red-500/10 hover:bg-red-500/15">
        <FileText className="w-4 h-4" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportAll('excel')} className="rounded-xl gap-2 text-emerald-700 border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/15">
        <FileSpreadsheet className="w-4 h-4" /> Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportAll('csv')} className="rounded-xl gap-2 text-sky-700 border-sky-400/40 bg-sky-500/10 hover:bg-sky-500/15">
        <FileDown className="w-4 h-4" /> CSV
      </Button>
    </div>
  );
}
