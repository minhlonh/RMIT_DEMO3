import type { Metadata } from 'next';
import './globals.css';
import { FamilyProvider } from '@/context/FamilyContext';

export const metadata: Metadata = {
  title: 'Gia Đình Số - Kết Nối Đa Thế Hệ',
  description: 'Nền tảng ứng dụng gắn kết tình cảm gia đình, bảo tồn ký ức và bảo vệ người lớn tuổi.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <FamilyProvider>
          {children}
        </FamilyProvider>
      </body>
    </html>
  );
}