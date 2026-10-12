import { Megaphone } from 'lucide-react';
import { resolveMetaFormCapture } from '../../lib/metaFormCapture';
import { DETAIL_CARD } from './leadDetailUtils';
import { cn } from '../../lib/utils';

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-slate-100 py-2.5 last:border-0 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-4">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-[13px] font-medium leading-snug text-slate-800 whitespace-pre-wrap break-words">
        {value}
      </dd>
    </div>
  );
}

export default function MetaFormAnswersCard({ lead }) {
  const capture = resolveMetaFormCapture(lead);
  if (!capture) return null;

  const answers = Array.isArray(capture.answers) ? capture.answers : [];
  const hasMeta =
    capture.campaignName ||
    capture.formName ||
    capture.adName ||
    capture.leadgenId ||
    answers.length;

  if (!hasMeta) return null;

  const capturedLabel = capture.capturedAt
    ? new Date(capture.capturedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <section className={cn(DETAIL_CARD, 'p-5')}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-2 text-[14px] font-bold text-slate-800">
            <Megaphone className="h-4 w-4 text-blue-600" />
            Meta form answers
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Facebook / Instagram Instant Form · {capturedLabel || 'Imported lead'}
          </p>
        </div>
      </div>

      <dl className="mb-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3">
        <MetaRow label="Campaign" value={capture.campaignName} />
        <MetaRow label="Ad set" value={capture.adsetName} />
        <MetaRow label="Ad" value={capture.adName} />
        <MetaRow label="Form" value={capture.formName} />
        {capture.leadgenId ? (
          <MetaRow label="Lead ID" value={capture.leadgenId} />
        ) : null}
      </dl>

      {answers.length ? (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Form questions
          </p>
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-100 px-3">
            {answers.map((row, index) => (
              <MetaRow
                key={`${row.key || row.label}-${index}`}
                label={row.label || row.key}
                value={row.value}
              />
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
