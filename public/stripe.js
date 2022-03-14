// This is your test publishable API key.
const MAX_ATTEMPTS = 10;
const STRIPE_PUB_KEY = 'pk_test_51KbpbfGeEo6Zs3JacERm7SN6Ok8OGZzXGRueDiBgvtJ2KoqUCdvU3Os3xbLa4MCxkPRaazyrqDPR96UXLxHzVpmd00lLTM3FAc';
const stripe = Stripe(STRIPE_PUB_KEY);

// The items the customer wants to buy
// const items = [{ id: itemId }];

let elements;

initialize();
checkStatus();

document
  .querySelector("#payment-form")
  .addEventListener("submit", handleSubmit);

// Fetches a payment intent and captures the client secret
async function initialize(attempt = 1) {
  if (attempt > MAX_ATTEMPTS) throw new Error(`Failed to initialize stripe (tried ${attempt} times)`);

  if (typeof checkoutPrice !== 'undefined') {
    const response = await fetch(`/payment/${checkoutPrice.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkoutPrice
      }),
    });
    const { clientSecret } = await response.json();

    const appearance = {
      theme: 'stripe',
    };
    elements = stripe.elements({ appearance, clientSecret });

    const paymentElement = elements.create("payment");
    paymentElement.mount("#payment-element");
  } else {
    setTimeout(() => {
      initialize(attempt++);
    }, 100);
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  setLoading(true);

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      // Make sure to change this to your payment completion page
      return_url: "https://localhost:4040/pricing",
      // receipt_email: customer.email,
    },
  });

  // This point will only be reached if there is an immediate error when
  // confirming the payment. Otherwise, your customer will be redirected to
  // your `return_url`. For some payment methods like iDEAL, your customer will
  // be redirected to an intermediate site first to authorize the payment, then
  // redirected to the `return_url`.
  if (error.type === "card_error" || error.type === "validation_error") {
    showMessage(error.message);
  } else {
    showMessage("An unexpected error occured.");
  }

  setLoading(false);
}

// Fetches the payment intent status after payment submission
async function checkStatus() {
  const clientSecret = new URLSearchParams(window.location.search).get(
    "payment_intent_client_secret"
  );

  if (!clientSecret) {
    return;
  }

  const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);

  switch (paymentIntent.status) {
    case "succeeded":
      showMessage("Payment succeeded!");
      break;
    case "processing":
      showMessage("Your payment is processing.");
      break;
    case "requires_payment_method":
      showMessage("Your payment was not successful, please try again.");
      break;
    default:
      showMessage("Something went wrong.");
      break;
  }
}

// ------- UI helpers -------

function showMessage(messageText) {
  const messageContainer = document.querySelector("#payment-message");

  messageContainer.classList.remove("hidden");
  messageContainer.textContent = messageText;

  setTimeout(function () {
    messageContainer.classList.add("hidden");
    messageText.textContent = "";
  }, 4000);
}

// Show a spinner on payment submission
function setLoading(isLoading) {
  if (isLoading) {
    // Disable the button and show a spinner
    document.querySelector("#submit").disabled = true;
    document.querySelector("#spinner").classList.remove("hidden");
    document.querySelector("#button-text").classList.add("hidden");
  } else {
    document.querySelector("#submit").disabled = false;
    document.querySelector("#spinner").classList.add("hidden");
    document.querySelector("#button-text").classList.remove("hidden");
  }
}

// const elements = stripe.elements();

// // Create our card inputs
// var style = {
//   base: {
//     color: "#fff"
//   }
// };

// const card = elements.create('card', { style });
// card.mount('#card-element');

// const form = document.querySelector('form');
// const errorEl = document.querySelector('#card-errors');

// // Give our token to our form
// const stripeTokenHandler = token => {
//   const hiddenInput = document.createElement('input');
//   hiddenInput.setAttribute('type', 'hidden');
//   hiddenInput.setAttribute('name', 'stripeToken');
//   hiddenInput.setAttribute('value', token.id);
//   form.appendChild(hiddenInput);

//   form.submit();
// }

// // Create token from card data
// form.addEventListener('submit', e => {
//   e.preventDefault();

//   stripe.createToken(card).then(res => {
//     if (res.error) errorEl.textContent = res.error.message;
//     else stripeTokenHandler(res.token);
//   })
// })
