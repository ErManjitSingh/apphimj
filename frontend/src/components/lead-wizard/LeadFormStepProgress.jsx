import { cn } from '../../lib/utils';
import { LEAD_FORM_STEPS } from './constants';

function scrollToStep(anchorId) {
  document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Purely a visual guide — highlights the section currently in view (see useScrollSpy) and, on
 * click, smooth-scrolls to that section. It never changes what's rendered: this is a single
 * scrollable page, not a wizard with separate views per step.
 */
export default function LeadFormStepProgress({ activeAnchorId }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      {/* Desktop: horizontal chain */}
      <div className="hidden md:flex items-center">
        {LEAD_FORM_STEPS.map((step, i) => {
          const active = step.anchorId === activeAnchorId;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex flex-1 items-center">
              <button
                type="button"
                onClick={() => scrollToStep(step.anchorId)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors',
                  active ? 'bg-[#5D5FEF]/10' : 'hover:bg-slate-50'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                    active ? 'bg-[#5D5FEF] text-white shadow-sm shadow-[#5D5FEF]/30' : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {active ? <Icon className="h-3.5 w-3.5" /> : step.id}
                </span>
                <span className={cn('text-xs font-semibold whitespace-nowrap', active ? 'text-[#5D5FEF]' : 'text-slate-500')}>
                  {step.title}
                </span>
              </button>
              {i < LEAD_FORM_STEPS.length - 1 && <div className="mx-1 h-px flex-1 bg-slate-200" />}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical list */}
      <div className="flex flex-col gap-1 md:hidden">
        {LEAD_FORM_STEPS.map((step) => {
          const active = step.anchorId === activeAnchorId;
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => scrollToStep(step.anchorId)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors',
                active ? 'bg-[#5D5FEF]/10' : ''
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors',
                  active ? 'bg-[#5D5FEF] text-white shadow-sm shadow-[#5D5FEF]/30' : 'bg-slate-100 text-slate-400'
                )}
              >
                {active ? <Icon className="h-3.5 w-3.5" /> : step.id}
              </span>
              <span className="min-w-0">
                <span className={cn('block text-xs font-semibold', active ? 'text-[#5D5FEF]' : 'text-slate-600')}>
                  {step.title}
                </span>
                <span className="block text-[10px] text-slate-400 truncate">{step.subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
