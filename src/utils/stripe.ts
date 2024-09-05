import Stripe from 'stripe';
import env from './env';

export const stripe = new Stripe(env.stripe.token);
