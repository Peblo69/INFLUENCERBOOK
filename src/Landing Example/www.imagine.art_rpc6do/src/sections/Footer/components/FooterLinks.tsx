import { useAuthModal } from "../../../App";

export const FooterLinks = () => {
  const { openAuthModal } = useAuthModal();

  return (
    <div className="box-border caret-transparent gap-x-8 grid grid-cols-[repeat(2,minmax(0px,1fr))] gap-y-8 md:grid-cols-[repeat(6,minmax(0px,1fr))]">
      <div className="box-border caret-transparent gap-x-8 flex flex-col gap-y-8">
        <div className="box-border caret-transparent gap-x-3 flex flex-col gap-y-3">
          <h4 className="text-sm font-semibold box-border caret-transparent tracking-[0.28px] leading-5">
            Kiara Vision
          </h4>
          <div className="box-border caret-transparent gap-x-2 flex flex-col gap-y-2">
            <button
              onClick={openAuthModal}
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5 text-left hover:text-white transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Login
            </button>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Teams
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Partnerships
            </a>
          </div>
        </div>
      </div>
      <div className="box-border caret-transparent gap-x-8 flex flex-col gap-y-8">
        <div className="box-border caret-transparent gap-x-3 flex flex-col gap-y-3">
          <h4 className="text-sm font-semibold box-border caret-transparent tracking-[0.28px] leading-5">
            Tools
          </h4>
          <div className="box-border caret-transparent gap-x-2 flex flex-col gap-y-2">
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              AI Image
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              AI Art
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              AI Video
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              AI Music
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              AI Voice
            </a>
          </div>
        </div>
      </div>
      <div className="box-border caret-transparent gap-x-8 flex flex-col gap-y-8">
        <div className="box-border caret-transparent gap-x-3 flex flex-col gap-y-3">
          <h4 className="text-sm font-semibold box-border caret-transparent tracking-[0.28px] leading-5">
            Resources
          </h4>
          <div className="box-border caret-transparent gap-x-2 flex flex-col gap-y-2">
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Pricing
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Help Center
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Tutorials
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Blogs
            </a>
          </div>
        </div>
      </div>
      <div className="box-border caret-transparent gap-x-8 flex flex-col gap-y-8">
        <div className="box-border caret-transparent gap-x-3 flex flex-col gap-y-3">
          <h4 className="text-sm font-semibold box-border caret-transparent tracking-[0.28px] leading-5">
            Community
          </h4>
          <div className="box-border caret-transparent gap-x-2 flex flex-col gap-y-2">
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Discord
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Facebook
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Instagram
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Youtube
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
      <div className="box-border caret-transparent gap-x-8 flex flex-col gap-y-8">
        <div className="box-border caret-transparent gap-x-3 flex flex-col gap-y-3">
          <h4 className="text-sm font-semibold box-border caret-transparent tracking-[0.28px] leading-5">
            Contact Us
          </h4>
          <div className="box-border caret-transparent gap-x-2 flex flex-col gap-y-2">
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Contact Support
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Contact Billing
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Demo for Individuals
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Demo for Teams
            </a>
          </div>
        </div>
      </div>
      <div className="box-border caret-transparent gap-x-8 flex flex-col gap-y-8">
        <div className="box-border caret-transparent gap-x-3 flex flex-col gap-y-3">
          <h4 className="text-sm font-semibold box-border caret-transparent tracking-[0.28px] leading-5">
            Legal
          </h4>
          <div className="box-border caret-transparent gap-x-2 flex flex-col gap-y-2">
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="text-sm box-border caret-transparent block tracking-[0.28px] leading-5"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
