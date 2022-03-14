// import 'dotenv/config';
import Stripe from 'stripe';

const { STRIPE_SECRET_KEY } = process.env;

export interface StripeDataRow {
  active: string[];
  image: string;
  title: string;
  subtitle: string | null;
  product: Stripe.Product;
  plans: Stripe.Plan[];
  prices: Stripe.Price[];
}

export interface StripeDataMap {
  [id: string]: StripeDataRow;
}

export const getAllProducts = (ids?: string[]): Promise<StripeDataMap> => {
  if (STRIPE_SECRET_KEY) {
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2020-08-27'
    });

    const loadProducts = async (): Promise<StripeDataMap> => {
      const stripeData: StripeDataMap = {};

      const products = await stripe.products.list({
        ids,
        limit: 100
      });

      console.log(
        'Products',
        // products,
        products.data.map((product) => {
          return `[${product.id}] (${product.type}) ${product.name} - ${product.description}`;
        })
      );

      products.data.forEach((product) => {
        stripeData[product.id] = {
          product,
          title: product.name,
          subtitle: product.description,
          image: product.images.length ? product.images[0] : '/img/logo.png',
          active: [],
          plans: [],
          prices: []
        };
      });

      // stripeData.products = [...products.data];

      const plans = await stripe.plans.list({
        limit: 100
      });

      // console.log('Plans', plans);

      plans.data.forEach((plan) => {
        const pid = plan.product as string;

        if (stripeData[pid]) {
          stripeData[pid].plans.push(plan);
        } else {
          console.error(`Cannot find product for plan: ${plan.product}`, plan);
        }
      });

      const prices = await stripe.prices.list({
        active: true,
        // type: 'recurring', // or 'one_time'
        // product: 'prod_LISHIdmRBlYbe2',
        limit: 100
      });

      // console.log(
      //   'Prices',
      //   prices
      // );

      prices.data.forEach((price) => {
        const pid = price.product as string;

        if (stripeData[pid]) {
          stripeData[pid].prices.push(price);
        } else {
          console.error(`Cannot find product for price: ${price.product}`, price);
        }
      });

      // console.log('Combined stripeData:');
      // console.log(JSON.stringify(stripeData, null, 2));

      return stripeData;
    };

    return loadProducts();
  } else {
    throw new Error('Missing required env var for stripe: STRIPE_SECRET_KEY');
  }
};

/**
 * Metadata?
 *
 * - Plan name/desc
 * - Details/lists
 * - Included features/rates
 */

/**
 * Other stripe objects/apis to look at...
 *
 * https://stripe.com/docs/api/errors?lang=node
 * - Errors
 * - Metadata (all the datas)
 * - Coupons
 * - Promo Codes
 * - Charges & Refunds
 * - Checkout (flow, payment, billing, invoice, etc)
 * - Payment Intents? (SetupIntent - future use)
 * - Taxes? (Tax Codes, etc)
 * - Customers (already partially setup)
 */
