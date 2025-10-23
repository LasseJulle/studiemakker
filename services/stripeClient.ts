import { User } from '../types';

// This is a simplified mock of a Stripe client.
// In a real application, this would interact with your backend to create a Stripe Checkout Session.

export const stripeClient = {
  /**
   * Simulates creating a Stripe checkout session.
   * In a real app, this would call a backend endpoint to get a session ID.
   * It no longer handles redirection.
   */
  redirectToCheckout: async (priceId: string): Promise<{ error?: { message: string } }> => {
    console.log(`Simulating Stripe checkout for price ID: ${priceId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (priceId) {
        // Simulate a successful API call by returning no error.
        // The calling component will handle the navigation.
        return {};
    } else {
        return { error: { message: 'Pris-ID mangler.' } };
    }
  },
};
