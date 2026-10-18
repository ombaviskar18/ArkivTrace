import type { Metadata } from "next";
import { Poppins, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkAuthSync } from "@/components/auth/ClerkAuthSync";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArkivTrace — Public Distribution Transparency",
  description: "Auditable public distribution records, grain dispatches, shop receipts, and discrepancy reconciliation powered by Arkiv blockchain.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/images/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.ico',
    apple: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      dynamic
      appearance={{
        variables: {
          colorPrimary: '#3b82f6',
          colorPrimaryForeground: '#FFFFFF',
          colorBackground: '#041017',
          colorInput: '#06151D',
          colorInputForeground: '#FFFFFF',
          colorForeground: '#FFFFFF',
          colorMutedForeground: '#91A9B7',
          colorNeutral: '#FFFFFF',
        },
        elements: {
          card: 'bg-[#041017] border border-[#3b82f6]/30 shadow-2xl text-white',
          headerTitle: 'text-white font-bold text-xl',
          headerSubtitle: 'text-[#91A9B7] text-sm',
          socialButtonsBlockButton: 'bg-[#06151D] border border-[#3b82f6]/25 text-white hover:bg-[#09232F]',
          socialButtonsBlockButtonText: 'text-white font-semibold',
          formButtonPrimary: 'bg-[#3b82f6] text-white font-bold hover:bg-[#60a5fa] shadow-[0_0_20px_rgba(59, 130, 246, 0.4)]',
          footerActionLink: 'text-[#60a5fa] hover:text-[#93c5fd] font-semibold',
          footerActionText: 'text-[#91A9B7]',
          formFieldLabel: 'text-white text-xs font-semibold',
          formFieldInput: 'bg-[#06151D] border border-[#3b82f6]/30 text-white focus:border-[#3b82f6]',
          userButtonPopoverCard: 'bg-[#041017] border border-[#3b82f6]/30 text-white shadow-2xl',
          userPreviewMainIdentifier: 'text-white font-bold',
          userPreviewSecondaryIdentifier: 'text-[#91A9B7]',
          userButtonPopoverActionButton: 'text-white hover:bg-[#3b82f6]/15 hover:text-white',
          userButtonPopoverActionButtonText: 'text-white font-medium',
          userButtonPopoverActionButtonIcon: 'text-[#60a5fa]',
          userButtonPopoverFooter: 'border-t border-[#3b82f6]/20 text-[#91A9B7]',
        },
      }}
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="apple-touch-icon" href="/images/logo.png" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  function cleanExtensionAttrs(node) {
                    if (node && node.nodeType === 1) {
                      if (node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
                      if (node.hasAttribute('bis_register')) node.removeAttribute('bis_register');
                      for (var i = 0; i < node.attributes.length; i++) {
                        var attr = node.attributes[i];
                        if (attr && attr.name && attr.name.indexOf('__processed_') === 0) {
                          node.removeAttribute(attr.name);
                          i--;
                        }
                      }
                      for (var j = 0; j < node.children.length; j++) {
                        cleanExtensionAttrs(node.children[j]);
                      }
                    }
                  }
                  if (typeof MutationObserver !== 'undefined') {
                    var observer = new MutationObserver(function(mutations) {
                      for (var i = 0; i < mutations.length; i++) {
                        var m = mutations[i];
                        if (m.type === 'attributes') {
                          if (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register' || (m.attributeName && m.attributeName.indexOf('__processed_') === 0)) {
                            m.target.removeAttribute(m.attributeName);
                          }
                        } else if (m.type === 'childList') {
                          for (var j = 0; j < m.addedNodes.length; j++) {
                            cleanExtensionAttrs(m.addedNodes[j]);
                          }
                        }
                      }
                    });
                    observer.observe(document.documentElement, {
                      attributes: true,
                      childList: true,
                      subtree: true,
                      attributeFilter: ['bis_skin_checked', 'bis_register']
                    });
                  }
                })();
              `,
            }}
          />
        </head>
        <body
          suppressHydrationWarning
          className={`${poppins.variable} ${jetbrainsMono.variable} antialiased bg-[#02090D] text-[#F1F8FC] min-h-screen selection:bg-[#3b82f6]/20 selection:text-[#60a5fa]`}
        >
          <ClerkAuthSync />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
