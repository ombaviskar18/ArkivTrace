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
          colorPrimary: '#00C8FF',
          colorBackground: '#06151D',
        },
        elements: {
          card: 'bg-[#06151D] border border-[#00C8FF]/20 shadow-2xl',
          headerTitle: 'text-[#F1F8FC] font-bold',
          headerSubtitle: 'text-[#91A9B7]',
          socialButtonsBlockButton: 'bg-[#071B25] border border-[#00C8FF]/20 text-[#F1F8FC] hover:bg-[#09232F]',
          formButtonPrimary: 'bg-[#00C8FF] text-[#02090D] font-bold hover:bg-[#55E5FF] shadow-[0_0_15px_rgba(0,200,255,0.4)]',
          footerActionLink: 'text-[#00C8FF] hover:text-[#55E5FF]',
          formFieldLabel: 'text-[#91A9B7] text-xs font-semibold',
          formFieldInput: 'bg-[#071B25] border border-[#00C8FF]/20 text-[#F1F8FC] focus:border-[#00C8FF]',
        },
      }}
    >
      <html lang="en" className="dark" suppressHydrationWarning>
        <head>
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
          className={`${poppins.variable} ${jetbrainsMono.variable} antialiased bg-[#02090D] text-[#F1F8FC] min-h-screen selection:bg-[#00C8FF]/20 selection:text-[#55E5FF]`}
        >
          <ClerkAuthSync />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
