import { useNavigate } from 'react-router-dom';
import { api } from '../api/agroviaApi';

// Find-or-create a conversation (backend authorizes), then open it in the Messages page.
export function useOpenConversation() {
  const navigate = useNavigate();
  return async (payload) => {
    try {
      const data = await api.createConversation(payload);
      navigate(`/messages?c=${data.conversation._id}`);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.response?.data?.message || 'Söhbət açıla bilmədi.');
    }
  };
}
