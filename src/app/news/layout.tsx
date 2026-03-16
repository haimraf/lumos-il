import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'נביא היומי | LUMOS IL - חדשות מעולם הקסמים',
  description: 'הדברים שקורים עכשיו בטירת לומוס ישראל. הישארו מעודכנים בחדשות האחרונות של קהילת הקוסמים.',
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
