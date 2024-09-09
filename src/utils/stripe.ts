import Stripe from 'stripe';
import env from './env';

export const stripe = new Stripe(env.stripe.token);

export function clampString(string_: string) {
  return string_.length > 37 ? `${string_.slice(0, 37)}...` : string_;
}
