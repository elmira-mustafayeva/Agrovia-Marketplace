import { useNavigate } from 'react-router-dom';
import { api } from '../api/agroviaApi';

// Find-or-create a conversation (backend authorizes), then open it.
// Support conversations route to /support; all others route to /messages.
export function useOpenConversation() {
  const navigate = useNavigate();
  return async (payload) => {
    try {
      const data = await api.createConversation(payload);
      const id = data.conversation._id;
      const dest = payload?.type === 'support' ? `/support?c=${id}` : `/messages?c=${id}`;
      navigate(dest);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.response?.data?.message || 'Söhbət açıla bilmədi.');
    }
  };
}
