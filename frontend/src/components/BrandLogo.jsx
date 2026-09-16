import { cn } from '../lib/utils';
import { COMPANY_INFO, COMPANY_LOGO_URL } from '../config/branding';

export default function BrandLogo({ className = 'h-10 w-10', alt = COMPANY_INFO.name }) {
  return (
    <img
      src={COMPANY_LOGO_URL}
      alt={alt}
      className={cn('rounded-full object-cover bg-black shrink-0', className)}
    />
  );
}
