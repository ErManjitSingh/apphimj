import { forwardRef } from 'react';
import './quotePdfTemplate.css';
import { COMPANY_INFO } from './constants';
import { formatINR } from './quotationUtils';
import { resolveDestinationImages } from './destinationGalleryUtils';
import { QUOTE_WELCOME_TEXT } from './quoteTemplateDefaults';
import {
  resolveQuotePackage,
  resolveQuoteLead,
  formatQuoteDate,
  formatQuoteDateShort,
  getDayDate,
  resolveQuoteVehicles,
  resolveDayHotelForItinerary,
  resolveTripPlanner,
  resolvePolicies,
  resolveBankAccounts,
  resolveTravelerCounts,
} from './quotePdfHelpers';
import { shortMealPlanLabel } from '../../lib/mealPlanDefaults';
import { absolutizeUrl } from './embedPrintImages';

/** Split long text into short bullet lines — no dense paragraphs. */
function toBulletLines(text, { max = 6, maxLen = 110 } = {}) {
  const raw = String(text || '').trim();
  if (!raw) return [];

  const chunks = raw
    .split(/\n+|•|\u2022|(?<=[.!?])\s+|(?<=;)\s+/)
    .map((s) => s.replace(/^[-–—\d.)\s]+/, '').trim())
    .filter((s) => s.length > 2);

  const lines = [];
  for (const chunk of chunks) {
    if (lines.length >= max) break;
    if (chunk.length <= maxLen) {
      lines.push(chunk);
      continue;
    }
    // Prefer natural break near maxLen
    const cut = chunk.lastIndexOf(' ', maxLen);
    lines.push((cut > 40 ? chunk.slice(0, cut) : chunk.slice(0, maxLen)).trim());
  }
  return lines.length ? lines : [raw.slice(0, maxLen)];
}

function PdfSection({ title, eyebrow, children, flush, spaced, className = '' }) {
  const sectionClass = [
    'quote-ht-section',
    spaced ? 'quote-ht-section-spaced' : '',
    flush ? 'quote-ht-section--flush' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={sectionClass}>
      {title && (
        <div className="quote-ht-section-title">
          {eyebrow && <span className="quote-ht-section-eyebrow">{eyebrow}</span>}
          <span className="quote-ht-section-heading">{title}</span>
          <span className="quote-ht-section-rule" aria-hidden="true" />
        </div>
      )}
      <div
        className={`quote-ht-section-content ${flush ? 'quote-ht-section-content-flush' : ''}`.trim()}
      >
        {children}
      </div>
    </section>
  );
}

