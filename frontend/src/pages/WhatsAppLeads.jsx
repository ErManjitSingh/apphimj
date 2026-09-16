import { WhatsAppLeadsPage } from '../components/whatsapp';
import { useLogModuleOpened } from '../hooks/useLogModuleOpened';
import { ChannelGate } from '../components/channels/ChannelUnavailable';

export default function WhatsAppLeads() {
  useLogModuleOpened('whatsapp');
  return (
    <ChannelGate channel="whatsapp">
      <WhatsAppLeadsPage />
    </ChannelGate>
  );
}
