import PaymentCallback from '@/features/checkout/PaymentCallback';

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ params }) {
  const { provider } = await params;
  return <PaymentCallback provider={provider} />;
}
