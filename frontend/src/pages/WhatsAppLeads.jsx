import { WhatsAppLeadsPage } from '../components/whatsapp';
import { useLogModuleOpened } from '../hooks/useLogModuleOpened';

export default function WhatsAppLeads() {
  useLogModuleOpened('whatsapp');
  return <WhatsAppLeadsPage />;
}
