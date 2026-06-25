import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set) => ({
      cart: [],
      isDrawerOpen: false,
      setDrawerOpen: (open) => set({ isDrawerOpen: open }),
      addToCart: (product) => set((state) => {
        const cartId = product.selectedVariation 
          ? `${product.id}-${product.selectedVariation.weight}` 
          : product.id;
        
        const qtyToAdd = product.quantity || 1;
          
        const existing = state.cart.find(item => item.cartId === cartId);
        let newCart;
        if (existing) {
          newCart = state.cart.map(item => 
            item.cartId === cartId ? { ...item, quantity: item.quantity + qtyToAdd } : item
          );
        } else {
          newCart = [...state.cart, { ...product, cartId, quantity: qtyToAdd }];
        }
        return { cart: newCart };
      }),
      removeFromCart: (cartId) => set((state) => ({
        cart: state.cart.filter(item => item.cartId !== cartId)
      })),
      updateQuantity: (cartId, quantity) => set((state) => ({
        cart: state.cart.map(item => 
          item.cartId === cartId ? { ...item, quantity: Math.max(1, quantity) } : item
        )
      })),
      clearCart: () => set({ cart: [] })
    }),
    {
      name: 'agropets-cart',
      partialize: (state) => ({ cart: state.cart }), // Only persist cart, not drawer state
    }
  )
);

export const useSearchStore = create((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query })
}));

export const useWishlistStore = create(
  persist(
    (set) => ({
      wishlist: [],
      toggleWishlist: (product) => set((state) => {
        const isFavorite = state.wishlist.find(item => item.id === product.id);
        if (isFavorite) {
          return { wishlist: state.wishlist.filter(item => item.id !== product.id) };
        }
        return { wishlist: [...state.wishlist, product] };
      }),
      isFavorite: (productId) => {
        const state = useWishlistStore.getState();
        return state.wishlist.some(item => item.id === productId);
      }
    }),
    {
      name: 'agropets-wishlist',
    }
  )
);
