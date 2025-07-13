import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Forward checkout data collection events to our backend
  try {
    const response = await fetch(`${process.env.BACKEND_API_URL}/webhooks/checkouts/data-collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': topic,
        'X-Shopify-Shop-Domain': shop,
      },
      body: JSON.stringify({
        shop,
        topic,
        payload,
        sessionId: session?.id,
      }),
    });

    if (!response.ok) {
      console.error('Failed to forward webhook to backend:', response.statusText);
    }
  } catch (error) {
    console.error('Error forwarding webhook to backend:', error);
  }

  return new Response();
};