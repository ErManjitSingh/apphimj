import { motion } from 'framer-motion';

const QUOTES = [
  'The best views come after the hardest calls.',
  'Every follow-up is a step closer to the summit.',
  'Sell journeys, not just packages.',
  'Great trips start with great conversations.',
];

function getDayGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function ExecutiveWelcomeBanner({ firstName, now = new Date() }) {
  const quote = QUOTES[now.getDate() % QUOTES.length];

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl min-h-[132px]"
      style={{
        backgroundImage:
          "linear-gradient(100deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.45) 55%, rgba(15,23,42,0.55) 100%), url('/login-himalaya-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="relative z-10 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <div className="min-w-0 max-w-xl">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[28px]">
            {getDayGreeting(now)}, {firstName}!{' '}
            <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1.5 text-base font-medium text-white/95">
            Turn travel dreams into journeys.
          </p>
          <p className="mt-1 text-sm text-white/70">
            New people, new places, new stories — keep selling!
          </p>
        </div>

        <div className="max-w-xs shrink-0 rounded-xl border border-white/15 bg-black/25 px-4 py-3 backdrop-blur-md sm:max-w-[240px]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-200/90">
            Today&apos;s spark
          </p>
          <p className="mt-1.5 text-sm font-medium leading-snug text-white/95">
            &ldquo;{quote}&rdquo;
          </p>
        </div>
      </div>
    </motion.section>
  );
}
