import PaymentSimulator from '@/features/checkout/PaymentSimulator';

export const metadata = { title: 'Payment simulator', robots: { index: false, follow: false } };

export default function Page() {
  return <PaymentSimulator />;
}
