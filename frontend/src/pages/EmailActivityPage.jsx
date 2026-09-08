import GmailMailbox from '../components/email/GmailMailbox';
import { useLogModuleOpened } from '../hooks/useLogModuleOpened';

export default function EmailActivityPage() {
  useLogModuleOpened('email_activity');
  return (
    <div className="-m-3 sm:-m-4 lg:-m-5 h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">
      <GmailMailbox />
    </div>
  );
}
