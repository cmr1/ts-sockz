import 'dotenv/config';
import Stripe from 'stripe';

const { STRIPE_SECRET_KEY } = process.env;

if (STRIPE_SECRET_KEY) {
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2020-08-27'
  });

  const debug = async () => {
    // const plans = await stripe.plans.list({
    //   limit: 100
    // });

    // console.log('Plans', plans);

    const products = await stripe.products.list({
      limit: 100
    });

    console.log(
      'Products',
      products.data.map((product) => {
        return `[${product.id}] (${product.type}) ${product.name} - ${product.description}`;
      })
    );
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
