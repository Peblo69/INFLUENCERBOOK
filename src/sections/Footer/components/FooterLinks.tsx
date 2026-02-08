import { FooterColumn } from "@/sections/Footer/components/FooterColumn";

export const FooterLinks = () => {
  return (
    <div className="box-border caret-transparent grid flex-nowrap grid-cols-[repeat(1,minmax(0px,1fr))] justify-center py-5 md:flex md:flex-wrap">
      <FooterColumn
        title="Services"
        links={[
          { href: "#", text: "AI Girl Generator" },
          { href: "#", text: "NSFW AI Chat" },
          { href: "#", text: "AI Hentai Generator" },
          { href: "#", text: "AI Porn Generator" },
          { href: "#", text: "AI Character" },
          { href: "#", text: "AI Furry Generator" },
          { href: "#", text: "NSFW AI Generator" },
          { href: "#", text: "Gay AI Generator" },
          { href: "#", text: "AI Video Generator" },
        ]}
      />
      <FooterColumn
        title="Socials"
        links={[
          { href: "#", text: "Discord" },
          { href: "#", text: "Instagram" },
          { href: "#", text: "TikTok" },
          { href: "#", text: "X (Twitter)" },
          { href: "#", text: "YouTube" },
        ]}
        className="ml-0 mt-4 md:ml-2 md:mt-0"
      />
      <FooterColumn
        title="Business / API"
        links={[
          { href: "#", text: "Affiliate Guide" },
          { href: "#", text: "API Guide" },
          { href: "#", text: "API Docs" },
          { href: "#", text: "Business Contact" },
        ]}
        className="ml-0 mt-4 md:ml-2 md:mt-0"
      />
      <FooterColumn
        title="About"
        links={[
          { href: "#", text: "Guide" },
          { href: "#", text: "Contact" },
        ]}
        className="ml-0 mt-4 md:ml-2 md:mt-0"
      />
      <FooterColumn
        title="AI Tools"
        links={[
          { href: "#", text: "Explore NSFW AI Images" },
          { href: "#", text: "Create NSFW AI Images" },
          { href: "#", text: "Tweak NSFW AI Images" },
          { href: "#", text: "NSFW AI Chat" },
        ]}
        className="ml-0 mt-4 md:ml-2 md:mt-0"
      />
      <FooterColumn
        title="Shop"
        links={[
          { href: "#", text: "Upgrade to Pro" },
          { href: "#", text: "Buy Gems" },
          { href: "#", text: "Custom AI Merch" },
        ]}
        className="ml-0 mt-4 md:ml-2 md:mt-0"
      />
    </div>
  );
};
