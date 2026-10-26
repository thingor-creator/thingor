import React, { useState, useEffect, useCallback } from 'react';
import type {
  MarketplaceListing,
  MarketplaceFilterState,
} from '../../types/marketplace';
import {
  fetchListings,
  fetchMyListings,
  fetchSavedListings,
  toggleSavedListing,
} from '../../lib/marketplace';
import { useApp } from '../../context/AppContext';
import { ListingCard } from './ListingCard';
import { MarketplaceFilters } from './MarketplaceFilters';
import { ListingDetailModal } from './ListingDetailModal';
import { CreateEditListingModal } from './CreateEditListingModal';
import { PublicProfileModal } from './PublicProfileModal';
import { MakeOfferModal } from './MakeOfferModal';
import { ConversationsModal } from './ConversationsModal';
import { ReportModal } from './ReportModal';
import {
  ShoppingBag,
  Plus,
  Heart,
  MessageSquare,
  Package,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

type MarketplaceTab = 'browse' | 'my_listings' | 'saved';

interface MarketplaceViewProps {
  initialListingId?: string | null;
  initialCreateItemId?: string | null;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  initialListingId,
  initialCreateItemId,
}) => {
  const { user, isAuthenticated, setIsAuthModalOpen, language, items } = useApp();
  const isHu = language === 'hu';

  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState<MarketplaceTab>('browse');

  // Filter State
  const [filters, setFilters] = useState<MarketplaceFilterState>({
    status: 'active',
    limit: 18,
    offset: 0,
    sort_by: 'newest',
  });

  // Data States
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;

  // Modals Coordination State
  const [selectedListingId, setSelectedListingId] = useState<string | null>(initialListingId || null);
  const [isDetailOpen, setIsDetailOpen] = useState(Boolean(initialListingId));

  const [isCreateEditOpen, setIsCreateEditOpen] = useState(Boolean(initialCreateItemId));
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [initialItemToCreate, setInitialItemToCreate] = useState<any | null>(null);

  // If initialCreateItemId is passed, find the item and prepare to create listing
  useEffect(() => {
    if (initialCreateItemId && items.length > 0) {
      const target = items.find((i) => i.id === initialCreateItemId);
      if (target) {
        setInitialItemToCreate(target);
        setIsCreateEditOpen(true);
      }
    }
  }, [initialCreateItemId, items]);

  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [isSellerProfileOpen, setIsSellerProfileOpen] = useState(false);

  const [offerListing, setOfferListing] = useState<MarketplaceListing | null>(null);
  const [isOfferOpen, setIsOfferOpen] = useState(false);

  const [isConversationsOpen, setIsConversationsOpen] = useState(false);
  const [chatParams, setChatParams] = useState<{
    conversationId?: string | null;
    sellerId?: string | null;
    listingId?: string | null;
  }>({});

  const [reportTarget, setReportTarget] = useState<{
    listingId?: string;
    userId?: string;
    title?: string;
  } | null>(null);

  // Load listings based on current tab and filters
  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * itemsPerPage;

      if (activeTab === 'browse') {
        const res = await fetchListings({
          ...filters,
          status: 'active',
          limit: itemsPerPage,
          offset,
        });

        if (res.success && res.data) {
          setListings(res.data);
          setTotalCount(res.count ?? res.data.length);
        } else {
          setError(res.error || (isHu ? 'Nem sikerült betölteni a hirdetéseket' : 'Failed to load listings'));
        }
      } else if (activeTab === 'my_listings') {
        if (!isAuthenticated) {
          setListings([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        const res = await fetchMyListings();
        if (res.success && res.data) {
          setListings(res.data);
          setTotalCount(res.data.length);
        } else {
          setError(res.error || (isHu ? 'Nem sikerült betölteni a saját hirdetéseket' : 'Failed to load your listings'));
        }
      } else if (activeTab === 'saved') {
        if (!isAuthenticated) {
          setListings([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        const res = await fetchSavedListings();
        if (res.success && res.data) {
          setListings(res.data);
          setTotalCount(res.data.length);
        } else {
          setError(res.error || (isHu ? 'Nem sikerült betölteni a mentett hirdetéseket' : 'Failed to load saved listings'));
        }
      }
    } catch (err: any) {
      setError(err?.message || (isHu ? 'Hiba történt a betöltéskor' : 'Error loading listings'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, currentPage, isAuthenticated, isHu]);

  // Initial load and filter change trigger
  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Handle URL hash changes targeting specific listings
  useEffect(() => {
    if (initialListingId) {
      setSelectedListingId(initialListingId);
      setIsDetailOpen(true);
    }
  }, [initialListingId]);

  // Bookmark Toggle
  const handleToggleBookmark = async (listingId: string, currentSaved: boolean) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    // Optimistic UI update
    setListings((prev) =>
      prev.map((item) =>
        item.id === listingId ? { ...item, is_saved: !currentSaved } : item
      )
    );

    const res = await toggleSavedListing(listingId, currentSaved);
    if (!res.success) {
      // Revert if failed
      setListings((prev) =>
        prev.map((item) =>
          item.id === listingId ? { ...item, is_saved: currentSaved } : item
        )
      );
    } else if (activeTab === 'saved' && currentSaved) {
      // If we are in 'saved' tab and removed a bookmark, remove from view
      setListings((prev) => prev.filter((item) => item.id !== listingId));
    }
  };

  // Open Chat Handler
  const handleOpenChat = (sellerId: string, listingId: string) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setChatParams({ sellerId, listingId });
    setIsConversationsOpen(true);
  };

  // Open Make Offer Handler
  const handleOpenOffer = (listing: MarketplaceListing) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setOfferListing(listing);
    setIsOfferOpen(true);
  };

  // Open Seller Profile Handler
  const handleOpenSellerProfile = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setIsSellerProfileOpen(true);
  };

  // Create Listing Click
  const handleCreateListingClick = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    setEditingListing(null);
    setIsCreateEditOpen(true);
  };

  // Edit Listing Click
  const handleEditListing = (listing: MarketplaceListing) => {
    setEditingListing(listing);
    setIsCreateEditOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="flex-1 w-full flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="relative rounded-[16px] bg-gradient-to-br from-[var(--card-bg,#3A4551)] via-[var(--surface-bg,#465362)] to-[var(--bg-main,#1E262F)] border border-[var(--border-color,#56616D)] p-6 md:p-8 overflow-hidden shadow-lg">
        {/* Glow Accent */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isHu ? 'Közösségi Gazdaság & Piactér' : 'Community Sharing & Marketplace'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {isHu ? 'Közösségi Piactér' : 'Social Marketplace'}
            </h1>
            <p className="text-xs md:text-sm text-[var(--text-sub,#B5BDC6)] leading-relaxed">
              {isHu
                ? 'Oszd meg, add bérbe, add el vagy cseréld el értékeidet a közösség megbízható tagjaival.'
                : 'Rent, sell, share or barter items with trusted community members.'}
            </p>
          </div>

          {/* Action Buttons: Create Listing & Messages */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setChatParams({});
                  setIsConversationsOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-[var(--text-main,#E0E3E6)] hover:text-white border border-[var(--border-color,#56616D)] text-xs font-bold transition-all shadow-sm"
              >
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>{isHu ? 'Üzenetek & Ajánlatok' : 'Messages'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateListingClick}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[var(--color-primary-blue,#2563EB)] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-md hover:shadow-blue-500/25 flex-1 sm:flex-initial"
            >
              <Plus className="w-4 h-4" />
              <span>{isHu ? 'Hirdetés feladása' : 'Create Listing'}</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="relative z-10 flex items-center gap-2 pt-6 border-t border-[var(--border-color,#56616D)]/50 mt-6 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => {
              setActiveTab('browse');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'browse'
                ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                : 'text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-white/5'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isHu ? 'Böngészés' : 'Browse All'}</span>
          </button>

          {isAuthenticated && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('my_listings');
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
                  activeTab === 'my_listings'
                    ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                    : 'text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-white/5'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>{isHu ? 'Saját hirdetéseim' : 'My Listings'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('saved');
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${
                  activeTab === 'saved'
                    ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                    : 'text-[var(--text-sub,#B5BDC6)] hover:text-white hover:bg-white/5'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span>{isHu ? 'Mentett kedvencek' : 'Saved'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters (Shown in browse tab) */}
      {activeTab === 'browse' && (
        <MarketplaceFilters
          filters={filters}
          isSearching={loading}
          onChange={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
          onReset={() => {
            setFilters({
              status: 'active',
              limit: itemsPerPage,
              offset: 0,
              sort_by: 'newest',
            });
            setCurrentPage(1);
          }}
        />
      )}

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Results Header */}
        <div className="flex items-center justify-between text-xs text-[var(--text-sub,#B5BDC6)]">
          <span className="font-medium">
            {isHu ? 'Találatok száma: ' : 'Total listings: '}
            <strong className="text-white">{totalCount}</strong>
          </span>

          {loading && (
            <span className="inline-flex items-center gap-1.5 text-blue-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isHu ? 'Betöltés...' : 'Loading...'}</span>
            </span>
          )}
        </div>

        {/* Error State */}
        {error ? (
          <div className="p-8 rounded-[14px] bg-[var(--card-bg,#3A4551)] border border-rose-500/30 flex flex-col items-center justify-center text-center gap-3">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
            <h3 className="text-sm font-bold text-white">{isHu ? 'Hiba történt a lekéréskor' : 'Error loading listings'}</h3>
            <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-md">{error}</p>
            <button
              type="button"
              onClick={loadListings}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all mt-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isHu ? 'Újrapróbálás' : 'Retry'}</span>
            </button>
          </div>
        ) : loading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[14px] border border-[var(--border-color,#56616D)]/50 bg-[var(--card-bg,#3A4551)]/50 h-72 animate-pulse flex flex-col"
              >
                <div className="h-44 bg-[var(--surface-bg,#465362)]/50 rounded-t-[14px]" />
                <div className="p-3.5 space-y-2 flex-1">
                  <div className="h-3 bg-[var(--surface-bg,#465362)]/50 rounded w-1/3" />
                  <div className="h-4 bg-[var(--surface-bg,#465362)]/60 rounded w-3/4" />
                  <div className="h-5 bg-[var(--surface-bg,#465362)]/70 rounded w-1/2 mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          /* Empty State */
          <div className="p-12 rounded-[16px] bg-[var(--card-bg,#3A4551)]/40 border border-[var(--border-color,#56616D)]/60 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[var(--surface-bg,#465362)] flex items-center justify-center text-[var(--text-sub,#B5BDC6)] mb-1">
              <ShoppingBag className="w-7 h-7 opacity-60" />
            </div>

            <h3 className="text-base font-bold text-white">
              {activeTab === 'saved'
                ? (isHu ? 'Nincsenek mentett hirdetéseid' : 'No saved listings yet')
                : activeTab === 'my_listings'
                ? (isHu ? 'Még nincs saját hirdetésed' : 'You have not created any listings yet')
                : (isHu ? 'Nem található hirdetés a megadott feltételekkel' : 'No listings match your search criteria')}
            </h3>

            <p className="text-xs text-[var(--text-sub,#B5BDC6)] max-w-sm">
              {activeTab === 'saved'
                ? (isHu ? 'Kattints a szív ikonra a hirdetéseken a gyors eléréshez.' : 'Click the heart icon on any listing to save it for later.')
                : activeTab === 'my_listings'
                ? (isHu ? 'Add el feleslegessé vált értékeidet vagy add bérbe a közösségnek!' : 'List your unused items for sale, rent, or barter!')
                : (isHu ? 'Próbálj meg tágabb keresési feltételeket vagy töröld a szűrőket.' : 'Try broadening your search or resetting filters.')}
            </p>

            {activeTab === 'my_listings' ? (
              <button
                type="button"
                onClick={handleCreateListingClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all mt-2 shadow"
              >
                <Plus className="w-4 h-4" />
                <span>{isHu ? 'Első hirdetés feladása' : 'Create First Listing'}</span>
              </button>
            ) : activeTab === 'browse' && (
              <button
                type="button"
                onClick={() => {
                  setFilters({ status: 'active', limit: itemsPerPage, offset: 0, sort_by: 'newest' });
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[var(--surface-bg,#465362)] hover:bg-[var(--surface-bg,#465362)]/80 text-white text-xs font-semibold transition-all mt-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isHu ? 'Szűrők törlése' : 'Reset filters'}</span>
              </button>
            )}
          </div>
        ) : (
          /* Listings Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                onSelect={(sel) => {
                  setSelectedListingId(sel.id);
                  setIsDetailOpen(true);
                }}
                onToggleBookmark={handleToggleBookmark}
                isSaved={Boolean(item.is_saved)}
                isOwner={Boolean(user && item.seller_id === user.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-3 pt-6 pb-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)] hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-[var(--text-main,#E0E3E6)]">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-[8px] bg-[var(--surface-bg,#465362)] border border-[var(--border-color,#56616D)] text-[var(--text-sub,#B5BDC6)] hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Listing Detail Modal */}
      <ListingDetailModal
        listingId={selectedListingId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedListingId(null);
        }}
        onOpenChat={handleOpenChat}
        onOpenOffer={handleOpenOffer}
        onOpenSellerProfile={handleOpenSellerProfile}
        onOpenReport={(id, title) => setReportTarget({ listingId: id, title })}
        onEditListing={handleEditListing}
        onListingUpdated={loadListings}
      />

      {/* Create / Edit Listing Modal */}
      <CreateEditListingModal
        isOpen={isCreateEditOpen}
        listing={editingListing}
        initialItem={initialItemToCreate}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditingListing(null);
          setInitialItemToCreate(null);
        }}
        onSaved={(_saved) => {
          loadListings();
        }}
      />

      {/* Public Seller Profile Modal */}
      <PublicProfileModal
        sellerId={selectedSellerId}
        isOpen={isSellerProfileOpen}
        onClose={() => {
          setIsSellerProfileOpen(false);
          setSelectedSellerId(null);
        }}
        onSelectListing={(sel) => {
          setSelectedListingId(sel.id);
          setIsDetailOpen(true);
        }}
        onOpenReport={(userId, name) => setReportTarget({ userId, title: name })}
      />

      {/* Make Offer Modal */}
      <MakeOfferModal
        listing={offerListing}
        isOpen={isOfferOpen}
        onClose={() => {
          setIsOfferOpen(false);
          setOfferListing(null);
        }}
        onOfferCreated={(_offer) => {
          loadListings();
        }}
      />

      {/* Realtime Conversations & Chat Modal */}
      <ConversationsModal
        isOpen={isConversationsOpen}
        onClose={() => setIsConversationsOpen(false)}
        initialConversationId={chatParams.conversationId}
        initialSellerId={chatParams.sellerId}
        initialListingId={chatParams.listingId}
        onSelectListing={(lid) => {
          setSelectedListingId(lid);
          setIsDetailOpen(true);
        }}
      />

      {/* Report Listing or User Modal */}
      <ReportModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        listingId={reportTarget?.listingId}
        targetUserId={reportTarget?.userId}
        targetTitle={reportTarget?.title}
      />
    </div>
  );
};