function PolicyBlock({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="quote-ht-policy">
      <div className="quote-ht-policy-head">{title}</div>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PdfImage({ src, alt, className }) {
  if (!src) return null;
  const absolute = absolutizeUrl(src);
  const isData = absolute.startsWith('data:');
  let sameOrigin = true;
  try {
    if (!isData && typeof window !== 'undefined') {
      sameOrigin = new URL(absolute, window.location.href).origin === window.location.origin;
    }
  } catch {
    sameOrigin = true;
  }
  return (
    <img
      src={absolute}
      alt={alt}
      className={className}
      crossOrigin={isData || sameOrigin ? undefined : 'anonymous'}
      referrerPolicy={isData || sameOrigin ? undefined : 'no-referrer'}
    />
  );
}

function BulletList({ items, className = '' }) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return null;
  return (
    <ul className={`quote-ht-bullets ${className}`.trim()}>
      {list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function HotelStayCard({ dayHotel, dayMeals, dayNumber }) {
  if (!dayHotel?.name) return null;

  const hotelPhoto = absolutizeUrl(
    dayHotel.hotelImages?.[0] ||
      dayHotel.thumbnailUrl ||
      dayHotel.image ||
      dayHotel.images?.[0] ||
      dayHotel.roomImage ||
      dayHotel.roomImages?.[0] ||
      ''
  );
  const isDayOne = Number(dayNumber) === 1;
  const mealPlan = isDayOne
    ? shortMealPlanLabel(dayHotel.mealPlanKey, dayHotel.meals, dayMeals, dayHotel.mealPlan)
    : dayHotel.meals || dayMeals || '—';
  const roomType = dayHotel.roomType || 'Deluxe';
  const rating = Number(dayHotel.rating || dayHotel.starCategory || 0);

  return (
    <div className="quote-ht-stay-card">
      <div className="quote-ht-stay-photo">
        {hotelPhoto ? (
          <PdfImage src={hotelPhoto} alt={dayHotel.name} className="quote-ht-stay-photo-img" />
        ) : (
          <div className="quote-ht-stay-photo-fallback">Stay</div>
        )}
        <span className="quote-ht-stay-photo-tag">Overnight</span>
      </div>
      <div className="quote-ht-stay-body">
        <div className="quote-ht-stay-label">Your Stay</div>
        <h4 className="quote-ht-stay-name">{dayHotel.name}</h4>
        {rating > 0 && (
          <div className="quote-ht-stay-rating">
            <span className="quote-ht-stay-stars">{'★'.repeat(Math.min(5, Math.round(rating)))}</span>
            <span className="quote-ht-stay-rating-val">{rating.toFixed(1)}</span>
          </div>
        )}
        <div className="quote-ht-stay-meta">
          {!isDayOne && (
            <div className="quote-ht-stay-meta-item">
              <span className="quote-ht-stay-meta-label">Room</span>
              <span className="quote-ht-stay-meta-value">{roomType}</span>
            </div>
          )}
          <div className="quote-ht-stay-meta-item">
            <span className="quote-ht-stay-meta-label">Meal Plan</span>
            <span className="quote-ht-stay-meta-value">{mealPlan}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const QuotePdfPreview = forwardRef(function QuotePdfPreview({ quote }, ref) {
  if (!quote) return null;

  const lead = resolveQuoteLead(quote);
  const pkg = resolveQuotePackage(quote);
  const p = quote.pricing || {};
  const vehicles = resolveQuoteVehicles(quote);
  const planner = resolveTripPlanner(quote);
  const policies = resolvePolicies(quote);
  const banks = resolveBankAccounts(quote);
  const pax = resolveTravelerCounts(quote);
  const nights = Math.max(1, (pkg.duration || 1) - 1);
  const shortName = pkg.shortName || pkg.name?.split(' ').slice(0, 2).join(' ') || 'Package';
  const guestName = lead.name || 'Guest';
  const guestFirst = guestName.split(/\s+/).filter(Boolean)[0] || 'Guest';
  const destImages = resolveDestinationImages(quote);
  const coverSrc = pkg.coverImage || destImages[0]?.url || '';
  const destLabel =
    (pkg.routing || pkg.destination || '').split(/[,·|/]/)[0]?.trim() ||
    destImages[0]?.label ||
    'Your Trip';
  const welcomeParagraphs = String(QUOTE_WELCOME_TEXT || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div ref={ref} className="quote-ht-pdf">
      <header className="quote-ht-topbar">
        <div className="quote-ht-brand-row">
          <img
            src={absolutizeUrl(COMPANY_INFO.logoUrl)}
            alt={COMPANY_INFO.name}
            className="quote-ht-logo-img"
          />
          <div className="quote-ht-brand-text">
            <span className="quote-ht-brand-name">{COMPANY_INFO.brand}</span>
            <span className="quote-ht-brand-tagline">{COMPANY_INFO.tagline}</span>
          </div>
        </div>
        <div className="quote-ht-quote-meta">
          <span className="quote-ht-meta-pill">Travel Quotation</span>
          <div className="qnum">{quote.quoteNumber}</div>
          <div>{formatQuoteDate(quote.createdAt)}</div>
        </div>
      </header>

      <div className="quote-ht-cover">
        {coverSrc ? (
          <PdfImage src={coverSrc} alt={destLabel} className="quote-ht-cover-img" />
        ) : (
          <div className="quote-ht-cover-fallback" />
        )}
        <div className="quote-ht-cover-shade" />
        <div className="quote-ht-cover-ornament" aria-hidden="true" />
        <div className="quote-ht-cover-content">
          <span className="quote-ht-cover-badge">{shortName}</span>
          {guestName && guestName !== 'Guest' && (
            <p className="quote-ht-cover-kicker">Prepared for {guestName}</p>
          )}
          <h1 className="quote-ht-cover-title">{pkg.name}</h1>
          <p className="quote-ht-cover-route">{pkg.routing || pkg.destination}</p>
          <div className="quote-ht-cover-chips">
            <span>
              {nights}N / {pkg.duration}D
            </span>
            <span>{pkg.packageCategory}</span>
            {lead.travelDate && <span>{formatQuoteDate(lead.travelDate)}</span>}
          </div>
        </div>
        <div className="quote-ht-cover-price">
          <span className="price-label">Investment</span>
          <span className="price-value">{formatINR(p.total)}</span>
          <span className="price-note">All inclusive · GST as applicable</span>
        </div>
      </div>

      <PdfSection title={`Hello ${guestFirst}`} eyebrow="Greeting" spaced>
        <div className="quote-ht-welcome">
          <p className="quote-ht-welcome-guest">
            Dear <strong>{guestName}</strong>,
          </p>
          {welcomeParagraphs.map((para) => (
            <p key={para.slice(0, 40)}>{para}</p>
          ))}
          <p className="quote-ht-welcome-contact">
            Need help anytime? <strong>{COMPANY_INFO.phone}</strong> · {COMPANY_INFO.email}
          </p>
        </div>
      </PdfSection>

      <PdfSection title="Trip Snapshot" eyebrow="Overview" spaced>
        <div className="quote-ht-snapshot">
          {[
            ['Guest', guestName],
            ['Package', pkg.name],
            ['Quotation', quote.quoteNumber],
            ['Route', pkg.routing || pkg.destination || destLabel],
            ['Duration', `${pkg.duration} Days / ${nights} Nights`],
            [
              'Travellers',
              `${pax.adults} Adult${pax.adults !== 1 ? 's' : ''}${pax.kids ? ` · ${pax.kids} Child` : ''}`,
            ],
            [
              'Rooms',
              `${pax.rooms}${pax.extraBeds ? ` + ${pax.extraBeds} extra bed` : ''}`,
            ],
            ['Cab', pkg.cabCategory || vehicles[0]?.name || '—'],
            ...(lead.phone ? [['Contact', lead.phone]] : []),
            ...(lead.travelDate ? [['Travel date', formatQuoteDate(lead.travelDate)]] : []),
            ['Category', pkg.packageCategory],
          ].map(([label, value]) => (
            <div key={label} className="quote-ht-snapshot-cell">
              <span className="lbl">{label}</span>
              <span className="val">{value}</span>
            </div>
          ))}
        </div>
      </PdfSection>

      {vehicles.length > 0 && (
        <PdfSection title="Transfers & Cab" eyebrow="Transport" spaced>
          <div className="quote-ht-transport-grid">
            {vehicles.map((v) => (
              <div key={v.name} className="quote-ht-transport-card">
                <div className="quote-ht-transport-icon">CAB</div>
                <div>
                  <div className="quote-ht-transport-name">{v.name}</div>
                  <div className="quote-ht-transport-meta">
                    {v.tripType ? v.tripType.replace(/_/g, ' ') : 'Private transfer'}
                    {v.startDate ? ` · ${formatQuoteDateShort(v.startDate)}` : ''}
                    {v.endDate ? ` → ${formatQuoteDateShort(v.endDate)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PdfSection>
      )}

      {pkg.itinerary?.length > 0 && (
        <PdfSection title="Day-wise Itinerary" eyebrow="Your journey" spaced flush>
          <div className="quote-ht-timeline">
            {pkg.itinerary.map((day, index) => {
              const dayDate = getDayDate(lead.travelDate, day.day);
              const dayHotel = resolveDayHotelForItinerary(quote, day.day);
              const hasHotel = dayHotel?.name || day.hotel;
              const isLast = index === pkg.itinerary.length - 1;
              const dayPhoto = destImages[index % Math.max(1, destImages.length)];
              const dayPoints = toBulletLines(day.description, { max: 5 });
              const sightPoints = toBulletLines(day.sightseeing, { max: 4 });
              const activityPoints = toBulletLines(day.activities || day.activityNotes, {
                max: 4,
              });

              return (
                <div
                  key={day.id || day.day}
                  className={`quote-ht-timeline-item${isLast ? ' is-last' : ''}`}
                >
                  <div className="quote-ht-timeline-rail">
                    <span className="quote-ht-timeline-dot">
                      {String(day.day).padStart(2, '0')}
                    </span>
                    {!isLast && <span className="quote-ht-timeline-line" />}
                  </div>
                  <div className="quote-ht-timeline-card">
                    <div className="quote-ht-day-head">
                      <div className="quote-ht-day-head-main">
                        <h3 className="quote-ht-day-title">{day.title}</h3>
                        <div className="quote-ht-day-date">
                          {dayDate ? formatQuoteDate(dayDate) : `Day ${day.day}`}
                          {(day.transport || pkg.cabCategory) && (
                            <span> · {day.transport || pkg.cabCategory}</span>
                          )}
                        </div>
                      </div>
                      {dayPhoto?.url && (
                        <div className="quote-ht-day-thumb">
                          <PdfImage
                            src={dayPhoto.url}
                            alt={dayPhoto.label || `Day ${day.day}`}
                            className="quote-ht-day-thumb-img"
                          />
                        </div>
                      )}
                    </div>

                    {dayPoints.length > 0 && <BulletList items={dayPoints} className="quote-ht-day-points" />}

                    {(sightPoints.length > 0 || activityPoints.length > 0) && (
                      <div className="quote-ht-day-extra">
                        {sightPoints.length > 0 && (
                          <div className="quote-ht-day-extra-block">
                            <strong>Sightseeing</strong>
                            <BulletList items={sightPoints} />
                          </div>
                        )}
                        {activityPoints.length > 0 && (
                          <div className="quote-ht-day-extra-block">
                            <strong>Activities</strong>
                            <BulletList items={activityPoints} />
                          </div>
                        )}
                      </div>
                    )}

                    {hasHotel && (
                      <HotelStayCard
                        dayNumber={day.day}
                        dayMeals={day.meals}
                        dayHotel={
                          dayHotel || {
                            name: day.hotel,
                            roomType: '',
                            meals: day.meals,
                            city: pkg.destination?.split(/[,·|/]/)[0]?.trim(),
                          }
                        }
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </PdfSection>
      )}

      <PdfSection title="What's Included" eyebrow="Package cover" spaced>
        <div className="quote-ht-inc-exc">
          <div className="inc">
            <h4>Inclusions</h4>
            <ul>
              {(pkg.inclusions || []).map((item, index) => (
                <li key={`inc-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="exc">
            <h4>Exclusions</h4>
            <ul>
              {(pkg.exclusions || []).map((item, index) => (
                <li key={`exc-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </PdfSection>

      <div className="quote-ht-fare">
        <div className="quote-ht-fare-left">
          <span className="quote-ht-fare-label">Package fare</span>
          <span className="quote-ht-fare-sub">
            {nights}N · {pax.adults} Adult{pax.adults !== 1 ? 's' : ''}
            {pax.kids ? ` · ${pax.kids} Child` : ''}
          </span>
        </div>
        <div className="quote-ht-fare-right">
          <span className="quote-ht-fare-amount">{formatINR(p.total)}</span>
          <span className="quote-ht-fare-note">Taxes included as applicable</span>
        </div>
      </div>

      <PdfSection title="Policies & Terms" eyebrow="Please read" spaced>
        <div className="quote-ht-policies-wrap">
          <PolicyBlock title="Remarks" items={policies.remarks} />
          <PolicyBlock title="Booking & Payment Policy" items={policies.confirmation} />
          <PolicyBlock title="Cancellation Policy" items={policies.cancellation} />
          <PolicyBlock
            title="Postponement / Preponement Policy"
            items={policies.amendment}
          />
          <PolicyBlock title="General Terms & Conditions" items={policies.terms} />
        </div>
      </PdfSection>

      <PdfSection title="Payment Details" eyebrow="Bank transfer" spaced>
        <table className="quote-ht-bank-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Bank</th>
              <th>Account Name</th>
              <th>Account No.</th>
              <th>IFSC</th>
              <th>Branch</th>
              <th>UPI</th>
            </tr>
          </thead>
          <tbody>
            {banks.map((b, i) => (
              <tr key={b.bank}>
                <td>{i + 1}</td>
                <td>
                  <strong>{b.bank}</strong>
                </td>
                <td>{b.accountName}</td>
                <td>{b.accountNo}</td>
                <td>{b.ifsc}</td>
                <td>{b.branch}</td>
                <td>{b.upi || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PdfSection>

      <PdfSection title="Need assistance?" eyebrow="Your trip expert" spaced>
        <div className="quote-ht-planner">
          <div className="quote-ht-planner-box quote-ht-planner-box--accent">
            <h4>Trip Planner</h4>
            <div className="quote-ht-planner-name">{planner.name}</div>
            <div className="quote-ht-contact-line">{planner.phone || COMPANY_INFO.phone}</div>
          </div>
          <div className="quote-ht-planner-box">
            <h4>{COMPANY_INFO.name}</h4>
            <div className="quote-ht-contact-line">{COMPANY_INFO.phone}</div>
            <div className="quote-ht-contact-line">{COMPANY_INFO.email}</div>
            <div>Address: {COMPANY_INFO.address}</div>
            <div className="quote-ht-contact-line">{COMPANY_INFO.website}</div>
            <div className="quote-ht-contact-line">
              Instagram: {COMPANY_INFO.instagram.replace('https://www.', '')}
            </div>
            <div className="quote-ht-contact-line">
              Facebook: {COMPANY_INFO.facebook.replace('https://www.', '')}
            </div>
          </div>
        </div>
      </PdfSection>

      <footer className="quote-ht-footer">
        <div className="quote-ht-footer-inner">
          <img
            src={absolutizeUrl(COMPANY_INFO.logoUrl)}
            alt={COMPANY_INFO.name}
            className="quote-ht-footer-logo"
          />
          <p className="quote-ht-footer-price">
            Total Package Price: <strong>{formatINR(p.total)}</strong>
          </p>
          <p className="quote-ht-footer-brand">{COMPANY_INFO.brand}</p>
          <p>{COMPANY_INFO.tagline}</p>
          <p>
            {COMPANY_INFO.phone} · {COMPANY_INFO.email}
          </p>
          <p>
            {COMPANY_INFO.website} · Instagram · Facebook
          </p>
          <p className="quote-ht-footer-thanks">
            Thank you for choosing {COMPANY_INFO.name}
          </p>
        </div>
      </footer>
    </div>
  );
});

export default QuotePdfPreview;
