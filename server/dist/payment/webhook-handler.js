import { verifyWebhookSignature, handleSuccessfulPayment } from './stripe-service';
import { z } from 'zod';
// Validation schema for webhook data
const paymentIntentSchema = z.object({
    id: z.string(),
    amount: z.number(),
    currency: z.string(),
    status: z.string(),
    metadata: z.object({
        userId: z.string().transform(Number), // Transform to number
        type: z.string(),
    }).optional(),
});
/**
 * Handles incoming Stripe webhook events
 */
export const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
        console.error('Missing stripe-signature header');
        res.status(400).send('Missing stripe-signature header');
        return;
    }
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
        console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
        res.status(500).send('Webhook configuration error: Missing STRIPE_WEBHOOK_SECRET');
        return;
    }
    let event;
    try {
        // Verify the webhook signature
        event = await verifyWebhookSignature(Buffer.from(req.body), sig, endpointSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    try {
        // Handle the event based on its type
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event);
                break;
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                // Handle subscription events if needed
                console.log(`Unhandled subscription event type ${event.type}`);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        // Return a 200 response to acknowledge receipt of the event
        res.status(200).send('Success');
    }
    catch (error) {
        console.error('Error processing webhook event:', error);
        res.status(500).send('Error processing webhook event');
    }
};
/**
 * Handles successful payment intent events
 */
const handlePaymentIntentSucceeded = async (event) => {
    const paymentIntent = event.data.object;
    // Validate the payment intent data
    const validationResult = paymentIntentSchema.safeParse(paymentIntent);
    if (!validationResult.success) {
        console.error('Invalid payment intent data:', validationResult.error);
        throw new Error(`Invalid payment intent data: ${validationResult.error.message}`);
    }
    const { id: paymentIntentId, amount, metadata } = validationResult.data;
    // Convert amount from cents to dollars
    const amountInDollars = amount / 100;
    if (!metadata || !metadata.userId) {
        console.warn('Payment intent missing userId in metadata:', paymentIntentId);
        return; // Skip processing if no userId is provided
    }
    const userId = metadata.userId;
    // Process the successful payment
    await handleSuccessfulPayment(paymentIntentId, userId, amountInDollars);
    console.log(`Successfully processed payment for user ${userId}, amount: $${amountInDollars}`);
};
/**
 * Handles failed payment intent events
 */
const handlePaymentIntentFailed = async (event) => {
    const paymentIntent = event.data.object;
    console.log(`Payment failed for payment intent: ${paymentIntent.id}`);
    // Here you could implement logic to notify the user about the failed payment
    // For example, send an email notification
};
