import { getLeadListStatusDisplay } from '../../lib/executiveStatusDisplay';
import { PIPELINE_STAGES } from './leadDetailData';
import { DETAIL_CARD } from './leadDetailUtils';
import { cn } from '../../lib/utils';
import { RefreshCw } from 'lucide-react';
import {
  normalizeLeadStatus,
  LEAD_TEMPERATURE_OPTIONS,
  pipelineStatusLabel,
} from '../../lib/leadPipeline';

export default function LeadStatusPipeline({ status, lead, onUpdateStatus }) {
  const resolved = lead || { status };
  const current = normalizeLeadStatus(resolved.status);
  const temp = String(resolved.temperature || '').toLowerCase();
  const tempLabel =
    LEAD_TEMPERATURE_OPTIONS.find((t) => t.value === temp)?.label ||
    (temp === 'vip' ? 'Hot' : '');
  const stageDate =
    lead?.createdAt && current === 'new_lead'
      ? new Date(lead.createdAt).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '';
  const [dateLine, timeLine] = stageDate ? stageDate.split(',').map((part) => part.trim()) : [];
  const display = getLeadListStatusDisplay(resolved);

  return (
    <div className={cn(DETAIL_CARD, 'px-5 py-4')}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-slate-800">Lead Status</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {pipelineStatusLabel(current)}
            {tempLabel ? ` · ${tempLabel}` : ''}
            {display.reasonLabel ? ` · ${display.reasonLabel}` : ''}
          </p>
        </div>
        {onUpdateStatus ? (
          <button
            type="button"
            onClick={onUpdateStatus}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Update Status
          </button>
        ) : null}
      </div>

      <div className="relative px-1 pt-1 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="absolute left-[20px] right-[20px] top-[7px] h-px bg-slate-200" />
          <div className="relative flex justify-between gap-1">
            {PIPELINE_STAGES.filter((s) => !['postponed', 'lost'].includes(s.value) || s.value === current).map(
              (stage) => {
                const active = stage.value === current;
                return (
                  <div key={stage.value} className="flex w-14 flex-col items-center shrink-0">
                    <span
                      className={cn(
                        'relative z-[1] flex h-[14px] w-[14px] items-center justify-center rounded-full',
                        active ? 'bg-orange-500 ring-[6px] ring-orange-100' : 'border-2 border-slate-200 bg-white'
                      )}
                    >
                      {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                    </span>
                    <span
                      className={cn(
                        'mt-2.5 text-center text-[10px] font-semibold leading-tight',
                        active ? 'text-orange-500' : 'text-slate-400'
                      )}
                    >
                      {stage.shortLabel || stage.label}
                    </span>
                    {active && dateLine ? (
                      <span className="mt-0.5 text-center text-[9px] leading-tight text-slate-400">
                        {dateLine}
                        {timeLine ? (
                          <>
                            <br />
                            {timeLine}
                          </>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
