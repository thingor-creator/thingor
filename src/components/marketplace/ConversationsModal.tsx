import React, { useState, useEffect, useRef } from 'react';
import type { MarketplaceConversation, MarketplaceMessage, MarketplaceOffer } from '../../types/marketplace';
import {
  fetchConversations,
  getOrCreateConversation,
  fetchMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToConversationMessages,
  fetchOffersForListing,
  respondToOffer,
  cancelOffer,
} from '../../lib/marketplace';
import { useApp } from '../../context/AppContext';
import {
  X,
  Send,
  User as UserIcon,
  MessageSquare,
  HandCoins,
  ShieldCheck,
  Check,
  CheckCheck,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Repeat,
  CheckCircle2,
  XCircle,
  Tag
} from 'lucide-react';

interface ConversationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversationId?: string | null;
  initialSellerId?: string | null;
  initialListingId?: string | null;
  onSelectListing?: (listingId: string) => void;
}

export const ConversationsModal: React.FC<ConversationsModalProps> = ({
  isOpen,
  onClose,
  initialConversationId,
  initialSellerId,
  initialListingId,
  onSelectListing,
}) => {
  const { user, language } = useApp();
  const isHu = language === 'hu';

  const [conversations, setConversations] = useState<MarketplaceConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<MarketplaceConversation | null>(null);
  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [inputText, setInputText] = useState('');

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load conversations list
  useEffect(() => {
    if (!isOpen || !user) {
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingConversations(true);

    const init = async () => {
      // 1. If starting a new conversation from listing detail
      if (initialListingId && initialSellerId && initialSellerId !== user.id) {
        const createRes = await getOrCreateConversation(initialListingId, initialSellerId);
        if (createRes.success && createRes.data && isMounted) {
          setActiveConversation(createRes.data);
        }
      }

      // 2. Fetch full conversations list
      const listRes = await fetchConversations();
      if (!isMounted) return;

      if (listRes.success && listRes.data) {
        setConversations(listRes.data);

        // If specific conversation ID requested
        if (initialConversationId) {
          const match = listRes.data.find((c) => c.id === initialConversationId);
          if (match) setActiveConversation(match);
        } else if (!activeConversation && listRes.data.length > 0 && window.innerWidth >= 768) {
          // Default to first conversation on desktop
          setActiveConversation(listRes.data[0]);
        }
      }

      setLoadingConversations(false);
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialConversationId, initialSellerId, initialListingId, user?.id]);

  // Load messages and subscribe when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      setOffers([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    // Fetch messages & offers
    Promise.all([
      fetchMessages(activeConversation.id),
      fetchOffersForListing(activeConversation.listing_id),
      markMessagesAsRead(activeConversation.id),
    ]).then(([msgRes, offerRes]) => {
      if (!isMounted) return;
      if (msgRes.success && msgRes.data) {
        setMessages(msgRes.data);
        setTimeout(scrollToBottom, 100);
      }
      if (offerRes.success && offerRes.data) {
        setOffers(offerRes.data);
      }
      setLoadingMessages(false);
    });

    // Realtime subscription
    const unsubscribe = subscribeToConversationMessages(
      activeConversation.id,
      (newMsg) => {
        if (!isMounted) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        markMessagesAsRead(activeConversation.id);
        setTimeout(scrollToBottom, 100);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeConversation?.id]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);

    const res = await sendMessage(activeConversation.id, content);
    setIsSending(false);

    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data!]);
      setTimeout(scrollToBottom, 50);
    } else {
      setError(res.error || (isHu ? 'Nem sikerült elküldeni az üzenetet' : 'Failed to send message'));
    }
  };

  const handleOfferResponse = async (offerId: string, status: 'accepted' | 'declined') => {
    setActionLoadingId(offerId);
    const res = await respondToOffer(offerId, status);
    setActionLoadingId(null);

    if (res.success && res.data) {
      setOffers((prev) => prev.map((o) => (o.id === offerId ? res.data! : o)));
    } else {
      alert(res.error || (isHu ? 'Hiba történt az ajánlat frissítésekor' : 'Error updating offer'));
    }
  };

  const handleOfferCancel = async (offerId: string) => {
    setActionLoadingId(offerId);
    const res = await cancelOffer(offerId);
    setActionLoadingId(null);

    if (res.success && res.data) {
      setOffers((prev) => prev.map((o) => (o.id === offerId ? res.data! : o)));
    } else {
      alert(res.error || (isHu ? 'Hiba történt az ajánlat visszavonásakor' : 'Error cancelling offer'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-[16px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] shadow-2xl overflow-hidden text-[var(--text-main,#E0E3E6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/60">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-sm text-white">
              {isHu ? 'Piactéri Üzenetek & Ajánlatok' : 'Marketplace Messages & Offers'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-[var(--surface-bg,#465362)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Area: Two Panes */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Conversations List */}
          <div
            className={`w-full md:w-80 shrink-0 border-r border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/30 flex flex-col ${
              activeConversation ? 'hidden md:flex' : 'flex'
            }`}
          >
            <div className="p-3 border-b border-[var(--border-color,#56616D)]/50 text-xs font-semibold text-[var(--text-sub,#B5BDC6)]">
              {isHu ? 'Beszélgetések' : 'Conversations'} ({conversations.length})
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-color,#56616D)]/40">
              {loadingConversations ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-[11px] text-[var(--text-sub,#B5BDC6)]">{isHu ? 'Betöltés...' : 'Loading...'}</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-12 p-4 text-center text-xs text-[var(--text-sub,#B5BDC6)]">
                  {isHu ? 'Még nincsenek üzeneteid.' : 'No conversations yet.'}
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = activeConversation?.id === conv.id;
                  const otherParty = user?.id === conv.seller_id ? conv.buyer : conv.seller;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConversation(conv)}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-primary-blue,#2563EB)]/15 border-l-4 border-[var(--color-primary-blue,#2563EB)]'
                          : 'hover:bg-[var(--surface-bg,#465362)]/60'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] flex items-center justify-center text-[var(--color-primary-blue,#2563EB)] font-bold shrink-0 overflow-hidden text-sm">
                        {otherParty?.avatar_url ? (
                          <img src={otherParty.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          otherParty?.display_name?.charAt(0).toUpperCase() || <UserIcon className="w-5 h-5" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-white truncate flex items-center gap-1">
                            {otherParty?.display_name || (isHu ? 'Felhasználó' : 'User')}
                            {otherParty?.is_verified && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                          </span>
                          <span className="text-[10px] text-[var(--text-sub,#B5BDC6)] shrink-0">
                            {new Date(conv.last_message_at).toLocaleTimeString(isHu ? 'hu-HU' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Listing Title */}
                        <div className="text-[11px] text-blue-400 truncate flex items-center gap-1 font-medium">
                          <Tag className="w-2.5 h-2.5" />
                          <span>{conv.listing?.title || (isHu ? 'Hirdetés' : 'Listing')}</span>
                        </div>

                        {/* Unread indicator */}
                        {conv.unread_count !== undefined && conv.unread_count > 0 && (
                          <div className="mt-1 flex justify-end">
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-bold">
                              {conv.unread_count}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Chat Stream */}
          <div
            className={`flex-1 flex flex-col bg-[var(--card-bg,#3A4551)] ${
              !activeConversation ? 'hidden md:flex' : 'flex'
            }`}
          >
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Mobile Back Button */}
                    <button
                      type="button"
                      onClick={() => setActiveConversation(null)}
                      className="md:hidden p-1.5 rounded-full text-[var(--text-sub,#B5BDC6)] hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">
                          {user?.id === activeConversation.seller_id
                            ? activeConversation.buyer?.display_name
                            : activeConversation.seller?.display_name}
                        </span>
                        {(user?.id === activeConversation.seller_id
                          ? activeConversation.buyer?.is_verified
                          : activeConversation.seller?.is_verified) && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>

                      {/* Clickable Listing header */}
                      <button
                        type="button"
                        onClick={() => onSelectListing?.(activeConversation.listing_id)}
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 truncate max-w-sm"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span>{activeConversation.listing?.title || (isHu ? 'Hirdetés megtekintése' : 'View listing')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chat Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Offers Section inside chat */}
                  {offers.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {offers.map((offer) => {
                        const isBuyer = user?.id === offer.buyer_id;
                        const isSeller = user?.id === activeConversation.seller_id;

                        return (
                          <div
                            key={offer.id}
                            className="p-3.5 rounded-[12px] bg-gradient-to-r from-emerald-950/40 to-slate-800/60 border border-emerald-500/40 text-xs shadow-md space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                                <HandCoins className="w-4 h-4" />
                                {offer.offer_type === 'rent'
                                  ? (isHu ? 'Bérleti ajánlat' : 'Rent Offer')
                                  : offer.offer_type === 'barter'
                                  ? (isHu ? 'Csereajánlat' : 'Barter Offer')
                                  : (isHu ? 'Vételi ajánlat' : 'Buy Offer')}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  offer.status === 'accepted'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : offer.status === 'declined'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : offer.status === 'cancelled'
                                    ? 'bg-slate-700 text-slate-300'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                }`}
                              >
                                {offer.status}
                              </span>
                            </div>

                            {/* Offer Details */}
                            <div className="text-[12px] text-white">
                              {offer.offered_price && (
                                <div className="font-bold text-sm">
                                  {new Intl.NumberFormat(isHu ? 'hu-HU' : 'en-US').format(offer.offered_price)} {offer.currency}
                                </div>
                              )}
                              {offer.rental_start_date && offer.rental_end_date && (
                                <div className="text-[11px] text-[var(--text-sub,#B5BDC6)] flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3" />
                                  <span>{offer.rental_start_date} → {offer.rental_end_date}</span>
                                </div>
                              )}
                              {offer.barter_description && (
                                <div className="text-[11px] text-purple-300 flex items-center gap-1 mt-0.5">
                                  <Repeat className="w-3 h-3" />
                                  <span>{offer.barter_description}</span>
                                </div>
                              )}
                              {offer.message && (
                                <div className="text-[11px] text-[var(--text-sub,#B5BDC6)] italic mt-1 bg-black/20 p-2 rounded">
                                  "{offer.message}"
                                </div>
                              )}
                            </div>

                            {/* Action Buttons for Offer */}
                            {offer.status === 'pending' && (
                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-500/20">
                                {isSeller && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={actionLoadingId === offer.id}
                                      onClick={() => handleOfferResponse(offer.id, 'accepted')}
                                      className="px-3 py-1 rounded-[6px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{isHu ? 'Ajánlat elfogadása' : 'Accept'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={actionLoadingId === offer.id}
                                      onClick={() => handleOfferResponse(offer.id, 'declined')}
                                      className="px-3 py-1 rounded-[6px] bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>{isHu ? 'Elutasítás' : 'Decline'}</span>
                                    </button>
                                  </>
                                )}

                                {isBuyer && (
                                  <button
                                    type="button"
                                    disabled={actionLoadingId === offer.id}
                                    onClick={() => handleOfferCancel(offer.id)}
                                    className="px-2.5 py-1 rounded-[6px] text-slate-400 hover:text-white hover:bg-slate-700 text-[11px] transition-colors"
                                  >
                                    {isHu ? 'Ajánlat visszavonása' : 'Cancel offer'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Messages Bubble List */}
                  {loadingMessages ? (
                    <div className="py-12 flex justify-center">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[var(--text-sub,#B5BDC6)]">
                      {isHu
                        ? 'Itt kezdődik a beszélgetésetek. Írj bátran üzenetet az eladónak!'
                        : 'Start the conversation! Type a message below.'}
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-[14px] px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-[var(--color-primary-blue,#2563EB)] text-white rounded-tr-none'
                                : 'bg-[var(--surface-bg,#465362)] text-[var(--text-main,#E0E3E6)] rounded-tl-none border border-[var(--border-color,#56616D)]/50'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-sub,#B5BDC6)] px-1 mt-0.5">
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString(isHu ? 'hu-HU' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe && (
                              <span>
                                {msg.is_read ? (
                                  <CheckCheck className="w-3 h-3 text-blue-400 inline" />
                                ) : (
                                  <Check className="w-3 h-3 inline" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Error banner */}
                {error && (
                  <div className="px-4 py-2 bg-rose-950/60 border-t border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Message Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-[var(--border-color,#56616D)] bg-[var(--surface-bg,#465362)]/40 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isHu ? 'Írj üzenetet...' : 'Type a message...'}
                    className="flex-1 px-3.5 py-2 rounded-[10px] bg-[var(--card-bg,#3A4551)] border border-[var(--border-color,#56616D)] text-xs sm:text-sm text-white focus:outline-none focus:border-[var(--color-primary-blue,#2563EB)] placeholder:text-[var(--text-sub,#B5BDC6)]/60"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="p-2.5 rounded-[10px] bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white transition-all disabled:opacity-40 disabled:hover:bg-[var(--color-primary-blue,#2563EB)] shadow"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-xs text-[var(--text-sub,#B5BDC6)]">
                <MessageSquare className="w-12 h-12 text-[var(--border-color,#56616D)] mb-2" />
                <span className="font-semibold text-white">
                  {isHu ? 'Válassz ki egy beszélgetést' : 'Select a conversation'}
                </span>
                <span>
                  {isHu
                    ? 'A bal oldali listából kattints egy meglévő üzenetváltásra a megtekintéshez.'
                    : 'Click a conversation from the left pane to view messages.'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
