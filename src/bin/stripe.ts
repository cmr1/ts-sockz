import 'dotenv/config';
import Stripe from 'stripe';

const { STRIPE_SECRET_KEY } = process.env;

interface StripeDataRow {
  product: Stripe.Product;
  plans: Stripe.Plan[];
  prices: Stripe.Price[];
}

interface StripeDataMap {
  [id: string]: StripeDataRow;
}

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

if (STRIPE_SECRET_KEY) {
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2020-08-27'
  });

  const debug = async () => {
    const stripeData: StripeDataMap = {};

    const products = await stripe.products.list({
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

    console.log('Combined stripeData:');
    console.log(JSON.stringify(stripeData, null, 2));
  };

  debug();
} else {
  throw new Error('Missing required env var for stripe: STRIPE_SECRET_KEY');
}

// {
//   id: 'prod_LIZ6yfL65hhehB',
//   object: 'product',
//   active: true,
//   attributes: [],
//   created: 1646964771,
//   description: 'Basic Sockz Subscription',
//   images: [],
//   livemode: false,
//   metadata: {},
//   name: 'Basic',
//   package_dimensions: null,
//   shippable: null,
//   statement_descriptor: null,
//   tax_code: 'txcd_10000000',
//   type: 'service',
//   unit_label: null,
//   updated: 1646964771,
//   url: null
// },
// {
//   id: 'prod_LISHIdmRBlYbe2',
//   object: 'product',
//   active: true,
//   attributes: [],
//   created: 1646939396,
//   description: 'Sockz example product',
//   images: [Array],
//   livemode: false,
//   metadata: {},
//   name: 'Example',
//   package_dimensions: null,
//   shippable: null,
//   statement_descriptor: null,
//   tax_code: 'txcd_10000000',
//   type: 'service',
//   unit_label: null,
//   updated: 1646939396,
//   url: null
// }
// ],

/**
 * Metadata?
 *
 * - Plan name/desc
 * - Details/lists
 * - Included features/rates
 */

//  stripe.customers
//  .list()
//  .autoPagingEach((customer) => {
//    return doSomething(customer).then(() => {
//      if (shouldBreak()) {
//        return false;
//      }
//    });
//  })
