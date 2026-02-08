import { FAQHeader } from "@/sections/FAQSection/components/FAQHeader";
import { FAQList } from "@/sections/FAQSection/components/FAQList";

export const FAQSection = () => {
  return (
    <section className="box-border caret-transparent max-w-screen-lg mt-14 mx-auto px-6 py-4 md:px-8">
      <FAQHeader />
      <FAQList />
      <p className="box-border caret-transparent text-center my-12">
        Have more questions? Visit our{" "}
        <a
          href="#"
          className="box-border caret-transparent underline"
        >
          Discord community
        </a>
        to ask for help.
      </p>
    </section>
  );
};
