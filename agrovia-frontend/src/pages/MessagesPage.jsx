import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/agroviaApi';
import { getSocket } from '../api/socketClient';
import { SectionTitle } from '../components/Ui';
import ConversationList from '../components/ConversationList';
import ChatPanel from '../components/ChatPanel';

export default function MessagesPage({ embedded = false }) {
  const { user } = useSelector((state) => state.auth);
  const myId = user?.id || user?._id;
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('c') || '';

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
    enabled: Boolean(user),
  });
  // Exclude support conversations — those belong on /support.
  const conversations = (conversationsQuery.data?.conversations || []).filter(
    (c) => c.type !== 'support',
  );

  // Live refresh the list (unread / last message) on any conversation update.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onUpdated = () => queryClient.invalidateQueries({ queryKey: ['conversations'] });
    socket.on('conversation:updated', onUpdated);
    return () => socket.off('conversation:updated', onUpdated);
  }, [queryClient]);

  const onSelect = (id) => setSearchParams({ c: id });

  if (embedded) {
    return (
      <div className="flex h-full">
        <div className="w-[280px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
          {conversationsQuery.isLoading ? (
            <div className="p-4 text-sm text-slate-400">Yüklənir…</div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={onSelect}
              myId={myId}
              isAdmin={isAdmin}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <ChatPanel conversationId={selectedId} myId={myId} panelClass="h-full" />
        </div>
      </div>
    );
  }

  return (
    <section className="section-shell py-8">
      <SectionTitle eyebrow="Mesajlar" title="Söhbətlər" />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="max-h-[70vh] overflow-y-auto">
          {conversationsQuery.isLoading ? (
            <div className="text-sm text-slate-400">Yüklənir…</div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={onSelect}
              myId={myId}
              isAdmin={isAdmin}
            />
          )}
        </div>
        <ChatPanel conversationId={selectedId} myId={myId} />
      </div>
    </section>
  );
}
