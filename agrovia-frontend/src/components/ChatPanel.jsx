import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { api } from '../api/agroviaApi';
import { getSocket } from '../api/socketClient';
import { EmptyState, formatDate } from './Ui';

const TYPE_LABELS = {
  buyer_seller: 'Alıcı ↔ Satıcı',
  buyer_courier: 'Alıcı ↔ Kuryer',
  seller_courier: 'Satıcı ↔ Kuryer',
  support: 'Dəstək',
};

const nameOf = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');

function headerTitle(convo, myId) {
  if (!convo) return '';
  if (convo.type === 'support') return 'Dəstək (Admin)';
  const parts = [convo.buyer, convo.seller, convo.courier, convo.user].filter(Boolean);
  const other = parts.find((u) => String(u._id) !== String(myId));
  return nameOf(other) || 'İstifadəçi';
}

export default function ChatPanel({ conversationId, myId, panelClass = 'h-[70vh]' }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.getMessages(conversationId),
    enabled: Boolean(conversationId),
  });

  const conversation = messagesQuery.data?.conversation;
  const messages = messagesQuery.data?.messages || [];

  const readOnly = Boolean(
    conversation &&
      (conversation.isActive === false ||
        (['buyer_courier', 'seller_courier'].includes(conversation.type) &&
          conversation.order &&
          ['delivered', 'cancelled'].includes(conversation.order.status)))
  );

  // Join the room, mark read, and stream live messages.
  useEffect(() => {
    if (!conversationId) return undefined;
    const socket = getSocket();

    api.markConversationRead(conversationId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => {});

    if (!socket) return undefined;
    socket.emit('conversation:join', conversationId);
    socket.emit('message:read', conversationId);

    const onNew = ({ conversationId: cid, message }) => {
      if (String(cid) !== String(conversationId)) return;
      queryClient.setQueryData(['messages', conversationId], (old) =>
        old ? { ...old, messages: [...old.messages, message] } : old
      );
      socket.emit('message:read', conversationId);
    };
    const onTypingStart = ({ conversationId: cid, userId }) => {
      if (String(cid) === String(conversationId) && String(userId) !== String(myId)) setOtherTyping(true);
    };
    const onTypingStop = ({ conversationId: cid }) => {
      if (String(cid) === String(conversationId)) setOtherTyping(false);
    };

    socket.on('message:new', onNew);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.off('message:new', onNew);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      setOtherTyping(false);
    };
  }, [conversationId, myId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, otherTyping]);

  const emitTyping = () => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing:start', conversationId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing:stop', conversationId), 1500);
  };

  const send = () => {
    const t = text.trim();
    if (!t || readOnly) return;
    setText('');
    const socket = getSocket();
    socket?.emit('typing:stop', conversationId);

    if (socket && socket.connected) {
      socket.emit('message:send', { conversationId, text: t }, (resp) => {
        if (!resp?.ok) {
          // eslint-disable-next-line no-alert
          alert(resp?.message || 'Mesaj göndərilmədi');
        }
      });
    } else {
      // REST fallback when the socket is unavailable
      api.sendMessage(conversationId, { text: t })
        .then((data) => {
          queryClient.setQueryData(['messages', conversationId], (old) =>
            old ? { ...old, messages: [...old.messages, data.message] } : old
          );
        })
        // eslint-disable-next-line no-alert
        .catch((e) => alert(e?.response?.data?.message || 'Mesaj göndərilmədi'));
    }
  };

  if (!conversationId) {
    return (
      <div className="panel flex h-full items-center justify-center">
        
      </div>
    );
  }

  return (
    <div className={`panel flex flex-col ${panelClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <div className="font-semibold text-ink">{headerTitle(conversation, myId)}</div>
          <div className="text-xs text-slate-400">
            {TYPE_LABELS[conversation?.type] || ''}
            {conversation?.product?.name ? ` • ${conversation.product.name}` : ''}
            {conversation?.order?.orderNumber ? ` • #${conversation.order.orderNumber}` : ''}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messagesQuery.isLoading ? (
          <div className="text-center text-sm text-slate-400">Yüklənir…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-slate-400">Hələ mesaj yoxdur. İlk mesajı yazın.</div>
        ) : (
          messages.map((m) => {
            const mine = String(m.sender?._id) === String(myId);
            return (
              <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-forest text-white' : 'bg-slate-100 text-ink'}`}>
                  {!mine ? <div className="mb-0.5 text-xs font-medium opacity-70">{nameOf(m.sender)}</div> : null}
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                  <div className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-slate-400'}`}>{formatDate(m.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
        {otherTyping ? <div className="text-xs italic text-slate-400">yazır…</div> : null}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {readOnly ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          Söhbət bağlanıb (sifariş tamamlanıb). Tarixçəni görə bilərsiniz.
        </div>
      ) : (
        <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <input
              className="input-shell flex-1"
              placeholder="Mesaj yazın..."
              value={text}
              maxLength={1000}
              onChange={(e) => { setText(e.target.value); emitTyping(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <button type="button" className="btn-primary px-4" onClick={send} disabled={!text.trim()}>
              <Send className="h-4 w-4" />
            </button>
          </div>
          {text.length > 900 && (
            <p className={`text-right text-xs ${text.length >= 1000 ? 'text-red-500' : 'text-slate-400'}`}>
              {text.length}/1000
            </p>
          )}
        </div>
      )}
    </div>
  );
}
