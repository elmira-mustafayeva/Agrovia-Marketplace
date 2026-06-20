const nameOf = (u) => (u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : '');

const TYPE_CHIP = {
  buyer_seller: 'Satıcı',
  buyer_courier: 'Kuryer',
  seller_courier: 'Kuryer/Satıcı',
  support: 'Dəstək',
};

function title(convo, myId, isAdmin) {
  if (convo.type === 'support') {
    return isAdmin ? `Dəstək: ${nameOf(convo.user) || 'İstifadəçi'}` : 'Dəstək (Admin)';
  }
  const parts = [convo.buyer, convo.seller, convo.courier].filter(Boolean);
  const other = parts.find((u) => String(u._id) !== String(myId));
  return nameOf(other) || 'İstifadəçi';
}

function unreadFor(convo, myId, isAdmin) {
  const u = convo.unread || {};
  if (convo.type === 'support' && isAdmin) return u.admin || 0;
  return u[String(myId)] || 0;
}

export default function ConversationList({ conversations, selectedId, onSelect, myId, isAdmin }) {
  if (!conversations.length) {
    return <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Söhbət yoxdur.</div>;
  }
  return (
    <div className="space-y-2">
      {conversations.map((convo) => {
        const unread = unreadFor(convo, myId, isAdmin);
        const active = String(selectedId) === String(convo._id);
        return (
          <button
            key={convo._id}
            type="button"
            onClick={() => onSelect(convo._id)}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${active ? 'border-forest bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 font-semibold text-ink truncate">{title(convo, myId, isAdmin)}</div>
              {unread > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-forest px-1.5 text-xs font-semibold text-white">{unread}</span>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{TYPE_CHIP[convo.type]}</span>
              <span className="truncate text-xs text-slate-500">{convo.lastMessage || 'Söhbət başladıldı'}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
