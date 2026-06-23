import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/agroviaApi';
import { getSocket } from '../api/socketClient';
import { SectionTitle } from '../components/Ui';
import ConversationList from '../components/ConversationList';
import ChatPanel from '../components/ChatPanel';

export default function SupportPage({ embedded = false }) {
  const { user } = useSelector((state) => state.auth);
  const myId = user?.id || user?._id;
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('c') || '';
  const autoStarted = useRef(false);

  const conversationsQuery = useQuery({
    queryKey: ['conversations', 'support'],
    queryFn: () => api.getConversations({ type: 'support' }),
    enabled: Boolean(user),
  });
  const conversations = conversationsQuery.data?.conversations || [];

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onUpdated = () =>
      queryClient.invalidateQueries({ queryKey: ['conversations', 'support'] });
    socket.on('conversation:updated', onUpdated);
    return () => socket.off('conversation:updated', onUpdated);
  }, [queryClient]);

  // Non-admin: find-or-create the single support conversation automatically.
  useEffect(() => {
    if (isAdmin || selectedId || autoStarted.current || conversationsQuery.isLoading) return;
    autoStarted.current = true;
    const first = conversations[0];
    if (first) {
      setSearchParams({ c: first._id }, { replace: true });
    } else {
      api
        .createConversation({ type: 'support' })
        .then((data) => {
          queryClient.invalidateQueries({ queryKey: ['conversations', 'support'] });
          setSearchParams({ c: data.conversation._id }, { replace: true });
        })
        .catch(() => {
          autoStarted.current = false;
        });
    }
  }, [isAdmin, selectedId, conversations, conversationsQuery.isLoading, queryClient, setSearchParams]);

  const onSelect = (id) => setSearchParams({ c: id });

  if (embedded) {
    return (
      <div className="flex h-full">
        {isAdmin && (
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
        )}
        <div className="min-w-0 flex-1">
          <ChatPanel conversationId={selectedId} myId={myId} panelClass="h-full" />
        </div>
      </div>
    );
  }

  return (
    <section className="section-shell py-8">
      <SectionTitle eyebrow="Kömək" title="Dəstək" />
      <div className={`grid gap-5${isAdmin ? ' lg:grid-cols-[340px_1fr]' : ''}`}>
        {isAdmin ? (
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
        ) : null}
        <ChatPanel conversationId={selectedId} myId={myId} />
      </div>
    </section>
  );
}
